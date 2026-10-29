# Issue #57 — Phase 2 hierarchy review

Starting commit: `2af7acf01674b8b1475ae537550cafdb585c97e7` on `refine/issue-57-hierarchy`, isolated from the existing checkout. At preparation the original worktree was clean and no open PRs overlapped. Styles load in the order `styles.css`, then `editorial.css`, after the bundled fonts. English is the supported language.

## Page map and decisions

- **Home:** “The Prompt Issue” introduces the publication. Start/Resume reading is the primary filled action; Browse studies is secondary, Inside the issue and Start from beginning are supporting choices. Progress and collection cards remain truthful. The image-led hero and existing action order were retained.
- **Archive:** “Portrait prompts” introduces the searchable collection. Search, result count and study images lead; advanced filters and tools remain disclosed, and active restrictions and saved state remain available. The existing hierarchy, URL state and focus restoration were retained.
- **Issue overview:** “The Prompt Issue” identifies the issue; Browse chapters focuses the chapter directory. Previously the start/resume action followed the large cover, leaving it below the first screen on the 390px baseline. It now precedes the cover in both visual and DOM order. Print and PDF remain secondary, the chapter directory and focus behavior are unchanged. A 24px gap separates the controls and cover.
- **Study:** The archive return and read-in-issue links remain at the top. Previously the previous/next card preceded the study title and image, making another study prominent before the current one. Navigation now follows the article and study record, preserving previous/next destinations, keyboard shortcuts and archive context. The title and reference lead to the prompt and its primary copy action; save, share and related actions remain available. Image Prompt, Working notes, Try this and Study record use level-two headings beneath the study title; the existing visual role is retained, with the mobile prompt heading using the Phase 1 caption token.
- **Shared navigation and reader:** Existing active navigation underline, accessible names, Focus mode, settings, page controls and keyboard model are retained. Study heading semantics also apply in reader text mode.

Baseline and final screenshots, captured after page content and fonts load, are outside the checkout in `/workspace/shared/issue57-phase2/before/` and `/workspace/shared/issue57-phase2/after/`. They cover home, archive, issue, study and reader at 390 and 1440 CSS px in both themes. Inspected phone comparisons show the reading button above the cover and current study identity above next navigation. Full semantic inventories are in `structure.json` in each folder.

Changed files: `src/pages/IssueOverviewPage.tsx`, `src/pages/StudyPage.tsx`, `src/components/Study.tsx`, `src/styles.css`, `tests/browser/hierarchy.spec.ts`, and this report. No palette, image, route, storage, collection or reading-preference changes were intended.

## Verification

Earlier local checks: `npm ci --cache /workspace/.npm-cache`, `npm run typecheck`, `NODE_USE_ENV_PROXY=1 npm test` and `XDG_CACHE_HOME=/workspace/.onboarding/cache npm run build` passed. The two focused regressions passed with `npm run test:e2e -- tests/browser/hierarchy.spec.ts --project=desktop-light --workers=1`. An initial focused run used an empty archive filter and timed out; the setup was corrected to use a populated saved collection, with no assertion weakening.

Final checks:

- `npm run typecheck`: passed.
- `NODE_USE_ENV_PROXY=1 npm test`: passed (192 unit and 5 external-link tests).
- `XDG_CACHE_HOME=/workspace/.onboarding/cache npm run build`: passed, including 365 sitemap routes, 366 static pages and built-asset checks.
- `npm run test:e2e -- tests/browser/hierarchy.spec.ts --project=desktop-light --workers=1`: 2 passed. Before the production build, the preview server returned HTTP errors; this was corrected by building first.
- `PLAYWRIGHT_JSON_OUTPUT_NAME=/workspace/shared/issue57-phase2/browser.json npm run test:e2e -- --reporter=list,json`: 422 passed, 60 existing skips, zero failures, zero timeouts or unrun cases, 958.46 seconds. The two new test definitions ran in seven applicable projects. No existing tests or retries were changed.
- `npm run audit:accessibility -- --base-url http://127.0.0.1:5191/the-portrait-edit-issue-02/ --output /workspace/shared/issue57-phase2/accessibility.json`: complete, 2,318 page/state results, zero axe violations, 397 supplemental failures, exit 1. Compared with `/workspace/shared/phase1-complete/final/accessibility-full.json`, the route, theme, state, element, ratio and threshold signatures are identical. The existing light reader toolbar `--muted` worst-case image/grain finding is 4.38994:1 against 4.5:1. No new findings were observed; the audit remains a failure, not a pass.
- `npx prettier --check src/pages/IssueOverviewPage.tsx src/pages/StudyPage.tsx src/components/Study.tsx src/styles.css tests/browser/hierarchy.spec.ts`: passed.

Native Chromium 200% zoom used a persistent browser profile and `viewport: null`, asserting CSS viewport width and device pixel ratio of 2. Sixty final page/theme/width captures cover 320, 390, 768, 834, 1280 and 1440 CSS px. None had measured page-level horizontal overflow. This is separate from the viewport and touch emulation in the test suite. The 390px issue zoom capture was visually inspected; images and JSON are in `after/zoom200-*` and `after/zoom200.json`.

The full browser suite covers fresh and returning reading states, saved collections, archive filters and empty states, archive return/focus, touch targets, keyboard and reader controls. The added tests check chapter focus, reading-action DOM order, prompt heading, and saved-filter return. Visual clarity requires human judgment; the supplied captures should receive reviewer inspection.

Limitations: Linux Chromium only; Safari, Firefox and physical devices were not tested. Native zoom screenshots and overflow were checked, but not every state was manually exercised at every zoom/width/theme combination. Screenshots are not physical-device validation. The existing contrast debt remains. Subject to those limits and visual review, Phase 2 is ready for review; no commit, push or deployment was made.
