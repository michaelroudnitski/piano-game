import Head from 'next/head';
import { useEffect, useState } from 'react';

/* components */
import Footer from '../components/footer';
import Treble from '../components/treble';
import Bass from '../components/bass';

export default function Home() {
  const [note, setNote] = useState(chooseNote());

  return (
    <div>
      <Head>
        <title>Piano Game</title>
        <meta name="description" content="FILL ME" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <div className="flex flex-col h-screen items-center justify-center">
          <Treble note={note} />
          {/* <Bass note={note} /> */}
          <div className="mt-12">
            <input type="text" autoFocus={true} placeholder="." className="px-2 py-3 relative bg-white uppercase text-center rounded-lg text-2xl font-bold border-0 shadow-md outline-none focus:outline-none ring-gray-600 ring focus:ring"/>
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
  return notes[index];
}
