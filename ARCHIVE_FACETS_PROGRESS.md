# Archive facet clarity — 2026-10-24

## Evidence and decision

- At the start of this task, this checkout already had uncommitted archive hierarchy and test changes plus `ARCHIVE_HIERARCHY_PROGRESS.md`. They were preserved. No repository AGENTS.md or runtime pin was present; `package.json` requires Node >=22.12 and CI uses Node 24 with npm. The committed lockfile was unchanged.
- The live production archive at `https://ivan-esteban23.github.io/the-portrait-edit-issue-02/prompts/` showed 165 studies, 112 style selector options (including All styles), only All models/Unspecified for Model, and only All aspect ratios/Not recorded for Aspect Ratio. Checked 2026-10-24 with local Arch Chromium.
- The local schema permits nullable model and parameter records. All 165 local records have `model: null`, no aspect ratio parameter or `--ar` in prompt text, and 111 distinct style tags.
- The archive omits Model and Aspect Ratio selectors while neither has a recorded value, and explains missing metadata inside More filters. It retains style selection, counted tag chips, saved/search controls, URL filtering, active filter labels, and reset with focus returned to Search. A populated fixture verifies that real model and ratio values automatically restore those selectors, including missing-value choices for mixed data.
- The style selector grid uses minimum 220px tracks and an 864px cap so one useful selector stays readable without stretching across high-resolution CSS layouts.

## Actual browser viewport readings

CSS viewport sizes, not physical monitor resolutions. `innerWidth`, `innerHeight`, and `devicePixelRatio` were read from Chromium. Style width was measured with More filters open. Large sizes ran serially without full-page screenshots. No page-level horizontal overflow was found. Publication width stayed at or below 1440px, and visible style width stayed at or below 272px from 1024px upward. The 844×390 layout remains vertically scrollable.

| Requested CSS viewport | innerWidth | innerHeight | DPR | Open style selector width (px) |
| ---------------------- | ---------: | ----------: | --: | -----------------------------: |
| 320 × 568              |        320 |         568 |   1 |                            239 |
| 360 × 640              |        360 |         640 |   1 |                            279 |
| 390 × 844              |        390 |         844 |   1 |                            309 |
| 430 × 932              |        430 |         932 |   1 |                            349 |
| 844 × 390              |        844 |         390 |   1 |                            237 |
| 720 × 1280             |        720 |        1280 |   1 |                            314 |
| 768 × 1024             |        768 |        1024 |   1 |                            327 |
| 834 × 1112             |        834 |        1112 |   1 |                            234 |
| 1024 × 768             |       1024 |         768 |   1 |                            272 |
| 1280 × 800             |       1280 |         800 |   1 |                            272 |
| 1280 × 720             |       1280 |         720 |   1 |                            272 |
| 1366 × 768             |       1366 |         768 |   1 |                            272 |
| 1440 × 900             |       1440 |         900 |   1 |                            272 |
| 1920 × 1080            |       1920 |        1080 |   1 |                            272 |
| 2560 × 1440            |       2560 |        1440 |   1 |                            272 |
| 3840 × 2160            |       3840 |        2160 |   1 |                            272 |
| 5120 × 2880            |       5120 |        2880 |   1 |                            272 |
| 6016 × 3384            |       6016 |        3384 |   1 |                            272 |
| 7680 × 4320            |       7680 |        4320 |   1 |                            272 |
| 390 × 844              |        390 |         844 |   2 |                            309 |
| 834 × 1112             |        834 |        1112 |   2 |                            234 |
| 1440 × 900             |       1440 |         900 |   2 |                            272 |

## Verification

- `mise exec node@24 -- npm run build` — passed after the final CSS change; includes content validation, typecheck, Vite production build, postbuild, and sitemap generation. Generated sitemap date changes were restored to their clean starting state.
- `mise exec node@24 -- npm test -- --maxWorkers=1` — 22 files, 160 tests passed before the final CSS-only adjustment. Existing nonfatal JSDOM `scrollTo` warnings appeared.
- `mise exec node@24 -- npm run test:e2e -- --workers=2` — 242 passed, 18 conditional skips in 17.9 minutes before the final CSS adjustment.
- `mise exec node@24 -- npx playwright test tests/browser/viewport-audit.spec.ts --project=chromium-responsive --workers=1` — 5 passed after the CSS adjustment, including all 19 DPR 1 viewports, three DPR 2 representatives, keyboard/focus, URL/reset behavior, and visible selector widths.
- `mise exec node@24 -- npx playwright test tests/browser/viewport-audit.spec.ts --project=chromium-responsive --grep 'DPR 2' --workers=1` — 1 passed after adding open-control width and overflow checks to the DPR 2 cases.
- No lint script exists in `package.json` or CI. Prettier and `git diff --check` are the applicable formatting checks; final results recorded at task completion.

No branch, PR, push, or deployment was created. Chromium emulation was used; physical devices and other browser engines were not checked.
