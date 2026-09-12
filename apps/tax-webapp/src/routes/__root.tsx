import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import '@astryxdesign/core/reset.css'
import '@astryxdesign/core/astryx.css'
import '@excited-live/design-system/mastercard-theme.css'
import '../styles.css'

const SITE_URL = 'https://tax.excited.live'
const TITLE = 'excited.live — Thailand income tax calculator'
const DESCRIPTION =
  'Estimate your Thailand income tax for 2026 — brackets, deductions, allowances, and refund, live in your browser.'
const OG_IMAGE = `${SITE_URL}/og.png`

/* Sitewide schema graph. The Organization node reuses the @id published by
   the landing page (excited.live/#org) so Google merges the entity across
   surfaces instead of seeing two brands; this app contributes its own
   WebApplication node on top. */
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://excited.live/#org',
      name: 'FromSukong',
      url: 'https://fromsukong.com',
      logo: 'https://excited.live/logo-mark.png',
      sameAs: [
        'https://www.instagram.com/excited.live/',
        'https://github.com/fromsukong/excited.live',
      ],
    },
    {
      '@type': 'WebApplication',
      '@id': `${SITE_URL}/#app`,
      name: 'excited.live Tax calculator',
      url: `${SITE_URL}/`,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      inLanguage: ['en', 'th'],
      isPartOf: { '@id': 'https://excited.live/#website' },
      publisher: { '@id': 'https://excited.live/#org' },
    },
  ],
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: TITLE },
      { name: 'description', content: DESCRIPTION },
      { name: 'theme-color', content: '#F3F0EE' },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'excited.live' },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESCRIPTION },
      { property: 'og:url', content: `${SITE_URL}/` },
      { property: 'og:image', content: OG_IMAGE },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: TITLE },
      { name: 'twitter:description', content: DESCRIPTION },
      { name: 'twitter:image', content: OG_IMAGE },
      { 'script:ld+json': jsonLd },
    ],
    links: [
      { rel: 'canonical', href: `${SITE_URL}/` },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Sofia+Sans:wght@400;450;500;600;700&display=swap',
      },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
