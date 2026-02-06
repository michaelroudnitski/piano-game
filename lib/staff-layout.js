// Staff geometry constants (derived from Tailwind h-5 = 1.25rem)
const LINE_HEIGHT_REM = 1.25;
const STEP_REM = LINE_HEIGHT_REM / 2; // 0.625rem per staff position (line↔space)
const BOTTOM_LINE_LEVEL = 2;
const TOP_LINE_LEVEL = 10;

// Base offset accounts for the note SVG's head center being ~6.5px from its bottom edge.
const BASE_OFFSET_REM = -1.656;

const TREBLE_MAP = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const BASS_MAP = { E: 0, F: 1, G: 2, A: 3, B: 4, C: 5, D: 6 };

const CLEF_MAPS = { treble: TREBLE_MAP, bass: BASS_MAP };

/**
 * Convert a note key + octave + clef to a staff level number.
 * Level 0 = lowest position (ledger line below staff), level 12 = above staff, etc.
 */
export function noteToLevel(key, octave, clef) {
  const map = CLEF_MAPS[clef];
  const base = map[key];
  if (clef === "treble") {
    return base + (octave === 2 && key !== "B" ? 7 : 0);
  }
  return base + (octave === 2 ? 7 : 0);
}

/** Convert a staff level to a CSS bottom offset in rem. */
export function levelToBottomRem(level) {
  return BASE_OFFSET_REM + level * STEP_REM;
}

/** Whether a level sits on a ledger line (even level outside the five staff lines). */
export function needsLedgerLine(level) {
  return level % 2 === 0 && (level < BOTTOM_LINE_LEVEL || level > TOP_LINE_LEVEL);
}
