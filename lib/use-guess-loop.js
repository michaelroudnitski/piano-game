import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  EMPTY_STATS,
  LETTERS,
  SOLVED_PAUSE_MS,
  WRONG_FLASH_MS,
  answerFromKeyDown,
  isMilestone,
  judge,
  newRound,
} from './guess-loop';

const CELEBRATION_MS = 2400;

/**
 * The guess/feedback loop for the note on screen: judges answers, keeps score,
 * and calls `onNext()` when it's time for a new note. It listens for typed
 * letters itself; anything else that answers (the on-screen piano) calls `guess`.
 *
 * `onResult(event)` runs after every answer key press, with
 *   { outcome, guess, answer, note, streak, milestone?, newBest? }
 * `outcome` is one of: correct, wrong, reveal, retry, continue, nudge, skip
 * (see judge() in guess-loop.js). It's the place to hang sound effects.
 */
export default function useGuessLoop(note, onNext, { onResult } = {}) {
  const [game, setGame] = useState(() => ({ round: newRound(null), stats: EMPTY_STATS, event: null }));
  const [wrongFlash, setWrongFlash] = useState(null); // { note } while the staff shows a wrong guess
  const [celebration, setCelebration] = useState(null); // { id, streak, milestone, newBest }
  const storedBest = useSyncExternalStore(subscribeBestStreak, readBestStreak, () => 0);

  const live = useRef(game); // the current game, for event handlers that run between renders
  const latest = useRef({ note, onNext, onResult });
  const timers = useRef({});
  const seq = useRef(0);
  const recordToBeat = useRef(null); // best streak from earlier visits

  useLayoutEffect(() => {
    latest.current = { note, onNext, onResult };
  });

  useEffect(() => {
    const pending = timers.current;
    return () => Object.values(pending).forEach(clearTimeout);
  }, []);

  const commit = useCallback((next) => {
    live.current = next;
    setGame(next);
  }, []);

  const later = useCallback((name, fn, ms) => {
    clearTimeout(timers.current[name]);
    timers.current[name] = setTimeout(fn, ms);
  }, []);

  const advance = useCallback(() => {
    clearTimeout(timers.current.advance);
    setWrongFlash(null);
    commit({ ...live.current, round: newRound(null) });
    latest.current.onNext?.();
  }, [commit]);

  const guess = useCallback((input) => {
    const { note, onResult } = latest.current;
    const letter = String(input).toUpperCase();
    if (note?.key == null || !LETTERS.includes(letter)) return;

    const stored = readBestStreak();
    recordToBeat.current ??= stored;
    const prev = live.current;
    const prevStats = { ...prev.stats, best: Math.max(prev.stats.best, stored) };
    const round = prev.round.note === note ? prev.round : newRound(note);
    const { round: nextRound, stats, outcome } = judge(round, prevStats, letter);
    const event = { id: ++seq.current, outcome, guess: letter, answer: note.key, streak: stats.streak };

    if (outcome === 'correct') {
      const record = recordToBeat.current;
      if (isMilestone(stats.streak)) event.milestone = stats.streak;
      if (record >= 3 && stats.streak === record + 1 && prevStats.best === record) event.newBest = true;
      if (stats.best > stored) writeBestStreak(stats.best);
    }

    commit({ round: nextRound, stats, event });

    switch (outcome) {
      case 'correct':
        // Pause on the solved note, unless something else changed the note meanwhile.
        later('advance', () => latest.current.note === note && advance(), SOLVED_PAUSE_MS);
        break;
      case 'skip':
      case 'continue':
        advance();
        break;
      case 'wrong':
      case 'retry':
        setWrongFlash({ note });
        later('wrongFlash', () => setWrongFlash(null), WRONG_FLASH_MS);
        break;
    }

    if (event.milestone || event.newBest) {
      setCelebration({ id: event.id, streak: stats.streak, milestone: !!event.milestone, newBest: !!event.newBest });
      later('celebration', () => setCelebration(null), CELEBRATION_MS);
    } else if (stats.streak < prevStats.streak) {
      setCelebration(null); // no cheering a streak that just broke
    }

    onResult?.({ ...event, note });
  }, [advance, commit, later]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.repeat) return;
      const letter = answerFromKeyDown(e);
      if (letter) guess(letter);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [guess]);

  // What the page should show for the current note.
  const round = game.round.note === note ? game.round : newRound(note);
  const solved = round.phase === 'solved';
  const revealed = round.phase === 'revealed';
  const tone = solved ? 'correct' : revealed ? 'answer' : wrongFlash?.note === note ? 'wrong' : 'idle';

  const marks = {};
  for (const letter of round.tried) marks[letter] = 'wrong';
  if (solved) marks[note.key] = 'correct';
  if (revealed) marks[note.key] = 'answer';

  return {
    guess,
    stats: { ...game.stats, best: Math.max(game.stats.best, storedBest) },
    tone, // 'idle' | 'correct' | 'wrong' | 'answer': color and badge for the staff
    answer: revealed ? note.key : null, // the letter to show beside the staff
    marks, // { [letter]: 'correct' | 'wrong' | 'answer' } for the piano keys
    feedback: game.event, // the latest press, to animate it
    celebration,
    announcement: describe(game.event),
  };
}

/** Screen reader text for a press. */
function describe(event) {
  if (!event) return '';
  const { outcome, guess, answer } = event;
  let text;
  switch (outcome) {
    case 'correct':
      text = `Correct, ${answer}.`;
      if (event.milestone) text += ` ${event.milestone} in a row!`;
      if (event.newBest) text += ' New best streak!';
      break;
    case 'wrong':
    case 'retry':
      text = `Not ${guess}. Try again.`;
      break;
    case 'reveal':
      text = `Not ${guess}. It's ${answer}. Press ${answer} to continue.`;
      break;
    case 'nudge':
      text = `It's ${answer}. Press ${answer} to continue.`;
      break;
    default:
      return '';
  }
  // Alternate a trailing no-break space so the same message is announced again.
  return event.id % 2 ? text : `${text} `;
}

// Best streak, kept on this device.
const BEST_STREAK_KEY = 'piano-game:best-streak';
const bestStreakListeners = new Set();

function readBestStreak() {
  try {
    const n = parseInt(window.localStorage.getItem(BEST_STREAK_KEY), 10);
    return n > 0 ? n : 0;
  } catch {
    return 0; // storage blocked: the best streak only lasts the session
  }
}

function writeBestStreak(best) {
  try {
    window.localStorage.setItem(BEST_STREAK_KEY, String(best));
  } catch {
    // storage blocked or full; nothing to do
  }
  bestStreakListeners.forEach((notify) => notify());
}

function subscribeBestStreak(notify) {
  const onStorage = (e) => e.key === BEST_STREAK_KEY && notify(); // other tabs
  bestStreakListeners.add(notify);
  window.addEventListener('storage', onStorage);
  return () => {
    bestStreakListeners.delete(notify);
    window.removeEventListener('storage', onStorage);
  };
}
