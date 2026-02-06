import Image from "next/image";

/* components */
import NoteNormal from "./icons/note-normal";
import NoteLined from "./icons/note-lined";
import TrebleIcon from "./icons/treble-icon";
import BassIcon from "./icons/bass-icon";

import { levelToBottomRem, needsLedgerLine } from "../lib/staff-layout";

export default function Staff({ clef, level }) {
  const noteBottom = levelToBottomRem(level) + "rem";
  const note = needsLedgerLine(level) ? <NoteLined /> : <NoteNormal />;

  return (
    <div className="relative" style={{ width: 'min(490px, 90vw)' }}>
      <div className="border-black dark:border-slate-200">
        <div className="h-5 w-full border-t border-inherit"></div>
        <div className="h-5 w-full border-t border-inherit"></div>
        <div className="h-5 w-full border-t border-inherit"></div>
        <div className="h-5 w-full border-y border-inherit"></div>
      </div>

      <div className="absolute left-0 bottom-1/2 transform translate-y-1/2 w-12">
        <Clef clef={clef} />
      </div>

      <span className="absolute left-1/2 transform -translate-x-1/2" style={{ bottom: noteBottom }}>
        {note}
      </span>
    </div>
  )
}

function Clef({ clef }) {
  return clef == "treble" ? <TrebleIcon /> : <BassIcon />;
}
