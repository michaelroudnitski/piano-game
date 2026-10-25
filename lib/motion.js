// One-shot animations through the Web Animations API, so they can be restarted
// on every event. They are skipped when the user prefers reduced motion; the
// state they decorate (colors, icons, outlines) is always rendered without them.

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

export function animate(el, keyframes, options) {
  if (!el?.animate || prefersReducedMotion()) return null;
  return el.animate(keyframes, options);
}

/** A short horizontal "no" shake. Uses `translate`, so it composes with transforms. */
export const SHAKE = {
  keyframes: [
    { translate: '0' },
    { translate: '-4px 0' },
    { translate: '4px 0' },
    { translate: '-3px 0' },
    { translate: '2px 0' },
    { translate: '0' },
  ],
  options: { duration: 320, easing: 'ease-in-out' },
};

/** A springy scale-in for icons and badges. */
export const POP_IN = {
  keyframes: [
    { scale: '0.4', opacity: 0 },
    { scale: '1.2', opacity: 1, offset: 0.6 },
    { scale: '1' },
  ],
  options: { duration: 260, easing: 'ease-out' },
};

/** A brief swell, for something that is already on screen. */
export const BUMP = {
  keyframes: [{ scale: '1' }, { scale: '1.25' }, { scale: '1' }],
  options: { duration: 280, easing: 'ease-out' },
};
