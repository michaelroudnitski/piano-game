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
  useEffect(() => setNote(chooseNote()), []);

  const handleGuess = useCallback((guess) => {
    if (lockedRef.current) return;
    const upper = guess.toUpperCase();
    if (!'CDEFGAB'.includes(upper)) return;

    lockedRef.current = true;
    setFeedbackNote(upper);

    if (upper === note.key) {
      setCorrect(true);
      setScore(s => s + 1);
      setTimeout(() => {
        setCorrect(null);
        setFeedbackNote(null);
        setNote(chooseNote());
        lockedRef.current = false;
      }, 750);
    } else {
      setCorrect(false);
      setTimeout(() => {
        setCorrect(null);
        setFeedbackNote(null);
        lockedRef.current = false;
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
    <div className="dark:bg-black flex flex-col h-screen">
      <HTMLHead />

      <main className="grow">
        <div className="flex flex-col h-full items-center justify-center">
          <span className={correct ? "text-green-500" : "text-black dark:text-slate-100"}>
            <Treble note={note} />
            {/* <Bass note={note} /> */}
          </span>

          <div className="mt-8">
            <Piano onKeyPress={handleGuess} feedbackNote={feedbackNote} correct={correct} />
          </div>

          <p className="mt-4 text-sm font-medium text-gray-500 dark:text-zinc-500">
            {score} correct
          </p>

          <div className="mt-6 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 px-5 py-4 text-sm text-gray-500 dark:text-zinc-500" style={{ width: 'min(490px, 90vw)' }}>
            <p className="font-medium text-gray-700 dark:text-zinc-300 mb-2">How to play</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Read the note on the staff above</li>
              <li>Press the matching key on your keyboard or click the piano</li>
              <li>Correct guesses flash green, wrong ones flash red</li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

const chooseNote = () => {
  const notes = ["C", "D", "E", "F", "G", "A", "B"];
  const index = Math.floor(Math.random() * notes.length);
  return { key: notes[index], octave: Math.random() > 0.5 ? 1 : 2 };
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
