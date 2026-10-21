# Responsive reader QA

## Homepage discovery and sharing verification — 2026-10-20

- Production build: passed content/asset validation, TypeScript, and bundling.
- Unit suite: 157 tests passed across 20 files, including clipboard denial,
  stale copy feedback, saved collections, and resume links.
- `discovery-sharing.spec.ts`: 4 checks passed across small-phone-dark and
  desktop-light. Read/Explore/Collect destinations and direct study/page links
  work with native sharing disabled.
- `viewport-audit.spec.ts`: both archive and reader checks passed across the
  existing 26-width matrix.
- All 13 responsive-reader scenarios passed, including the 1920px desktop
  toolbar, rotation, keyboard navigation, and Focus scrolling. The page-link
  action uses an icon in the wide toolbar and a text label in compact Tools.
- Sharing checks also verify that copy confirmation leaves the wide toolbar
  within its 110px height limit, before and after copying.
- Homepage screenshots inspected at 390px and 1440px. Physical-device checks
  remain separate from Chromium emulation.

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
npx playwright install --with-deps chromium
npm run build
npm test
npm run test:e2e
```

The existing seven viewport/theme projects run the full Chromium suite. The
`chromium-responsive` project runs the focused responsive suite at 320×740,
390×844, 844×390, 834×1112, 1194×834, 1366×768, and 1920×1080. It also
exercises rotation/resizing,
retained reading size/theme/bookmarks, keyboard navigation, dialog focus, overflow,
and a 683×384 CSS viewport representing the reflow space at 200% zoom on a
1366×768 display. This is a reflow check, not certification of browser zoom or
physical hardware. Existing Chromium projects also exercise touch emulation.

To run just this suite:

```sh
npx playwright test --project=chromium-responsive
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
360px, it uses one column so the three footer controls retain 48px touch targets.

The Chromium responsive project also runs `archive-cards.spec.ts` at 320, 390,
430, 834, 1366, and 1920px. Checks cover clear portraits, action/menu bounds,
copying, sharing, comparison, bookmarking, keyboard dismissal, and tag filtering.
Keyboard checks cover Enter/Space entry, Escape from the panel or trigger, and
natural Tab dismissal. The viewport audit checks archive and reader overflow at
26 widths from 360px through 7680px in the responsive project.
Existing Chromium checks cover archive routing, multi-selection, print output,
and Compare Lab focus behavior.

## Linux release checks

Linux is the primary development and validation platform for this change. Run the
Chromium responsive project on Linux. WebKit remains optional and does not certify
Safari on Apple hardware.

- [ ] Spot-check Chrome/Chromium on Linux with keyboard navigation,
      browser zoom at 200%, short laptop windows, and wide desktop windows.
- [ ] Verify desktop single-page/spread modes and reduced motion.

## Optional wider-platform checks (not completed by viewport emulation)

These checks are outside the current Linux-focused validation scope.

- [ ] Chrome, Edge, Brave, and Opera: verify reading, Display, Tools, images, and
      downloads; include Windows at native display scaling and browser zoom 200%.
- [ ] Safari on macOS, iPhone, and iPad: check dynamic browser bars, safe areas,
      pinch zoom, touch targets, image inspection, and dialog scrolling.
- [ ] Rotate a physical phone and tablet while reading and while Display is open;
      verify page, mode, text size, theme, and bookmarks remain selected.
- [ ] On a short laptop and a wide desktop, verify single-page and spread modes,
      keyboard focus, reduced motion, and no covered content at the document end.

Record browser version, OS, device, orientation, result, and any issue link. An
engine test pass does not establish a pass for every branded browser or device.

## Local reliability verification — 2026-10-20

Verified locally on `fix/reliability-pass` before publication. The Firefox run
below preceded incorporation of main's removal of Firefox from the CI matrix.

- `npm run build`: passed content/asset validation, TypeScript, and production build.
- `npm test -- --maxWorkers=1 --pool=threads`: 154 tests passed across 19 files.
- `npm run test:e2e -- --project=chromium-responsive --project=firefox-responsive --workers=1 --max-failures=1 --output=test-results/reliability-final`: 46 passed, including menu keyboard entry/dismissal and the 26-width audits.
- `npm run test:e2e -- --project=desktop-dark --project=small-phone-dark --grep 'keyboard|coarse-pointer|Compare Lab|focus|ratio|clipboard|manifest' --workers=1 --max-failures=1 --output=test-results/reliability-targeted`: 24 passed; two expected skips (desktop dimming on a phone and coarse-pointer targets on desktop).

Initial parallel attempts encountered unit worker startup timeouts and Firefox
click timeouts under local memory/I/O pressure. The completed runs above passed
with reduced concurrency. These results cover automated Linux browser emulation;
the optional physical-device and wider-platform checks above remain outstanding.
