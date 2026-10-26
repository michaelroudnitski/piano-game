// Per-note practice stats and the adaptive deck weights derived from them.
// Pure; lib/practice.js keeps them in localStorage.
//
// stats = { v: 1, notes: { 'treble:E4': { n, c, h, ts }, ... } }
//   n   first-try answers, ever
//   c   ...of which were right
//   h   the last HISTORY first tries, oldest first: '1' right, '0' missed
//   ts  the last TIMES response times (ms) of right first tries
//
// Only the first guess at each note counts: after a miss the player keeps
// guessing until they find it, and those guesses say little.

import { noteId } from './deck';

export const HISTORY = 10;
export const TIMES = 5;
export const EMPTY_STATS = Object.freeze({ v: 1, notes: Object.freeze({}) });

const MIN_MS = 150; // quicker than this was a stray key, not a read
const MAX_MS = 20000; // slower than this, the player probably looked away

const isTime = (ms) => Number.isFinite(ms) && ms >= MIN_MS && ms <= MAX_MS;
const countHits = (h) => h.split('').filter((r) => r === '1').length;

/** Record a first try at the note `id`. Returns new stats; `stats` is untouched. */
export function recordAnswer(stats, id, correct, ms) {
  const prev = stats.notes[id] || { n: 0, c: 0, h: '', ts: [] };
  const next = {
    n: prev.n + 1,
    c: prev.c + (correct ? 1 : 0),
    h: (prev.h + (correct ? '1' : '0')).slice(-HISTORY),
    ts: correct && isTime(ms) ? [...prev.ts, Math.round(ms)].slice(-TIMES) : prev.ts,
  };
  return { ...stats, notes: { ...stats.notes, [id]: next } };
}

/** Recent accuracy, e.g. { correct: 8, tries: 10, ratio: 0.8 }; null if unpractised. */
export function accuracy(stat) {
  if (!stat || !stat.h) return null;
  const correct = countHits(stat.h);
  return { correct, tries: stat.h.length, ratio: correct / stat.h.length };
}

/** Median of the recent response times (robust to the odd distracted answer). */
export function typicalTime(stat) {
  return stat && stat.ts.length ? median(stat.ts) : null;
}

// ---- Adaptive weights ------------------------------------------------------
//
// Each note's weight is how many copies it gets in the next shuffle bag. Every
// note keeps at least one, so the whole range is still covered each round;
// weaker notes just come up a little more often. Weights are relative: if all
// notes are equally strong (or unpractised) the bag is a plain shuffle.

// Smoothing: every note starts as if it had 2 tries with 0.3 misses (15%), so
// one unlucky miss doesn't make a note look hopeless.
const PRIOR_TRIES = 2;
const PRIOR_MISSES = 0.3;
// A note missed half the time gets about one extra copy per bag...
const MISS_GAIN = 2.5;
// ...and one taking twice your usual time to name gets half an extra copy.
const SLOW_GAIN = 0.5;
// Even a note you always miss comes up at most 2.25× as often as the rest.
export const MAX_WEIGHT = 2.25;

/** Smoothed recent miss rate, 0–1. */
export function missRate(stat) {
  const acc = accuracy(stat);
  const tries = acc ? acc.tries : 0;
  const misses = acc ? tries - acc.correct : 0;
  return (misses + PRIOR_MISSES) / (tries + PRIOR_TRIES);
}

/** Map of noteId → weight (1..MAX_WEIGHT) for the notes in range. */
export function weightsFor(notes, stats) {
  const rows = notes.map((note) => {
    const stat = stats.notes[noteId(note)];
    return { id: noteId(note), miss: missRate(stat), time: typicalTime(stat) };
  });
  const times = rows.map((r) => r.time).filter((t) => t != null);
  const usual = times.length >= 3 ? median(times) : null;
  const scores = rows.map(({ miss, time }) => {
    const slow = usual && time != null ? clamp(time / usual - 1, 0, 1) : 0;
    return MISS_GAIN * miss + SLOW_GAIN * slow;
  });
  const floor = Math.min(...scores);
  return new Map(rows.map((r, i) => [r.id, Math.min(MAX_WEIGHT, 1 + scores[i] - floor)]));
}

/** Coerce anything (e.g. parsed localStorage) into valid stats. */
export function sanitizeStats(raw) {
  if (!raw || raw.v !== 1 || !raw.notes || typeof raw.notes !== 'object') return EMPTY_STATS;
  const notes = {};
  for (const [id, s] of Object.entries(raw.notes)) {
    if (!/^(treble|bass):[A-G]-?\d+$/.test(id) || !s || typeof s !== 'object') continue;
    const h = typeof s.h === 'string' ? s.h.replace(/[^01]/g, '').slice(-HISTORY) : '';
    const ts = Array.isArray(s.ts) ? s.ts.filter(isTime).slice(-TIMES) : [];
    const n = Number.isInteger(s.n) && s.n >= h.length ? s.n : h.length;
    const c = Number.isInteger(s.c) && s.c >= 0 && s.c <= n ? s.c : countHits(h);
    notes[id] = { n, c, h, ts };
  }
  return { v: 1, notes };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}
