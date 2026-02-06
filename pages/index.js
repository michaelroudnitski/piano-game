import Head from 'next/head';
import { useEffect, useState, useRef, useCallback } from 'react';

/* components */
import Footer from '../components/footer';
import Treble from '../components/treble';
import Bass from '../components/bass';
import Piano from '../components/piano';

export default function Home() {
  const [note, setNote] = useState({ key: null, octave: 1 });
  const [correct, setCorrect] = useState(null);
  const [feedbackNote, setFeedbackNote] = useState(null);
  const [score, setScore] = useState(0);
  const lockedRef = useRef(false);
  const wrongTimerRef = useRef(null);
  useEffect(() => setNote(drawNote()), []);

  const handleGuess = useCallback((guess) => {
    if (lockedRef.current) return;
    const upper = guess.toUpperCase();
    if (!'CDEFGAB'.includes(upper)) return;

    clearTimeout(wrongTimerRef.current);
    setFeedbackNote(upper);

    if (upper === note.key) {
      lockedRef.current = true;
      setCorrect(true);
      setScore(s => s + 1);
      setTimeout(() => {
        setCorrect(null);
        setFeedbackNote(null);
        setNote(drawNote());
        lockedRef.current = false;
      }, 750);
    } else {
      setCorrect(false);
      wrongTimerRef.current = setTimeout(() => {
        setCorrect(null);
        setFeedbackNote(null);
      }, 750);
    }
  }, [note.key]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      handleGuess(e.key);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [handleGuess]);

  if (note.key == null) {
    return <HTMLHead />
  }

  return (
    <div className="dark:bg-black grid grid-rows-[1fr_auto]" style={{ height: '100dvh' }}>
      <HTMLHead />

      <main className="flex flex-col items-center justify-center gap-[3vh]">
        <span className={correct ? "text-green-500" : "text-black dark:text-slate-100"}>
          <Treble note={note} />
          {/* <Bass note={note} /> */}
        </span>

        <Piano onKeyPress={handleGuess} feedbackNote={feedbackNote} correct={correct} />

        <Well className="py-2">
          <p className="text-base font-semibold text-gray-500 dark:text-zinc-500">
            {score} Correct
          </p>
        </Well>
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
