// Note generation for the practice deck: the note model, the practice settings
// (clef + range) and a weighted shuffle bag. Pure: no DOM, storage or React
// (see lib/practice.js for the stateful wiring).
//
// A note is { key, octave, clef, level, midi }:
//   key    'C'..'B', what the player has to name
//   octave scientific pitch octave (middle C = C4)
//   clef   'treble' | 'bass'
//   level  staff position, as <Staff level>: 0 = first ledger line below the
//          staff, 2 = bottom line, 6 = middle line, 10 = top line, 12 = first
//          ledger line above. Each step is one line or space.
//   midi   MIDI note number (middle C = 60)

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// Diatonic step (octave * 7 + letter index) of level 0 for each clef.
const LEVEL_ZERO = {
  treble: 4 * 7 + 0, // C4
  bass: 2 * 7 + 2, // E2
};

export const CLEF_OPTIONS = [
  { id: 'treble', label: 'Treble', clefs: ['treble'] },
  { id: 'bass', label: 'Bass', clefs: ['bass'] },
  { id: 'both', label: 'Both', clefs: ['treble', 'bass'] },
];

// Staff levels drilled by each range option. Ids are stored in settings, so keep
// them stable. The staff has room for three ledger lines either side (-5–17).
export const RANGE_OPTIONS = [
  { id: 'staff', label: 'Staff only', min: 1, max: 11 },
  { id: 'ledger', label: '1 ledger line', min: 0, max: 12 },
  { id: 'ledger2', label: '2 ledger lines', min: -2, max: 14 },
];

// Treble C4–A5: what the game drilled before settings existed.
export const DEFAULT_SETTINGS = Object.freeze({ clef: 'treble', range: 'ledger' });

/**
 * Coerce anything (e.g. parsed localStorage) into valid settings; invalid or
 * missing fields come from `fallback`.
 */
export function normalizeSettings(raw, fallback = DEFAULT_SETTINGS) {
  const s = raw && typeof raw === 'object' ? raw : {};
  return {
    clef: CLEF_OPTIONS.some((o) => o.id === s.clef) ? s.clef : fallback.clef,
    range: RANGE_OPTIONS.some((o) => o.id === s.range) ? s.range : fallback.range,
  };
}

/** The note at a staff level for a clef. Works for any integer level. */
export function noteAt(clef, level) {
  const step = LEVEL_ZERO[clef] + level;
  const octave = Math.floor(step / 7);
  const key = LETTERS[step - octave * 7];
  return { key, octave, clef, level, midi: 12 * (octave + 1) + SEMITONES[key] };
}

/** 'E4' */
export const noteName = (note) => `${note.key}${note.octave}`;

/** 'treble:E4': stable across sessions, used for stats. */
export const noteId = (note) => `${note.clef}:${noteName(note)}`;

export const sameNote = (a, b) => !!a && !!b && a.clef === b.clef && a.level === b.level;

/** Every note the settings drill, treble first, low to high. */
export function notesInRange(settings) {
  const { clef, range } = normalizeSettings(settings);
  const { min, max } = RANGE_OPTIONS.find((o) => o.id === range);
  const notes = [];
  for (const c of CLEF_OPTIONS.find((o) => o.id === clef).clefs) {
    for (let level = min; level <= max; level++) notes.push(noteAt(c, level));
  }
  return notes;
}

export const MAX_COPIES = 3;

/**
 * One shuffled bag: every note at least once (the floor), plus extra copies
 * for notes weighted above 1. A weight of 1.4 means one copy plus a 40% chance
 * of a second. Copies of the same note are spread across the bag rather than
 * clumped. Draw from the end.
 */
export function fillBag(notes, weightOf = () => 1, random = Math.random) {
  const entries = [];
  for (const note of notes) {
    const raw = Number(weightOf(note));
    const weight = Number.isFinite(raw) ? Math.min(MAX_COPIES, Math.max(1, raw)) : 1;
    let copies = Math.floor(weight);
    if (random() < weight - copies) copies += 1;
    // Stratified sort keys: copy k lands in the k-th slice of the bag.
    for (let k = 0; k < copies; k++) entries.push([(k + random()) / copies, note]);
  }
  entries.sort((a, b) => a[0] - b[0]);
  return entries.map((entry) => entry[1]);
}

// After a miss, the note comes back as the 4th–7th draw from then on.
const REQUEUE_MIN = 4;
const REQUEUE_MAX = 7;

/**
 * A shuffle-bag deck that never draws the same note twice in a row.
 *
 *   const deck = createDeck();
 *   deck.draw(notes, weightOf) // a fresh note object each call
 *
 * `notes` is the current range; when it changes the bag starts over.
 * `weightOf(note)` returns how many copies the note gets per bag (1–3,
 * fractions allowed); every note in range always gets at least one, so each
 * bag covers the whole range.
 */
export function createDeck({ random = Math.random } = {}) {
  let bag = [];
  let range = [];
  let rangeKey = '';
  let weightOf = null;
  let last = null;
  // Notes requeue() gave an extra copy in this bag; they get one fewer in the next.
  let extra = new Set();

  function refill() {
    const owed = extra;
    extra = new Set();
    const weight = (note) => (weightOf ? weightOf(note) : 1) - (owed.has(noteId(note)) ? 1 : 0);
    bag = fillBag(range, weight, random);
  }

  return {
    draw(notes, weights) {
      if (!notes.length) return null;
      const key = notes.map(noteId).join(' ');
      if (key !== rangeKey) {
        rangeKey = key;
        bag = [];
        extra = new Set();
      }
      range = notes;
      weightOf = weights;
      for (let attempt = 0; attempt < 2; attempt++) {
        if (bag.length === 0) refill();
        // Take the next note, skipping a repeat of the one just shown.
        for (let i = bag.length - 1; i >= 0; i--) {
          if (!sameNote(bag[i], last)) {
            last = bag.splice(i, 1)[0];
            return { ...last };
          }
        }
        // Only extra copies of the note just shown are left; drop them.
        bag = [];
      }
      // A one-note range can only repeat.
      last = notes[0];
      return { ...last };
    },

    /**
     * Bring a missed note back soon, as the 4th–7th draw from now: move its
     * next copy in the bag forward or, if it has none left, add one (at most
     * once per bag) and take it out of the note's next bag. Either way the
     * note keeps about the share of draws its weight gives it.
     */
    requeue(note) {
      const entry = note && range.find((n) => sameNote(n, note));
      if (!entry) return;
      if (bag.length === 0) refill();
      let i = bag.length - 1;
      while (i >= 0 && !sameNote(bag[i], entry)) i--;
      if (i >= 0 && bag.length - i <= REQUEUE_MAX) return; // already due soon
      if (i >= 0) {
        bag.splice(i, 1);
      } else {
        if (extra.has(noteId(entry))) return; // reviewed once this bag already
        extra.add(noteId(entry));
      }
      const due = REQUEUE_MIN + Math.floor(random() * (REQUEUE_MAX - REQUEUE_MIN + 1));
      bag.splice(Math.max(0, bag.length - due + 1), 0, entry);
    },

    /** Forget the current bag (the next draw still won't repeat the last note). */
    reset() {
      bag = [];
      range = [];
      rangeKey = '';
      extra = new Set();
    },

    /** Upcoming draws, next first. For tests and debugging. */
    peek() {
      return bag.slice().reverse();
    },
  };
}
