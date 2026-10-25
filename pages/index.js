import Head from 'next/head';
import { useEffect, useState } from 'react';

/* components */
import Footer from '../components/footer';
import Treble from '../components/treble';
import Bass from '../components/bass';
import Piano from '../components/piano';
import Scoreboard from '../components/scoreboard';
import StaffFeedback from '../components/staff-feedback';
import useGuessLoop from '../lib/use-guess-loop';

export default function Home() {
  const [note, setNote] = useState({ key: null, octave: 1 });
  useEffect(() => setNote(drawNote()), []);

  // Judges typed letters and piano presses, keeps score, and asks for the next note.
  const game = useGuessLoop(note, () => setNote(drawNote()));

  if (note.key == null) {
    return <HTMLHead />
  }

  return (
    <div className="dark:bg-black grid grid-rows-[1fr_auto]" style={{ height: '100dvh' }}>
      <HTMLHead />

      <main className="flex flex-col items-center justify-center gap-[3vh]">
        <StaffFeedback tone={game.tone} answer={game.answer}>
          <Treble note={note} />
          {/* <Bass note={note} /> */}
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

const KEYS = ["C", "D", "E", "F", "G", "A", "B"];
const OCTAVES = [1, 2];

function buildPool(exclude) {
  const pool = [];
  for (const key of KEYS) {
    for (const octave of OCTAVES) {
      if (exclude && key === exclude.key && octave === exclude.octave) continue;
      pool.push({ key, octave });
    }
  }
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function createNoteDeck() {
  let pool = [];
  let last = null;
  return function draw() {
    if (pool.length === 0) pool = buildPool(last);
    last = pool.pop();
    return last;
  };
}

const drawNote = createNoteDeck();

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
