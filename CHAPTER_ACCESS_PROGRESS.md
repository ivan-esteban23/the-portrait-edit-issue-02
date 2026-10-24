# Issue chapter access — audit fix F

Implemented in `/home/user/Work/the-portrait-edit-chapters` on `fix/issue-chapter-access`, based on deployed `origin/main` at `099131a`. The original checkout and its unpublished reader changes remain preserved.

## Result

- Browse chapters is visible directly below the issue title, before the description and cover.
- The fragment link targets a visible Chapters heading and places keyboard focus there. Native Tab continues through front matter and chapter links. The jump measures the current sticky/fixed masthead height before scrolling; phone layouts use the non-sticky header behavior. Repeated activation, fragment reloads, and browser Back work.
- Printing is a secondary ghost button with a printer icon in the existing SVG icon component. The PDF size label, resume/start actions, directory links, desktop cover/directory grid and contact sheet are retained.
- No dependencies, lockfile, CI workflow, or runtime pins changed. No repository or parent AGENTS.md or separate runtime pin was found during this session or prior inspection; package, lockfile and CI were read. Node 24.22.1 matches CI's Node 24.

## Verification

- `npm ci --no-audit --no-fund` — passed with the existing lockfile.
- `npm run build` — passed, including content validation, TypeScript, Vite, thumbnails and route generation. Restored only this worktree's generated sitemap dates to their starting contents.
- `npm run typecheck` — passed after adding the browser checks.
- `npm test -- --maxWorkers=1` — **25 files / 174 tests passed**. Existing nonfatal jsdom scrollTo warnings remain.
- `CI=1 npm run test:e2e -- tests/browser/issue-chapters.spec.ts tests/browser/discovery-sharing.spec.ts --project=small-phone-dark --project=phone-light --project=large-phone-dark --project=tablet-light --project=tablet-landscape-dark --project=desktop-dark --project=desktop-light --workers=2` — **28 passed, zero skips, zero failures**, 31.2 seconds. Explicit light/dark application themes, all seven standard viewport projects, plus 320×568 and 740×360 checks with resume state and reduced motion. Covers first-screen discovery, keyboard focus/order, header clearance, chapter navigation, browser Back, fragment reload/repeated activation, PDF/resume controls, print invocation/layout and existing discovery/sharing behavior.
- Visual inspection at 320×568, 390×844 and 1280×900 in dark/light themes. Temporary screenshots: `/tmp/portrait-chapters-*-before.png` and `/tmp/portrait-chapters-*-after.png`.
- Prettier checks on changed files and `git diff --check` — passed. No lint script is configured.

## Verification corrections and limits

An initial unit run found the existing overview test still expecting the printer emoji label; the expectation now uses the new visible label. A browser test fixture initially used page 197 although this issue ends at 196; stopped that initial run and corrected the fixture before the successful full targeted run. A first screenshot attempt ran after Playwright had already stopped its server; restarted a task-owned preview and captured the rendered page after its lazy route loaded. No assertions about intended behavior, timeout settings or skip conditions were relaxed.

Chromium viewport/touch simulation was used. Physical devices, other engines, screen readers, and the complete browser regression/high-resolution matrix were not run for this focused change. The user authorized publishing the branch and opening a PR. Full remote CI will run on the PR; merge and deployment have not been performed. The task-owned preview server was stopped after verification; the worktree is retained for review.
