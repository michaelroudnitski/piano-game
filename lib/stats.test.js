import { describe, expect, test } from 'bun:test';
import { notesInRange, noteId, DEFAULT_SETTINGS } from './deck';
import {
  accuracy,
  EMPTY_STATS,
  HISTORY,
  MAX_WEIGHT,
  missRate,
  recordAnswer,
  sanitizeStats,
  TIMES,
  typicalTime,
  weightsFor,
} from './stats';

const ID = 'treble:E4';
// Results: 0 = missed, 1 = right, a larger number = right after that many ms.
const play = (results, stats = EMPTY_STATS, id = ID) =>
  results.reduce((s, r) => recordAnswer(s, id, r >= 1, r > 1 ? r : null), stats);

describe('recordAnswer', () => {
  test('counts first tries and keeps a short recent history', () => {
    const stats = play([1, 0, 1, 1]);
    expect(stats.notes[ID]).toEqual({ n: 4, c: 3, h: '1011', ts: [] });
  });

  test(`keeps only the last ${HISTORY} results`, () => {
    const stats = play([0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(stats.notes[ID].h).toBe('1111111111');
    expect(stats.notes[ID].n).toBe(13);
    expect(stats.notes[ID].c).toBe(10);
  });

  test(`records the response time of right answers, keeping the last ${TIMES}`, () => {
    let stats = EMPTY_STATS;
    for (const ms of [900, 1000, 1100, 1200, 1300, 1400]) stats = recordAnswer(stats, ID, true, ms);
    expect(stats.notes[ID].ts).toEqual([1000, 1100, 1200, 1300, 1400]);
  });

  test('ignores times from misses, stray keys and long breaks', () => {
    let stats = recordAnswer(EMPTY_STATS, ID, false, 1500);
    stats = recordAnswer(stats, ID, true, 40);
    stats = recordAnswer(stats, ID, true, 60000);
    stats = recordAnswer(stats, ID, true, null);
    stats = recordAnswer(stats, ID, true, 1234.6);
    expect(stats.notes[ID].ts).toEqual([1235]);
  });

  test('does not modify the stats it was given', () => {
    const before = play([1, 0]);
    const copy = JSON.parse(JSON.stringify(before));
    recordAnswer(before, ID, true, 1000);
    recordAnswer(before, 'bass:C3', false, null);
    expect(before).toEqual(copy);
    expect(EMPTY_STATS.notes).toEqual({});
  });
});

describe('accuracy and timing', () => {
  test('is null for a note never tried', () => {
    expect(accuracy(undefined)).toBe(null);
    expect(typicalTime(undefined)).toBe(null);
  });

  test('is measured over the recent history', () => {
    expect(accuracy(play([0, 1, 1, 1]).notes[ID])).toEqual({ correct: 3, tries: 4, ratio: 0.75 });
  });

  test('typical time is the median, so one slow answer barely moves it', () => {
    const stats = play([1000, 1100, 9000, 1200, 1050]);
    expect(typicalTime(stats.notes[ID])).toBe(1100);
  });

  test('miss rate is smoothed toward 15% when there is little data', () => {
    expect(missRate(undefined)).toBeCloseTo(0.15);
    expect(missRate(play([0]).notes[ID])).toBeCloseTo(1.3 / 3);
    expect(missRate(play([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]).notes[ID])).toBeCloseTo(0.3 / 12);
  });
});

describe('weightsFor', () => {
  const notes = notesInRange(DEFAULT_SETTINGS);
  const ids = notes.map(noteId);
  const statsWith = (perNote) => {
    let stats = EMPTY_STATS;
    for (const [id, results] of Object.entries(perNote)) stats = play(results, stats, id);
    return stats;
  };
  const everyNote = (results) => statsWith(Object.fromEntries(ids.map((id) => [id, results])));

  test('a new player gets a plain shuffle', () => {
    const weights = weightsFor(notes, EMPTY_STATS);
    expect([...weights.keys()]).toEqual(ids);
    expect([...weights.values()].every((w) => w === 1)).toBe(true);
  });

  test('notes that are all equally strong (or weak) stay even', () => {
    for (const results of [[1, 1, 1, 1], [0, 1, 0, 1]]) {
      expect([...weightsFor(notes, everyNote(results)).values()].every((w) => Math.abs(w - 1) < 1e-9)).toBe(true);
    }
  });

  test('missed notes get more weight, gently, and never below 1', () => {
    const solid = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const stats = statsWith({
      ...Object.fromEntries(ids.map((id) => [id, solid])),
      'treble:F5': [1, 0, 1, 1, 0, 1, 1, 1, 0, 1], // 70%
      'treble:A5': [0, 1, 0, 1, 0, 1, 0, 1, 0, 1], // 50%
      'treble:C4': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 0%
    });
    const w = weightsFor(notes, stats);
    expect(w.get('treble:E4')).toBeCloseTo(1);
    expect(w.get('treble:F5')).toBeGreaterThan(1.4);
    expect(w.get('treble:F5')).toBeLessThan(w.get('treble:A5'));
    expect(w.get('treble:A5')).toBeCloseTo(2, 0); // about one extra copy per bag
    expect(w.get('treble:C4')).toBe(MAX_WEIGHT);
    expect(Math.min(...w.values())).toBeGreaterThanOrEqual(1);
  });

  test('untried notes get a little extra exposure next to well-known ones', () => {
    const solid = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const stats = statsWith(Object.fromEntries(ids.filter((id) => id !== 'treble:A5').map((id) => [id, solid])));
    const w = weightsFor(notes, stats).get('treble:A5');
    expect(w).toBeGreaterThan(1.2);
    expect(w).toBeLessThan(1.5);
  });

  test('slow notes get a small boost once there is timing to compare', () => {
    const fast = [1000, 1100, 1000, 900, 1000];
    const timed = Object.fromEntries(ids.map((id) => [id, fast]));
    const w = weightsFor(notes, statsWith({ ...timed, 'treble:G5': [2400, 2600, 2500, 2300, 2500] }));
    expect(w.get('treble:G5')).toBeCloseTo(1.5); // 2.5× the usual time: capped at +0.5
    expect(w.get('treble:E4')).toBeCloseTo(1);

    // Too few timed notes to know what "usual" is: no time-based boost.
    const sparse = weightsFor(notes, statsWith({ 'treble:E4': fast, 'treble:G5': [2400, 2600, 2500, 2300, 2500] }));
    expect(sparse.get('treble:G5')).toBeCloseTo(sparse.get('treble:E4'));
  });
});

describe('sanitizeStats', () => {
  test('falls back to empty stats for anything unusable', () => {
    for (const raw of [null, 'x', 42, [], {}, { v: 2, notes: {} }, { v: 1 }, { v: 1, notes: 'x' }]) {
      expect(sanitizeStats(raw)).toEqual(EMPTY_STATS);
    }
  });

  test('keeps good entries and repairs or drops bad ones', () => {
    const clean = sanitizeStats({
      v: 1,
      notes: {
        'treble:E4': { n: 12, c: 9, h: '1101111011', ts: [1200, 1300] },
        'bass:C3': { h: '10x1', ts: [5, 'slow', 1500] },
        'bass:C4': { n: -1, c: 99, h: '111111111111111', ts: 'nope' },
        'alto:C4': { n: 1, c: 1, h: '1', ts: [] },
        'treble:H2': { n: 1, c: 1, h: '1', ts: [] },
        'treble:D4': null,
      },
    });
    expect(clean).toEqual({
      v: 1,
      notes: {
        'treble:E4': { n: 12, c: 9, h: '1101111011', ts: [1200, 1300] },
        'bass:C3': { n: 3, c: 2, h: '101', ts: [1500] },
        'bass:C4': { n: 10, c: 10, h: '1111111111', ts: [] },
      },
    });
  });

  test('round-trips through JSON', () => {
    const stats = play([1, 0, 1500, 1]);
    expect(sanitizeStats(JSON.parse(JSON.stringify(stats)))).toEqual(stats);
  });
});
