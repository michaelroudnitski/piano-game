import { describe, expect, test } from 'bun:test';
import {
  CLEF_OPTIONS,
  createDeck,
  DEFAULT_SETTINGS,
  fillBag,
  MAX_COPIES,
  normalizeSettings,
  noteAt,
  noteId,
  noteName,
  notesInRange,
  RANGE_OPTIONS,
  sameNote,
} from './deck';
import { BOTTOM_LINE_LEVEL, LEDGER_ROOM, TOP_LINE_LEVEL } from './staff-layout';

// Small seeded PRNG so the statistical tests are deterministic.
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ALL_SETTINGS = CLEF_OPTIONS.flatMap((c) => RANGE_OPTIONS.map((r) => ({ clef: c.id, range: r.id })));
const names = (notes) => notes.map(noteName);

describe('noteAt', () => {
  test('treble levels follow the Staff contract', () => {
    expect([0, 2, 6, 10, 12].map((l) => noteName(noteAt('treble', l)))).toEqual(['C4', 'E4', 'B4', 'F5', 'A5']);
  });

  test('bass levels follow the Staff contract', () => {
    expect([0, 2, 6, 10, 12].map((l) => noteName(noteAt('bass', l)))).toEqual(['E2', 'G2', 'D3', 'A3', 'C4']);
  });

  test('returns the full note shape, with scientific octaves and MIDI numbers', () => {
    expect(noteAt('treble', 0)).toEqual({ key: 'C', octave: 4, clef: 'treble', level: 0, midi: 60 });
    expect(noteAt('treble', 6)).toEqual({ key: 'B', octave: 4, clef: 'treble', level: 6, midi: 71 });
    expect(noteAt('treble', 7)).toEqual({ key: 'C', octave: 5, clef: 'treble', level: 7, midi: 72 });
    expect(noteAt('treble', 12).midi).toBe(81); // A5
    expect(noteAt('bass', 0).midi).toBe(40); // E2
    expect(noteAt('bass', 12)).toEqual({ key: 'C', octave: 4, clef: 'bass', level: 12, midi: 60 });
  });

  test('B sits between A and C of the same octave (the old B4/B5 mix-up)', () => {
    expect(noteName(noteAt('treble', 6))).toBe('B4');
    expect(noteName(noteAt('treble', 13))).toBe('B5');
    expect(noteAt('treble', 13).midi - noteAt('treble', 6).midi).toBe(12);
  });

  test('works past the current range, for when more ledger lines are drawn', () => {
    expect(noteName(noteAt('treble', -2))).toBe('A3');
    expect(noteName(noteAt('treble', 14))).toBe('C6');
    expect(noteName(noteAt('bass', -1))).toBe('D2');
    expect(noteName(noteAt('bass', 16))).toBe('G4');
  });

  test('every step up is a white-key step up', () => {
    for (const clef of ['treble', 'bass']) {
      for (let level = -8; level < 20; level++) {
        const step = noteAt(clef, level + 1).midi - noteAt(clef, level).midi;
        expect(step === 1 || step === 2).toBe(true);
      }
    }
  });
});

describe('settings and ranges', () => {
  test('the default is treble C4–A5, what the game drilled before settings', () => {
    expect(DEFAULT_SETTINGS).toEqual({ clef: 'treble', range: 'ledger' });
    expect(names(notesInRange(DEFAULT_SETTINGS))).toEqual(
      ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5'],
    );
  });

  test('"Staff only" is levels 1–11', () => {
    expect(names(notesInRange({ clef: 'treble', range: 'staff' }))).toEqual(
      ['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5'],
    );
    expect(names(notesInRange({ clef: 'bass', range: 'staff' }))).toEqual(
      ['F2', 'G2', 'A2', 'B2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3'],
    );
  });

  test('bass with ledger lines is E2–C4', () => {
    const notes = notesInRange({ clef: 'bass', range: 'ledger' });
    expect(names(notes)).toEqual(['E2', 'F2', 'G2', 'A2', 'B2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4']);
    expect(notes.every((n) => n.clef === 'bass')).toBe(true);
  });

  test('"2 ledger lines" reaches the second ledger line on either side', () => {
    expect(names(notesInRange({ clef: 'treble', range: 'ledger2' }))).toEqual(
      ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6'],
    );
    expect(names(notesInRange({ clef: 'bass', range: 'ledger2' }))).toEqual(
      ['C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4'],
    );
  });

  test('"Both" drills every treble note and every bass note', () => {
    const notes = notesInRange({ clef: 'both', range: 'ledger' });
    expect(notes).toHaveLength(26);
    expect(notes.filter((n) => n.clef === 'treble')).toEqual(notesInRange({ clef: 'treble', range: 'ledger' }));
    expect(notes.filter((n) => n.clef === 'bass')).toEqual(notesInRange({ clef: 'bass', range: 'ledger' }));
  });

  test('ranges stay within the ledger lines the staff has room for', () => {
    // The staff canvas fits LEDGER_ROOM ledger lines either side, plus the space beyond the last one.
    const lowest = BOTTOM_LINE_LEVEL - 2 * LEDGER_ROOM - 1;
    const highest = TOP_LINE_LEVEL + 2 * LEDGER_ROOM + 1;
    for (const settings of ALL_SETTINGS) {
      for (const note of notesInRange(settings)) {
        expect(note.level).toBeGreaterThanOrEqual(lowest);
        expect(note.level).toBeLessThanOrEqual(highest);
      }
    }
  });

  test('every note in a range is distinct, so none is drawn twice as often', () => {
    for (const settings of ALL_SETTINGS) {
      const ids = notesInRange(settings).map(noteId);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  test('normalizeSettings fills in or replaces anything invalid', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings('both')).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ clef: 'alto', range: 'everything' })).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ clef: 'bass' })).toEqual({ clef: 'bass', range: 'ledger' });
    expect(normalizeSettings({ clef: 'both', range: 'staff', extra: 1 })).toEqual({ clef: 'both', range: 'staff' });
  });
});

describe('fillBag', () => {
  const notes = notesInRange(DEFAULT_SETTINGS);

  test('with equal weights, a bag is a shuffle of the whole range', () => {
    const random = mulberry32(1);
    for (let i = 0; i < 50; i++) {
      const bag = fillBag(notes, () => 1, random);
      expect(names(bag).sort()).toEqual(names(notes).sort());
    }
    expect(names(fillBag(notes, () => 1, mulberry32(2)))).not.toEqual(names(notes));
  });

  test('every note gets at least one copy and at most MAX_COPIES', () => {
    const random = mulberry32(3);
    const weights = [0, -5, NaN, undefined, 1, 1.5, 2, 2.9, 3, 10, Infinity, 'x', 1.2];
    for (let i = 0; i < 50; i++) {
      const bag = fillBag(notes, (n) => weights[n.level], random);
      for (const note of notes) {
        const copies = bag.filter((b) => sameNote(b, note)).length;
        expect(copies).toBeGreaterThanOrEqual(1);
        expect(copies).toBeLessThanOrEqual(MAX_COPIES);
      }
    }
  });

  test('a fractional weight adds an extra copy that often', () => {
    const random = mulberry32(4);
    let extra = 0;
    for (let i = 0; i < 4000; i++) {
      const bag = fillBag(notes, (n) => (n.level === 3 ? 1.25 : 1), random);
      extra += bag.filter((b) => b.level === 3).length - 1;
    }
    expect(extra / 4000).toBeCloseTo(0.25, 1);
  });

  test('copies of one note are spread across the bag, not clumped', () => {
    const random = mulberry32(5);
    let distance = 0;
    let adjacent = 0;
    const bags = 2000;
    for (let i = 0; i < bags; i++) {
      const bag = fillBag(notes, (n) => (n.level === 3 ? 2 : 1), random);
      const at = bag.flatMap((b, index) => (b.level === 3 ? [index] : []));
      expect(at).toHaveLength(2);
      distance += at[1] - at[0];
      if (at[1] - at[0] === 1) adjacent++;
    }
    // In a plain shuffle of 14 the two copies would sit 5 apart on average and
    // be neighbours 1 time in 7.
    expect(distance / bags).toBeGreaterThan(6.5);
    expect(adjacent / bags).toBeLessThan(0.05);
  });
});

describe('createDeck', () => {
  test('never draws the same note twice in a row', () => {
    for (const settings of ALL_SETTINGS) {
      for (const seed of [1, 2, 3]) {
        const random = mulberry32(seed);
        const deck = createDeck({ random });
        const notes = notesInRange(settings);
        // Lopsided weights make repeats likely if the deck didn't prevent them.
        const weightOf = (n) => (n.level === 6 ? MAX_COPIES : n.level % 3 === 0 ? 2.5 : 1);
        let prev = null;
        for (let i = 0; i < 3000; i++) {
          const note = deck.draw(notes, weightOf);
          expect(sameNote(note, prev)).toBe(false);
          prev = note;
        }
      }
    }
  });

  test('with equal weights, every round of draws covers the whole range once', () => {
    const deck = createDeck({ random: mulberry32(6) });
    const notes = notesInRange({ clef: 'both', range: 'staff' });
    for (let round = 0; round < 100; round++) {
      const drawn = [];
      for (let i = 0; i < notes.length; i++) drawn.push(deck.draw(notes));
      expect(new Set(drawn.map(noteId)).size).toBe(notes.length);
    }
  });

  test('returns a fresh note object on every draw', () => {
    const deck = createDeck({ random: mulberry32(7) });
    const notes = notesInRange(DEFAULT_SETTINGS);
    const seen = new Set();
    for (let i = 0; i < 100; i++) {
      const note = deck.draw(notes);
      expect(seen.has(note)).toBe(false);
      seen.add(note);
    }
  });

  test('weaker notes come up more often, but every note keeps coming up', () => {
    const deck = createDeck({ random: mulberry32(8) });
    const notes = notesInRange(DEFAULT_SETTINGS); // 13 notes
    const weightOf = (n) => (n.level === 12 ? 2.5 : 1);
    const counts = new Map();
    const lastSeen = new Map();
    let longestGap = 0;
    const draws = 26000;
    for (let i = 0; i < draws; i++) {
      const id = noteId(deck.draw(notes, weightOf));
      counts.set(id, (counts.get(id) || 0) + 1);
      if (lastSeen.has(id)) longestGap = Math.max(longestGap, i - lastSeen.get(id));
      lastSeen.set(id, i);
    }
    const share = (id) => counts.get(id) / draws;
    // ~17% (2.5 of ~14.5 per bag), vs ~7.7% if all were even.
    expect(share('treble:A5')).toBeGreaterThan(0.155);
    expect(share('treble:A5')).toBeLessThan(0.185);
    for (const note of notes.filter((n) => n.level !== 12)) {
      expect(share(noteId(note))).toBeGreaterThan(0.062); // ~6.9% each
      expect(share(noteId(note))).toBeLessThan(0.076);
    }
    // A bag holds at most 15 notes here, so no note waits longer than two bags.
    expect(longestGap).toBeLessThanOrEqual(30);
  });

  test('a new range applies on the next draw, without repeating the note on screen', () => {
    const deck = createDeck({ random: mulberry32(9) });
    const treble = notesInRange({ clef: 'treble', range: 'ledger' });
    const both = notesInRange({ clef: 'both', range: 'ledger' });
    const bass = notesInRange({ clef: 'bass', range: 'staff' });
    for (let i = 0; i < 200; i++) {
      const a = deck.draw(treble);
      const b = deck.draw(both);
      expect(sameNote(a, b)).toBe(false);
      const c = deck.draw(bass);
      expect(c.clef).toBe('bass');
      expect(c.level).toBeGreaterThanOrEqual(1);
      expect(c.level).toBeLessThanOrEqual(11);
    }
  });

  test('a missed note comes back 4–7 draws later', () => {
    const notes = notesInRange({ clef: 'both', range: 'ledger' });
    for (let seed = 1; seed <= 300; seed++) {
      const deck = createDeck({ random: mulberry32(seed) });
      const skip = seed % 30; // miss at different points in the bag
      for (let i = 0; i < skip; i++) deck.draw(notes);
      const missed = deck.draw(notes);
      deck.requeue(missed);
      const next = Array.from({ length: 7 }, () => deck.draw(notes));
      const back = next.findIndex((n) => sameNote(n, missed)) + 1;
      expect(back).toBeGreaterThanOrEqual(2); // never straight back
      expect(back).toBeLessThanOrEqual(7);
    }
  });

  test('requeue moves a copy forward rather than piling on extra copies', () => {
    const notes = notesInRange(DEFAULT_SETTINGS);
    const deck = createDeck({ random: mulberry32(10) });
    const weightOf = (n) => (n.level === 4 ? 2 : 1);
    const missed = deck.draw(notes, weightOf);
    const count = () => deck.peek().filter((n) => sameNote(n, missed)).length;
    const before = count();
    deck.requeue(missed);
    if (before > 0) expect(count()).toBe(before);
    else expect(count()).toBe(1);
    deck.requeue(missed); // already due soon: no change
    expect(count()).toBe(Math.max(before, 1));
  });

  test('reviews after misses are borrowed from the next bag, so a weak note never snowballs', () => {
    const deck = createDeck({ random: mulberry32(12) });
    const notes = notesInRange(DEFAULT_SETTINGS); // 13 notes
    const weightOf = (n) => (n.level === 10 ? 2 : 1);
    let hits = 0;
    const draws = 28000;
    for (let i = 0; i < draws; i++) {
      const note = deck.draw(notes, weightOf);
      if (note.level === 10) {
        hits++;
        deck.requeue(note); // missed every single time
      }
    }
    // Its weight alone: 2 of 14 per bag (~14%); stacking reviews would push it past 20%.
    expect(hits / draws).toBeGreaterThan(0.125);
    expect(hits / draws).toBeLessThan(0.16);
  });

  test('requeue ignores notes outside the current range', () => {
    const deck = createDeck({ random: mulberry32(11) });
    const treble = notesInRange(DEFAULT_SETTINGS);
    deck.draw(treble);
    const before = deck.peek();
    deck.requeue(noteAt('bass', 4));
    expect(deck.peek()).toEqual(before);
  });
});
