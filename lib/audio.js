// Sound for the piano game: a tiny Web Audio piano and a persisted mute switch.
//
// Each note is built from layered sine partials, stretched slightly the way a
// stiff piano string's are, with a fast attack, a two-stage exponential decay
// (upper partials fading first) and a gentle low-pass. No samples, no dependencies.
//
// Browsers only start audio from a user gesture, and iOS Safari is the strictest:
// the AudioContext has to be created and resumed inside one. So nothing is created
// at import or on mount. The first playNote() call, which the game makes from a
// key or tap handler, creates the context, and every call resumes it if needed.
// On the server, and in browsers without Web Audio, everything is a silent no-op.

/* ---------------------------------------------------------------- pitch */

const PITCH_CLASSES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Equal-tempered frequency of a MIDI note number: A4 (69) is 440 Hz. */
export function midiToFrequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

/**
 * MIDI number of a game note `{ key, octave }`, where octave counts from the
 * treble staff: 1 is C4–B4 and 2 is C5 upward (C4 = 60). A `midi` field wins.
 */
export function noteToMidi(note) {
  if (Number.isFinite(note.midi)) return note.midi;
  return 12 * (note.octave + 4) + PITCH_CLASSES[note.key];
}

/**
 * The guessed letter in the octave nearest the target, so a wrong answer sounds
 * next to the right one. It is never more than three staff steps away.
 */
export function guessToMidi(letter, targetMidi) {
  const pitchClass = PITCH_CLASSES[letter];
  if (pitchClass === undefined) return NaN;
  const up = (((pitchClass - targetMidi) % 12) + 12) % 12;
  if (up < 6) return targetMidi + up;
  if (up > 6) return targetMidi + up - 12;
  // A tritone either way. Among naturals that's only F and B: B sits three staff
  // steps above F, and F three steps below B.
  return targetMidi % 12 === PITCH_CLASSES.F ? targetMidi + 6 : targetMidi - 6;
}

/* ---------------------------------------------------------------- synth */

// Relative strengths of the first eight partials of a mid-register piano tone.
const PARTIALS = [1, 0.55, 0.33, 0.21, 0.13, 0.08, 0.05, 0.03];
// A stiff string stretches partial n to about n·f·√(1 + B·n²) (here measured
// from an exactly-tuned fundamental). That slight inharmonicity is much of what
// makes a piano sound unlike an organ.
const INHARMONICITY = 0.0004;
// Peak gain of one voice at full velocity, leaving headroom for overlaps.
const VOICE_LEVEL = 0.25;
// Schedule a little ahead of currentTime so a busy main thread can never cut
// into the attack ramp, which would click. 10 ms is imperceptible as latency.
const LOOKAHEAD = 0.01;
// Let the audio hardware sleep after this long without a note.
const IDLE_SUSPEND_MS = 30_000;
// A decay is ~78 dB down after this many time constants, so stopping there is silent.
const FADED = 9;

// Times are in seconds at middle C. Higher notes, like shorter strings, are quicker.
const TONES = {
  // A clean, bright strike that rings and mellows for a couple of seconds.
  correct: {
    velocity: 1,
    brightness: 1, // partial n is scaled by brightness^(n-1)
    cutoff: 10, // low-pass cutoff, as a multiple of the fundamental
    attack: 0.004,
    drop: 0.1, // time constant of the quick fall after the strike...
    sustain: 0.4, // ...towards this fraction of the peak...
    hold: 0.25, // ...until the long ring takes over
    ring: 0.8, // time constant of the long ring
    shimmer: 0.7, // time constant of the second partial; higher ones fade faster
  },
  // The same piano touched softly and damped at once. The pitch is clear, but it
  // doesn't ring or bite, so even the fiftieth miss is easy on the ears.
  wrong: {
    velocity: 0.75,
    brightness: 0.7,
    cutoff: 4,
    attack: 0.008,
    drop: 0.11,
    sustain: 0,
    shimmer: 0.25,
  },
};

/** Schedule one struck note on `ctx` and return a handle for damping it. */
function scheduleVoice(ctx, destination, midi, when, tone) {
  const f0 = midiToFrequency(midi);
  const scale = Math.min(1.2, Math.max(0.45, Math.sqrt(262 / f0)));
  // A touch of variation, so no two strikes are quite alike.
  const peak = VOICE_LEVEL * tone.velocity * (0.96 + Math.random() * 0.08);

  // partials -> low-pass -> envelope -> damper -> destination
  const damper = ctx.createGain();
  damper.connect(destination);
  const envelope = ctx.createGain();
  envelope.gain.value = 0;
  envelope.connect(damper);
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = Math.min(f0 * tone.cutoff, 9000);
  lowpass.Q.value = -3; // dB for a low-pass: maximally flat, no resonant bump
  lowpass.connect(envelope);

  const oscillators = [];
  PARTIALS.forEach((strength, i) => {
    const n = i + 1;
    const frequency = f0 * n * Math.sqrt((1 + INHARMONICITY * n * n) / (1 + INHARMONICITY));
    const level = strength * tone.brightness ** i;
    if (frequency > ctx.sampleRate * 0.45 || level < 0.004) return;
    const partial = ctx.createGain();
    partial.gain.setValueAtTime(level, when);
    // Upper partials die away first: a bright strike that mellows as it rings.
    if (i > 0) partial.gain.setTargetAtTime(0, when, (tone.shimmer * scale) / i);
    partial.connect(lowpass);
    const osc = ctx.createOscillator();
    osc.frequency.value = frequency;
    osc.connect(partial);
    osc.start(when);
    oscillators.push(osc);
  });

  // Fast attack, a quick fall from the strike, then (for a ringing tone) a long
  // exponential tail. Every change is a ramp, so nothing clicks.
  const gain = envelope.gain;
  gain.setValueAtTime(0, when);
  gain.linearRampToValueAtTime(peak, when + tone.attack);
  gain.setTargetAtTime(peak * tone.sustain, when + tone.attack, tone.drop * scale);
  let end = when + tone.attack + tone.drop * scale * FADED;
  if (tone.sustain > 0) {
    const ringFrom = when + tone.attack + tone.hold * scale;
    gain.setTargetAtTime(0, ringFrom, tone.ring * scale);
    end = ringFrom + tone.ring * scale * FADED;
  }
  oscillators.forEach((osc) => osc.stop(end));
  return { start: when, end, damper, oscillators };
}

/**
 * A piano on any BaseAudioContext (an OfflineAudioContext works too).
 * `play(midi, { wrong, velocity, at })` strikes a note; `silence()` fades out
 * whatever is still ringing.
 */
export function createPiano(ctx, destination = ctx.destination) {
  // A limiter on the bus, so a burst of overlapping notes can't clip.
  const bus = ctx.createDynamicsCompressor();
  bus.threshold.value = -6;
  bus.knee.value = 6;
  bus.ratio.value = 20;
  bus.attack.value = 0.002;
  bus.release.value = 0.2;
  bus.connect(destination);

  const voices = new Set();

  // Fade a voice out from `at` with time constant `tau`, unless it ends sooner anyway.
  function damp(voice, at, tau) {
    const end = at + tau * FADED;
    if (end >= voice.end) return;
    voice.damper.gain.setTargetAtTime(0, at, tau);
    voice.end = end;
    for (const osc of voice.oscillators) {
      try {
        osc.stop(end);
      } catch {
        // Old WebKit refuses a second stop(); the damper has silenced it anyway.
      }
    }
  }

  return {
    context: ctx,
    play(midi, { wrong = false, velocity, at = ctx.currentTime + LOOKAHEAD } = {}) {
      // Lift the earlier keys, as a pianist would, so notes don't pile up. A key
      // struck only a moment ago (mashing) is cut quicker, still without a click.
      for (const voice of voices) {
        damp(voice, Math.max(at, voice.start), at - voice.start < 0.05 ? 0.015 : 0.1);
      }
      const tone = TONES[wrong ? 'wrong' : 'correct'];
      const voice = scheduleVoice(ctx, bus, midi, at, velocity === undefined ? tone : { ...tone, velocity });
      voices.add(voice);
      voice.oscillators[0].onended = () => {
        voice.damper.disconnect();
        voices.delete(voice);
      };
      return voice;
    },
    silence(at = ctx.currentTime + LOOKAHEAD) {
      for (const voice of voices) damp(voice, at, 0.03);
    },
  };
}

/* ----------------------------------------------------------- live audio */

let piano = null;
let idleTimer;
let warned = false;

// The page's piano, created on first use (always inside a user gesture).
function livePiano() {
  if (!piano) {
    const AudioContextClass =
      typeof window === 'undefined' ? undefined : window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    piano = createPiano(new AudioContextClass({ latencyHint: 'interactive' }));
  }
  const { context } = piano;
  // A new context may start suspended, and iOS suspends ("interrupts") it when the
  // page is backgrounded. Either way it may only resume from a gesture, like this one.
  if (context.state !== 'running') context.resume?.()?.catch?.(() => {});
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (context.state === 'running') context.suspend?.()?.catch?.(() => {});
  }, IDLE_SUSPEND_MS);
  return piano;
}

/**
 * Play a MIDI note: a ringing tone, or with `{ wrong: true }` a soft damped one.
 * Call it from a user gesture (key or tap handler). Returns whether it sounded.
 */
export function playNote(midi, options) {
  if (!Number.isFinite(midi) || isMuted()) return false;
  try {
    const live = livePiano();
    if (!live) return false;
    live.play(midi, options);
    return true;
  } catch (error) {
    if (!warned) {
      warned = true;
      console.warn('Piano Game: sound is unavailable.', error);
    }
    return false;
  }
}

/* ----------------------------------------------------------------- mute */

const STORAGE_KEY = 'piano-game:muted';
const listeners = new Set();
let muted; // read from localStorage on first use in the browser

/** Whether sound is muted. Always false on the server. */
export function isMuted() {
  if (muted === undefined) {
    if (typeof window === 'undefined') return false;
    try {
      muted = window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      muted = false; // storage blocked (private mode, sandboxed frame)
    }
  }
  return muted;
}

/** Mute or unmute, remember it, and fade out anything still ringing. */
export function setMuted(value) {
  const next = Boolean(value);
  if (typeof window === 'undefined' || next === isMuted()) return;
  muted = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
  } catch {
    // Not persisted, but still applies for this visit.
  }
  if (next) {
    try {
      piano?.silence();
    } catch {
      // Nothing worth surfacing: the next note is skipped anyway.
    }
  }
  listeners.forEach((listener) => listener());
}

/** Subscribe to mute changes (fits React's useSyncExternalStore). */
export function subscribeMuted(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
