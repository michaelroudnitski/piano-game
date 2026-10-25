import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { CLEF_OPTIONS, RANGE_OPTIONS, noteId, noteName, notesInRange } from '../lib/deck';
import { accuracy, typicalTime } from '../lib/stats';
import {
  pauseTiming,
  resetStats,
  resumeTiming,
  setSettings,
  usePracticeSettings,
  usePracticeStats,
} from '../lib/practice';
import styles from './practice-settings.module.css';

/**
 * Gear button opening the practice settings (clef, range) and per-note
 * progress. `onChange` runs after a setting changes: draw a new note there so
 * it applies straight away. Place the button with `className`.
 *
 * While open, the dialog is modal and keydowns don't reach the game's
 * document listener, so typed letters aren't taken as guesses.
 */
export default function PracticeSettings({ className = '', onChange }) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const buttonRef = useRef(null);
  const dialogRef = useRef(null);
  const pressedBackdrop = useRef(false);
  const usingKeyboard = useRef(false);
  const titleId = useId();

  // Where the popover goes on wider screens: just under the button.
  const measure = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setAnchor({
      top: Math.round(rect.bottom + 8),
      right: Math.max(8, Math.round(document.documentElement.clientWidth - rect.right)),
    });
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    if (!dialog.open) dialog.showModal();
    // Start on the selected clef; arrow keys move between options.
    dialog.querySelector('input:checked')?.focus();

    // Swallow keydowns before the game's document listener sees them. Native
    // behaviour (Tab, arrows, Space, Esc to close) still works.
    const swallow = (e) => {
      usingKeyboard.current = true;
      e.stopPropagation();
    };
    document.addEventListener('keydown', swallow, true);
    window.addEventListener('resize', measure);
    pauseTiming('settings'); // don't count time spent in here as reading time
    return () => {
      document.removeEventListener('keydown', swallow, true);
      window.removeEventListener('resize', measure);
      resumeTiming('settings');
    };
  }, [open, measure]);

  const close = () => dialogRef.current?.close();

  const update = (patch) => {
    if (setSettings(patch)) onChange?.();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Practice settings"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Practice settings"
        onClick={(e) => {
          usingKeyboard.current = e.detail === 0; // Enter/Space rather than a click
          measure();
          setOpen(true);
        }}
        className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-200 ${open ? 'bg-gray-100 text-gray-700 dark:bg-zinc-900 dark:text-zinc-200' : ''} ${className}`}
      >
        <GearIcon className={`h-6 w-6 motion-safe:transition-transform motion-safe:duration-300 ${open ? 'rotate-[60deg]' : ''}`} />
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className={styles.dialog}
        style={anchor ? { '--anchor-top': `${anchor.top}px`, '--anchor-right': `${anchor.right}px` } : undefined}
        onClose={() => {
          setOpen(false);
          // Keyboard users go back to the gear. After a click or tap, let go of
          // focus instead, or typing guesses would light up the gear's focus ring.
          if (usingKeyboard.current) buttonRef.current?.focus();
          else buttonRef.current?.blur();
        }}
        // A click that starts and ends outside the panel (on the backdrop) closes it.
        onPointerDown={(e) => {
          usingKeyboard.current = false;
          pressedBackdrop.current = e.target === e.currentTarget;
        }}
        onClick={(e) => {
          if (pressedBackdrop.current && e.target === e.currentTarget) close();
        }}
      >
        {open && <Panel titleId={titleId} onClose={close} onUpdate={update} />}
      </dialog>
    </>
  );
}

function Panel({ titleId, onClose, onUpdate }) {
  const settings = usePracticeSettings();
  const stats = usePracticeStats();
  const notes = notesInRange(settings);
  const clefs = CLEF_OPTIONS.find((o) => o.id === settings.clef).clefs;

  return (
    <div
      tabIndex={-1}
      className={`${styles.panel} rounded-t-2xl border-t border-gray-200 bg-white px-5 pb-6 pt-4 text-gray-900 shadow-2xl outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 sm:rounded-xl sm:border sm:px-4 sm:pb-4 sm:pt-3`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 id={titleId} className="text-base font-semibold">
          Practice
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-2 inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      <Choice legend="Clef" options={CLEF_OPTIONS} value={settings.clef} onChange={(clef) => onUpdate({ clef })} />
      <Choice legend="Range" options={RANGE_OPTIONS} value={settings.range} onChange={(range) => onUpdate({ range })} />

      <section className="mt-5">
        <div className="flex items-center justify-between">
          <h3 className={LABEL}>Accuracy</h3>
          <ResetButton empty={Object.keys(stats.notes).length === 0} />
        </div>
        {clefs.map((clef) => (
          <NoteBars
            key={clef}
            label={clefs.length > 1 ? (clef === 'bass' ? 'Bass' : 'Treble') : null}
            notes={notes.filter((note) => note.clef === clef)}
            stats={stats}
          />
        ))}
        <p className="mt-3 text-xs leading-relaxed text-gray-500 dark:text-zinc-400">
          Bars show each note&rsquo;s last 10 tries. Notes you miss come up a little more often.
        </p>
      </section>
    </div>
  );
}

const LABEL = 'text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400';

/** A segmented control built from native radios (arrow keys, form semantics). */
function Choice({ legend, options, value, onChange }) {
  const name = useId();
  return (
    <fieldset className="mt-4 first-of-type:mt-0">
      <legend className={`${LABEL} mb-1.5`}>{legend}</legend>
      <div
        className="grid gap-1 rounded-lg bg-gray-100 p-1 dark:bg-zinc-800"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((option) => (
          <label key={option.id}>
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={value === option.id}
              onChange={() => onChange(option.id)}
              className="peer sr-only"
            />
            <span className="block cursor-pointer select-none whitespace-nowrap rounded-md px-2 py-2 text-center text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 peer-checked:bg-white peer-checked:text-gray-900 peer-checked:shadow peer-focus-visible:ring-2 peer-focus-visible:ring-gray-400 dark:text-zinc-400 dark:hover:text-zinc-100 dark:peer-checked:bg-zinc-600 dark:peer-checked:text-white">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** One bar per note in range, low to high: height is recent accuracy. */
function NoteBars({ label, notes, stats }) {
  return (
    <div className="mt-2.5">
      {label && (
        <p aria-hidden="true" className="mb-1 text-[11px] font-medium text-gray-500 dark:text-zinc-400">
          {label}
        </p>
      )}
      <ol
        aria-label={label ? `${label} clef` : 'Accuracy by note'}
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${notes.length}, minmax(0, 1fr))` }}
      >
        {notes.map((note) => {
          const stat = stats.notes[noteId(note)];
          const acc = accuracy(stat);
          const time = typicalTime(stat);
          const name = noteName(note);
          const summary = acc
            ? `${name}: ${acc.correct} of last ${acc.tries} right${time ? `, ~${(time / 1000).toFixed(1)}s` : ''}`
            : `${name}: not practiced yet`;
          return (
            <li key={name} title={summary} className="flex min-w-0 flex-col items-center gap-1">
              <span
                aria-hidden="true"
                className={`relative block h-9 w-full overflow-hidden rounded ${acc ? 'bg-gray-100 dark:bg-zinc-800' : 'border border-dashed border-gray-300 dark:border-zinc-700'}`}
              >
                {acc && (
                  <span
                    className={`absolute inset-x-0 bottom-0 ${barColor(acc.ratio)}`}
                    style={{ height: `max(2px, ${Math.round(acc.ratio * 100)}%)` }}
                  />
                )}
              </span>
              <span aria-hidden="true" className="text-[10px] leading-none tabular-nums text-gray-500 dark:text-zinc-400">
                {name}
              </span>
              <span className="sr-only">{summary}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function barColor(ratio) {
  if (ratio >= 0.9) return 'bg-green-500 dark:bg-green-400';
  if (ratio >= 0.7) return 'bg-amber-400 dark:bg-amber-300';
  return 'bg-red-400';
}

/** Asks for a second press before wiping progress. Stays focusable when empty. */
function ResetButton({ empty }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <button
      type="button"
      aria-disabled={empty}
      onClick={() => {
        if (empty) return;
        if (armed) resetStats();
        setArmed(!armed);
      }}
      className={`-mr-1.5 h-8 rounded-md px-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 ${
        empty
          ? 'cursor-default text-gray-300 dark:text-zinc-600'
          : armed
            ? 'text-red-600 dark:text-red-400'
            : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100'
      }`}
    >
      {armed ? 'Confirm reset' : 'Reset'}
    </button>
  );
}

const GearIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true" {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

const CloseIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);
