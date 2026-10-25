import styles from "./staff.module.css";
import { TREBLE_CLEF_PATH } from "./icons/treble-icon";
import { BASS_CLEF_PATH } from "./icons/bass-icon";
import {
  LEDGER_LINE_THICKNESS,
  NOTEHEAD,
  STAFF_LINE_THICKNESS,
  STAFF_LINE_YS,
  STAFF_WIDTH,
  VIEW_BOX,
  clefOrigin,
  noteLayout,
} from "../lib/staff-layout";

// Staff and ledger lines keep a neutral ink. The clef and note use
// currentColor, so the page can tint them (green on a correct answer).
const LINE_INK = "text-black dark:text-slate-200";

const CLEFS = {
  treble: { name: "Treble", path: TREBLE_CLEF_PATH },
  bass: { name: "Bass", path: BASS_CLEF_PATH },
};

const VIEW_BOX_ATTR = [VIEW_BOX.x, VIEW_BOX.y, VIEW_BOX.width, VIEW_BOX.height].map(round).join(" ");
const STAFF_LINES_PATH = STAFF_LINE_YS.map((y) => `M0 ${y}H${STAFF_WIDTH}`).join("");

/**
 * A five-line staff with a clef and (optionally) one note, drawn as a single
 * SVG in staff-space units so everything scales together.
 *
 * `level` is the note's staff position (see lib/staff-layout.js), or null for
 * an empty staff. `className` and `style` size it (default: min(490px, 90vw) wide).
 */
export default function Staff({ clef = "treble", level = null, className, style, ...rest }) {
  const { name, path } = CLEFS[clef] ?? CLEFS.treble;
  const hasNote = Number.isFinite(level);
  const origin = clefOrigin(clef);

  return (
    <svg
      viewBox={VIEW_BOX_ATTR}
      role="img"
      aria-label={hasNote ? `${name} clef staff with one note` : `Empty ${name.toLowerCase()} clef staff`}
      className={className ? `${styles.staff} ${className}` : styles.staff}
      style={style}
      data-clef={clef}
      data-level={hasNote ? level : undefined}
      {...rest}
    >
      <path className={LINE_INK} d={STAFF_LINES_PATH} stroke="currentColor" strokeWidth={STAFF_LINE_THICKNESS} />
      <path d={path} transform={`translate(${origin.x} ${origin.y})`} fill="currentColor" />
      {hasNote && <Note key={level} level={level} />}
    </svg>
  );
}

function Note({ level }) {
  const { x, y, stem, ledgerLines } = noteLayout(level);
  const ledgerPath = ledgerLines.map((l) => `M${round(l.x1)} ${round(l.y)}H${round(l.x2)}`).join("");

  return (
    <g className={styles.note}>
      {ledgerPath && (
        <path className={LINE_INK} d={ledgerPath} stroke="currentColor" strokeWidth={LEDGER_LINE_THICKNESS} />
      )}
      <rect
        x={round(stem.x)}
        y={round(stem.top)}
        width={round(stem.width)}
        height={round(stem.bottom - stem.top)}
        fill="currentColor"
      />
      <ellipse
        cx={round(x)}
        cy={round(y)}
        rx={round(NOTEHEAD.rx)}
        ry={round(NOTEHEAD.ry)}
        transform={`rotate(${-NOTEHEAD.tilt} ${round(x)} ${round(y)})`}
        fill="currentColor"
      />
    </g>
  );
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}
