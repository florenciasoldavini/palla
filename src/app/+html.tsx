import { ScrollViewStyleReset } from 'expo-router/html';

import type { PropsWithChildren } from 'react';

const configuredSiteUrl = new URL(process.env.EXPO_PUBLIC_SITE_URL || 'https://palla.vercel.app');
// Local auth redirects should never become public social-preview image URLs.
const isLocalSite =
  ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(configuredSiteUrl.hostname) ||
  configuredSiteUrl.hostname.endsWith('.localhost');
const siteUrl = isLocalSite ? 'https://palla.vercel.app' : configuredSiteUrl.origin;
const title = 'Palla | Play more, meet more.';
const description =
  'Play more, meet more. Palla brings players and organizers together for recurring social padel sessions in Buenos Aires.';
const imageUrl = `${siteUrl}/og/palla-og-cover.png`;
const imageAlt =
  'Palla — Play more, meet more. Social padel in Buenos Aires, with a capybara mascot holding a padel racket and bottle.';

// Included in every exported web page, even before fonts or auth have loaded.
export default function RootHtml({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="theme-color" content="#d4ff00" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Palla" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={imageAlt} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={imageUrl} />
        <meta name="twitter:image:alt" content={imageAlt} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
