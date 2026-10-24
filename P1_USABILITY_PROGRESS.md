# P1 usability fixes — 2026-10-24

## Scope and isolation

Implemented the three P1 findings from the UI/UX report on branch `fix/archive-p1-usability`, based on fetched `origin/main` at `dd73186`. The original `boat/remote-development` checkout and all its unpublished reader changes were preserved. No dependencies, runtime pins, lockfile, styles, or CI workflow changed. No repository/parent AGENTS.md or runtime pin was found. Read the package, committed lockfile, CI workflow, and existing verification configuration. Installed Node 24.22.1 matches CI's Node 24; mise is not installed on this machine.

## Result

- Search matching ignores surrounding whitespace and case. Ordinary searches also inspect actual tag values. A leading `#` matches a complete tag, including multiword tags such as `#dark romantic`; unknown/partial hashtags do not silently become broad text queries. Input and query URLs retain what the user typed.
- Opening a study from the archive snapshots its query, expanded-tag state, scroll position, and originating study. Both the study's archive link and native Back restore that context and focus. Previous/next links and arrow-key navigation retain the original archive context while continuing to follow full-issue order. Modified clicks retain native link behavior. Direct study visits fall back to `/prompts`; only a query and validated state fields are accepted, never an arbitrary external return destination.
- The page metadata hook skips its usual top-of-page reset only for a valid archive return, avoiding a race with restored scroll.
- Hidden toasts render no Undo control. Undo and timeout return focus before removal if focus is inside the toast. If the opener is gone, main receives focus. Expiry does not move focus when it is elsewhere.

## Verification

- `npm ci --no-audit --no-fund` — passed, using the committed lockfile (174 packages).
- `npm run typecheck` — passed; also included in the final successful build.
- `npm test -- --maxWorkers=1` — 25 files / 173 tests passed after the final application changes. Existing nonfatal JSDOM `scrollTo` warnings remain.
- `npm run build` — passed after the final application changes; includes content validation, TypeScript, Vite, 165 thumbnails, and route generation. Build-generated sitemap date changes were restored to their clean starting contents.
- `CI=1 npx playwright test tests/browser/archive-usability.spec.ts tests/browser/discovery-sharing.spec.ts --project=phone-light --project=desktop-light --project=small-phone-dark --workers=1` — 18 passed, zero skips, in 41.4 seconds. Covered 320×740, 390×844, and 1280×900, query reload, exact multiword hashtags, combined search/tag/model/ratio/saved filters, full-issue study sequencing, archive return, native Back, disclosure/focus/scroll restoration, direct-entry fallback, Undo/expiry, and existing homepage/sharing journeys. The app defaults dark regardless of browser color-scheme preference; the separate final run below explicitly selects the requested theme.
- `CI=1 npx playwright test tests/browser/archive-usability.spec.ts --project=phone-light --project=desktop-light --project=small-phone-dark --workers=1` — 12 passed, zero skips, in 27.5 seconds after explicitly setting the application theme for each project.
- Prettier check on all changed source, tests, and this note — passed. `git diff --check` — passed.
- Preview server stopped automatically; verified no listener remains on port 4173.
- Worktree retained at `/home/user/Work/the-portrait-edit-p1-usability` for review; the original checkout is unchanged.

## Issues found during implementation and corrected

- The initial full unit run caught focused-toast expiry losing focus when its DOM disappeared before effect cleanup. Restoration now runs before dismissal. Added coverage for the opener disappearing and for leaving external focus unchanged.
- The initial browser test sent an arrow key as soon as the URL changed, before the destination's render was ready. It now asserts the new study heading and focuses the next link before testing the shortcut; navigation assertions remain intact.
- A subsequent browser run caught the page metadata effect resetting desktop scroll after archive restoration. The archive return now explicitly preserves scroll in that hook. The combined 18-case rerun passed without retries, relaxed assertions, added skips, or timeout increases.

## Publication validation correction

The first full local run and first PR CI run exposed an unsynchronized assertion in the new search test: it read the ordinary-search count immediately after input, sometimes capturing the initial 165-study count. The whitespace search correctly returned 16 studies, so comparing it to that stale baseline failed. The test now explicitly awaits 16 studies for both the ordinary and whitespace queries. No application code, assertions about intended behavior, retries, skip conditions, or timeout settings were relaxed. Full-suite and CI rerun results are recorded in the PR description and checks.

## Limits and remaining work

Chromium viewport/touch emulation was used. Physical devices, other engines, and actual screen-reader applications were not checked. The checks above record the initial local implementation. The subsequent full local browser suite (including the large CSS viewport matrix) and GitHub Actions results are recorded in the publication PR description and its checks. Existing P2 recommendations and unrelated model/clipboard refinements remain outside this change. The user subsequently authorized publication and full validation. No merge or deployment is authorized or performed for this change.
