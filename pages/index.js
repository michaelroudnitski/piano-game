import Head from 'next/head';
import { useEffect, useState } from 'react';

/* components */
import Footer from '../components/footer';
import Staff from '../components/staff';
import Piano from '../components/piano';
import Scoreboard from '../components/scoreboard';
import StaffFeedback from '../components/staff-feedback';
import SoundToggle from '../components/sound-toggle';
import PracticeSettings from '../components/practice-settings';
import ClefLabel from '../components/clef-label';
import useGuessLoop from '../lib/use-guess-loop';

import { playNote, noteToMidi, guessToMidi } from '../lib/audio';
import { drawNote, recordResult } from '../lib/practice';

export default function Home() {
  const [note, setNote] = useState({ key: null, octave: 1 });
  useEffect(() => setNote(drawNote()), []);

  // Judges typed letters and piano presses, keeps score, and asks for the next note.
  const game = useGuessLoop(note, () => setNote(drawNote()), { onResult: handleResult });

  if (note.key == null) {
    return <HTMLHead />
  }

  return (
    <div className="dark:bg-black grid grid-rows-[1fr_auto]" style={{ height: '100dvh' }}>
      <HTMLHead />
      <div className="fixed top-3 right-3 z-20 flex items-center gap-1">
        <PracticeSettings onChange={() => setNote(drawNote())} />
        <SoundToggle />
      </div>

      <main className="flex flex-col items-center justify-center gap-[3vh]">
        <ClefLabel clef={note.clef} />
        <StaffFeedback tone={game.tone} answer={game.answer}>
          <Staff clef={note.clef} level={note.level} />
        </StaffFeedback>

        <Piano onKeyPress={game.guess} marks={game.marks} feedback={game.feedback} />

        <Well className="py-2 flex items-center gap-3">
          <Scoreboard stats={game.stats} celebration={game.celebration} />
        </Well>

        <p role="status" className="sr-only">{game.announcement}</p>
      </main>

      <Footer />
    </div>
  )
}

// Runs after every answer press. Counted guesses feed adaptive practice (it keeps only the
// first try on each note). The right answer, or pressing the revealed answer, plays the note
// on the staff; any other answer press plays the pressed key softly; skips stay silent.
function handleResult({ outcome, guess, note }) {
  if (outcome === 'correct' || outcome === 'wrong' || outcome === 'reveal') {
    recordResult(note, outcome === 'correct');
  }
  const target = noteToMidi(note);
  if (outcome === 'correct' || outcome === 'continue') playNote(target);
  else if (outcome !== 'skip') playNote(guessToMidi(guess, target), { wrong: true });
}

function Well({ children, className = '', style }) {
  return (
    <div
      className={`rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 px-5 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

const HTMLHead = () => (
  <Head>
    <title>Piano Game</title>
    <meta name="description" content="Learn to read sheet music with this simple game. Just type the notes as you read them." />
    <meta property="og:title" content="Piano Game" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="og_image.png" />
    <meta property="og:url" content="https://www.pianogame.mroudnitski.com" />
    <meta property="og:description" content="Learn to read sheet music with this simple game. Just type the notes as you read them." />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:creator" content="@mroudnitski" />
    <meta property="twitter:domain" content="pianogame.mroudnitski.com" />
    <meta property="twitter:url" content="https://www.pianogame.mroudnitski.com" />
    <meta name="twitter:title" content="Piano Game" />
    <meta name="twitter:description" content="Learn to read sheet music with this simple game. Just type the notes as you read them." />
    <meta name="twitter:image" content="og_image.png" />
    <link rel="icon" href="/favicon.ico" />
  </Head>
)
