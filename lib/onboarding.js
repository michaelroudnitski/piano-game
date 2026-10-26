// Remembers whether this browser has already seen the "How to play" card.
// Storage can be missing or throw (private modes, blocked site data), so every access is guarded;
// without storage the card simply shows on each visit.
export const HOW_TO_PLAY_KEY = 'piano-game:how-to-play-seen';

function defaultStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function hasSeenHowToPlay(storage = defaultStorage()) {
  try {
    return storage?.getItem(HOW_TO_PLAY_KEY) === '1';
  } catch {
    return false;
  }
}

export function markHowToPlaySeen(storage = defaultStorage()) {
  try {
    storage?.setItem(HOW_TO_PLAY_KEY, '1');
  } catch {
    // Nothing to do: the card will just show again next visit.
  }
}
