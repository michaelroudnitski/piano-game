// F clef outline in staff spaces, with its origin at the left edge of the
// head on the F line (second line from the top). The head is centred on that
// line, the arch reaches the top line, and the two dots sit in the spaces
// either side of the F line.
export const BASS_CLEF_PATH =
  "M0 0C0-0.62 0.5-1.02 1.1-1.02C1.72-1.02 2.08-0.58 2.08 0C2.08 0.98 1.3 1.86 0.05 2.52L0 2.46C1.02 1.86 1.62 0.95 1.62-0.05C1.62-0.58 1.38-0.84 1.02-0.84C0.62-0.84 0.28-0.62 0.22-0.38C0.3-0.33 0.42-0.42 0.55-0.43C0.78-0.43 0.9-0.22 0.9 0C0.9 0.24 0.7 0.43 0.45 0.43C0.2 0.43 0 0.24 0 0Z" +
  "M2.65-0.5A0.2 0.2 0 1 1 2.25-0.5A0.2 0.2 0 1 1 2.65-0.5Z" +
  "M2.65 0.5A0.2 0.2 0 1 1 2.25 0.5A0.2 0.2 0 1 1 2.65 0.5Z";

/** A standalone bass clef icon. */
const BassIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="-0.1 -1.12 2.85 3.74"
    className="text-inherit"
    aria-hidden="true"
    {...props}
  >
    <path fill="currentColor" d={BASS_CLEF_PATH} />
  </svg>
)

export default BassIcon;
