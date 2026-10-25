import { useLayoutEffect, useRef } from 'react';

import { accuracy } from '../lib/guess-loop';
import { animate } from '../lib/motion';

const HOT_STREAK = 5;

const SWELL = {
  keyframes: [{ scale: '1' }, { scale: '1.4' }, { scale: '1' }],
  options: { duration: 420, easing: 'cubic-bezier(.2,.8,.3,1.2)' },
};

const FLOAT_UP = {
  keyframes: [
    { opacity: 0, translate: '0 6px' },
    { opacity: 1, translate: '0 0', offset: 0.12 },
    { opacity: 1, translate: '0 -6px', offset: 0.75 },
    { opacity: 0, translate: '0 -10px' },
  ],
  options: { duration: 2200, easing: 'ease-out', fill: 'forwards' },
};

/** Correct, accuracy, streak and best streak, with a small cheer at streak milestones. */
export default function Scoreboard({ stats, celebration }) {
  const percent = accuracy(stats);
  return (
    <dl className="flex divide-x divide-gray-200 dark:divide-zinc-800">
      <Stat label="Correct" value={stats.correct} />
      <Stat label="Accuracy" value={percent == null ? '–' : `${percent}%`} />
      <Stat label="Streak" value={stats.streak} hot={stats.streak >= HOT_STREAK}>
        {celebration && <Cheer key={celebration.id} celebration={celebration} />}
      </Stat>
      <Stat label="Best" value={stats.best} />
    </dl>
  );
}

function Stat({ label, value, hot = false, children }) {
  return (
    <div className="flex min-w-[3.5rem] flex-col-reverse items-center px-2.5 first:pl-0 last:pr-0 sm:px-4">
      <dt className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-zinc-500">{label}</dt>
      <dd
        className={`relative text-base font-semibold tabular-nums leading-6 ${
          hot ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-zinc-300'
        }`}
      >
        <span data-value className="inline-block">
          {value}
        </span>
        {children}
      </dd>
    </div>
  );
}

function Cheer({ celebration }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    animate(ref.current?.parentElement.querySelector('[data-value]'), SWELL.keyframes, SWELL.options);
    animate(ref.current, FLOAT_UP.keyframes, FLOAT_UP.options);
  }, []);

  const { streak, milestone, newBest } = celebration;
  const text = milestone ? `${streak} in a row${newBest ? ', new best' : ''}!` : 'New best!';
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 shadow-sm dark:bg-amber-400/20 dark:text-amber-300"
    >
      {text}
    </span>
  );
}
