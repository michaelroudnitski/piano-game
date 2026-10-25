import { useLayoutEffect, useRef } from 'react';

import { POP_IN, animate } from '../lib/motion';
import { CheckIcon, CrossIcon } from './feedback-icons';

// The staff draws its note and clef in currentColor.
const TONE = {
  idle: 'text-black dark:text-slate-100',
  correct: 'text-green-600 dark:text-green-400',
  wrong: 'text-red-600 dark:text-red-400',
  answer: 'text-sky-600 dark:text-sky-400',
};

/**
 * Wraps the staff with answer feedback: tints the note, and puts a badge beside
 * it, a check, a cross, or the revealed answer's letter.
 */
export default function StaffFeedback({ tone = 'idle', answer, children }) {
  return (
    <div className={`relative ${TONE[tone]}`}>
      {children}
      <Badge key={tone} tone={tone} answer={answer} />
    </div>
  );
}

function Badge({ tone, answer }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    animate(ref.current, POP_IN.keyframes, POP_IN.options);
  }, []);

  if (tone === 'idle') return null;

  const place = 'pointer-events-none absolute left-[calc(50%+2.25rem)] top-1/2 -translate-y-1/2';
  if (tone === 'answer') {
    return (
      <span aria-hidden="true" className={place}>
        <span ref={ref} className="flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg bg-sky-600 px-2 font-serif text-2xl font-semibold leading-none text-white shadow-sm">
          {answer}
        </span>
      </span>
    );
  }
  const correct = tone === 'correct';
  return (
    <span aria-hidden="true" className={place}>
      <span ref={ref} className={`flex h-7 w-7 items-center justify-center rounded-full text-white shadow-sm ${correct ? 'bg-green-600' : 'bg-red-600'}`}>
        {correct ? <CheckIcon className="h-4 w-4" /> : <CrossIcon className="h-4 w-4" />}
      </span>
    </span>
  );
}
