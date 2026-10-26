# Issue 02 redesign progress

- Base: cloud redesign commit `eaca7702bda3f76e574d51a60f6486596da50b1d` on `origin/work`, already based on current `origin/main` (`8d9a99b`).
- Work happens in the isolated `the-portrait-edit-redesign` worktree on `work`. Existing dirty reader/content and archive worktrees remain untouched; those reader changes are already represented in the current main history.
- Node: mise Node 24.22.1. `npm ci` passed, zero reported vulnerabilities. `npm run typecheck` passed.
- Review: format cloud changes with repository Prettier; retain translated labels and accessible arrow text alongside decorative SVG icons.
- Pending: unit tests, production build, desktop/mobile reader and discovery-sharing browser tests, both-theme screenshots and layout checks, final commit/push and PR. Preserve generated sitemap/robots dates; do not merge or deploy.

## Review and first validation

- `mise exec node@24 -- npm test`: 27 files / 184 unit tests passed, plus all 6 external-link checks. jsdom emits its existing unimplemented `scrollTo` warning.
- `mise exec node@24 -- npm run build`: passed, including content validation, type checking, 165 thumbnails, static/no-JavaScript route checks and built-asset checks.
- Restored `docs/sitemap.xml` and `public/sitemap.xml` only after comparing normalized contents and confirming date-only changes. Robots files did not change.
- Browser validation uses the installed Playwright and `/usr/bin/chromium`, one worker to respect local memory limits.
- Review fixes: restore the cover caption hidden by legacy mobile CSS; apply SVG arrow sizing to portaled dialogs as well as publication content. Keep formatting edits confined to changed JSX rather than reformatting the entire pre-existing command palette.

## Layout review fixes and verification

- Chromium screenshot review exposed a legacy narrow-screen grid reserving space for a removed theme select. Use two 44px icon columns and enough space for all three navigation links; search retains its accessible name.
- Preserve `/ 02` in the reader masthead when legacy rules hide subtitle spans.
- The visual matrix now waits for route-specific content, bundled fonts and visible images, checks navigation text fits, checks aligned image/caption edges, verifies both primary home links fit at 320×568, and measures SVG arrows in portaled display/shortcuts dialogs.
- First full requested browser run: 96 passed, 24 expected device/matrix skips, no failures (8.6m).
- After layout fixes, targeted reader/discovery/theme/accessibility and visual run: 30 passed, 14 expected skips, no failures (3.4m).
- New browser test initially needed an HTMLImageElement type guard; corrected and the production build/typecheck then passed.
- Final issue-number assertion and screenshot matrix verification pending, followed by commit/push/PR and latest-commit CI inspection.

## Final local results

- Final matrix after all source changes: 4 passed, no skips or failures (1.0m). Inspected desktop and mobile screenshots across home, archive, overview, study, About and reader in both themes, plus featured studies and modal arrows. The reader issue number is visible again.
- `git diff --check` passed. Final type checking and production build passed. No new lint script exists in package.json. Targeted Prettier checks passed; unrelated pre-existing formatting in index.html and the rest of CommandPalette.tsx was preserved.
- No content/reference-image or dependency changes. No generated sitemap/robots changes retained. Original dirty worktrees remain untouched.

Commands (Node 24.22.1 through mise):

```sh
mise exec node@24 -- npm ci
mise exec node@24 -- npm run typecheck
mise exec node@24 -- npm test
mise exec node@24 -- npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium mise exec node@24 -- npm run test:e2e -- tests/browser/reader.spec.ts tests/browser/discovery-sharing.spec.ts tests/browser/editorial-layout.spec.ts --project=desktop-light --project=desktop-dark --project=phone-light --project=small-phone-dark --workers=1
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium mise exec node@24 -- npm run test:e2e -- tests/browser/reader.spec.ts tests/browser/discovery-sharing.spec.ts tests/browser/editorial-layout.spec.ts --project=desktop-light --project=desktop-dark --project=phone-light --project=small-phone-dark --workers=1 --grep 'editorial layouts|homepage routes|study and reader links|publication routes|explicit themes|theme controls|accessibility: shortcuts|coarse-pointer'
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium mise exec node@24 -- npm run test:e2e -- tests/browser/editorial-layout.spec.ts --project=desktop-light --workers=1
mise exec node@24 -- npx prettier --check src/editorial.css tests/browser/editorial-layout.spec.ts
git diff --check
```

CI validation will run on the PR; merge and deployment are not authorized.

## CI follow-up

- PR #55 / commit `6254f17` CI passed unit tests/build but found five browser failures (345 passed, 54 skipped, 22 did not run after a serial-group failure).
- Reproduced the two tablet-context homepage failures locally: at 320×568 with `hasTouch: true`, global 48px touch targets increase the masthead height and push Browse studies to y=606.53. Compact phone spacing fixes the layout while preserving target sizes.
- Archive first portraits moved below the first screen (y=643.06) after the oversized header; compact narrow-screen header/intro spacing and type restore image visibility without hiding content or filters.
- Restored the established 1440px publication cap required by the reader and archive viewport contracts; large editorial headings and image layouts remain.
- Added a dedicated touch-enabled desktop/tablet context test at 320×568 in both themes. Existing assertions, retries, and CI workflow remain unchanged.
- Pending: focused reproduction tests, refreshed visual review, commit/push, latest-commit CI.

CI follow-up local verification passed:

- Production build, typecheck, targeted Prettier and `git diff --check` passed.
- Focused CI reproductions plus both-theme screenshots: 11 passed, 10 expected non-owner matrix skips, no failures (4.0m). Includes both failing tablet contexts, all reader widths, compact archive from 320×568 through 8K, and complete tag discovery at 320×568.
- Inspected refreshed touch and non-touch screenshots; primary homepage links and first archive portraits fit at 320×568. Touch targets remain at least 48px.
- Stopped the task-owned preview server and preserved date-only generated sitemaps again.

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium mise exec node@24 -- npm run test:e2e -- tests/browser/discovery-sharing.spec.ts tests/browser/editorial-layout.spec.ts tests/browser/viewport-audit.spec.ts --project=desktop-light --project=tablet-light --project=tablet-landscape-dark --project=chromium-responsive --workers=1 --grep 'editorial layouts|touch-enabled tablet|homepage routes|all requested CSS viewport widths keep the reader|archive entry stays compact|320×568: every tag'
```
