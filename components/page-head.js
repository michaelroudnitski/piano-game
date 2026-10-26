import Head from 'next/head';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, OG_IMAGE } from '../lib/site';

// Per-page <head> tags. Static, site-wide tags (lang, icons, manifest, theme-color) live in
// pages/_document.js.
export default function PageHead() {
  return (
    <Head>
      <title>{SITE_NAME}</title>
      {/* viewport-fit=cover lets the header and footer pad themselves around notches. */}
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <meta name="description" content={SITE_DESCRIPTION} />
      <link rel="canonical" href={`${SITE_URL}/`} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={SITE_NAME} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={`${SITE_URL}/`} />
      <meta property="og:description" content={SITE_DESCRIPTION} />
      <meta property="og:image" content={OG_IMAGE.url} />
      <meta property="og:image:width" content={String(OG_IMAGE.width)} />
      <meta property="og:image:height" content={String(OG_IMAGE.height)} />
      <meta property="og:image:alt" content={OG_IMAGE.alt} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:creator" content="@mroudnitski" />
      <meta property="twitter:domain" content="pianogame.mroudnitski.com" />
      <meta property="twitter:url" content={`${SITE_URL}/`} />
      <meta name="twitter:title" content={SITE_NAME} />
      <meta name="twitter:description" content={SITE_DESCRIPTION} />
      <meta name="twitter:image" content={OG_IMAGE.url} />
      <meta name="twitter:image:alt" content={OG_IMAGE.alt} />
    </Head>
  );
}
