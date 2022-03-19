import Image from "next/image";

export default function Staff({ clef, level }) {
  return (
    <div className="relative my-10">
      <div className="absolute left-0 -bottom-1">
        <Clef clef={clef} />
      </div>
      <div className="border-black">
        <div className="h-5 w-96 border border-inherit border-b-0"></div>
        <div className="h-5 w-96 border border-inherit border-b-0"></div>
        <div className="h-5 w-96 border border-inherit border-b-0"></div>
        <div className="h-5 w-96 border border-inherit"></div>
      </div>
      <Note level={level} />
    </div>
  )
}

function Clef({ clef }) {
  return <Image src={`/${clef}.svg`} height={75} width={50} />
}

function Note({ level = 0 }) {
  const note = [0, 12].includes(level) ? "/note-lined.svg" : "/note.svg";
  const fromBottom = -2 + level * 0.625 + "rem";
  const fromLeft = Math.floor(Math.random() * 8) * 25 + 48;

  return (
    <span className="absolute" style={{ bottom: fromBottom, left: fromLeft }}>
      <Image src={note} height={38} width={38} />
    </span>
  )
}
