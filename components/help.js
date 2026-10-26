import { useCallback, useEffect, useRef } from 'react';
import HeaderButton from './header-button';
import { hasSeenHowToPlay, markHowToPlaySeen } from '../lib/onboarding';

const NOTE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

// The header's "?" button and the "How to play" card it opens. The card also opens by itself on
// a first visit, and "?" on the keyboard reopens it at any time.
export default function Help() {
  const dialogRef = useRef(null);
  const pressStartedOnBackdrop = useRef(false);

  const open = useCallback(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const close = useCallback(() => dialogRef.current?.close(), []);

  // First visit: show the card once the page is interactive (never in the server render, so the
  // markup always hydrates cleanly). Focus the card itself rather than its button: nobody has
  // interacted yet, so a focus ring on the button would only be noise. Tab still reaches the
  // button; Escape or a click outside closes the card.
  useEffect(() => {
    if (hasSeenHowToPlay()) return;
    open();
    dialogRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== '?' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      open();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <HeaderButton label="How to play" aria-haspopup="dialog" onClick={open}>
        <QuestionIcon className="h-[22px] w-[22px]" />
      </HeaderButton>

      <dialog
        ref={dialogRef}
        tabIndex={-1}
        aria-labelledby="how-to-play-title"
        className="how-to-play m-auto w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
        onClose={() => markHowToPlaySeen()}
        // Letters typed while the card is open shouldn't count as guesses underneath it.
        onKeyDown={(e) => e.stopPropagation()}
        // Light dismiss: a click that starts and ends on the backdrop closes the card.
        onPointerDown={(e) => {
          pressStartedOnBackdrop.current = e.target === e.currentTarget;
        }}
        onClick={(e) => {
          if (pressStartedOnBackdrop.current && e.target === e.currentTarget) close();
        }}
      >
        <div className="p-6">
          <h2 id="how-to-play-title" className="text-lg font-semibold tracking-tight">
            How to play
          </h2>

          <ol className="mt-4 space-y-4 text-[15px] leading-6 text-zinc-600 dark:text-zinc-300">
            <Step number={1}>
              <strong className="font-semibold text-zinc-900 dark:text-zinc-100">Read the note</strong>{' '}
              on the staff.
            </Step>
            <Step number={2}>
              <strong className="font-semibold text-zinc-900 dark:text-zinc-100">Name it.</strong>{' '}
              Type its letter on your keyboard, or tap its key on the piano.
              <span className="mt-2.5 flex gap-1" aria-hidden="true">
                {NOTE_LETTERS.map((letter) => (
                  <kbd
                    key={letter}
                    className="grid h-7 w-7 place-items-center rounded-md border border-zinc-300 bg-zinc-100 font-mono text-xs font-semibold text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {letter}
                  </kbd>
                ))}
              </span>
            </Step>
          </ol>

          <button
            type="button"
            onClick={close}
            className="mt-6 w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white dark:focus-visible:ring-zinc-500 dark:focus-visible:ring-offset-zinc-900"
          >
            Got it
          </button>

          <p className="how-to-play-hint mt-3 text-center text-xs text-zinc-400 dark:text-zinc-500">
            Press <kbd className="font-mono font-semibold">?</kbd> anytime to see this again.
          </p>
        </div>
      </dialog>
    </>
  );
}

function Step({ number, children }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
      >
        {number}
      </span>
      <span>{children}</span>
    </li>
  );
}

function QuestionIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9.25" />
      <path d="M9.5 9.25a2.5 2.5 0 0 1 4.86.83c0 1.67-2.36 2.17-2.36 3.67" />
      <path d="M12 17h.01" strokeWidth={2.25} />
    </svg>
  );
}
