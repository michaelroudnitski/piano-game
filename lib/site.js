// Site-wide metadata, shared by <PageHead> and checked against the web manifest in tests.
export const SITE_URL = 'https://www.pianogame.mroudnitski.com';
export const SITE_NAME = 'Piano Game';
export const SITE_DESCRIPTION =
  'Learn to read sheet music with this simple game. Just type the notes as you read them.';

export const OG_IMAGE = {
  url: `${SITE_URL}/og_image.png`,
  width: 1200,
  height: 630,
  alt: 'Piano Game: a correctly named note on a treble staff, above a one-octave piano and the score',
};

// Matches the body background in each color scheme (see styles/globals.css).
export const THEME_COLORS = { light: '#ffffff', dark: '#000000' };
