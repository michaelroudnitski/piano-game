import Staff from "./staff";
import { noteToLevel } from "../lib/staff-layout";

export default function Treble({ note, ...props }) {
  const level = note?.key == null ? null : noteToLevel(note.key, note.octave, "treble");

  return (
    <Staff clef="treble" level={level} {...props} />
  )
}
