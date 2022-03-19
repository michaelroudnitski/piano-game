import Staff from "./staff";

export default function Bass({ note }) {
  const level = NOTE_MAPPING[note.key] + (note.octave === 2 ? 7 : 0);

  return (
    <Staff clef="bass" level={level} />
  )
}

const NOTE_MAPPING = {
  "E": 0,
  "F": 1,
  "G": 2,
  "A": 3,
  "B": 4,
  "C": 5,
  "D": 6,
}
