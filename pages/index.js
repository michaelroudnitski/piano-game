import Head from 'next/head';
import { useEffect, useState, useRef, useCallback } from 'react';

/* components */
import Footer from '../components/footer';
import Staff from '../components/staff';
import Piano from '../components/piano';
import PracticeSettings from '../components/practice-settings';
import ClefLabel from '../components/clef-label';
import { drawNote, recordResult } from '../lib/practice';

export default function Home() {
  const [note, setNote] = useState({ key: null, octave: 1 });
  const [correct, setCorrect] = useState(null);
  const [feedbackNote, setFeedbackNote] = useState(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const lockedRef = useRef(false);
  const wrongTimerRef = useRef(null);
  useEffect(() => setNote(drawNote()), []);

  const handleGuess = useCallback((guess) => {
    if (lockedRef.current) return;
    const upper = guess.toUpperCase();
    if (!'CDEFGAB'.includes(upper)) return;

    clearTimeout(wrongTimerRef.current);
    setFeedbackNote(upper);
    recordResult(note, upper === note.key);

    if (upper === note.key) {
      lockedRef.current = true;
      setCorrect(true);
      setScore(s => s + 1);
      setStreak(s => s + 1);
      setTimeout(() => {
        setCorrect(null);
        setFeedbackNote(null);
        setNote(drawNote());
        lockedRef.current = false;
      }, 750);
    } else {
      setCorrect(false);
      setStreak(0);
      wrongTimerRef.current = setTimeout(() => {
        setCorrect(null);
        setFeedbackNote(null);
      }, 750);
    }
  }, [note]);

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
      <PracticeSettings className="fixed right-3 top-3 z-20" onChange={() => setNote(drawNote())} />

      <main className="flex flex-col items-center justify-center gap-[3vh]">
        <ClefLabel clef={note.clef} />
        <span className={correct ? "text-green-500" : "text-black dark:text-slate-100"}>
          <Staff clef={note.clef} level={note.level} />
        </span>

        <Piano onKeyPress={handleGuess} feedbackNote={feedbackNote} correct={correct} />

        <Well className="py-2 flex items-center gap-3">
          <p key={score} className="text-base font-semibold text-gray-500 dark:text-zinc-500 animate-pop">
            {score} Correct
          </p>
          {streak >= 3 && (
            <p key={streak} className="text-sm font-bold text-orange-500 animate-pop">
              {streak} streak!
            </p>
          )}
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
