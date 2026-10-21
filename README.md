# The Portrait Edit

A React + TypeScript editorial magazine and portrait-prompt archive.

**Live:** https://ivan-esteban23.github.io/the-portrait-edit-issue-02/

## Develop and verify

Node 24 LTS is used in CI (minimum supported: Node 22.12). Use npm and the committed lockfile.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
npm run preview
npm run test:e2e
```

Open `/the-portrait-edit-issue-02/` on the Vite server. `npm run build` runs content validation and TypeScript before producing `dist/`. Browser tests use system Chromium when available; otherwise run `npx playwright install chromium`. Linux CI uses `npx playwright install --with-deps chromium`.

## Architecture

- `src/App.tsx`: BrowserRouter routes, publication shell, persistent Focus preference and compatibility with old hash links.
- `src/components/Reader.tsx`: original-page and flowing reading modes, URL navigation, chapter controls, scrubber, ±10-page steps, lazy raw text, loading/retry and adjacent image prefetch.
- `src/components/Study.tsx`: original study text and references, editorial prompt card, exact-copy feedback and clipboard fallback.
- `src/pages/`: homepage, issue overview, searchable archive, study records, About and 404, split into route-level page modules.
- `src/components/ui/`: source-owned shadcn/ui-style Button and Dialog compositions using Radix primitives, CVA and Tailwind utilities. `components.json` configures further shadcn components; no hosted UI service is required.
- `src/hooks/useReader.ts`: media queries, 3.5-second desktop Focus dimming and passive swipe handling for both canvases.
- `src/content/schema.ts`: shared Zod schemas. `scripts/validate-content.ts` validates records, paths, chapter boundaries, study numbering, featured IDs and source preservation.
- `docs/`: **static assets**, copied by Vite into `dist/` at the same URLs. It is no longer the deployment output directory. No image was regenerated or deleted.
- `legacy/`: archived HTML/CSS/JS, former UI fixtures, complete pre-migration file inventory and SHA-256 manifest.
- `build.py`, `verify-content.py`, `requirements.txt`: retained PDF extraction tooling. This migration does not rebuild or replace the release PDF.

### Routes

| Route                       | Purpose                                             |
| --------------------------- | --------------------------------------------------- |
| `/`                         | Current issue and selected studies                  |
| `/issues/:slug`             | Chapter directory and PDF download                  |
| `/issues/:slug/pages/:page` | Original/Reading view                               |
| `/prompts`                  | Search plus style/tag and model filters             |
| `/prompts/:id`              | Study, prompt, flags and notes                      |
| `/about`                    | Editorial statement, methodology and GitHub contact |
| Any other path              | Publication-themed 404                              |

All routes live beneath `/the-portrait-edit-issue-02/`. Existing `#page=60` and `#reader` links redirect into the reader. Page turns replace the current history entry, as the legacy reader did; links from the archive/home create normal history entries. Back/forward remain native browser behavior.

## Reader interaction

The homepage offers Read, Explore, and Collect entry points. Read resumes the
last page; Collect opens the active collection's saved studies and shows its
current count. Progress and collections stay in the current browser; the archive
provides JSON and Markdown exports for keeping a copy.

Every study has a Copy link action, including on browsers without native sharing.
The reader's Tools group offers Copy page link for the exact current page. Links
include the GitHub Pages base path and open directly; if clipboard access fails,
a read-only field provides the URL for manual copying. Feedback resets when the
destination changes, and pending copy results cannot overwrite a newer page's
feedback. The interface is presented in English.

Below 768px, Reading view is the default; wider screens default to Original page. Original pages offer Fit / 125 / 150 / 200% zoom. Reading view offers 16 / 18 / 20px text with a 68ch maximum measure, Newsreader editorial text, and monospace prompts.

The native page slider previews while dragging and commits on release, keyboard completion or blur. Nine chapter ticks and ±10-page buttons support precise navigation. The page number stays editable. Only previous/next images are prefetched, at low priority; the visible original page uses high priority and async decoding.

Display opens an accessible Radix dialog: a bottom sheet on phone/tablet widths, a centered dialog on desktop. It provides chapter selection, modes, size/zoom, shortcut guidance and the release PDF. Radix handles focus trapping, Escape dismissal and focus restoration. Mobile/tablet navigation docks at the bottom with safe-area clearance. Horizontal swipes work in both modes; vertical scrolling, multi-touch, pinch zoom, selected text and controls are ignored. Original pages zoomed above Fit keep native horizontal panning.

Focus is stored under `portrait-edit-focus-mode`. `?focus=1` enters it; `?focus=0` exits it. F toggles Focus, Escape exits it (or closes an open settings dialog first), arrows/J/K turn pages, and Home/End reach issue boundaries. Shortcuts ignore form controls and editable text. This deliberately updates the old Escape behavior to meet the new specification. Desktop chrome dims after 3.5 seconds and wakes on pointer, touch, key or focus activity. Reduced-motion preferences disable fades and animations.

## Typography and themes

Inter and Newsreader variable WOFF2 fonts are self-hosted from their Fontsource npm packages, including Newsreader italic. Charter/Georgia and platform sans/monospace stacks provide fallbacks. Light and dark share geometry and type scales. The theme toggle and display settings offer only Light and Dark, and the chosen theme is saved in local storage.

Every form control has a minimum 16px font across all widths, including iPads. Greyscale font smoothing applies **only** above 192dpi / 2dppx; standard-density Windows keeps its native text rendering. Focus rings, selected/disabled controls, loading and error states use shared theme tokens.

## Content and provenance

Issue records live in `src/content/issues/<slug>/issue.json`; studies live in `src/content/prompts/<id>.json`. Issue 02 contains 196 pages and 168 unique archive studies. Repeated image references are represented once in the archive; the printed magazine reader pages retain their original content. Eight archive references use 2× Lanczos-resampled copies; reader pages retain the original extracted images.

The original source does not record model versions, generation parameters or dates: `model` and `date` are `null`, `parameters` is `{}`. The interface says “Not recorded” / “Unspecified”. Tags come only from the existing comma-separated style descriptions. A prompt’s verification statement means its text matches the published source; it is not a rights or identity claim. No private contact details were invented; contact points to the public project issue tracker.

### Add a new issue

1. Add `src/content/issues/<slug>/issue.json`, using the current record as a template. Supply a unique slug, number, title, description, cover path, `pdfUrl`, PDF bytes, page/study counts, featured study IDs, and ordered chapter start/end pages.
2. Put images under `docs/`. Use a distinct `pageDirectory`, such as `issues/<slug>/pages`, with `001.webp` and `001.json` through the final page. Page JSON must include `text`. Paths are relative to `docs/`, with no leading slash or traversal. References may live under `issues/<slug>/references/`.
3. Add corresponding prompt records. Set the new issue’s counts and featured IDs accurately. Update `currentIssue` in `src/content/issues.ts` if it becomes the featured publication.
4. Run validation, tests and build before committing. Postbuild generates direct entrypoints for every issue/page/study automatically.

### Add or maintain a prompt

Use a unique filename matching `id`, link it to `issueSlug` and its printed page, and include all required fields in `promptSchema`: title, study number, reference path, exact prompt, source, style, notes, Try this, flags, parameters, tags, nullable model/date. Dates, when documented, use `YYYY-MM-DD`. Update issue counts and preserve sequential study numbers. Keep unknown values unknown.

Issue 02’s migration is protected by comparisons to the published `docs/pages/*.json` and `legacy/asset-sha256.json`. Missing fields, broken paths, duplicate assignments, altered protected content or assets cause the build to fail with the file and field involved. Do not regenerate the preservation manifest simply to silence a failure; intentional editorial source revisions need a separately reviewed provenance update.

## GitHub Pages

The Vite base is `/the-portrait-edit-issue-02/`. In repository **Settings → Pages**, select **GitHub Actions** as the deployment source. `.github/workflows/deploy.yml` validates, typechecks, runs unit/browser tests, builds and deploys `dist/` on main. Pull requests run checks without deploying. The workflow uses scoped Pages/OIDC permissions and pinned Actions.

`scripts/postbuild.mjs` copies `dist/index.html` to `dist/404.html`, writes `.nojekyll`, and creates entrypoint copies for all known routes. Thus direct known URLs receive normal Pages responses, while unknown routes load the branded 404 through the fallback. Vite asset URLs are absolute beneath the repository base, so nested routes resolve scripts, fonts and images correctly. Keep the GitHub release PDF URL intact; the PDF is not bundled into the repository or deployment artifact.

The workflow follows the [Vite GitHub Pages deployment guide](https://vite.dev/guide/static-deploy.html#github-pages); Tailwind is installed through its [Vite plugin](https://tailwindcss.com/docs/installation/using-vite).

## QA scope

See [Responsive reader QA](RESPONSIVE_QA.md) for the Chromium responsive matrix and the separate physical-device release checklist.

The active suite includes Zod diagnostics, full content/asset preservation, copy fallback/stale-response isolation, and Chromium browser tests at 320, 390, 430, 834, 1194, 1280 and 1440px in light/dark variants. Browser tests exercise route entry, legacy hashes, archive filtering, Focus, modes, zoom, sizing, copying, keyboard, scrubber, swipes and image retry, and capture review screenshots in ignored `test-results/`.

Chromium viewport/touch emulation does not certify Safari on Apple hardware, Windows ClearType or physical gesture bars. Those platform checks remain manual. Do not treat the earlier `VERIFICATION.json` PDF report as a sign-off for this application.
