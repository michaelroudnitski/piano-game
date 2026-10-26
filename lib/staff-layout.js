// Staff geometry. Every length is in staff spaces (the gap between two
// adjacent staff lines), and the staff SVG draws one user unit per space.
// y = 0 is the top line and y grows downward, so the lines sit at y = 0..4.
//
// A "level" counts staff positions upward, one step per line or space:
// 0 = first ledger line below, 2 = bottom line, 6 = middle line, 10 = top line.
export const BOTTOM_LINE_LEVEL = 2;
export const MIDDLE_LINE_LEVEL = 6;
export const TOP_LINE_LEVEL = 10;

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

/* Engraving metrics, after SMuFL's Bravura defaults, with staff lines a touch
   lighter (Bravura uses 0.13) so they don't look heavy on screen. */
export const STAFF_LINE_THICKNESS = 0.1;
export const LEDGER_LINE_THICKNESS = 0.14;
export const LEDGER_LINE_EXTENSION = 0.4; // past each side of the notehead
export const STEM_THICKNESS = 0.12;
export const STEM_LENGTH = 3.5; // from the notehead's centre

/**
 * Fit a tilted ellipse to a bounding box. Returns its radii and `stemJoin`:
 * how far the ellipse's rightmost point sits above its centre (the leftmost
 * point sits the same distance below). Stems attach at those points.
 */
export function tiltedEllipse(width, height, tiltDegrees) {
  const t = (tiltDegrees * Math.PI) / 180;
  const cos2 = Math.cos(t) ** 2;
  const sin2 = Math.sin(t) ** 2;
  const w2 = (width / 2) ** 2;
  const h2 = (height / 2) ** 2;
  const rx = Math.sqrt((w2 * cos2 - h2 * sin2) / (cos2 - sin2));
  const ry = Math.sqrt((h2 * cos2 - w2 * sin2) / (cos2 - sin2));
  const stemJoin = ((rx ** 2 - ry ** 2) * Math.sin(t) * Math.cos(t)) / (width / 2);
  return { rx, ry, stemJoin };
}

/** A filled notehead: one space tall, 1.3 wide, tilted up to the right. */
export const NOTEHEAD = { width: 1.3, height: 1, tilt: 20, ...tiltedEllipse(1.3, 1, 20) };

/* Canvas. Wide enough for clef + note; tall enough for LEDGER_ROOM ledger
   lines above and below, including a note in the space beyond the last one. */
export const STAFF_WIDTH = 22;
export const LEDGER_ROOM = 2; // the widest practice range (lib/deck.js) goes two ledger lines out
const VIEW_MARGIN = 0.25;
const HIGHEST_LEVEL = TOP_LINE_LEVEL + 2 * LEDGER_ROOM + 1;
const LOWEST_LEVEL = BOTTOM_LINE_LEVEL - 2 * LEDGER_ROOM - 1;
const viewTop = levelToY(HIGHEST_LEVEL) - NOTEHEAD.height / 2 - VIEW_MARGIN;
const viewBottom = levelToY(LOWEST_LEVEL) + NOTEHEAD.height / 2 + VIEW_MARGIN;
export const VIEW_BOX = { x: 0, y: viewTop, width: STAFF_WIDTH, height: viewBottom - viewTop };

export const STAFF_LINE_YS = [0, 1, 2, 3, 4];
export const NOTE_X = STAFF_WIDTH / 2;

/* Clefs are drawn with their origin on the line they name, at their left edge. */
const CLEF_X = 1;
const CLEF_LINE_LEVEL = { treble: 4, bass: 8 }; // the G line and the F line

/** Where to place a clef glyph's origin. */
export function clefOrigin(clef) {
  return { x: CLEF_X, y: levelToY(CLEF_LINE_LEVEL[clef] ?? CLEF_LINE_LEVEL.treble) };
}

/** Staff level -> y in staff spaces (0 = top line, 4 = bottom line). */
export function levelToY(level) {
  return (TOP_LINE_LEVEL - level) / 2;
}

/** Levels of the ledger lines a note needs: every one between it and the staff. */
export function ledgerLineLevels(level) {
  const levels = [];
  for (let l = BOTTOM_LINE_LEVEL - 2; l >= level; l -= 2) levels.push(l);
  for (let l = TOP_LINE_LEVEL + 2; l <= level; l += 2) levels.push(l);
  return levels;
}

/** Notes below the middle line take a stem up; on or above it, a stem down. */
export function stemDirection(level) {
  return level < MIDDLE_LINE_LEVEL ? "up" : "down";
}

/**
 * Level where the stem ends: an octave (3.5 spaces) from the notehead, and
 * never short of the middle line, so notes on ledger lines reach into the staff.
 */
export function stemTipLevel(level) {
  const reach = STEM_LENGTH * 2;
  return stemDirection(level) === "up"
    ? Math.max(level + reach, MIDDLE_LINE_LEVEL)
    : Math.min(level - reach, MIDDLE_LINE_LEVEL);
}

/** Everything needed to draw one note at `level`, in staff spaces. */
export function noteLayout(level, x = NOTE_X) {
  const y = levelToY(level);
  const half = NOTEHEAD.width / 2;
  const ledgerHalf = half + LEDGER_LINE_EXTENSION;
  const direction = stemDirection(level);
  const tipY = levelToY(stemTipLevel(level));
  const stem =
    direction === "up"
      ? { x: x + half - STEM_THICKNESS, top: tipY, bottom: y - NOTEHEAD.stemJoin }
      : { x: x - half, top: y + NOTEHEAD.stemJoin, bottom: tipY };

  return {
    x,
    y,
    direction,
    stem: { ...stem, width: STEM_THICKNESS },
    ledgerLines: ledgerLineLevels(level).map((l) => ({
      y: levelToY(l),
      x1: x - ledgerHalf,
      x2: x + ledgerHalf,
    })),
  };
}
