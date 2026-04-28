# PWA Install Support Design

**Date:** 2026-04-29

**Goal:** Make SplitTrip installable on iOS and Android home screens with instant load via shell caching.

---

## Overview

Add PWA support using `vite-plugin-pwa`. The installed app loads from a precached shell (HTML/CSS/JS) so it feels native and loads instantly even on slow connections. Firebase data still requires an internet connection — no full offline support.

---

## Approach

`vite-plugin-pwa` hooks into the Vite build to:
1. Generate a `manifest.webmanifest` at the root
2. Register a Workbox-powered service worker that precaches all built static assets
3. Invalidate and re-precache on every new deploy automatically

---

## Files

| File | Change |
|------|--------|
| `vite.config.js` | Add `vite-plugin-pwa` plugin with manifest and workbox config |
| `index.html` | Add iOS Safari meta tags and apple-touch-icon link |
| `public/icon-192.png` | New — 192×192 app icon generated from `favicon.svg` |
| `public/icon-512.png` | New — 512×512 app icon generated from `favicon.svg` |

No new source files. No changes to app logic.

---

## Web App Manifest

Configured inside `vite.config.js` via the plugin (not a standalone file):

```js
manifest: {
  name: 'SplitTrip',
  short_name: 'SplitTrip',
  start_url: '/',
  display: 'standalone',
  background_color: '#0f0f0f',
  theme_color: '#0f0f0f',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}
```

Dark background/theme matches the existing app dark theme (`#0f0f0f`).

---

## Service Worker Strategy

- **Static assets (JS, CSS, HTML):** Precached on install via Workbox `generateSW`
- **Firebase API calls:** Not cached — pass straight to network
- **Cache invalidation:** Automatic on every `npm run build` + deploy (Workbox generates a new precache manifest with content hashes)

---

## iOS Safari Support

iOS Safari ignores the web manifest for home screen installs. These meta tags are required in `index.html`:

```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="SplitTrip" />
<link rel="apple-touch-icon" href="/icon-192.png" />
```

`black-translucent` status bar matches the dark theme.

---

## Icons

Generated from the existing `public/favicon.svg` using `sharp` (Node.js) as a one-off script — not added as a build dependency. Output:
- `public/icon-192.png`
- `public/icon-512.png`

---

## Out of Scope

- Full offline mode (trips/expenses available without internet)
- Push notifications
- Background sync
- Custom install prompt UI (browser default is sufficient)
