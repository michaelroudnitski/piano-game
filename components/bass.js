import Staff from "./staff";
import { noteToLevel } from "../lib/staff-layout";

export default function Bass({ note }) {
  const level = noteToLevel(note.key, note.octave, "bass");

  return (
    <Staff clef="bass" level={level} />
  )
}
