# Archive tag discovery — pull request handoff

## Result

Implemented and verified on the existing `fix/archive-first-screen-hierarchy` branch in `the-portrait-edit-archive-publish`, then copied only the six intended files into a fresh `feat/archive-tag-discovery-2026-10-24` worktree based on fetched `origin/main` (`361cb96`). The original working tree and separate CI checkout were preserved. No dependency, lockfile, CI workflow, runtime pin, or unrelated archive feature changed.

The new worktree passed a clean `npm ci --no-audit --no-fund`, `npm test -- --maxWorkers=1` (22 files / 162 tests), `npm run build` (content validation, TypeScript, optimized thumbnails, and route generation), Prettier for all six files, and `git diff --check`. A focused serial Chromium run passed four cases covering 390 × 844, 1280 × 720, DPR 2 at 390 × 844, and deep-linked uncommon tag behavior. The unchanged base makes the earlier full serial Playwright and 22-case viewport evidence applicable. The build-generated sitemap date changes were restored; the preview server stopped automatically. GitHub Actions will run the full suite for the PR commit.

Read package/lockfile, CI, browser configuration, archive component/styles, and relevant tests. No repository/parent AGENTS.md or runtime pin file was found; user-supplied AGENTS instructions apply. Used installed mise Node 24.22.1 to match CI, npm, and Arch Chromium through the repository's configured Playwright setup.

## Observed before and implemented after

- Before: the archive contains 111 unique tags, but only 16 appeared in the horizontal row. Only 1–2 fully fit on phones and 11 fit even at the widest viewports. Native Tab already revealed those 16 horizontally; the other 95 required the secondary Style/tag select. The clipped row lacked an explicit discovery cue.
- After: a compact frequency-ranked set and a counted **More tags** control stay visible. One shortcut appears below 390px, two below 768px, three below 1024px, and six at wider CSS widths. Expansion exposes all 111 original tags and counts in a wrapping layout. **Fewer tags** collapses it.
- A selected uncommon tag stays visible while collapsed. **Clear tag** and the pressed tag toggle remove only the tag query, preserving search and other facets. Disappearing controls restore focus to the disclosure.
- Native buttons preserve keyboard operation. The disclosure has aria-expanded/aria-controls, tags retain aria-pressed, hidden extra tags leave the Tab order, and focused tags scroll into view. Reverse traversal was verified below the sticky masthead.
- Tags cap at 72rem / 1152px and align with Search inside the existing 1440px publication cap. There is no horizontal scrolling or page overflow. Default phone portrait positions are unchanged; the 1280 × 720 first screen still includes portraits. The 844 × 390 landscape viewport still requires vertical scrolling.
- Removed the small counts' 75% opacity and used the existing surface token for selected text. Font sizes and palette tokens are preserved. Rendered label/count contrast now measures 11.47:1 selected and 5.75:1 unselected in dark mode, and 4.73:1 selected and 6.77:1 unselected in light mode.

## Actual viewport coverage

All requested CSS viewports ran serially. The three representative sizes were repeated at DPR 2. Every expanded list exposes 111 tags, and all 111 were traversed by native keyboard in each of the 22 final browser cases. No requested viewport check remains unrun. No full-page screenshots were taken at 4K or above.

The table uses matching before/after capture contexts with Chromium's default pointer. The full browser tests additionally use the repository's touch-configured Chromium project. Full-precision geometry, contrast values, and the actual viewport dimensions/DPR confirmed by the keyboard assertions are saved in [measurement data](review/archive-tag-measurements.json).

| Actual CSS viewport | DPR | Before: fully visible / 16 | After: popular / expanded | Tag measure after | First portrait Y before → after |
| ------------------- | --- | -------------------------- | ------------------------- | ----------------- | ------------------------------- |
| 320 × 568           | 1   | 1 / 16                     | 1 / 111                   | 265px             | 515px → 515px                   |
| 360 × 640           | 1   | 2 / 16                     | 1 / 111                   | 305px             | 515px → 515px                   |
| 390 × 844           | 1   | 2 / 16                     | 2 / 111                   | 335px             | 515px → 515px                   |
| 430 × 932           | 1   | 2 / 16                     | 2 / 111                   | 375px             | 515px → 515px                   |
| 844 × 390           | 1   | 6 / 16                     | 3 / 111                   | 762px             | 606px → 611px                   |
| 720 × 1280          | 1   | 5 / 16                     | 2 / 111                   | 665px             | 165px → 483px                   |
| 768 × 1024          | 1   | 6 / 16                     | 3 / 111                   | 692px             | 600px → 604px                   |
| 834 × 1112          | 1   | 6 / 16                     | 3 / 111                   | 752px             | 605px → 610px                   |
| 1024 × 768          | 1   | 7 / 16                     | 6 / 111                   | 927px             | 621px → 626px                   |
| 1280 × 800          | 1   | 9 / 16                     | 6 / 111                   | 1152px            | 572px → 576px                   |
| 1280 × 720          | 1   | 9 / 16                     | 6 / 111                   | 1152px            | 572px → 576px                   |
| 1366 × 768          | 1   | 10 / 16                    | 6 / 111                   | 1152px            | 576px → 581px                   |
| 1440 × 900          | 1   | 11 / 16                    | 6 / 111                   | 1152px            | 580px → 585px                   |
| 1920 × 1080         | 1   | 11 / 16                    | 6 / 111                   | 1152px            | 584px → 588px                   |
| 2560 × 1440         | 1   | 11 / 16                    | 6 / 111                   | 1152px            | 584px → 588px                   |
| 3840 × 2160         | 1   | 11 / 16                    | 6 / 111                   | 1152px            | 584px → 588px                   |
| 5120 × 2880         | 1   | 11 / 16                    | 6 / 111                   | 1152px            | 584px → 588px                   |
| 6016 × 3384         | 1   | 11 / 16                    | 6 / 111                   | 1152px            | 584px → 588px                   |
| 7680 × 4320         | 1   | 11 / 16                    | 6 / 111                   | 1152px            | 584px → 588px                   |
| 390 × 844           | 2   | 2 / 16                     | 2 / 111                   | 335px             | 515px → 515px                   |
| 834 × 1112          | 2   | 6 / 16                     | 3 / 111                   | 752px             | 605px → 610px                   |
| 1920 × 1080         | 2   | 11 / 16                    | 6 / 111                   | 1152px            | 584px → 588px                   |

## Commands and results

- `mise exec node@24 -- npm run build` — baseline and final builds passed, including content validation (1 issue, 165 studies, 564 protected asset/text records), TypeScript, 165 optimized thumbnails, and route generation. Restored build-generated sitemap dates to their clean starting versions.
- `mise exec node@24 -- npm run typecheck` — passed, including the final recheck after test configuration placement was corrected.
- `mise exec node@24 -- npm test -- --maxWorkers=1` — 22 files / 162 tests passed in 109.34 seconds, exit 0. Existing JSDOM scrollTo warnings remain non-fatal.
- `mise exec node@24 -- npx vitest run tests/archive-tags.test.tsx tests/archive-hierarchy.test.tsx --maxWorkers=1` — 5 passed.
- `mise exec node@24 -- npx playwright test tests/browser/viewport-audit.spec.ts --project=chromium-responsive --workers=1 --grep 'archive tag discovery.*(320×568|390×844|1280×720|7680×4320|deep-linked)'` — 6 passed before the final contrast refinement.
- `mise exec node@24 -- npx playwright test tests/browser/viewport-audit.spec.ts --project=chromium-responsive --workers=1 --grep 'reverse keyboard'` — passed.
- `mise exec node@24 -- npx playwright test tests/browser/viewport-audit.spec.ts --project=chromium-responsive --workers=1 --grep 'tag labels and counts'` — passed on the final contrast styling.
- `mise exec node@24 -- npm run test:e2e -- --list` — 286 tests collected successfully after correcting trace-option placement.
- **`mise exec node@24 -- npm run test:e2e -- --workers=1` — 268 passed, 18 existing conditional skips, zero failures, 30.5 minutes, exit 0.** All requested viewport, DPR, expansion/filtering, forward/reverse keyboard, first-screen hierarchy, contrast, and existing regression checks completed.
- `mise exec node@24 -- npx prettier --check src/pages/ArchivePage.tsx src/styles.css tests/archive-tags.test.tsx tests/browser/viewport-audit.spec.ts ARCHIVE_TAGS_PROGRESS.md review/archive-tag-measurements.json` — passed on all changed code, tests, report, and measurement data.
- `git diff --check` — passed after final documentation formatting. No lint script is configured.

Capture commands: `mise exec node@24 -- node /tmp/portrait-tags/measure-before.mjs`, `mise exec node@24 -- node /tmp/portrait-tags/measure-after.mjs`, `mise exec node@24 -- node /tmp/portrait-tags/capture-final.mjs`, and `mise exec node@24 -- node /tmp/portrait-tags/contrast.mjs`. These used real CSS viewports, measured innerWidth/innerHeight/devicePixelRatio, and only viewport screenshots. Final captures are saved in `~/Images/`; filenames are recorded in the measurement JSON.

## Earlier attempts, resolved

- Initial prototype compilation caught unsupported Testing Library `exact` options in the new unit tests. Removed the options while retaining exact string-name queries; subsequent builds passed.
- Initial browser assertions counted the disclosure as an unpressed button and retained its old name after expansion. Corrected the tag-only and disclosure locators; behavior assertions remain intact.
- The first combined shell reported all 162 unit tests passing, then exited with signal 143 before the build started. No assertion failed; cause was not established. The standalone rerun above passed with exit 0.
- Intentionally stopped an earlier full browser run to fix measured count/selected-label contrast: 35 passed, 4 existing conditional skips, 1 interrupted, 245 not run. That partial run is not described as a full pass.
- One restart failed during collection because Playwright requires the worker-scoped trace option at file level. Moved it to the viewport-audit file. Viewport cases retain DOM traces and failure screenshots while avoiding large per-action filmstrip frames. No assertions, retries, timeouts, or existing skip conditions changed. The subsequent full invocation passed as reported above.

## Limits and cleanup

Chromium CSS viewport/touch emulation was tested. Physical devices, other browser engines, and actual screen-reader applications were not tested. ARIA state, accessible names, focus, and native keyboard behavior were verified in unit/browser tests.

Final formatting, TypeScript, and diff checks passed. Stopped the task-owned preview server (SIGTERM) and verified no listener remains on port 4173. The working tree contains only the intended tag component/styles/tests, this note, and measurement data; the index is unchanged. Temporary measurement scripts/logs remain under `/tmp/portrait-tags/`; persistent results are in this note and the measurement JSON.
