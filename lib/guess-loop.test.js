import { describe, expect, test } from 'bun:test';
import {
  EMPTY_STATS,
  MAX_WRONG,
  accuracy,
  answerFromKeyDown,
  isMilestone,
  judge,
  keyLetter,
  newRound,
} from './guess-loop';

const E4 = { key: 'E', octave: 1 };

/** Play a sequence of letters against one note; returns every step. */
function play(letters, { note = E4, stats = EMPTY_STATS } = {}) {
  let round = newRound(note);
  return letters.map((letter) => {
    const step = judge(round, stats, letter);
    ({ round, stats } = step);
    return step;
  });
}

describe('judge', () => {
  test('a correct first guess solves the round and counts', () => {
    const [step] = play(['E']);
    expect(step.outcome).toBe('correct');
    expect(step.round.phase).toBe('solved');
    expect(step.stats).toEqual({ correct: 1, guesses: 1, streak: 1, best: 1 });
  });

  test('a wrong guess counts, breaks the streak and leaves one more try', () => {
    const [step] = play(['D'], { stats: { correct: 4, guesses: 4, streak: 4, best: 4 } });
    expect(step.outcome).toBe('wrong');
    expect(step.round.phase).toBe('asking');
    expect(step.round.tried).toEqual(['D']);
    expect(step.stats).toEqual({ correct: 4, guesses: 5, streak: 0, best: 4 });
  });

  test('right on the second try counts as correct and starts a new streak', () => {
    const steps = play(['D', 'E']);
    expect(steps.map((s) => s.outcome)).toEqual(['wrong', 'correct']);
    expect(steps[1].stats).toEqual({ correct: 1, guesses: 2, streak: 1, best: 1 });
  });

  test(`the answer is revealed after ${MAX_WRONG} different wrong letters`, () => {
    const steps = play(['D', 'F']);
    expect(steps.map((s) => s.outcome)).toEqual(['wrong', 'reveal']);
    expect(steps[1].round.phase).toBe('revealed');
    expect(steps[1].stats).toEqual({ correct: 0, guesses: 2, streak: 0, best: 0 });
  });

  test('repeating the same wrong letter is not counted again', () => {
    const steps = play(['D', 'D', 'D']);
    expect(steps.map((s) => s.outcome)).toEqual(['wrong', 'retry', 'retry']);
    expect(steps[2].round.phase).toBe('asking');
    expect(steps[2].stats.guesses).toBe(1);
  });

  test('a revealed note never counts as correct; only its answer moves on', () => {
    const steps = play(['D', 'F', 'G', 'E']);
    expect(steps.map((s) => s.outcome)).toEqual(['wrong', 'reveal', 'nudge', 'continue']);
    expect(steps[3].stats).toEqual({ correct: 0, guesses: 2, streak: 0, best: 0 });
  });

  test('presses during the post-correct pause are skips, not guesses', () => {
    const steps = play(['E', 'C', 'E']);
    expect(steps.map((s) => s.outcome)).toEqual(['correct', 'skip', 'skip']);
    expect(steps[2].stats).toEqual({ correct: 1, guesses: 1, streak: 1, best: 1 });
  });

  test('best streak keeps the maximum', () => {
    const stats = { correct: 9, guesses: 12, streak: 2, best: 7 };
    expect(judge(newRound(E4), stats, 'E').stats.best).toBe(7);
    expect(judge(newRound(E4), { ...stats, streak: 7 }, 'E').stats.best).toBe(8);
  });

  test('judging is pure', () => {
    const round = newRound(E4);
    const stats = { ...EMPTY_STATS };
    judge(round, stats, 'D');
    expect(round).toEqual(newRound(E4));
    expect(stats).toEqual(EMPTY_STATS);
  });
});

describe('accuracy', () => {
  test('is null before the first guess', () => {
    expect(accuracy(EMPTY_STATS)).toBeNull();
  });

  test('rounds to a whole percent', () => {
    expect(accuracy({ correct: 2, guesses: 3 })).toBe(67);
    expect(accuracy({ correct: 5, guesses: 5 })).toBe(100);
    expect(accuracy({ correct: 0, guesses: 2 })).toBe(0);
  });
});

describe('isMilestone', () => {
  test('celebrates 5, 10, 25… and every 500 past 1000', () => {
    const hits = [];
    for (let n = 1; n <= 2000; n++) if (isMilestone(n)) hits.push(n);
    expect(hits).toEqual([5, 10, 25, 50, 100, 250, 500, 1000, 1500, 2000]);
  });
});

describe('keyboard mapping', () => {
  const press = (key, extra = {}) => ({ key, code: '', target: null, ...extra });

  test('letters A–G in either case', () => {
    expect(keyLetter(press('c'))).toBe('C');
    expect(keyLetter(press('G'))).toBe('G');
    expect(keyLetter(press('h'))).toBeNull();
    expect(keyLetter(press('Enter'))).toBeNull();
    expect(keyLetter(press(' '))).toBeNull();
  });

  test('falls back to the physical key on non-Latin layouts', () => {
    expect(keyLetter(press('с', { code: 'KeyC' }))).toBe('C'); // Cyrillic es
    expect(keyLetter(press('ф', { code: 'KeyA' }))).toBe('A');
    expect(keyLetter(press('ж', { code: 'Semicolon' }))).toBeNull();
    // A Latin layout's own letters win over the physical position (AZERTY "a" sits on KeyQ).
    expect(keyLetter(press('a', { code: 'KeyQ' }))).toBe('A');
    expect(keyLetter(press('q', { code: 'KeyA' }))).toBeNull();
  });

  test('ignores shortcuts, composition, handled events and text fields', () => {
    expect(answerFromKeyDown(press('c', { metaKey: true }))).toBeNull();
    expect(answerFromKeyDown(press('c', { ctrlKey: true }))).toBeNull();
    expect(answerFromKeyDown(press('c', { altKey: true }))).toBeNull();
    expect(answerFromKeyDown(press('c', { isComposing: true }))).toBeNull();
    expect(answerFromKeyDown(press('c', { defaultPrevented: true }))).toBeNull();
    expect(answerFromKeyDown(press('c', { target: { tagName: 'INPUT', type: 'text' } }))).toBeNull();
    expect(answerFromKeyDown(press('c', { target: { tagName: 'TEXTAREA' } }))).toBeNull();
    expect(answerFromKeyDown(press('c', { target: { tagName: 'SELECT' } }))).toBeNull();
    expect(answerFromKeyDown(press('c', { target: { tagName: 'DIV', isContentEditable: true } }))).toBeNull();
  });

  test('answers from the page, buttons and non-text inputs', () => {
    expect(answerFromKeyDown(press('c', { shiftKey: true }))).toBe('C');
    expect(answerFromKeyDown(press('d', { target: { tagName: 'BODY' } }))).toBe('D');
    expect(answerFromKeyDown(press('e', { target: { tagName: 'BUTTON' } }))).toBe('E');
    expect(answerFromKeyDown(press('f', { target: { tagName: 'INPUT', type: 'checkbox' } }))).toBe('F');
  });
});
