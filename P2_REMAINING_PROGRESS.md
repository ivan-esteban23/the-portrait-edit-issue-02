# Remaining P2 audit fixes (E, H, I) — 2026-10-24

Implemented in `/home/user/Work/the-portrait-edit-p2-remaining` on branch `fix/p2-home-empty-card-copy`, based on deployed `origin/main` at `3d12447` (PR #46). The original `/home/user/Work/the-portrait-edit-issue-02` checkout and all its unpublished reader changes remain untouched.

## Changes

- **P2 Item E (Homepage archive discovery & mobile hierarchy):**
  - Added `Browse studies` (`/prompts`) directly alongside `Start reading ↗` / `Resume reading · Page {page} ↗` in `.hero-actions` on `src/pages/HomePage.tsx`.
  - Moved the featured portraits section (`From the archive`, `.selected-section`) above the three-card onboarding section (`Make the issue yours`, `.home-start`) and shortened the introductory card copy and mobile vertical spacing so first-time and returning phone visitors see both reading and browsing paths immediately in the first screen (`< 568px` height at `320px` width) and encounter portrait imagery before onboarding instructions (`< 844px` at `390×844`).
- **P2 Item H (Empty saved collections & consistent collection terminology):**
  - Replaced `"curation board"` in `src/pages/ArchivePage.tsx` with consistent `collection` terminology across both the `Default` collection and named collections (`“${activeCollection}”`).
  - Added a direct `Browse studies` button inside `.empty-state` when `saved=1` is active that deliberately clears only `saved=1` (`filter("saved", "")`), keeps any remaining search/style/model/aspect-ratio filters active and visible, and restores focus to the `Search` input.
  - Added `.empty-state-filters` copy explaining which non-saved filters remain applied when an empty collection view also has active filters.
- **P2 Item I (Clipboard failure feedback & manual copy on study cards):**
  - Updated `src/components/StudyCard.tsx` to track copy request IDs (`copyRequest.current`) so delayed or stale clipboard promises cannot overwrite newer copy feedback or leak after unmount.
  - When clipboard copying fails (`raw`, `params`, or `markdown`), the card announces `Copy unavailable for Study {studyNumber}. Select the prompt text below to copy it.` in an attached `role="status"` live region and renders a selectable `readOnly` input (`Prompt to copy for Study {studyNumber}`) containing the exact formatted prompt text without navigating away from the archive or overflowing the card.
- **Additional low-priority refinements included:**
  - Normalized `model` filter matching in `src/pages/ArchivePage.tsx` (`p.model?.trim()`) so whitespace-padded model names match their trimmed option and whitespace-only values match `Unspecified`.
  - Added `Browse the archive` (`/prompts`) alongside `Back to the reader` on `src/pages/NotFoundPage.tsx`.

## Verification

- `npm ci --no-audit --no-fund` — passed with the committed lockfile.
- `npm run typecheck` — passed (`tsc --noEmit`).
- `npm test -- --maxWorkers=1` — **25 files / 178 tests passed**.
- `npm run build` — passed (`validate`, `typecheck`, `vite build`, 165 card thumbnails, 364 route entrypoints, and sitemap generation). Restored only build-generated `public/sitemap.xml` date changes.
- `CI=1 npm run test:e2e -- tests/browser/p2-discovery-actions.spec.ts tests/browser/discovery-sharing.spec.ts tests/browser/archive-usability.spec.ts --project=small-phone-dark --project=phone-light --project=large-phone-dark --project=tablet-light --project=tablet-landscape-dark --project=desktop-dark --project=desktop-light --workers=2` — **70 passed, 0 failures, 0 skips** (1.2m).
- `CI=1 npm run test:e2e -- tests/browser/archive-cards.spec.ts --project=chromium-responsive --workers=2` — **10 passed, 0 failures** (10.9s).
- `CI=1 npm run test:e2e -- tests/browser/reader.spec.ts --grep "publication routes" --project=small-phone-dark --project=phone-light --project=desktop-light --workers=2` — **3 passed, 0 failures** (4.4s).
- `npx prettier --check` on all changed files and `git diff --check` — passed.
