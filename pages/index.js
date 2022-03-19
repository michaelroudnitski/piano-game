import Head from 'next/head';
import { useEffect, useState } from 'react';

/* components */
import Footer from '../components/footer';
import Treble from '../components/treble';
import Bass from '../components/bass';

export default function Home() {
  const [note, setNote] = useState({ key: null, octave: 1 });
  const [correct, setCorrect] = useState(null);
  useEffect(() => setNote(chooseNote()), [])

  const handleGuess = (guess) => {
    if (guess.length != 1) return;

    guess === note.key ? handleCorrect() : handleWrong();
  }

  const handleCorrect = () => {
    setCorrect(true);

    setTimeout(() => {
      setCorrect(null);
      setNote(chooseNote());
    }, 500);
  }

  const handleWrong = () => {
    setCorrect(false);

    setTimeout(() => {
      setCorrect(null);
    }, 500);
  }

  if (note.key == null) {
    return null
  }

  return (
    <div>
      <Head>
        <title>Piano Game</title>
        <meta name="description" content="FILL ME" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <div className="flex flex-col h-screen items-center justify-center">
          <span className={correct ? "text-green-500" : "text-black"}>
            <Treble note={note} />
            {/* <Bass note={note} /> */}
          </span>

          <div className="mt-8">
            <input
              type="text"
              autoFocus={true}
              onChange={e => handleGuess(e.target.value.toUpperCase())}
              maxLength={1}
              className="px-2 py-3 uppercase text-center rounded-lg text-2xl font-bold border-0 shadow-lg ring-gray-600 ring focus:ring focus:ring-yellow-500"
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
