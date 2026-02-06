const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_KEYS = [
  { note: 'C#', left: 'left-[calc(100%/7*1-1rem)]' },
  { note: 'D#', left: 'left-[calc(100%/7*2-1rem)]' },
  { note: 'F#', left: 'left-[calc(100%/7*4-1rem)]' },
  { note: 'G#', left: 'left-[calc(100%/7*5-1rem)]' },
  { note: 'A#', left: 'left-[calc(100%/7*6-1rem)]' },
];

export default function Piano({ onKeyPress, feedbackNote, correct }) {
  const getWhiteKeyClasses = (note) => {
    const isActive = feedbackNote === note && correct !== null;
    if (isActive && correct) return 'bg-green-300 dark:bg-green-400';
    if (isActive && correct === false) return 'bg-red-300 dark:bg-red-400';
    return 'bg-gray-50 dark:bg-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-200 active:bg-gray-200';
  };

  return (
    <div className="relative select-none" style={{ width: 'min(490px, 90vw)', height: 'min(180px, 33vw)' }}>
      {/* White keys */}
      <div className="flex h-full gap-[2px]">
        {WHITE_KEYS.map((note) => (
          <button
            key={note}
            onClick={() => onKeyPress(note)}
            className={`relative flex-1 border border-gray-200 dark:border-zinc-500 cursor-pointer transition-all duration-100 flex items-end justify-center pb-3 first:rounded-bl-xl last:rounded-br-xl active:scale-[0.97] active:translate-y-[2px] ${getWhiteKeyClasses(note)}`}
          >
            <kbd className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md border border-gray-300 dark:border-zinc-600 bg-gray-200 dark:bg-zinc-500 text-gray-500 dark:text-zinc-300 shadow-sm">
              {note}
            </kbd>
          </button>
        ))}
      </div>

      {/* Black keys */}
      {BLACK_KEYS.map(({ note, left }) => (
        <div
          key={note}
          className={`absolute top-0 ${left} w-8 h-[60%] bg-gray-800 dark:bg-zinc-900 rounded-b-md border border-gray-700 dark:border-zinc-700 pointer-events-none z-10`}
        />
      ))}
    </div>
  );
}
