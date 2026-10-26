import Help from './help';

// Slim app bar: the name on the left, small icon controls on the right. `actions` is the slot for
// other controls (sound, practice settings); ideally <HeaderButton>s. The help button always
// comes last. The content spans the same width as the game column, so its edges line up.
export default function Header({ actions }) {
  return (
    <header className="pt-[env(safe-area-inset-top)]">
      <div className="game-width mx-auto flex h-14 items-center justify-between gap-4">
        <h1 className="flex items-center gap-2.5 text-[17px] font-semibold tracking-tight">
          <Logo className="h-7 w-7 shrink-0" />
          Piano Game
        </h1>
        <div className="-mr-2 flex items-center gap-0.5">
          {actions}
          <Help />
        </div>
      </div>
    </header>
  );
}

// The app mark (same drawing as public/icon.svg): a quarter note on a ledger line.
function Logo(props) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" {...props}>
      <rect width="512" height="512" rx="114" className="fill-zinc-900 dark:fill-zinc-100" />
      <g className="fill-white dark:fill-zinc-900">
        <ellipse cx="256" cy="352" rx="90" ry="65" transform="rotate(-22 256 352)" />
        <rect x="307" y="72" width="36" height="268" />
        <rect x="137" y="338" width="238" height="29" />
      </g>
    </svg>
  );
}
