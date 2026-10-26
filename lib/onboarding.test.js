import { describe, expect, test } from 'bun:test';
import { HOW_TO_PLAY_KEY, hasSeenHowToPlay, markHowToPlaySeen } from './onboarding';

function memoryStorage() {
  const items = new Map();
  return {
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
  };
}

const throwingStorage = {
  getItem() {
    throw new Error('SecurityError');
  },
  setItem() {
    throw new Error('QuotaExceededError');
  },
};

describe('how-to-play onboarding flag', () => {
  test('a new visitor has not seen the card', () => {
    expect(hasSeenHowToPlay(memoryStorage())).toBe(false);
  });

  test('is remembered once marked', () => {
    const storage = memoryStorage();
    markHowToPlaySeen(storage);
    expect(storage.getItem(HOW_TO_PLAY_KEY)).toBe('1');
    expect(hasSeenHowToPlay(storage)).toBe(true);
  });

  test('ignores unexpected stored values', () => {
    const storage = memoryStorage();
    storage.setItem(HOW_TO_PLAY_KEY, 'yes');
    expect(hasSeenHowToPlay(storage)).toBe(false);
  });

  test('treats unusable storage as a new visitor, without throwing', () => {
    expect(hasSeenHowToPlay(throwingStorage)).toBe(false);
    expect(() => markHowToPlaySeen(throwingStorage)).not.toThrow();
    expect(hasSeenHowToPlay(null)).toBe(false);
    expect(() => markHowToPlaySeen(null)).not.toThrow();
  });

  test('works without a window (server render)', () => {
    expect(hasSeenHowToPlay()).toBe(false);
    expect(() => markHowToPlaySeen()).not.toThrow();
  });
});
