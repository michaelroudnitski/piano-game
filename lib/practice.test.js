import { describe, expect, test } from 'bun:test';
import { noteId, sameNote } from './deck';
import { createPracticeStore, SETTINGS_KEY, STATS_KEY } from './practice';

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

function setup({ initial, seed = 1, storage = memoryStorage(initial) } = {}) {
  let time = 0;
  const store = createPracticeStore({ storage: () => storage, now: () => time, random: mulberry32(seed) });
  return { store, storage, advance: (ms) => (time += ms) };
}

const stored = (storage, key) => JSON.parse(storage.data.get(key));

describe('settings', () => {
  test('start as treble C4–A5', () => {
    const { store } = setup();
    expect(store.getSettings()).toEqual({ clef: 'treble', range: 'ledger' });
    for (let i = 0; i < 50; i++) {
      const note = store.drawNote();
      expect(note.clef).toBe('treble');
      expect(note.level).toBeGreaterThanOrEqual(0);
      expect(note.level).toBeLessThanOrEqual(12);
    }
  });

  test('load from storage, ignoring junk', () => {
    expect(setup({ initial: { [SETTINGS_KEY]: '{"clef":"bass","range":"staff"}' } }).store.getSettings())
      .toEqual({ clef: 'bass', range: 'staff' });
    expect(setup({ initial: { [SETTINGS_KEY]: '{"clef":"tuba"' } }).store.getSettings())
      .toEqual({ clef: 'treble', range: 'ledger' });
  });

  test('are saved, and apply to the next note drawn', () => {
    const { store, storage } = setup();
    store.drawNote();
    expect(store.setSettings({ clef: 'bass' })).toBe(true);
    expect(stored(storage, SETTINGS_KEY)).toEqual({ clef: 'bass', range: 'ledger' });
    expect(store.drawNote().clef).toBe('bass');
    expect(store.setSettings({ clef: 'bass' })).toBe(false);
    expect(store.setSettings({ clef: 'nonsense' })).toBe(false);
    expect(store.getSettings()).toEqual({ clef: 'bass', range: 'ledger' });
  });

  test('"Both" mixes clefs from note to note', () => {
    const { store } = setup();
    store.setSettings({ clef: 'both' });
    const clefs = new Set(Array.from({ length: 60 }, () => store.drawNote().clef));
    expect([...clefs].sort()).toEqual(['bass', 'treble']);
  });

  test('getSettings returns the same object until something changes', () => {
    const { store } = setup();
    const a = store.getSettings();
    store.drawNote();
    store.recordResult(store.drawNote(), true);
    expect(store.getSettings()).toBe(a);
    store.setSettings({ range: 'staff' });
    expect(store.getSettings()).not.toBe(a);
  });
});

describe('recordResult', () => {
  test('records only the first guess at each note', () => {
    const { store } = setup();
    const note = store.drawNote();
    store.recordResult(note, false);
    store.recordResult(note, false);
    store.recordResult(note, true);
    expect(store.getStats().notes[noteId(note)]).toEqual({ n: 1, c: 0, h: '0', ts: [] });
  });

  test('times right answers from when the note was drawn', () => {
    const { store, advance } = setup();
    const note = store.drawNote();
    advance(1234);
    store.recordResult(note, true);
    expect(store.getStats().notes[noteId(note)].ts).toEqual([1234]);
  });

  test('does not time answers while paused (e.g. settings open)', () => {
    const { store, advance } = setup();
    const first = store.drawNote();
    advance(500);
    store.pauseTiming('settings');
    advance(9000);
    store.resumeTiming('settings');
    advance(800);
    store.recordResult(first, true);
    expect(store.getStats().notes[noteId(first)].ts).toEqual([800]);

    // A note drawn while paused is timed from when play resumes.
    store.pauseTiming('settings');
    const second = store.drawNote();
    advance(5000);
    store.pauseTiming('hidden');
    store.resumeTiming('settings');
    advance(5000);
    store.resumeTiming('hidden');
    advance(700);
    store.recordResult(second, true);
    expect(store.getStats().notes[noteId(second)].ts).toEqual([700]);
  });

  test('saves stats, which a later visit picks up', () => {
    const { store, storage } = setup();
    const note = store.drawNote();
    store.recordResult(note, true);
    expect(stored(storage, STATS_KEY).notes[noteId(note)].h).toBe('1');
    const later = setup({ storage }).store;
    expect(later.getStats()).toEqual(store.getStats());
  });

  test('brings a missed note back a few notes later', () => {
    const { store } = setup({ seed: 3 });
    store.setSettings({ clef: 'both' });
    for (let i = 0; i < 40; i++) {
      const missed = store.drawNote();
      store.recordResult(missed, false);
      const next = Array.from({ length: 7 }, () => store.drawNote());
      next.forEach((n) => store.recordResult(n, true));
      expect(next.some((n) => sameNote(n, missed))).toBe(true);
    }
  });

  test('ignores notes it did not draw in the new shape', () => {
    const { store } = setup();
    store.recordResult({ key: 'C', octave: 1 }, true);
    store.recordResult(null, true);
    expect(store.getStats().notes).toEqual({});
  });

  test('missed notes come up more often over time', () => {
    const { store } = setup({ seed: 5 });
    const counts = new Map();
    for (let i = 0; i < 4000; i++) {
      const note = store.drawNote();
      const id = noteId(note);
      counts.set(id, (counts.get(id) || 0) + 1);
      store.recordResult(note, id !== 'treble:F5'); // this player can't read F5
    }
    const others = [...counts].filter(([id]) => id !== 'treble:F5').map(([, n]) => n);
    const average = others.reduce((a, b) => a + b, 0) / others.length;
    // More often, but within the cap (2.25×): reviews after a miss don't stack on top.
    expect(counts.get('treble:F5') / average).toBeGreaterThan(1.9);
    expect(counts.get('treble:F5') / average).toBeLessThan(2.6);
    expect(Math.min(...others)).toBeGreaterThan(average * 0.8); // the rest stay even
  });
});

describe('storage', () => {
  test('keeps working in memory when storage throws', () => {
    const broken = {
      getItem() { throw new Error('denied'); },
      setItem() { throw new Error('quota'); },
      removeItem() { throw new Error('denied'); },
    };
    const { store } = setup({ storage: broken });
    expect(store.setSettings({ clef: 'bass' })).toBe(true);
    const note = store.drawNote();
    store.recordResult(note, true);
    expect(store.getStats().notes[noteId(note)].c).toBe(1);
    store.resetStats();
    expect(store.getStats().notes).toEqual({});
  });

  test('works with no storage at all (server rendering)', () => {
    const store = createPracticeStore({ storage: () => null });
    expect(store.getSettings()).toEqual({ clef: 'treble', range: 'ledger' });
    expect(store.drawNote().clef).toBe('treble');
  });

  test('resetStats clears saved stats but not settings', () => {
    const { store, storage } = setup();
    store.setSettings({ range: 'staff' });
    store.recordResult(store.drawNote(), false);
    store.resetStats();
    expect(store.getStats().notes).toEqual({});
    expect(storage.data.has(STATS_KEY)).toBe(false);
    expect(store.getSettings().range).toBe('staff');
  });
});

test('subscribers hear about settings, results and resets', () => {
  const { store } = setup();
  let calls = 0;
  const unsubscribe = store.subscribe(() => calls++);
  store.setSettings({ clef: 'both' });
  store.recordResult(store.drawNote(), true);
  store.resetStats();
  expect(calls).toBe(3);
  unsubscribe();
  store.setSettings({ clef: 'bass' });
  expect(calls).toBe(3);
});
