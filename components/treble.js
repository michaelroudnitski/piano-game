import Staff from "./staff";

export default function Treble({ note }) {
  const level = NOTE_MAPPING[note];

  return (
    <Staff clef="treble" level={level} />
  )
}

const NOTE_MAPPING = {
  "C": 0,
  "D": 1,
  "E": 2,
  "F": 3,
  "G": 4,
  "A": 5,
  "B": 6,
}
