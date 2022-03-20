import Head from 'next/head';
import { useEffect, useState, useRef } from 'react';

/* components */
import Footer from '../components/footer';
import Treble from '../components/treble';
import Bass from '../components/bass';

export default function Home() {
  const [note, setNote] = useState({ key: null, octave: 1 });
  const [correct, setCorrect] = useState(null);
  useEffect(() => setNote(chooseNote()), [])
  const textInput = useRef(null);

  const handleGuess = (guess) => {
    if (guess.length != 1) return;

    guess === note.key ? handleCorrect() : handleWrong();
  }

  const handleCorrect = () => {
    setCorrect(true);

    setTimeout(() => {
      setCorrect(null);
      setNote(chooseNote());
      textInput.current.value = "";
    }, 750);
  }

  const handleWrong = () => {
    setCorrect(false);

    setTimeout(() => {
      setCorrect(null);
      textInput.current.value = "";
    }, 750);
  }

  if (note.key == null) {
    return <HTMLHead />
  }

  return (
    <div className="dark:bg-black">
      <HTMLHead />

      <main>
        <div className="flex flex-col h-screen items-center justify-center">
          <span className={correct ? "text-green-500" : "text-black dark:text-slate-100"}>
            <Treble note={note} />
            {/* <Bass note={note} /> */}
          </span>

          <div className="mt-8">
            <input
              type="text"
              ref={textInput}
              autoFocus={true}
              onChange={e => handleGuess(e.target.value.toUpperCase())}
              maxLength={1}
              className={"px-2 py-3 dark:bg-black uppercase text-center rounded-lg text-2xl font-bold border-0 shadow-lg ring-gray-600 ring focus:ring " + (correct ? "focus:ring-green-500 text-green-500" : (correct === false ? "focus:ring-red-500 text-red-500" : "focus:ring-yellow-500 text-yellow-500"))}
            />
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
    <meta property="og:image" content="/og_image.png" />
    <meta property="og:url" content="https://www.pianogame.mroudnitski.com" />
    <meta property="og:description" content="Learn to read sheet music with this simple game. Just type the notes as you read them." />
    <meta name="twitter:card" content="summary_large_image" />
    <meta property="twitter:domain" content="pianogame.mroudnitski.com" />
    <meta property="twitter:url" content="https://www.pianogame.mroudnitski.com" />
    <meta name="twitter:title" content="Piano Game" />
    <meta name="twitter:description" content="Learn to read sheet music with this simple game. Just type the notes as you read them." />
    <meta name="twitter:image" content="/og_image.png" />
    <link rel="icon" href="/favicon.ico" />
  </Head>
)
