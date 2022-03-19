import Image from "next/image";

/* components */
import NoteNormal from "./icons/note-normal";
import NoteLined from "./icons/note-lined";

export default function Staff({ clef, level }) {
  const noteBottom = -1.5 + level * 0.595 + "rem";
  const note = level == 0 || level == 12 ? <NoteLined /> : <NoteNormal />;

  return (
    <div className="relative my-10">
      <div className="border-black">
        <div className="h-5 w-96 border border-inherit border-b-0"></div>
        <div className="h-5 w-96 border border-inherit border-b-0"></div>
        <div className="h-5 w-96 border border-inherit border-b-0"></div>
        <div className="h-5 w-96 border border-inherit"></div>
      </div>

      <div className="absolute left-0 -bottom-1">
        <Clef clef={clef} />
      </div>

      <span className="absolute left-1/2 transform -translate-x-1/2" style={{ bottom: noteBottom }}>
        {note}
      </span>
    </div>
  )
}

function Clef({ clef }) {
  return <Image src={`/${clef}.svg`} height={75} width={50} />
}
