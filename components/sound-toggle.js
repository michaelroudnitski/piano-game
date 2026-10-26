import { useEffect, useSyncExternalStore } from 'react';
import { isMuted, playNote, setMuted, subscribeMuted } from '../lib/audio';
import HeaderButton from './header-button';

// Sound on/off button. It is self-contained: the setting persists through
// lib/audio and the component owns the M shortcut, so it can sit anywhere on the
// page. Position it with `className`.
export default function SoundToggle({ className = '' }) {
  // The server and hydration render "on"; a stored "off" applies right after.
  const muted = useSyncExternalStore(subscribeMuted, isMuted, serverSnapshot);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'm' && e.key !== 'M') return;
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || isTyping(e.target)) return;
      e.preventDefault();
      toggleSound();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <HeaderButton
      label="Mute sound"
      title={muted ? 'Unmute (M)' : 'Mute (M)'}
      aria-pressed={muted}
      aria-keyshortcuts="M"
      onClick={toggleSound}
      className={className}
    >
      <SpeakerIcon muted={muted} />
    </HeaderButton>
  );
}

const serverSnapshot = () => false;

function toggleSound() {
  const mute = !isMuted();
  setMuted(mute);
  // A soft note confirms that sound is back on.
  if (!mute) playNote(76, { velocity: 0.45 });
}

function isTyping(target) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

function SpeakerIcon({ muted }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      {muted ? (
        <path d="m23 9-6 6m0-6 6 6" />
      ) : (
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
      )}
    </svg>
  );
}
