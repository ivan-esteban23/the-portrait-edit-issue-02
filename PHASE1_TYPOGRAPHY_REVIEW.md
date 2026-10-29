# Issue #57 — Phase 1 completed cloud review

**Ready for review, with pre-existing supplemental contrast debt.** The full browser matrix passes; the full accessibility audit still exits 1 for the same 397 supplemental contrast failures as the clean baseline. This is not an all-green accessibility result. No axe violations were reported by the configured audit rules.

This section supersedes the earlier limited verification preserved verbatim below. All counts here come from fresh cloud runs, not the user-supplied incomplete local results.

## Checkout and preservation

Repository: `/workspace/the-portrait-edit-issue-02`; branch `refine/issue-57-typography`; starting and ending HEAD `ec3d9c4713d1b5546591124c04571a5d8f4963d6`. At this run's start the two CSS files were modified and this report and `tests/browser/typography-spacing.spec.ts` were untracked. These existing proposals were copied with SHA256 manifests and a tracked patch into `/workspace/shared/phase1-complete/preserved/` before any change. Their CSS implementation was retained; the new test's project gates were removed so every applicable project now executes it. No pre-existing `package.json` allowScripts addition or `verification_report.md` was present here. No AGENTS.md was found in the checkout or its workspace ancestors. Remotes/worktrees and issue #57 were inspected.

A separate detached baseline worktree at `/workspace/.onboarding/issue57-baseline` uses the exact starting commit, its own dependencies and production build. Existing work was not reset or stashed. The branch and HEAD are unchanged. There have been no commits, pushes, PRs, merges or deployments.

The user-described earlier local run (290 passed, 58 skipped, 2 timed out, 90 unrun; partial audit 537 states, zero axe and 392 supplemental failures) is incomplete historical information and was not used as the cloud baseline.

## Actual complete validation

Node 24.19.0 / npm 11.9.0 satisfies the repository's Node >=22.12 requirement. Chromium 154 on Linux, existing eight-project configuration, two workers, zero retries. CI execution order was preserved: install, typecheck, unit/external-link tests, build, then browser tests. Full audits and screenshot jobs ran sequentially after browser testing to limit memory pressure.

| Check | Clean baseline | Final source |
| --- | --- | --- |
| `npm ci` | Passed (3.56s) | Passed (3.01s) |
| `npm run typecheck` | Passed (1.19s) | Passed (1.26s) |
| `NODE_USE_ENV_PROXY=1 npm test` | 192 unit + 5 external-link passed (22.68s) | 192 unit + 5 external-link passed (20.52s) |
| Production build | Passed (31.38s) | Passed (30.6s) |
| Complete configured browser matrix | 380 passed, 60 skipped / 440 cases (782.34s) | 408 passed, 60 skipped / 468 cases (886.73s) |
| Failures / timeouts / unrun / flaky browser cases | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| Full accessibility page/state records | 2318, complete | 2318, complete |
| Axe violations (configured color-contrast/image-alt rules) | 0 | 0 |
| Supplemental contrast failures | 397 | 397 |
| Image/alt failures | 0 | 0 |
| Accessibility command status / runtime | Exit 1 / 465.07s | Exit 1 / 465.08s |

Both browser runs completed as one full invocation within the existing 20-minute global timeout. No extended timeout, retries, assertion changes, new skips or last-failed substitutions were needed. All four focused regression definitions passed across seven applicable projects: **28/28 cases**. The dedicated responsive project only includes its existing three named files. The same 60 existing skip identities remain: 24 explicit-matrix-once, 12 desktop-spread-only, 8 desktop-idle, 6 explicit-touch-matrix-once, 4 desktop-only, 4 phone text-mode defaults, and 2 touch-only. Exact project/title/reason lists are in each `skipped-cases.json`.

Full baseline/final supplemental failure signatures are identical. They concern light-theme `#reader-toolbar` / `--muted`, the audit's conservative `worst-case-image-and-grain` model: 4.3899409317:1 against 4.5:1. They are reported separately from axe, not excused as passes. No palette change was made to repair this pre-existing debt outside Phase 1. The full audit includes current JS/static routes in both themes and interaction states; its existing rule selection is not a claim of exhaustive WCAG compliance. Both reports have `complete: true`; neither was stopped for memory. Peak measured cgroup memory was 10.02 GiB baseline and 9.94 GiB final.

Exact commands, run first in the baseline worktree and then the final checkout:

```sh
npm ci
npm run typecheck
NODE_USE_ENV_PROXY=1 npm test
XDG_CACHE_HOME=/workspace/.onboarding/cache npm run build
npm run test:e2e -- --reporter=list,json
# npm script itself supplies --full; use the independent preview on 4181/4180
npm run audit:accessibility -- --base-url http://127.0.0.1:4181/the-portrait-edit-issue-02/ --output /workspace/shared/phase1-complete/baseline/accessibility-full.json
npm run audit:accessibility -- --base-url http://127.0.0.1:4180/the-portrait-edit-issue-02/ --output /workspace/shared/phase1-complete/final/accessibility-full.json
```

Only the output reporter was added to the browser command. Production/test/package/config source hashes were frozen before final checks and verified unchanged afterward (`final/source-manifest.json`, `summary.json`). Build validation includes content/provenance, 365 route documents, metadata, no-JS and built-asset checks. Verified generated sitemap date-only changes were removed; no publication asset/source prompt was edited.

## Measured typography and spacing

`src/main.tsx` imports bundled fonts, `styles.css`, then `editorial.css`. Measurements follow `document.fonts.ready`, confirming loaded Inter, Newsreader and JetBrains Mono. The effective rendered overrides, not isolated declarations, are captured. The retained implementation's main changes are:

| Rendered role | Baseline CSS px / leading | Final CSS px / leading |
| --- | --- | --- |
| Body / Inter | 17 / 28.9 | 17 / 28.9 |
| Standalone article / Newsreader | 18 / 31.5 | 18 / 31.5 |
| Hero statistics | 11 / 18.7 | 12 / 20.4 |
| Hero image caption | 11 / 17.6 | 12 / 19.2 |
| Archive tag | 11 / 14.3 | 12 / 15.6 |
| Study source caption | 11 / 18.15 | 12 / 18 |
| Source note | 11 / 19.25 | 12 / 21 |
| Chapter kicker | 9 / 15.3 | 12 / 20.4 |
| Chapter count / metadata | 8.5 / 14.45 | 12 / 20.4 |
| Chapter source filename | 7.5 / 12.75 | 12 / 18 |
| Narrow navigation | 11 / 18.7 | 12 / 20.4 |
| Clipboard-failure prompt / link inputs | 12 / 14 | 16 / 16 (font sizes) |

Representative values above are light-theme 1440px except narrow navigation (320px) and real clipboard-failure fields (390px). Complete family, weight, tracking, leading, geometry, padding and gap values are in the paired JSON; before/after differences are machine-readable. Both Clipboard API and execCommand were forced to fail to measure the actual fallback fields.

Spacing: article gap 36px desktop / 28px narrow becomes 32px; article-section top 28→24px; caption offset 14→12px; chapter pair gap 9→12px and offset 10→12px, caption offset 5→8px; desktop hero-stat margin/padding 28/20→24/16px; desktop entry-card padding 28→32px. Already coherent repeated spacing is tokenized without changing geometry.

Reusable tokens extend the existing naming: `--space-1/2/3/4/6/8/12/16` = 4/8/12/16/24/32/48/64px at the default root; `--type-caption/ui/body` = 12/13/17px; `--leading-caption/reading` = 1.5/1.75. Size/space tokens use rem. Reader choices remain 16/18/20 CSS px and the existing 68ch measure is reused.

Intentional exceptions: expressive display sizes/leading/tracking, 11px redundant wordmark/shortcut notation, fluid `clamp(20px,4.5vw,64px)` gutter, safe-area expressions, fluid gaps and editorial 64/120px stagger remain. Gutters are 20/20/34.56/37.53/57.6/64px at the six requested widths. The existing five-column narrow navigation uses intrinsic label minima, zero horizontal link padding and normal tracking; a 12px narrow action gap keeps larger labels usable. This is a minimal accommodation for larger type, not a grid/breakpoint redesign. Touch targets and first-screen assertions pass unchanged. No new palette, motion, content, images, routes, translations, collections or reader behavior changes.

## Matched screenshots and deployment audit

Evidence root: `/workspace/shared/phase1-complete/` (separate from the earlier partial package).

- [Interactive before/after selector](/workspace/shared/phase1-complete/index.html)
- [Computed differences](/workspace/shared/phase1-complete/computed-differences.json) and [representative values](/workspace/shared/phase1-complete/representative-measurements.json)
- [Complete run summary](/workspace/shared/phase1-complete/summary.json)
- [Reader before](/workspace/shared/phase1-complete/before/no-preference-reader-light-320.png) · [Reader after](/workspace/shared/phase1-complete/after/no-preference-reader-light-320.png)
- [Home before](/workspace/shared/phase1-complete/before/no-preference-home-dark-1440.png) · [Home after](/workspace/shared/phase1-complete/after/no-preference-home-dark-1440.png)
- [200% reader before](/workspace/shared/phase1-complete/before/zoom200-reader-light-390.png) · [200% reader after](/workspace/shared/phase1-complete/after/zoom200-reader-light-390.png)

Each source state has **120 matched normal/reduced-motion captures**: home, archive, overview, study and reader × 320/390/768/834/1280/1440 CSS px × light/dark × normal/reduced motion. Each also has **60 native 200% browser zoom captures**, matching page/state/theme/width; zero page-level horizontal overflows in either set. Source-caption closeups and actual input-fallback screenshots are included.

Native zoom uses Chromium profile zoom level log(2)/log(1.2), `viewport:null`, with innerWidth and DPR=2 asserted and visualViewport scale=1. This is actual desktop browser zoom, separate from root font resizing or a narrow viewport. The automated root-font-200% case additionally verifies rem captions reach 24px while reader preferences remain selected. Existing keyboard/dialog, reading-size, safe-control and touch-target coverage ran in the complete suite; native zoom capture is visual/geometry evidence, not a physical-device usability certification.

The deployed page was inspected in a real Chromium browser at all 120 normal/reduced-motion page/theme/width combinations. Deployed CSS hashes match the clean baseline build exactly (`deployed/css-comparison.json`). The first attempt hit a proxy CA trust error; the retry trusted the environment's supplied CA and succeeded without disabling TLS verification (`deployed/trust-note.md`). No deployment was changed.

## Changed files and review limits

- `src/styles.css`: semantic type/spacing roles, source/caption legibility, reading rhythm, fallback input sizes.
- `src/editorial.css`: effective editorial labels and reusable spacing; minimal narrow-label accommodation.
- `tests/browser/typography-spacing.spec.ts`: four focused definitions covering both themes/six widths, long source wrapping, reading preferences/root resize, spacing and fallback fields; all applicable projects execute them.
- `PHASE1_TYPOGRAPHY_REVIEW.md`: this addendum, preserving earlier report content below.

Remaining limits: the app currently supports English only; no Spanish UI exists to test. Tests/captures use Linux Chromium and viewport/touch emulation. Physical iOS/Android devices, Safari and Firefox were not available or validated. Contrast debt remains as reported. Review the paired screenshots before approval. Everything remains local and uncommitted.

---

## Preserved earlier report — historical, superseded verification

The following original content is retained unchanged for provenance. Its clean-tree, partial-matrix and representative-audit statements describe the earlier run; use the completed cloud results above for readiness.

# Issue #57 — Phase 1 typography and spacing review

Local branch: `refine/issue-57-typography`.
Starting main: `ec3d9c4713d1b5546591124c04571a5d8f4963d6`.
The original tree was clean; no AGENTS.md was found in the checkout or workspace root. No work was stashed, discarded, committed, pushed, or deployed.

## Scope and cascade

`src/main.tsx` loads bundled Inter, Newsreader (including italic), and JetBrains Mono, followed by `styles.css`, then `editorial.css`. The latter owns the effective editorial headings, hero, section spacing and narrow-screen navigation. Base reading styles and later responsive rules in `styles.css` own source notes, captions, chapter openers, manual-copy inputs and article gaps. The app's LanguageProvider exposes English only and sets `lang=en`; no other language variants were assumed or added.

Only the two existing stylesheets are changed for presentation. Components, behavior, routes, translations, content and publication images are unchanged. A new Playwright file covers the affected metadata, wrapping, input failure states, resizing and reader size settings. This report and the review artifacts document the evidence.

## Rendered inventory and measured changes

Measurements were taken in Chromium 154 after `document.fonts.ready`. Full computed styles—including family, size, weight, line height, tracking, padding, gaps and measures—are saved for all five page types at 320, 390, 768, 834, 1280 and 1440 CSS px in each theme.

Representative light-theme measurements at 1440 CSS px (sizes/line heights in CSS px):

| Role | Before | After | Decision |
| --- | --- | --- | --- |
| Body / Inter | 17 / 28.9 | 17 / 28.9 | Semantic token; appearance retained |
| Standalone article / Newsreader | 18 / 31.5 | 18 / 31.5 | Preserve measure and leading |
| Hero issue statistics / Mono | 11 / 18.7 | 12 / 20.4 | Essential publication metadata |
| Hero image caption / Inter | 11 / 17.6 | 12 / 19.2 | Source identity and study navigation |
| Archive tags / Inter | 11 / 14.3 | 12 / 15.6 | Interactive labels remain readable |
| Study source/rights caption / Inter | 11 / 18.15 | 12 / 18 | Small source/rights text gets a clear caption role |
| Source note / Inter | 11 / 19.25 | 12 / 21 | Preserve paragraph-leading override |
| Chapter kicker / Mono | 9 / 15.3 | 12 / 20.4 | Location metadata |
| Chapter study count and opener number / Mono | 8.5 / 14.45 | 12 / 20.4 | Location metadata |
| Chapter source filename / Mono | 7.5 / 12.75 | 12 / 18 | Reference provenance must be readable |
| Navigation at 320px / Inter | 11 | 12 | Same secondary size as desktop |
| Clipboard-failure prompt field at 390px | 12 | 16 | Actual rendered failure state |
| Clipboard-failure link field at 390px | 14 | 16 | Actual rendered failure state |

The clipboard values were measured in the actual application after forcing both Clipboard API and `execCommand` failure, against both original and changed styles. Normal search/select text remains at least 16px. Checkboxes/ranges retain native geometry; no blanket button/input resize was applied.

The expressive display sizes, weights, tight tracking and line heights remain as measured, not normalized: the desktop hero remains Inter 800 with Newsreader italic, and archive/overview display heads remain Inter 750. UI labels still use Inter 13px where already legible. The general body token is rem-based; the reader-selected sizes remain explicit CSS pixels so the application preference is preserved. Prompt text retains bundled monospace and reader-selected 16/18/20px values; paragraph leading remains 1.75 and prompt leading remains 1.6. Article measure remains `min(68ch, 100%)`.

## Tokens and spacing decisions

`styles.css :root` extends the existing `--space-2` convention:

| Tokens | Default CSS px |
| --- | --- |
| `--space-1`, `--space-2`, `--space-3`, `--space-4` | 4, 8, 12, 16 |
| `--space-6`, `--space-8`, `--space-12`, `--space-16` | 24, 32, 48, 64 |
| `--type-caption`, `--type-ui`, `--type-body` | 12, 13, 17 |
| `--leading-caption`, `--leading-reading` | 1.5, 1.75 |

Sizes and spacing use rem; these are default values, not absolute limits. The existing reading measure is reused rather than duplicated.

Actual spacing refinements: article gap 36px desktop / 28px phone becomes 32px; article-section top space 28→24px; figure-caption offset 14→12px; chapter paired-image gap 9→12px, pair offset 10→12px and caption offset 5→8px; desktop hero-stat separation 28/20→24/16px; desktop entry-card padding 28→32px. Other repeated 24/32/48/64px values are tokenized without visual changes.

Intentional exceptions: fluid gutters remain `clamp(20px, 4.5vw, 64px)` (20px at 320/390, 34.56px at 768, 37.53px at 834, 57.6px at 1280, 64px at 1440). Reading-column padding, safe-area expressions, the 64/120px selected-study stagger, fluid grid gaps and the existing compact first-screen structure remain. At narrow widths, horizontal nav padding is removed (2→0px within the same target cell) and small-screen uppercase tracking becomes normal (0.22px at 11px → 0px at 12px), and the hero action gap is 12px instead of 20px horizontally. The existing five-column navigation retains its structure, with `min-content` label minima replacing zero minima so “Archive” can use its intrinsic width. This is the minimal typography-driven grid adjustment; no breakpoint, type size or touch target is reduced. Compact 11px wordmark tagline and keyboard hints are secondary/redundant branding or simple shortcut notation; they are not treated as defects solely because of size. No new stylesheet, `!important`, breakpoint, palette or motion rules were added. The single existing navigation grid adjustment is the intrinsic label minimum described above.

## Before/after evidence

Artifacts are outside the checkout under `/workspace/shared/phase1-review/`:

- `before/measurements.json`, `after/measurements.json`: 60 normal-zoom cases each.
- `before/zoom200.json`, `after/zoom200.json`: 60 actual-browser-zoom cases each.
- `computed-differences.json`: all recorded computed-style differences.
- `clipboard-measurements.json`: rendered failure-state input sizes.
- `index.html` is an interactive side-by-side screenshot selector (page, theme, width, zoom).
- Each before/after directory contains screenshots named `<page>-<theme>-<width>.png`, matching caption screenshots, and `zoom200-<page>-<theme>-<width>.png`.
- `capture.mjs`, `capture-zoom.mjs`, `clipboard-check.mjs`, `summarize.mjs` reproduce captures and measurement summaries against the local dev server.

Examples:

[Reader before](/workspace/shared/phase1-review/before/reader-light-320.png) · [Reader after](/workspace/shared/phase1-review/after/reader-light-320.png)

[Home before](/workspace/shared/phase1-review/before/home-dark-1440.png) · [Home after](/workspace/shared/phase1-review/after/home-dark-1440.png)

Each pair uses identical viewport, theme and state. Browser zoom was tested using a persistent Chromium profile with native 200% zoom and no Playwright device-metrics emulation (`viewport: null`): DPR=2, visual viewport scale=1, with an outer window twice the requested CSS width. Both innerWidth and DPR are asserted. These are not device-scale-factor, pinch-zoom or narrow-viewport simulations. Root text-size 200% is an additional, separately labeled regression check.

## Validation

Passed so far: clean-lockfile install, typecheck, 192 unit tests and 5 external-link tests; production build including 365 route documents and metadata checks. The initial 253-case browser matrix produced 177 passed, 70 intentionally skipped and 6 failed. Five failures exposed the narrow-screen navigation/action layout regressions described above; the sixth was a newly written test looking for “16px” rather than the actual “16 px” button. The new test selector was corrected; existing assertions, retries and skip settings were not weakened.

The first `--last-failed` rerun passed 4 and failed 2 (navigation intrinsic width). After the minimal grid fix, the final `--last-failed` rerun passed both remaining cases. All four new focused tests then passed on the final styles. The broad matrix was not rerun in full after these localized fixes; unchanged cases retain their earlier results. Explicit-matrix tests run once on the existing desktop-light project; other projects skip those cases by design.

Both before/after runs cover 60 normal-zoom and 60 actual-200%-zoom cases each, with no page-level horizontal overflow. The accessibility audit completed 102 states per version: zero axe violations and the same 15 supplemental toolbar contrast failures in both. This is an audit failure (exit 1), not an accessibility pass.

Commands:

```sh
npm ci --cache /workspace/.npm-cache
npm run typecheck
NODE_USE_ENV_PROXY=1 npm test
XDG_CACHE_HOME=/workspace/.onboarding/cache npm run build
npm run test:e2e -- tests/browser/typography-spacing.spec.ts tests/browser/editorial-layout.spec.ts tests/browser/discovery-sharing.spec.ts tests/browser/responsive-reader.spec.ts tests/browser/reader.spec.ts --workers=1
npm run test:e2e -- --last-failed --workers=1
npm run test:e2e -- tests/browser/typography-spacing.spec.ts --project=desktop-light --workers=1
node scripts/audit-contrast.mjs --output /workspace/shared/phase1-review/accessibility.json
```

The existing audit's supported representative mode is used (not `--full`): representative routes in both themes plus reader, collection, dialog and interaction states. A separate Vite baseline server supplies the exact original styles from the starting commit; other app source is unchanged. Running the same audit against it establishes whether failures predate this work. Reports are `accessibility-before.json` and `accessibility.json`; the baseline server deliberately uses its own dependency cache. A broad all-route/static-document audit is not claimed. Audit reports contain the compiled-build fingerprint used by that run; the baseline browser is deliberately supplied original styles through the comparison server, rather than substituting source declaration values for computed measurements.

Logs copied into the review package record the initial browser run, each rerun, focused regressions, build, unit tests, and both audit runs. The local code patch is `changes.patch`; it includes the new test and this review document, with no generated sitemap date noise.

Remaining limits: Chromium on Linux only; physical Safari/iOS/Android and Firefox are not tested here. Inspect the supplied screenshots before final approval. The existing audit flags a reader-toolbar worst-case translucent-surface/grain contrast ratio of 4.38994:1 versus 4.5:1 in 15 light-theme states, reproduced using original styles. This is not hidden or corrected by an unrelated palette change.
