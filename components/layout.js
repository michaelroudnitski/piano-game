import PageHead from './page-head';
import Header from './header';
import Footer from './footer';
import Staff from './staff';

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

// Centers the staff → piano → score column. The column is laid out at phone size and scaled
// as one unit to suit the screen (see `.game-column` in globals.css). The staff reserves its own
// room for ledger lines, so the gaps here are just spacing.
export function GameColumn({ children }) {
  return (
    <main className="flex items-center justify-center py-3">
      <div className="game-column flex flex-col items-center gap-6">{children}</div>
    </main>
  );
}

// The staff before the first note is drawn. The note is random, so it's drawn in an effect after
// hydration; until then an empty staff holds the exact footprint, so the first paint already shows
// the staff lines and nothing shifts when the note arrives.
export function StaffPlaceholder() {
  return <Staff clef="treble" level={null} />;
}
