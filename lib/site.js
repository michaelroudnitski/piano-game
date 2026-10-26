// Site-wide metadata, shared by <PageHead> and checked against the web manifest in tests.
export const SITE_URL = 'https://www.pianogame.mroudnitski.com';
export const SITE_NAME = 'Piano Game';
export const SITE_DESCRIPTION =
  'Learn to read sheet music with this simple game. Just type the notes as you read them.';

export const OG_IMAGE = {
  url: `${SITE_URL}/og_image.png`,
  width: 1066,
  height: 644,
  alt: 'A treble staff with one note, above a one-octave piano keyboard',
};

// Matches the body background in each color scheme (see styles/globals.css).
export const THEME_COLORS = { light: '#ffffff', dark: '#000000' };
