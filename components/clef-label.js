import { usePracticeSettings } from '../lib/practice';

/**
 * Names the clef on screen while practicing both clefs, so a switch between
 * treble and bass can't slip by. It pops each time the clef changes. Renders
 * nothing in single-clef practice.
 */
export default function ClefLabel({ clef }) {
  const { clef: mode } = usePracticeSettings();
  if (mode !== 'both' || !clef) return null;

  return (
    <div className="flex" style={{ width: 'min(490px, 90vw)' }} aria-live="polite">
      <span
        key={clef}
        className="animate-pop rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold uppercase leading-none tracking-wider text-gray-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
      >
        {clef === 'bass' ? 'Bass clef' : 'Treble clef'}
      </span>
    </div>
  );
}
