# Responsive reader QA

The compact reader toolbar keeps Index, page entry, Display, and Focus available.
Tools reveals presentation, fullscreen, audio, bookmarks, and keyboard shortcuts.
It is a nonmodal disclosure: Tab follows normal document order; Escape from the
panel closes it and restores focus to Tools. Wide screens retain inline tools.
Resizing changes presentation without remounting the reader or clearing preferences.
The publication header and compact reader toolbar scroll away with the page in
both Focus modes. Scroll back to the top to reach them; the existing phone
bottom-navigation dock remains available.

## Automated coverage

```sh
npm ci
npx playwright install --with-deps chromium firefox
npm run build
npm test
npm run test:e2e
```

The existing seven viewport/theme projects run the full Chromium suite. The
`chromium-responsive` and `firefox-responsive` projects run
the focused responsive suite at 320×740, 390×844, 844×390, 834×1112,
1194×834, 1366×768, and 1920×1080. These projects also exercise rotation/resizing,
retained reading size/theme/bookmarks, keyboard navigation, dialog focus, overflow,
and a 683×384 CSS viewport representing the reflow space at 200% zoom on a
1366×768 display. This is a reflow check, not certification of browser zoom or
physical hardware. Existing Chromium projects also exercise touch emulation.

To run just this suite:

```sh
npx playwright test --project=chromium-responsive --project=firefox-responsive
```

WebKit is deferred and excluded from the default run. To enable it later:

```sh
npx playwright install --with-deps webkit
PLAYWRIGHT_WEBKIT=1 npx playwright test --project=webkit-responsive
```

The GitHub Actions manual workflow also offers an `include_webkit` checkbox.

Browser downloads require `cdn.playwright.dev` and
`playwright.download.prss.microsoft.com`. On a cloud machine with an unwritable
home cache, set `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright` for both
installation and execution. Restart Vite after reinstalling dependencies.

## Archive cards

Portraits have no caption or action overlays. Copy and Save sit below the text;
More opens comparison, parameter/Markdown copying, and native sharing when the
browser supports it. Escape closes More and restores its trigger; moving focus
or clicking outside dismisses it. Tags are native buttons and wrap without clipping.

The archive retains two columns at 360–767px and three at larger widths. Below
360px, it uses one column so the three footer controls retain 44px touch targets.

Both responsive engine projects also run `archive-cards.spec.ts` at 320, 390,
430, 834, 1366, and 1920px. Checks cover clear portraits, action/menu bounds,
copying, sharing, comparison, bookmarking, keyboard dismissal, and tag filtering.
Existing Chromium checks cover archive routing, multi-selection, print output,
and Compare Lab focus behavior.

## Linux release checks

Linux is the primary development and validation platform for this change. Run the
Chromium and Firefox responsive projects on Linux. WebKit also runs on Linux;
it does not require macOS and does not certify Safari on Apple hardware.

- [ ] Spot-check Chrome/Chromium and Firefox on Linux with keyboard navigation,
      browser zoom at 200%, short laptop windows, and wide desktop windows.
- [ ] Verify desktop single-page/spread modes and reduced motion.

## Optional wider-platform checks (not completed by viewport emulation)

These checks are outside the current Linux-focused validation scope.

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
