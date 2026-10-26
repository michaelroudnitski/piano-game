import { Html, Head, Main, NextScript } from 'next/document';
import { THEME_COLORS } from '../lib/site';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Paint the right canvas color before any CSS loads, so dark mode never flashes white. */}
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content={THEME_COLORS.light} />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content={THEME_COLORS.dark} />
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
