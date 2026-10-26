import PageHead from './page-head';
import Header from './header';
import Footer from './footer';
import Treble from './treble';

// The page shell: header, the game in the middle, footer. Everything here renders on the server,
// so the first paint is complete. `actions` goes to the header's control slot.
export default function Layout({ actions, children }) {
  return (
    <div className="grid min-h-[100dvh] grid-rows-[auto_1fr_auto]">
      <PageHead />
      <Header actions={actions} />
      {children}
      <Footer />
    </div>
  );
}

// Centers the staff → piano → score column. The column is laid out at phone size and scaled up
// as one unit on roomy screens (see `.game-column` in globals.css). The top padding and gaps leave
// room for notes and ledger lines that stick out above and below the staff (A5 reaches ~50px
// above the top line, C4 ~27px below the bottom line).
export function GameColumn({ children }) {
  return (
    <main className="flex items-center justify-center py-6">
      <div className="game-column flex flex-col items-center gap-10 pt-12">{children}</div>
    </main>
  );
}

// Holds the staff's exact footprint until the first note is drawn. The note is random, so it's
// drawn in an effect after hydration; until then this renders a real staff, invisibly, so nothing
// shifts when the note arrives and no placeholder note flashes.
// TODO(integration): once <Staff level={null}> draws an empty staff, return
// <Staff clef="treble" level={null} /> here instead, so the first paint shows the staff lines too.
export function StaffPlaceholder() {
  return (
    <div aria-hidden="true" className="invisible">
      <Treble note={{ key: 'C', octave: 1 }} />
    </div>
  );
}
