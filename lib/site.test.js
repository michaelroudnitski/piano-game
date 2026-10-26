import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SITE_URL, SITE_NAME, OG_IMAGE, THEME_COLORS } from './site';

const publicFile = (name) => fileURLToPath(new URL(`../public/${name.replace(/^\//, '')}`, import.meta.url));

function pngSize(path) {
  const bytes = readFileSync(path);
  expect(bytes.subarray(1, 4).toString('ascii')).toBe('PNG');
  return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;
}

describe('share metadata', () => {
  test('uses absolute https URLs, so link previews can load the image', () => {
    expect(SITE_URL).toMatch(/^https:\/\/[^/]+$/);
    expect(OG_IMAGE.url.startsWith(`${SITE_URL}/`)).toBe(true);
  });

  test('declares the real size of the OG image', () => {
    const file = publicFile(new URL(OG_IMAGE.url).pathname);
    expect(pngSize(file)).toBe(`${OG_IMAGE.width}x${OG_IMAGE.height}`);
  });
});

describe('web manifest', () => {
  const manifest = JSON.parse(readFileSync(publicFile('manifest.webmanifest'), 'utf8'));

  test('names the app and starts at the root', () => {
    expect(manifest.name).toBe(SITE_NAME);
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.background_color).toBe(THEME_COLORS.light);
  });

  test('every icon exists at its declared size', () => {
    for (const icon of manifest.icons) {
      const file = publicFile(icon.src);
      expect(existsSync(file)).toBe(true);
      if (icon.type === 'image/png') expect(pngSize(file)).toBe(icon.sizes);
    }
  });

  test('offers a 192px and 512px icon, and a maskable one for Android', () => {
    const sizes = manifest.icons.map((icon) => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  });

  test('has an apple-touch-icon for iOS home screens', () => {
    expect(pngSize(publicFile('apple-touch-icon.png'))).toBe('180x180');
  });
});
