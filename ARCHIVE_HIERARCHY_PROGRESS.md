# Archive hierarchy progress — 2026-10-23

## Decisions

- Started with a clean working tree on the existing `fix/ci-validation-2026-10-23` branch. No branch, commit, PR, or deployment created.
- Read package/lockfile, CI, browser configuration, archive, styles, and relevant tests. No repository AGENTS.md or runtime pin file was present. Use mise Node 24 to match CI; installed dependencies were already available.
- Native **More filters** and **Archive tools** disclosures keep all controls available while search, result count, Saved, tags, active filter values, and a clear-all action remain visible. Clearing filters returns focus to Search.
- Expanded disclosure panels use the available content width; the existing 1440px publication cap, card framing, typography, palette, and query keys remain intact.

## Measured browser evidence

Local production build, system Chromium, sequential viewports; actual `innerWidth`, `innerHeight`, and DPR recorded. The large viewport checks measure layout without full-page screenshots. No page-level horizontal overflow was found. Publication width stays at or below 1440px; large-display cards stay at or below 450px wide. At 844 × 390, vertical scrolling is still required; at 320 × 568, only the beginning of the first image fits initially.

| CSS viewport | DPR | First card before | First card after |
| ------------ | --- | ----------------- | ---------------- |
| 320 × 568    | 1   | 943px             | 555px            |
| 360 × 640    | 1   | 943px             | 555px            |
| 390 × 844    | 1   | 943px             | 555px            |
| 430 × 932    | 1   | 943px             | 555px            |
| 844 × 390    | 1   | 802px             | 630px            |
| 720 × 1280   | 1   | 795px             | 522px            |
| 768 × 1024   | 1   | 854px             | 623px            |
| 834 × 1112   | 1   | 801px             | 629px            |
| 1024 × 768   | 1   | 759px             | 645px            |
| 1280 × 800   | 1   | 694px             | 580px            |
| 1280 × 720   | 1   | 694px             | 580px            |
| 1366 × 768   | 1   | 641px             | 584px            |
| 1440 × 900   | 1   | 645px             | 588px            |
| 1920 × 1080  | 1   | 648px             | 592px            |
| 2560 × 1440  | 1   | 648px             | 592px            |
| 3840 × 2160  | 1   | 648px             | 592px            |
| 5120 × 2880  | 1   | 648px             | 592px            |
| 6016 × 3384  | 1   | 648px             | 592px            |
| 7680 × 4320  | 1   | 648px             | 592px            |
| 390 × 844    | 2   | 943px             | 555px            |
| 834 × 1112   | 2   | 801px             | 629px            |
| 1440 × 900   | 2   | 645px             | 588px            |

Raw JSON and before/after phone/laptop viewport captures: `/tmp/portrait-archive-hierarchy/`. Browser tests also attach viewport/DPR measurements to their report. These checks emulate CSS viewports; they are not physical-device or Safari/Firefox checks.

## Verification

Commands use the repository's npm scripts and existing Playwright installation. No lint script is configured.

- `mise exec node@24 -- npm run build` — baseline passed.
- `mise exec node@24 -- npx vitest run tests/archive-hierarchy.test.tsx tests/slideshow-and-export.test.tsx tests/reliability.test.tsx tests/new-features.test.tsx --maxWorkers=1` — 30 passed, 2 new-test assertions failed because a test probe had an implicit status role; fixed the probe and used visibility assertions for native details in JSDOM.
- `mise exec node@24 -- npx playwright test tests/browser/viewport-audit.spec.ts --project=chromium-responsive --workers=1` — 5 passed, covering the full requested matrix, DPR 2 representatives, keyboard navigation, and filter URLs.
- `mise exec node@24 -- npm run typecheck` — passed.
- `mise exec node@24 -- npm run build` — final production build passed, including content validation and typechecking.
- `mise exec node@24 -- npx prettier --check src/pages/ArchivePage.tsx src/styles.css tests/archive-hierarchy.test.tsx tests/browser/viewport-audit.spec.ts tests/browser/editorial-tools.spec.ts tests/browser/reading-tools.spec.ts tests/new-features.test.tsx tests/reliability.test.tsx tests/slideshow-and-export.test.tsx` — passed.
- `mise exec node@24 -- npm test -- --maxWorkers=1` — 21 files / 159 tests passed. Existing JSDOM scrollTo warnings were non-fatal.
- `mise exec node@24 -- npm run test:e2e -- --workers=1` — hit the existing 1200-second suite limit: 239 passed, 18 existing conditional skips, 3 did not run. The reported suite/teardown errors were time-budget errors, not assertion failures. No timeouts, retries, or skip conditions were changed.
- `mise exec node@24 -- npm run build` — passed again after aligning the visible Reset all label with its accessible name.
- `mise exec node@24 -- npx vitest run tests/archive-hierarchy.test.tsx --maxWorkers=1` — 2 passed on the final reset-label implementation.
- `mise exec node@24 -- npm run test:e2e -- --workers=1 --last-failed` — 3 passed in 1.9 minutes on the final build, including the full 19-viewport matrix, DPR 2 cases, visible reset label, URL state, and focus restoration. Across the two runs, 242 runnable browser tests passed and 18 existing conditional skips remained. The original full invocation still has a timed-out status; it is not described as a single green full-suite run.
- Final Prettier check of all changed code/tests and this note, plus `git diff --check` — passed.

## Completion and limits

- Implementation and verification are complete. Build-generated sitemap date changes were restored to the clean starting versions.
- Phone and 720p laptop before/after captures are saved in `~/Images/the-portrait-edit-archive-{before,after}-{390x844,1280x720}-2026-10-23.png`.
- Chromium was tested; physical devices and other browser engines were not tested. The original one-worker full-suite invocation reached its unchanged 20-minute limit, and the remaining tests passed separately.
- Task-owned preview server on port 4173 stopped; verified no listener remains.

## Publication validation — 2026-10-23

- The original branch also contains four commits belonging to draft PR #39. Preserved that branch and its working tree. Created the isolated `fix/archive-first-screen-hierarchy` worktree from current `main` (`23cc334`), then applied only the archive implementation, tests, and this note. The latest main includes the merged archive image optimization from PR #38.
- Added the four original phone/laptop captures under `review/archive-hierarchy/` so the PR can link to real repository files. These are the earlier design captures; browser validation below runs against the latest image optimization.
- `mise exec node@24 -- npm ci` — passed, 174 packages installed, zero audit vulnerabilities; package manifests and lockfile unchanged.
- `mise exec node@24 -- npx prettier --check src/pages/ArchivePage.tsx src/styles.css tests/archive-hierarchy.test.tsx tests/browser/viewport-audit.spec.ts tests/browser/editorial-tools.spec.ts tests/browser/reading-tools.spec.ts tests/new-features.test.tsx tests/reliability.test.tsx tests/slideshow-and-export.test.tsx ARCHIVE_HIERARCHY_PROGRESS.md` — passed before this publication note was appended; recheck before committing.
- `mise exec node@24 -- npm run typecheck` — passed.
- `mise exec node@24 -- npm test -- --maxWorkers=1` — 21 files / 159 tests passed in 145.50 seconds on the isolated publication branch. Existing JSDOM scrollTo warnings remain non-fatal. The same command also passed on the preserved original branch (159 tests).
- `mise exec node@24 -- npm run build` — passed, including validation, TypeScript, 165 optimized card thumbnails, and static route generation. Restored the build-generated sitemap dates to their clean starting versions.
- `mise exec node@24 -- npx playwright test tests/browser/viewport-audit.spec.ts tests/browser/editorial-tools.spec.ts tests/browser/reading-tools.spec.ts tests/browser/archive-cards.spec.ts --workers=1` — all 64 focused browser tests passed. Covers the 19 CSS viewports, representative DPR 2 cases, keyboard/filter behavior, print, selection, and optimized card images. The preview server was managed and stopped by Playwright.
- Full CI, merge, and Pages deployment are pending at commit time. The PR and final publication report will record their outcomes. Local CLI push authentication is unavailable; the authenticated GitHub connector will publish the exact reviewed file tree.
