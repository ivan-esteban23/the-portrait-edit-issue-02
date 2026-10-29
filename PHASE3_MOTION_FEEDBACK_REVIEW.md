# Issue #57 — Phase 3 motion and feedback review

Baseline: `69331c88af9eedd146fb7f9c029142fd1a17a6e8`, branch `refine/issue-57-motion-feedback`. Stylesheet order is bundled fonts, `styles.css`, then `editorial.css`. The original checkout was preserved; no overlapping PRs were found. No commit, push or deployment was made.

## Reproduced findings and changes

- The thumbnail filmstrip called `scrollIntoView({behavior: "smooth"})` even with reduced motion. Browser interception confirmed this in both preferences on the baseline. It now chooses instant scrolling for the current reduced-motion preference and smooth scrolling otherwise, without delaying the page change. The focused browser regression changes the preference twice during a session and checks each resulting call.
- In prompt anatomy, an older copy success could replace a newer failure; a pending dismissal could also erase newer feedback. A request generation and cleaned-up timer now keep the latest action authoritative. Two unit regressions cover these cases.
- Compare Lab silently ignored copy failures and allowed old results/timers to overwrite newer feedback. A single visible status region in the sticky comparison toolbar reports success or failure; the request and timer are invalidated when the comparison changes or closes. Its reserved space minimizes layout movement. A regression reproduces the old silent failure and checks stale-response isolation.
- Prompt Studio and archive batch copy could accept older copy results after a newer action. Each now invalidates prior requests on a new action and relevant state changes; focused unit regressions reproduce the original failures.
- The study prompt card shared feedback between copy and recipe export; a delayed copy could overwrite a later export failure. A common request generation preserves the latest feedback, while separate busy flags still finish independently. A regression covers the overlap.
- The prompt copy control retains focus while busy, exposes `aria-disabled`, and rejects repeated activation until the pending copy completes. A regression covers the pending state and a browser test covers fallback focus.
- Prompt-card, prompt-anatomy, Studio and Compare Lab status regions reserve room for feedback rather than expanding from zero height; this is a minimal layout adjustment to avoid moving nearby controls. The status regions sit beside the associated controls rather than below long content. Browser regressions check visibility, focus and geometry after success and failure. At 320px, measured prompt feedback height remains 42px for both states; Studio remains 44.19px.
- Card action and tag hover transitions now list the actual color, background, border and (for card actions) transform properties instead of `all`; the existing 120/140ms timing remains.

Existing copy-link and study-card request guards, clipboard fallback selection/focus restoration, undo lifetime, Focus idle timer and reader input behavior are retained. No global motion token was added: the existing transitions have different roles and durations; introducing a token would not simplify the two changed rules. Existing sound/haptic capabilities were not added or changed.

## Motion inventory

CSS reduced-motion rules disable animations and transitions and set CSS scroll behavior to auto. The filmstrip was the reproduced JavaScript exception. The following describes the existing cascade; motion effects are not evidence of a defect merely because they share timing or a keyframe.

| Trigger / element                          | Existing effect and purpose                                                                                  | Timing                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Document anchor scrolling                  | CSS smooth navigation, auto under reduced motion                                                             | browser controlled                                      |
| Reader Focus idle / wake chrome            | reader top, bottom and toolbar opacity; toolbar also transform/background                                    | 180ms ease; toolbar 220ms ease                          |
| Loaded original page art                   | `page-arrive` opacity fade signals image arrival                                                             | 170ms ease-out                                          |
| Reader page change                         | `pageTurn` on the reader canvas; separate from loaded-image fade                                             | 150ms ease-out; JS turning timer 150ms                  |
| Loading line                               | translated indicator while image loads; separate loading text remains                                        | 1.2s infinite ease-in-out                               |
| Reading and slideshow progress             | width change                                                                                                 | 150ms ease-out / 60ms linear                            |
| Cards, tags and thumbnails                 | hover/selected border, color and transform; tooltip opacity/transform                                        | 120–150ms ease                                          |
| Lightbox                                   | overlay fade and image transform; dragging removes transform transition                                      | 150ms fade, 80ms transform                              |
| Filmstrip and chapter drawer               | entrance slide; JS centers active thumbnail                                                                  | 140ms / 180ms ease-out; JS smooth except reduced motion |
| Shortcuts, Compare Lab and command palette | overlay fade                                                                                                 | 120–150ms ease-out                                      |
| Compare and batch docks                    | dock entrance                                                                                                | 180ms ease-out                                          |
| Prompt Studio                              | overlay fade and drawer entrance                                                                             | 120ms ease-out / 200ms cubic-bezier(0.16,1,0.3,1)       |
| Controls in search, Compare Lab and Studio | hover/selected colors, backgrounds, borders, shadows; some existing `all` transitions retained               | 80–140ms ease                                           |
| Swipe hint                                 | declares `fadeIn`, but no matching keyframes exist in source or built CSS; no entrance animation is provided | declared 200ms ease                                     |
| Prompt anatomy tokens                      | transform/background on interaction                                                                          | 140ms ease                                              |
| Reader hover-pause indicator               | opacity                                                                                                      | 180ms ease-out                                          |
| Masthead links and theme toggle            | color, background, border and toggle transform                                                               | 180ms ease                                              |

The Focus idle/wake timer remains 3.5 seconds and listens to pointer, keyboard, touch and focus activity. Reader navigation does not wait for the page-turn timer. Page-art fade, reader page-turn animation and filmstrip entry affect different elements and were not combined. CSS and JS touch, swipe, zoom, native scrolling, dialog focus handling and existing undo lifetime are unchanged. Several `transition: all` rules remain in separate controls where the interaction has not been changed in this phase.

## Verification

Final commands and results on the final source:

- `NODE_USE_ENV_PROXY=1 npm test`: 199 unit tests and five external-link checks passed.
- `npm run typecheck`: passed.
- `XDG_CACHE_HOME=/workspace/.onboarding/cache npm run build`: passed; includes content validation, 365 route documents, no-JavaScript and built-asset checks.
- `npm run test:e2e -- tests/browser/motion-feedback.spec.ts --project=desktop-light --workers=1`: five passed.
- `PLAYWRIGHT_JSON_OUTPUT_NAME=/workspace/shared/issue57-phase3/verified-browser.json npm run test:e2e -- --reporter=list,json`: 457 passed, 60 existing skips, zero failures, timeouts, unrun or flaky cases; 1,075.41 seconds in one invocation within the configured 20-minute limit. The five new browser tests ran in seven applicable projects. No retry or skip settings changed.
- `npm run audit:accessibility -- --base-url http://127.0.0.1:5195/the-portrait-edit-issue-02/ --output /workspace/shared/issue57-phase3/verified-accessibility.json`: complete, 2,318 page/state records; zero axe violations and 397 supplemental failures. The failure signatures match the Phase 2 baseline by route, theme, state, element and ratio; zero new or removed signatures. The command exits 1 for the pre-existing light reader toolbar `--muted` worst-case image/grain contrast of 4.38994:1 versus 4.5:1. This is an audit failure, not a pass. The configured axe rules cover color contrast and image alt, not all WCAG requirements.
- Formatting and `git diff --check`: passed.

The regression logs retain the deliberately failing baseline tests, the partial browser runs stopped before source changes, and the earlier failed focus/visibility checks. Those runs are not claimed as final passes. The final suite covers existing rapid page/Focus navigation, reader loading/retry, swipe/zoom, dialog focus, saved collections, clipboard fallback and Undo, as well as the new copy race, visible-feedback and reduced-motion tests.

## Evidence and limits

The before/after reduced-motion filmstrip recordings are [before](/workspace/shared/issue57-phase3/before-reduced-motion.mp4) and [after](/workspace/shared/issue57-phase3/after-reduced-motion.mp4). They are short Chromium screencast captures encoded from variable-rate frames; use them for qualitative review, not precision timing. Baseline interception recorded `smooth` with both preference settings; the final browser test verifies `instant` under reduced motion, `smooth` under normal motion and immediate preference changes during the session. The captured before source tree matches the baseline commit.

At 320px, [copy success under reduced motion](/workspace/shared/issue57-phase3/copy-success-reduce.png), [copy failure under reduced motion](/workspace/shared/issue57-phase3/copy-failure-reduce.png), [Studio failure under reduced motion](/workspace/shared/issue57-phase3/studio-failure-reduce.png), and [Compare Lab failure under reduced motion](/workspace/shared/issue57-phase3/compare-failure-reduce.png) show the feedback in context. Corresponding normal-motion captures and `feedback-geometry.json` are in `/workspace/shared/issue57-phase3/`. At that width, prompt-card feedback stays 42px high for the measured failure, Studio stays 44.19px, and the messages are visible beside their controls. Screenshots alone do not establish animation quality; review the recordings and behavior in a browser.

Changed source: `src/components/CompareLab.tsx`, `src/components/PromptAnatomy.tsx`, `src/components/PromptStudioDrawer.tsx`, `src/components/Study.tsx`, `src/components/reader/ThumbnailFilmstrip.tsx`, `src/pages/ArchivePage.tsx`, and `src/styles.css`. Added regression files: `tests/browser/motion-feedback.spec.ts`, `tests/archive-batch-feedback.test.tsx`, `tests/compare-feedback.test.tsx`, `tests/prompt-anatomy-feedback.test.tsx`, `tests/prompt-card-feedback-race.test.tsx`, and `tests/studio-feedback.test.tsx`. This report is also new.

Coverage is Linux Chromium, including emulated touch and viewport contexts; Safari, Firefox and physical devices were not tested. Not every state was manually inspected on every device or theme. The pre-existing toolbar contrast debt remains. Subject to motion/device review and that known audit failure, the work is ready for review and remains local and uncommitted.
