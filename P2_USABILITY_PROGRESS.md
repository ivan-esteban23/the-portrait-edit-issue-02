# P2 discovery and study actions — 2026-10-24

## Scope and isolation

Implemented audit sequence step 2, findings D and G, on branch `fix/p2-tag-picker-study-actions` in `/home/user/Work/the-portrait-edit-p2`, based on deployed `origin/main` at `bcef2ab`. The original checkout and its unpublished reader changes are preserved. No dependency, lockfile, runtime pin, or CI workflow changes. Node 24.22.1 matches CI. No repository or parent AGENTS.md or separate runtime pin was found.

## Behavior

- Below 768 CSS pixels, More tags opens a searchable Radix dialog containing all 111 tags and their counts. Popular and selected tags remain on the archive. Search ignores case, surrounding whitespace and an optional leading hashtag. An empty match explains how to recover.
- Tag selection updates the existing tag query while preserving search and other facets. The dialog keeps the selected tag in its footer; Done completes discovery. Close, Escape and backdrop dismissal preserve the current selection. Focus starts in search, stays inside the dialog, and returns to More tags. The list scrolls within a bounded dialog with a persistent completion control. Tablet/desktop retain the existing wrapping disclosure.
- Study customization and recipe download no longer repeat in the study header. Copy prompt remains primary and preserves exact original text. Customize prompt opens the existing studio. More actions groups full labels for Discord, parameter and Markdown copies, recipe download, and Analyze prompt. The native disclosure supports keyboard activation; Escape and action completion return focus to its summary. Success and failure feedback remains in the prompt card's live region. Starting a card export clears earlier feedback timers.

## Verification

- `npm ci --no-audit --no-fund` — passed using the committed lockfile.
- `npm test -- --maxWorkers=1` — 25 files / 174 tests passed on the final application changes. Existing nonfatal jsdom scrollTo warnings remain.
- `npm run build` — passed on the final application changes, including content validation (1 issue, 165 studies, 564 protected records), TypeScript, thumbnails and route generation.
- `CI=1 npm run test:e2e -- tests/browser/p2-discovery-actions.spec.ts tests/browser/editorial-tools.spec.ts tests/browser/archive-usability.spec.ts --project=small-phone-dark --project=phone-light --project=desktop-light --workers=1` — 27 passed in 44.9 seconds. Covers exact raw copy, secondary formats, blocked clipboard and fallback, actual PNG download, studio parameters, archive return/native Back, Undo, and the tag picker at 740×360. A later test addition also checks backdrop focus restoration; broader results below apply to it.
- `CI=1 npm run test:e2e -- tests/browser/viewport-audit.spec.ts --project=chromium-responsive --workers=1 --grep 'archive tag discovery.*(320×568|390×844)'` — 3 passed. Broader checks below additionally require reverse traversal and containment within the visible tag list.
- Visual inspection of 320px phone screenshots in both themes, 390px dark, and desktop dark: tag dialog and consolidated study actions. Temporary captures are in `/tmp/portrait-p2-*.png`.
- `CI=1 npm run test:e2e -- --project=chromium-responsive --workers=1` — **55 passed**, zero failures, in 2.6 minutes. Includes every requested CSS viewport through 7680×4320, DPR 2 repeats, forward/reverse phone tag traversal with focus contained in the list, existing desktop traversal, contrast checks, and responsive reader/card regressions.
- `CI=1 npm run test:e2e -- --project=small-phone-dark --project=phone-light --project=large-phone-dark --project=tablet-light --project=tablet-landscape-dark --project=desktop-dark --project=desktop-light --workers=2` — **255 passed, 18 existing conditional skips, zero failures**, in 3.4 minutes. Includes the final backdrop-dismissal test. Together the two runs cover all 328 collected browser cases: **310 passed, 18 skipped**.
- `npm run typecheck`, Prettier checks on all changed source/tests/this note, and `git diff --check` — passed. No lint script is configured.
- Additional dialog contrast measurement reused the repository's rendered color/alpha calculation for all 111 tag labels/counts in each theme. Minimum dark contrast 5.7456:1; minimum light contrast 4.7318:1. Data is in `/tmp/portrait-p2-dialog-contrast.json`.
- Restored only this worktree's build-generated sitemap dates to their original contents. Package/lockfile/CI remain unchanged; the original worktree retains its initial modifications. Playwright stopped its preview server; verified no listener on 4173.

## Corrections during verification

The first build caught an unsupported Testing Library `exact` option in a new query; corrected without changing the assertion. An initial browser run used an archive locator after opening the modal, when Radix correctly hides background content. The test now determines the layout before opening and completes the dialog before navigating a study. The first failure-injection case blocked navigator.clipboard but the supported execCommand fallback succeeded; the test now blocks both copy paths before expecting failure. These partial runs are not counted as full passes. No retries, assertions about intended behavior, existing skip conditions, or timeout settings were relaxed.

## Limits and publication

Chromium viewport/touch simulation only; physical devices, other engines, and actual screen readers were not tested. The user authorized pushing this branch and opening a PR. Merge and deployment have not been performed. Full remote CI will run after the PR opens. Task-owned preview servers were managed and stopped by Playwright. The local worktree is retained for review.
