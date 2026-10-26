// Practice state on the client: settings and per-note stats (kept in
// localStorage), the adaptive deck, and hooks to read them from React.
//
//   drawNote()                  the next note for the current settings
//   recordResult(note, correct) call on every guess with the note object that
//                               drawNote() returned; only the first guess at
//                               each drawn note is recorded
//   setSettings(patch)          returns true if anything changed (then draw a
//                               new note to apply it)
//   usePracticeSettings(), usePracticeStats(), resetStats()
//   pauseTiming(why) / resumeTiming(why)
//                               while the player is busy elsewhere (e.g. in the
//                               settings), answers aren't timed
//
// Nothing touches localStorage until first use, so this is safe to import
// during server rendering.

import { useSyncExternalStore } from 'react';
import { createDeck, DEFAULT_SETTINGS, normalizeSettings, noteId, notesInRange } from './deck';
import { EMPTY_STATS, recordAnswer, sanitizeStats, weightsFor } from './stats';

export const SETTINGS_KEY = 'piano-game:settings';
export const STATS_KEY = 'piano-game:stats';

function browserStorage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null; // storage blocked
  }
}

const clock = () => (typeof performance === 'undefined' ? Date.now() : performance.now());

export function createPracticeStore({ storage = browserStorage, now = clock, random = Math.random } = {}) {
  let settings = null; // null until loaded
  let stats = EMPTY_STATS;
  let current = null; // the note on screen
  const deck = createDeck({ random });
  const listeners = new Set();
  const shownAt = new WeakMap(); // note → when timing started
  const answered = new WeakSet(); // notes whose first guess is recorded
  const pauses = new Set();

  function read(key) {
    try {
      const raw = storage()?.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function write(key, value) {
    try {
      const s = storage();
      if (value == null) s?.removeItem(key);
      else s?.setItem(key, JSON.stringify(value));
    } catch {
      // Full or blocked storage: keep going in memory.
    }
  }

  function load() {
    const next = normalizeSettings(read(SETTINGS_KEY));
    if (!settings || next.clef !== settings.clef || next.range !== settings.range) settings = next;
    stats = sanitizeStats(read(STATS_KEY));
  }

  function ensureLoaded() {
    if (settings) return;
    load();
    if (typeof window === 'undefined') return;
    // Another tab changed settings or stats: pick them up so we don't overwrite them.
    window.addEventListener('storage', (e) => {
      if (e.key !== null && e.key !== SETTINGS_KEY && e.key !== STATS_KEY) return;
      load();
      emit();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') pauseTiming('hidden');
      else resumeTiming('hidden');
    });
  }

  function emit() {
    for (const listener of listeners) listener();
  }

  function startTiming(note) {
    if (note && !pauses.size && !answered.has(note)) shownAt.set(note, now());
  }

  function pauseTiming(reason) {
    pauses.add(reason);
    if (current) shownAt.delete(current);
  }

  function resumeTiming(reason) {
    pauses.delete(reason);
    startTiming(current);
  }

  function drawNote() {
    ensureLoaded();
    const notes = notesInRange(settings);
    const weights = weightsFor(notes, stats);
    current = deck.draw(notes, (note) => weights.get(noteId(note)));
    startTiming(current);
    return current;
  }

  function recordResult(note, correct) {
    if (!note || typeof note !== 'object' || !note.clef || answered.has(note)) return;
    answered.add(note);
    ensureLoaded();
    const start = shownAt.get(note);
    stats = recordAnswer(stats, noteId(note), !!correct, start == null ? null : now() - start);
    write(STATS_KEY, stats);
    if (!correct) deck.requeue(note);
    emit();
  }

  function getSettings() {
    ensureLoaded();
    return settings;
  }

  function setSettings(patch) {
    ensureLoaded();
    const next = normalizeSettings(patch, settings);
    if (next.clef === settings.clef && next.range === settings.range) return false;
    settings = next;
    write(SETTINGS_KEY, settings);
    emit();
    return true;
  }

  function getStats() {
    ensureLoaded();
    return stats;
  }

  function resetStats() {
    ensureLoaded();
    stats = EMPTY_STATS;
    write(STATS_KEY, null);
    emit();
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    drawNote,
    recordResult,
    getSettings,
    setSettings,
    getStats,
    resetStats,
    subscribe,
    pauseTiming,
    resumeTiming,
  };
}

const store = createPracticeStore();

export const {
  drawNote,
  recordResult,
  getSettings,
  setSettings,
  getStats,
  resetStats,
  subscribe,
  pauseTiming,
  resumeTiming,
} = store;

const serverSettings = () => DEFAULT_SETTINGS;
const serverStats = () => EMPTY_STATS;

export function usePracticeSettings() {
  return useSyncExternalStore(subscribe, getSettings, serverSettings);
}

export function usePracticeStats() {
  return useSyncExternalStore(subscribe, getStats, serverStats);
}
