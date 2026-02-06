import Staff from "./staff";
import { noteToLevel } from "../lib/staff-layout";

export default function Treble({ note }) {
  const level = noteToLevel(note.key, note.octave, "treble");

  return (
    <Staff clef="treble" level={level} />
  )
}
