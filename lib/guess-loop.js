// Rules for the guess/feedback loop. Pure functions only (no React, no DOM),
// so they're easy to test. The React side lives in use-guess-loop.js.

/** The seven natural note letters, in keyboard order. */
export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/** Wrong letters allowed on one note before its answer is revealed. */
export const MAX_WRONG = 2;

/** Pause after a correct answer before the next note. Pressing a key skips it. */
export const SOLVED_PAUSE_MS = 400;

/** How long the staff stays tinted after a wrong guess. */
export const WRONG_FLASH_MS = 600;

const MILESTONES = [5, 10, 25, 50, 100, 250, 500, 1000];

export const EMPTY_STATS = { correct: 0, guesses: 0, streak: 0, best: 0 };

/** A fresh round for `note`: asking, nothing tried yet. */
export function newRound(note) {
  return { note, phase: 'asking', tried: [] };
}

/**
 * Judge one press of `guess` (a letter) against the round's note.
 *
 * A round goes 'asking' → 'solved' (named it) or 'revealed' (out of tries).
 * Possible outcomes:
 *   correct   named it. Counts as a guess; the streak grows.
 *   wrong     a new wrong letter. Counts as a guess; the streak resets.
 *   reveal    a wrong letter that used the last try; the answer is shown.
 *   retry     the same wrong letter again. Not counted.
 *   continue  pressed the revealed answer to move on. Not counted.
 *   nudge     pressed another letter while the answer is revealed. Not counted.
 *   skip      pressed during the pause after a correct answer. Not counted.
 *
 * Returns { round, stats, outcome }.
 */
export function judge(round, stats, guess) {
  const answer = round.note.key;

  if (round.phase === 'solved') return { round, stats, outcome: 'skip' };
  if (round.phase === 'revealed') {
    return { round, stats, outcome: guess === answer ? 'continue' : 'nudge' };
  }

  if (guess === answer) {
    const streak = stats.streak + 1;
    return {
      round: { ...round, phase: 'solved' },
      stats: {
        correct: stats.correct + 1,
        guesses: stats.guesses + 1,
        streak,
        best: Math.max(stats.best, streak),
      },
      outcome: 'correct',
    };
  }

  if (round.tried.includes(guess)) return { round, stats, outcome: 'retry' };

  const tried = [...round.tried, guess];
  const revealed = tried.length >= MAX_WRONG;
  return {
    round: { ...round, phase: revealed ? 'revealed' : 'asking', tried },
    stats: { ...stats, guesses: stats.guesses + 1, streak: 0 },
    outcome: revealed ? 'reveal' : 'wrong',
  };
}

/** Whole-percent share of counted guesses that were right, or null before any. */
export function accuracy({ correct, guesses }) {
  return guesses > 0 ? Math.round((100 * correct) / guesses) : null;
}

/** Streak lengths worth a small celebration: 5, 10, 25, 50, 100, 250, 500, 1000, then every 500. */
export function isMilestone(streak) {
  return MILESTONES.includes(streak) || (streak > 1000 && streak % 500 === 0);
}

/**
 * The note letter a keyboard event refers to, or null. Uses the typed character,
 * and falls back to the physical key on non-Latin layouts (e.g. Cyrillic), where
 * the C key types "с".
 */
export function keyLetter(e) {
  const key = e.key ?? '';
  if (/^[a-g]$/i.test(key)) return key.toUpperCase();
  if (key.length === 1 && key > '\x7f' && /^Key[A-G]$/.test(e.code ?? '')) return e.code[3];
  return null;
}

/**
 * The letter a keydown answers with, or null if it isn't an answer: modified
 * shortcuts (Cmd+C), IME composition, already-handled events and typing into a
 * text field are ignored.
 */
export function answerFromKeyDown(e) {
  if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing || e.defaultPrevented) return null;
  if (isTextEntry(e.target)) return null;
  return keyLetter(e);
}

const NON_TEXT_INPUTS = ['button', 'checkbox', 'color', 'file', 'image', 'radio', 'range', 'reset', 'submit'];

function isTextEntry(el) {
  if (!el || typeof el !== 'object') return false;
  if (el.isContentEditable) return true;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  return el.tagName === 'INPUT' && !NON_TEXT_INPUTS.includes(el.type);
}
