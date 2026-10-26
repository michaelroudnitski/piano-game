import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';

import { LETTERS, answerFromKeyDown, keyLetter } from '../lib/guess-loop';
import { BUMP, POP_IN, SHAKE, animate } from '../lib/motion';
import { CheckIcon, CrossIcon } from './feedback-icons';

const BLACK_KEYS = [
  { note: 'C#', left: 'left-[calc(100%/7*1-1rem)]' },
  { note: 'D#', left: 'left-[calc(100%/7*2-1rem)]' },
  { note: 'F#', left: 'left-[calc(100%/7*4-1rem)]' },
  { note: 'G#', left: 'left-[calc(100%/7*5-1rem)]' },
  { note: 'A#', left: 'left-[calc(100%/7*6-1rem)]' },
];

// A tap or keystroke can be shorter than a frame; keep the key down long enough to see.
const MIN_PRESS_MS = 90;

const FACE = {
  idle: 'bg-gray-50 dark:bg-zinc-300',
  down: 'bg-gray-200 dark:bg-zinc-400',
  correct: 'bg-green-200 dark:bg-green-300',
  wrong: 'bg-red-100 dark:bg-red-300',
  answer: 'bg-sky-100 dark:bg-sky-200 ring-4 ring-inset ring-sky-500',
};

const ICON = {
  correct: <CheckIcon className="h-full w-full text-green-700 dark:text-green-800" />,
  wrong: <CrossIcon className="h-full w-full text-red-600 dark:text-red-800" />,
};

// Only where a pointer can really hover: on touch screens :hover sticks to the last key tapped.
const HOVER_FACE = 'hover:bg-gray-100 dark:hover:bg-zinc-200';
const HOVER_QUERY = '(hover: hover)';
const canHover = () => window.matchMedia(HOVER_QUERY).matches;
function subscribeHover(onChange) {
  const query = window.matchMedia(HOVER_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const LABEL_SUFFIX = { wrong: ', wrong', answer: ', the answer' };

const GLOW = {
  keyframes: [
    { boxShadow: 'inset 0 0 0 0 rgb(22 163 74 / 0)' },
    { boxShadow: 'inset 0 0 0 6px rgb(22 163 74 / 0.45)', offset: 0.35 },
    { boxShadow: 'inset 0 0 0 0 rgb(22 163 74 / 0)' },
  ],
  options: { duration: 380, easing: 'ease-out' },
};

/**
 * One octave of keys. White keys answer through `onKeyPress(letter)`: on
 * pointerdown for mouse and touch, on click for Enter/Space and assistive tech.
 * Black keys are only scenery, but they still catch taps so a near miss doesn't
 * land on the white key underneath.
 *
 * `marks` tints keys ({ [letter]: 'correct' | 'wrong' | 'answer' }) and
 * `feedback` ({ id, outcome, guess, answer }) animates the latest answer.
 */
export default function Piano({ onKeyPress, marks = {}, feedback }) {
  const [down, setDown] = useState(() => new Set());
  const hoverable = useSyncExternalStore(subscribeHover, canHover, () => false);
  const keyEls = useRef({});
  const pressedAt = useRef({});
  const releaseTimers = useRef({});
  const answeredOnPointerDown = useRef(new Set());

  const press = useCallback((key) => {
    clearTimeout(releaseTimers.current[key]);
    pressedAt.current[key] = performance.now();
    setDown((keys) => (keys.has(key) ? keys : new Set(keys).add(key)));
  }, []);

  const release = useCallback((key) => {
    const lift = () =>
      setDown((keys) => {
        if (!keys.has(key)) return keys;
        const next = new Set(keys);
        next.delete(key);
        return next;
      });
    clearTimeout(releaseTimers.current[key]);
    const wait = MIN_PRESS_MS - (performance.now() - (pressedAt.current[key] ?? 0));
    if (wait > 0) releaseTimers.current[key] = setTimeout(lift, wait);
    else lift();
  }, []);

  // Typing a letter presses its key on screen, too.
  useEffect(() => {
    const onKeyDown = (e) => {
      const letter = answerFromKeyDown(e);
      if (letter) press(letter);
    };
    const onKeyUp = (e) => {
      const letter = keyLetter(e);
      if (letter) release(letter);
    };
    const releaseAll = () => setDown(new Set());
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', releaseAll);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', releaseAll);
    };
  }, [press, release]);

  useEffect(() => {
    const timers = releaseTimers.current;
    return () => Object.values(timers).forEach(clearTimeout);
  }, []);

  // A pop and a glow for a right key, a shake for a wrong one.
  useLayoutEffect(() => {
    if (!feedback) return;
    const { outcome, guess, answer } = feedback;
    const key = keyEls.current[guess];
    const icon = key?.querySelector('[data-icon]');
    if (outcome === 'correct') {
      animate(icon, POP_IN.keyframes, POP_IN.options);
      animate(key, GLOW.keyframes, GLOW.options);
    }
    if (outcome === 'wrong' || outcome === 'reveal') animate(icon, POP_IN.keyframes, POP_IN.options);
    if (['wrong', 'reveal', 'retry', 'nudge'].includes(outcome)) animate(key, SHAKE.keyframes, SHAKE.options);
    if (outcome === 'reveal' || outcome === 'nudge') {
      animate(keyEls.current[answer]?.querySelector('kbd'), BUMP.keyframes, BUMP.options);
    }
  }, [feedback]);

  return (
    <div
      role="group"
      aria-label="Piano keys"
      className="relative select-none touch-manipulation [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]"
      style={{ width: '100%', height: 'var(--piano-height, min(180px, 45vw))' }}
    >
      {/* White keys */}
      <div className="flex h-full gap-[2px]">
        {LETTERS.map((letter) => {
          const mark = marks[letter];
          const isDown = down.has(letter);
          const face = mark ?? (isDown ? 'down' : 'idle');
          return (
            <button
              key={letter}
              ref={(el) => {
                keyEls.current[letter] = el;
              }}
              type="button"
              aria-label={letter + (LABEL_SUFFIX[mark] ?? '')}
              aria-keyshortcuts={letter}
              onPointerDown={(e) => {
                if (e.button !== 0) return; // primary button, touch or pen contact only
                answeredOnPointerDown.current.add(letter);
                press(letter);
                onKeyPress?.(letter);
              }}
              onPointerUp={() => release(letter)}
              onPointerLeave={() => release(letter)}
              onPointerCancel={() => release(letter)}
              // Don't take focus on click or tap, so a later Space or Enter can't fire this key again.
              onMouseDown={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                if (e.repeat) e.preventDefault(); // a held Enter would otherwise answer over and over
                else press(letter);
              }}
              onKeyUp={(e) => {
                if (e.key === 'Enter' || e.key === ' ') release(letter);
              }}
              onClick={(e) => {
                // Pointer presses already answered on pointerdown. Keyboard and assistive-tech
                // activations arrive only as a click (detail 0, or no pointerdown before it).
                if (answeredOnPointerDown.current.delete(letter) && e.detail !== 0) return;
                if (!isDown) {
                  press(letter);
                  release(letter);
                }
                onKeyPress?.(letter);
              }}
              className={`relative flex flex-1 cursor-pointer touch-manipulation flex-col items-center justify-end gap-1 border border-gray-200 pb-2 outline-none transition-[background-color,box-shadow,transform] duration-100 first:rounded-bl-xl last:rounded-br-xl focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[-8px] focus-visible:outline-gray-900 dark:border-zinc-500 sm:pb-3 ${FACE[face]} ${face === 'idle' && hoverable ? HOVER_FACE : ''} ${isDown ? 'shadow-inner motion-safe:translate-y-[2px]' : ''}`}
            >
              {mark === 'answer' && (
                <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] bg-sky-400/30 motion-safe:animate-pulse" />
              )}
              <span data-icon aria-hidden="true" className="relative h-4 w-4">
                {ICON[mark]}
              </span>
              <kbd
                className={`relative rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold shadow-sm ${
                  mark === 'answer'
                    ? 'border-sky-700 bg-sky-600 text-white'
                    : 'border-gray-300 bg-gray-200 text-gray-500 dark:border-zinc-600 dark:bg-zinc-500 dark:text-zinc-300'
                }`}
              >
                {letter}
              </kbd>
            </button>
          );
        })}
      </div>

      {/* Black keys: not answers, but they catch their own taps */}
      {BLACK_KEYS.map(({ note, left }) => (
        <div
          key={note}
          aria-hidden="true"
          onPointerDown={(e) => e.button === 0 && press(note)}
          onPointerUp={() => release(note)}
          onPointerLeave={() => release(note)}
          onPointerCancel={() => release(note)}
          onMouseDown={(e) => e.preventDefault()}
          className={`absolute top-0 ${left} z-10 h-[60%] w-8 rounded-b-md border border-gray-700 transition-[background-color,transform] duration-100 dark:border-zinc-700 ${
            down.has(note) ? 'bg-gray-600 dark:bg-zinc-700 motion-safe:translate-y-px' : 'bg-gray-800 dark:bg-zinc-900'
          }`}
        />
      ))}
    </div>
  );
}
