import Staff from "./staff";
import { noteToLevel } from "../lib/staff-layout";

export default function Bass({ note, ...props }) {
  const level = note?.key == null ? null : noteToLevel(note.key, note.octave, "bass");

  return (
    <Staff clef="bass" level={level} {...props} />
  )
}
