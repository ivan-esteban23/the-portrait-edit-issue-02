# Responsive reader QA

The compact reader toolbar keeps Index, page entry, Display, and Focus available.
Tools reveals presentation, fullscreen, audio, bookmarks, and keyboard shortcuts.
It is a nonmodal disclosure: Tab follows normal document order; Escape from the
panel closes it and restores focus to Tools. Wide screens retain inline tools.
Resizing changes presentation without remounting the reader or clearing preferences.
The publication header scrolls away while the reader toolbar stays available.

## Automated coverage

```sh
npm ci
npx playwright install --with-deps chromium firefox webkit
npm run build
npm test
npm run test:e2e
```

The existing seven viewport/theme projects run the full Chromium suite. The
`chromium-responsive`, `firefox-responsive`, and `webkit-responsive` projects run
the focused responsive suite at 320×740, 390×844, 844×390, 834×1112,
1194×834, 1366×768, and 1920×1080. These projects also exercise rotation/resizing,
retained reading size/theme/bookmarks, keyboard navigation, dialog focus, overflow,
and a 683×384 CSS viewport representing the reflow space at 200% zoom on a
1366×768 display. This is a reflow check, not certification of browser zoom or
physical hardware. Existing Chromium projects also exercise touch emulation.

To run just this suite:

```sh
npx playwright test --project=chromium-responsive --project=firefox-responsive --project=webkit-responsive
```

Browser downloads require `cdn.playwright.dev` and
`playwright.download.prss.microsoft.com`. On a cloud machine with an unwritable
home cache, set `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright` for both
installation and execution. Restart Vite after reinstalling dependencies.

## Manual release checks (not completed by viewport emulation)

- [ ] Chrome, Edge, Brave, and Opera: verify reading, Display, Tools, images, and
      downloads; include Windows at native display scaling and browser zoom 200%.
- [ ] Firefox desktop and Android: repeat navigation, overflow, and keyboard/touch
      checks. Playwright Firefox does not emulate mobile Firefox hardware.
- [ ] Safari on macOS, iPhone, and iPad: check dynamic browser bars, safe areas,
      pinch zoom, touch targets, image inspection, and dialog scrolling.
- [ ] Rotate a physical phone and tablet while reading and while Display is open;
      verify page, mode, text size, theme, and bookmarks remain selected.
- [ ] On a short laptop and a wide desktop, verify single-page and spread modes,
      keyboard focus, reduced motion, and no covered content at the document end.

Record browser version, OS, device, orientation, result, and any issue link. An
engine test pass does not establish a pass for every branded browser or device.
