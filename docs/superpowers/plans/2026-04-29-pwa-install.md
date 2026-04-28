# PWA Install Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make SplitTrip installable on iOS and Android home screens with an app shell cached by a Workbox service worker.

**Architecture:** `vite-plugin-pwa` hooks into the Vite build to emit a `manifest.webmanifest` and a Workbox-powered service worker that precaches all static assets. iOS Safari requires separate `<meta>` tags since it ignores the web manifest for home screen install. Icons are generated from the existing `public/favicon.svg` using a one-off Node script with `sharp`.

**Tech Stack:** vite-plugin-pwa, Workbox (via vite-plugin-pwa), sharp (icon generation only)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `scripts/generate-icons.js` | Create | One-off script to rasterize favicon.svg → PNG icons |
| `public/icon-192.png` | Create | 192×192 app icon for Android + iOS touch icon |
| `public/icon-512.png` | Create | 512×512 app icon for splash screen + maskable |
| `vite.config.js` | Modify | Add VitePWA plugin with manifest + workbox config |
| `index.html` | Modify | Add iOS meta tags, update title to SplitTrip |

---

### Task 1: Generate PNG icons from favicon.svg

**Files:**
- Create: `scripts/generate-icons.js`
- Create: `public/icon-192.png` (output)
- Create: `public/icon-512.png` (output)

- [ ] **Step 1: Install sharp as a dev dependency**

```bash
npm install -D sharp
```

Expected: sharp appears in `devDependencies` in `package.json`.

- [ ] **Step 2: Create the icon generation script**

Create `scripts/generate-icons.js`:

```js
import sharp from 'sharp'

await sharp('public/favicon.svg').resize(192, 192).png().toFile('public/icon-192.png')
await sharp('public/favicon.svg').resize(512, 512).png().toFile('public/icon-512.png')
console.log('✓ public/icon-192.png')
console.log('✓ public/icon-512.png')
```

- [ ] **Step 3: Run the script**

```bash
node scripts/generate-icons.js
```

Expected output:
```
✓ public/icon-192.png
✓ public/icon-512.png
```

- [ ] **Step 4: Verify the icons exist and have reasonable file sizes**

```bash
ls -lh public/icon-192.png public/icon-512.png
```

Expected: both files exist, icon-192.png ~10–50 KB, icon-512.png ~50–200 KB.

- [ ] **Step 5: Commit**

```bash
rtk git add public/icon-192.png public/icon-512.png scripts/generate-icons.js package.json package-lock.json
rtk git commit -m "feat: generate PNG icons for PWA install"
```

---

### Task 2: Install vite-plugin-pwa and configure manifest + service worker

**Files:**
- Modify: `vite.config.js`

- [ ] **Step 1: Install vite-plugin-pwa**

```bash
npm install -D vite-plugin-pwa
```

Expected: `vite-plugin-pwa` appears in `devDependencies` in `package.json`.

- [ ] **Step 2: Update vite.config.js**

Replace the full contents of `vite.config.js` with:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
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
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
  },
})
```

- [ ] **Step 3: Run the existing test suite to confirm nothing broke**

```bash
rtk vitest run
```

Expected: `PASS (35) FAIL (0)`

- [ ] **Step 4: Build and verify service worker and manifest are emitted**

```bash
npm run build && ls dist/sw.js dist/manifest.webmanifest
```

Expected:
```
dist/sw.js
dist/manifest.webmanifest
```

- [ ] **Step 5: Commit**

```bash
rtk git add vite.config.js package.json package-lock.json
rtk git commit -m "feat: add vite-plugin-pwa with manifest and Workbox service worker"
```

---

### Task 3: Add iOS meta tags to index.html, update title, deploy

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Update index.html**

Replace the full contents of `index.html` with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="SplitTrip" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
    <title>SplitTrip</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Run tests**

```bash
rtk vitest run
```

Expected: `PASS (35) FAIL (0)`

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
rtk git add index.html
rtk git commit -m "feat: add iOS PWA meta tags and fix title to SplitTrip"
```

- [ ] **Step 5: Push and deploy**

```bash
rtk git push && firebase deploy --only hosting
```

Expected: deploy completes, Hosting URL shown as `https://splittripid.web.app`.
