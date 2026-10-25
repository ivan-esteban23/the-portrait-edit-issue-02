# Contrast and image alternative audit — 2026-10-25

Audited the production build with axe-core 4.14.0: **2,326 page/state checks, zero `color-contrast` or `image-alt` violations**. Additional computed/image-background checks also passed. No layout or font-size changes were made.

## Coverage and evidence

- All **366 route URLs**: home, issue overview, 196 reader pages, 165 study pages, archive, about, and missing-route fallback.
- Both light and dark CSS themes, with application JavaScript enabled and static documents parsed with it disabled. Every reader page is checked in original and text modes; static extracted-text disclosures are checked open too: **2,248 route/state checks**.
- **70 additional states** across 390px/1280px viewports and both themes: command palette, bookmark toast, copy feedback, anatomy, Prompt Studio, image inspector, display settings, filmstrip, chapter drawer, active/idle Focus, selected tags, comparison modes/dragging, batch-copy failure, and print.
- **8 legacy reader checks**: cover, original page 60, text page 60 and the initial no-JavaScript fallback in both system color schemes. The historical source was served in a temporary localhost fixture with its existing `docs/` assets.
- [Per-page results](contrast-alt-audit-2026-10-25/page-results.csv), [token measurements and layout proof](contrast-alt-audit-2026-10-25/results-summary.json), [complete CSS inventory](contrast-alt-audit-2026-10-25/css-inventory.csv), and [original failing examples](contrast-alt-audit-2026-10-25/before-violations.json).

The CSS inventory includes **1,848 declarations** from `src/styles.css`, `legacy/style.css` and compiled stylesheet assets: text/background paints, font sizes/shorthands, opacity, and custom properties. This includes muted captions, metadata, badges, labels and generated utility classes.

## Changed color tokens

Ratios use WCAG sRGB relative luminance. The small-text threshold is 4.5:1; large text is at least 24 CSS px, or 18.67 CSS px at weight 700+, and requires 3:1. Shared body, caption, accent, idle and status roles are conservatively tested at **4.5:1 on every shared surface**, even where large text would permit 3:1. Status-role rows report the CSS role on the available surfaces; archive card copy icons also retain their existing accent styling.

| Token | Theme | Measured pair | Before → after color | Before | After |
| --- | --- | --- | --- | ---: | ---: |
| `--accent` | Light | Small accent text / hover surface | #8c6d3b → #765a30 | 3.94:1 | 5.25:1 |
| `--danger` | Dark | Copy error / surface | #b42318 fallback → #ff9b8a | 2.85:1 | 9.20:1 |
| `--danger` | Light | Error role / surface | #b42318 fallback → #b42318 | 6.47:1 | 6.47:1 |
| `--success` | Light | Success role / hover surface | #16a34a → #146d30 | 2.70:1 | 5.28:1 |
| `--success` | Dark | Success role / hover surface | #16a34a → #76db99 | 4.94:1 | 9.59:1 |
| `--idle-text + idle opacity removal` | Light | Focus idle labels: minimum across matched elements | 20% opacity → opaque shared idle text | 1.31:1 | 5.89:1 |
| `--idle-text + idle opacity removal` | Dark | Focus idle labels: minimum across matched elements | 20% opacity → opaque shared idle text | 1.30:1 | 5.74:1 |
| `--image-label + --image-scrim` | Light | Worst image pixel | page background text / 35% dark scrim → #ffffff / 72% black | 2.06:1 | 9.23:1 |
| `--image-label + --image-scrim` | Dark | Worst image pixel | page background text / 72% black scrim → #ffffff / 72% black | 1.00:1 | 9.23:1 |
| `--image-handle-text + --image-handle-background` | Dark | Comparison handle while dragging | #171614 / #121212 → #171614 / #ffffff | 1.04:1 | 18.08:1 |
| `--image-handle-text + --image-handle-background` | Light | Comparison handle while dragging | #171614 / #fffdf8 → #171614 / #ffffff | 17.79:1 | 18.08:1 |
| `--navigation-background` | Light | Muted text over worst image | 84% canvas → 96% canvas | 4.38:1 | 5.81:1 |
| `--floating-background` | Light | Reader toolbar muted text over worst image | 84% surface → 96% surface | 4.73:1 | 6.27:1 |
| `--navigation-background` | Dark | Muted text over worst image | 84% canvas → 96% canvas | 4.08:1 | 5.75:1 |
| `--floating-background` | Dark | Reader toolbar muted text over worst image | 84% surface → 96% surface | 3.60:1 | 5.26:1 |
| `--body-background` | Dark | Body text / computed canvas | #121212 + flat #080808 gradient → var(--bg) = #080808 | 16.88:1 | 18.05:1 |

Image rows bound the worst image pixel, not a favorable crop. The 72% black scrim guarantees at least **9.23:1** for white image labels; even a conservative 2.5% grain perturbation on opposite foreground/background pixels leaves **8.18:1**. Floating controls also pass the same black/white image and grain bounds; their minimum measured bound is **4.71:1**. Backdrop blur is not used to establish the contrast guarantee.

The body canvas previously used a two-identical-stop gradient that painted `#080808` while exposing `#121212` as its computed background color. Replacing that gradient with the same solid paint exposes the real canvas to axe. Its rendered body-text ratio is unchanged at **18.05:1**; the table shows the corrected computed pair.

The original sampled axe failures included the light chapter-opener labels (4.37:1), image Inspect labels (2.23:1 light / 1.03:1 dark), and dark batch-copy error (2.84:1). The table also covers hover surfaces, success colors and image-backdrop extremes found by the token inventory.

Focus idle chrome previously reduced whole-panel opacity to 20%, including captions. It now uses shared theme-specific idle text colors at full panel opacity, keeping the quiet reading state legible. The seven previously failing elements in each theme now all pass; the table reports the minimum ratio across those matched elements. Pointer and keyboard activity still wake the controls.

## Image alternatives

- The historical reader's initially sourceless, empty-alt image now has `src="pages/001.webp"` and a meaningful cover alternative before JavaScript runs. Its initial cover alternative also names the publication and issue.
- Original reader page alternatives identify the publication, page purpose/chapter, and page number. Chapter-drawer previews identify their chapter opener.
- Related-study thumbnails are decorative beside their visible study title. Filmstrip previews are decorative inside explicitly named page buttons. These intentionally retain/use `alt=""` so screen readers do not repeat the label.
- Rendered image records were checked for absent/empty sources, missing alt attributes, and unexpected empty alternatives: **zero failures**. Reference portraits and covers retain meaningful alternatives.
- No empty Markdown image destination was present in tracked source files.

## Method and limits

Only the two requested axe rules are claimed as zero-violation results. Axe's incomplete contrast findings are retained rather than called passes: transparent stretched card links and glyph-only controls receive independent computed foreground/background checks, with 4.5:1 for text and 3:1 for non-text controls. **14,057 incomplete node findings** were reviewed by the supplementary calculation; **21,567 supplementary checks** passed, including the worst-case overlays. Labels with inherited color, alpha compositing and shared background surfaces are included.

Static documents are first parsed with JavaScript disabled. Their `noscript` children are preserved in an equivalent visible DOM, app scripts are removed, and only audit instrumentation is enabled so axe's timers can run. The application root must remain empty. Native JavaScript-disabled navigation/image/text behavior is separately covered by the browser regression tests.

Printed magazine artwork and the original PDF/reference assets were preserved. Axe checks HTML text and alternatives; it cannot assess every letter baked into a bitmap/PDF. Scanned pages have an HTML text reading alternative.

## Layout and regression checks

- **2,786 non-paint CSS declarations are identical** to merge commit `2d88eaa`, including font sizes, spacing, dimensions, grid/flex, positioning and transforms. Their before/after hashes match.
- **24 geometry comparisons** across home, archive, study detail, issue overview and reader, at 390px/1280px in both themes: zero changes (0.5px tolerance).
- Production build, content preservation validation and TypeScript checks passed.
- All 182 unit tests passed, including four new contrast matrix/image-overlay tests.
- Ten targeted browser checks passed, including native JavaScript-disabled reading, explicit themes/focus rings, and idle Focus contrast in both themes.

Reproduce: build the site, run `npm run preview -- --host 127.0.0.1 --port 4173`, then run `npm run audit:accessibility -- --output /tmp/portrait-contrast-audit.json` in another terminal. `--resume` validates the CSS/build fingerprint before reusing completed cases. Supply `--legacy-url <localhost-fixture-url>` to include the historical source fixture. See the README for the audit method.
