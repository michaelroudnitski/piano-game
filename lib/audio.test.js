import { afterAll, describe, expect, test } from 'bun:test';
import {
  guessToMidi,
  isMuted,
  midiToFrequency,
  noteToMidi,
  playNote,
  setMuted,
  subscribeMuted,
} from './audio';

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const PITCH_CLASSES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

describe('pitch math', () => {
  test('C4 is MIDI 60', () => {
    expect(noteToMidi({ key: 'C', octave: 1 })).toBe(60);
  });

  test('A4 is 440 Hz, and octaves double', () => {
    expect(midiToFrequency(noteToMidi({ key: 'A', octave: 1 }))).toBe(440);
    expect(midiToFrequency(81)).toBe(880);
    expect(midiToFrequency(57)).toBe(220);
    expect(midiToFrequency(60)).toBeCloseTo(261.6256, 4);
  });

  test('maps the treble range: octave 1 is C4–B4, octave 2 is C5 up', () => {
    expect(LETTERS.map((key) => noteToMidi({ key, octave: 1 }))).toEqual([60, 62, 64, 65, 67, 69, 71]);
    expect(LETTERS.map((key) => noteToMidi({ key, octave: 2 }))).toEqual([72, 74, 76, 77, 79, 81, 83]);
  });

  test('a note that carries its own midi number keeps it', () => {
    expect(noteToMidi({ key: 'E', octave: 1, midi: 40 })).toBe(40);
  });

  test('a correct guess is the target itself', () => {
    for (let target = 55; target <= 86; target++) {
      const letter = LETTERS.find((l) => PITCH_CLASSES[l] === target % 12);
      if (letter) expect(guessToMidi(letter, target)).toBe(target);
    }
  });

  test('a wrong guess sounds in the octave nearest the target', () => {
    expect(guessToMidi('D', 60)).toBe(62); // C4, guessed D: D4
    expect(guessToMidi('B', 60)).toBe(59); // C4, guessed B: B3, a step down
    expect(guessToMidi('G', 60)).toBe(55); // C4, guessed G: G3, not G4
    expect(guessToMidi('C', 81)).toBe(84); // A5, guessed C: C6
    expect(guessToMidi('E', 81)).toBe(76); // A5, guessed E: E5
  });

  test('F and B, a tritone apart either way, resolve to the nearer staff position', () => {
    expect(guessToMidi('B', 65)).toBe(71); // F4: B4 is 3 steps up, B3 is 4 down
    expect(guessToMidi('F', 71)).toBe(65); // B4: F4 is 3 steps down, F5 is 4 up
    expect(guessToMidi('B', 77)).toBe(83); // F5 -> B5
    expect(guessToMidi('F', 83)).toBe(77); // B5 -> F5
  });

  test('every guess is the right letter, at most 3 staff steps from the target', () => {
    for (const target of [...LETTERS.map((k) => 60 + PITCH_CLASSES[k]), ...LETTERS.map((k) => 72 + PITCH_CLASSES[k])]) {
      for (const letter of LETTERS) {
        const midi = guessToMidi(letter, target);
        expect(((midi % 12) + 12) % 12).toBe(PITCH_CLASSES[letter]);
        expect(Math.abs(midi - target)).toBeLessThanOrEqual(6);
      }
    }
  });

  test('an unknown letter gives NaN, which playNote ignores', () => {
    expect(guessToMidi('H', 60)).toBeNaN();
    expect(playNote(NaN)).toBe(false);
  });
});

// The module keeps one AudioContext and the mute flag for the page's lifetime,
// so the tests below run in order: server first, then a fake browser.
describe('outside a browser (server render)', () => {
  test('nothing throws and nothing plays', () => {
    expect(typeof window).toBe('undefined');
    expect(isMuted()).toBe(false);
    expect(() => setMuted(true)).not.toThrow();
    expect(isMuted()).toBe(false); // nothing to persist to, so nothing changes
    expect(playNote(60)).toBe(false);
    const unsubscribe = subscribeMuted(() => {});
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });
});

describe('in a browser', () => {
  const storage = new Map([['piano-game:muted', '1']]); // muted on a previous visit
  const localStorage = {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value)),
  };
  const browserWindow = { localStorage, AudioContext: FakeAudioContext };
  afterAll(() => {
    delete globalThis.window;
  });

  test('a mute from an earlier visit is remembered, and nothing is created while muted', () => {
    globalThis.window = browserWindow;
    expect(isMuted()).toBe(true);
    expect(playNote(60)).toBe(false);
    expect(FakeAudioContext.instances).toHaveLength(0);
  });

  test('unmuting persists and notifies subscribers', () => {
    let calls = 0;
    const unsubscribe = subscribeMuted(() => calls++);
    setMuted(false);
    unsubscribe();
    setMuted(false); // no change, no notification
    expect(calls).toBe(1);
    expect(isMuted()).toBe(false);
    expect(storage.get('piano-game:muted')).toBe('0');
  });

  test('without Web Audio, playing is a silent no-op', () => {
    globalThis.window = { localStorage };
    try {
      expect(playNote(60)).toBe(false);
    } finally {
      globalThis.window = browserWindow;
    }
  });

  test('the AudioContext is created by the first note, resumed, then reused', () => {
    expect(FakeAudioContext.instances).toHaveLength(0);
    expect(playNote(69)).toBe(true);
    expect(FakeAudioContext.instances).toHaveLength(1);
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.resumes).toBe(1);
    expect(ctx.oscillators[0].frequency.value).toBe(440); // the fundamental is in tune

    ctx.currentTime = 1;
    expect(playNote(guessToMidi('B', 69), { wrong: true })).toBe(true);
    expect(FakeAudioContext.instances).toHaveLength(1);
    expect(ctx.resumes).toBe(1); // already running

    ctx.state = 'interrupted'; // e.g. iOS after a phone call
    playNote(60);
    expect(ctx.resumes).toBe(2);
  });

  test('every voice fades in from silence and stops only once faded', () => {
    const ctx = FakeAudioContext.instances[0];
    const envelopes = ctx.gains.filter((g) => g.gain.events[0]?.[0] === 'set' && g.gain.events[0][1] === 0);
    expect(envelopes.length).toBeGreaterThanOrEqual(3);
    for (const { gain } of envelopes) {
      const [[, , start], [kind, peak, attackEnd]] = gain.events;
      expect(kind).toBe('ramp');
      expect(peak).toBeGreaterThan(0);
      expect(attackEnd).toBeGreaterThan(start);
    }
    for (const osc of ctx.oscillators) expect(osc.stopAt).toBeGreaterThan(osc.startAt);
  });

  test('muting persists and quickly silences whatever is ringing', () => {
    const ctx = FakeAudioContext.instances[0];
    ctx.currentTime = 2;
    playNote(72);
    setMuted(true);
    expect(storage.get('piano-game:muted')).toBe('1');
    const ringing = ctx.oscillators.filter((osc) => osc.startAt >= 2);
    expect(ringing.length).toBeGreaterThan(0);
    for (const osc of ringing) expect(osc.stopAt).toBeLessThan(2.5);
    expect(playNote(72)).toBe(false);
  });
});

/* A just-enough stand-in for AudioContext that records what the synth asks for. */
function fakeParam(value) {
  const events = [];
  return {
    value,
    events,
    setValueAtTime: (v, t) => events.push(['set', v, t]),
    linearRampToValueAtTime: (v, t) => events.push(['ramp', v, t]),
    setTargetAtTime: (v, t, c) => events.push(['target', v, t, c]),
  };
}

function fakeNode(props) {
  return { connect() {}, disconnect() {}, ...props };
}

class FakeAudioContext {
  static instances = [];

  constructor() {
    FakeAudioContext.instances.push(this);
    this.state = 'suspended';
    this.currentTime = 0;
    this.sampleRate = 48000;
    this.destination = fakeNode();
    this.resumes = 0;
    this.gains = [];
    this.oscillators = [];
  }

  resume() {
    this.resumes++;
    this.state = 'running';
    return Promise.resolve();
  }

  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }

  createGain() {
    const node = fakeNode({ gain: fakeParam(1) });
    this.gains.push(node);
    return node;
  }

  createBiquadFilter() {
    return fakeNode({ type: 'lowpass', frequency: fakeParam(350), Q: fakeParam(1) });
  }

  createDynamicsCompressor() {
    const [threshold, knee, ratio, attack, release] = [-24, 30, 12, 0.003, 0.25].map(fakeParam);
    return fakeNode({ threshold, knee, ratio, attack, release });
  }

  createOscillator() {
    const osc = fakeNode({
      frequency: fakeParam(440),
      start: (t) => (osc.startAt = t),
      stop: (t) => (osc.stopAt = t),
    });
    this.oscillators.push(osc);
    return osc;
  }
}
