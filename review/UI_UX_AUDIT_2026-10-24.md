---
title: The Portrait Edit — UI/UX Review
date: 2026-10-24
tags: [portrait-edit, design, ui-ux, audit]
status: recommendations
---

# The Portrait Edit — UI/UX Review

## Recommendation

Preserve the editorial typography, restrained palette, portrait imagery, and existing reader functionality. Prioritize search reliability, retaining browsing context, and accessible feedback. Then simplify mobile discovery and study actions. A full visual redesign is not justified by this inspection.

## Scope and evidence

- Live site: https://ivan-esteban23.github.io/the-portrait-edit-issue-02/
- Fetched default branch: `dd73186` (PR #42). Tag discovery from PR #41 is already merged; it is not unfinished implementation work.
- Local checkout: `boat/remote-development` at `495e005`, with existing unpublished reader changes. These were preserved. Live observations below do not assess those unpublished changes.
- Inspected homepage, archive, issue overview, study detail, reader page 60, About, and the saved collection empty state during this session. Refreshed archive checks at 320, 390, 834, and 1440 CSS pixels, each at 844px height, in explicitly selected dark and light themes. These are Chromium viewport simulations, not physical devices.
- Browser actions covered search, tag expansion, opening a filtered study, returning via its archive link, and direct focusability of the hidden Undo control. Source inspection supplied causes and implementation locations.
- Earlier same-session mobile measurements and screenshots are identified where used. New raw measurements: [measurements.json](ui-ux-audit-2026-10-24/measurements.json).
- No application files changed. No unit suite, production build, or complete Playwright regression suite was rerun for this report. No Lighthouse score, exhaustive contrast audit, screen-reader audit, or user-study results are claimed.

## What is working

- Clear editorial identity across archive, reader, and informational pages.
- Distinct, coherent light and dark treatments, both explicitly inspected.
- No horizontal archive overflow at the four refreshed widths in either theme.
- Responsive popular tags, tag counts, a visible disclosure, selected-tag handling, and clear tag control are already implemented.
- Archive portraits begin around 516px down at 320/390px widths, 611px at 834px, and 586px at 1440px in the refreshed checks. The default archive presents imagery within the 844px viewport.
- The mobile reader has persistent previous/next controls. Existing original-page and flowing-text modes address different reading needs.
- Unknown metadata is described honestly; model and ratio controls are omitted when there are no meaningful recorded values.

## Priorities

P1 means a usability or accessibility defect worth fixing first. P2 means a design improvement to evaluate in a focused iteration. Effort estimates are relative, not delivery commitments.

| ID | Priority | Improvement | Evidence | Effort |
| --- | --- | --- | --- | --- |
| A | P1 | Normalize search and support hashtags | Reproduced live + source | Small–medium |
| B | P1 | Retain archive context when returning from a study | Reproduced live + source | Medium |
| C | P1 | Remove hidden Undo from focus navigation | Reproduced live + source | Small |
| D | P2 | Make long tag discovery manageable on phones | Measured live | Medium |
| E | P2 | Bring mobile homepage discovery forward | Same-session geometry + visual inspection | Small–medium |
| F | P2 | Move chapter access ahead of secondary actions | Same-session geometry + visual inspection | Small |
| G | P2 | Consolidate study actions and clarify labels | Live labels + source | Medium |
| H | P2 | Put a direct browsing action in empty saved collections | Live empty state + source | Small |
| I | P2 | Report failed card copy operations | Source-confirmed failure path | Small |

### A. Search should accept the language users see

**Observed:** `moody` returns 16 studies. `#moody` and `  moody  ` each return zero. Tag buttons display hashtags. The search predicate includes title, prompt, style, and study number, but excludes the tags array and does not trim the query. The exact `moody` tag has 14 records; that difference from broad text search is legitimate and should remain understandable.

**Change:** Trim search input for matching without disrupting typing. Include actual tag values in text discovery. Recognize a known hashtag as an exact tag filter, or strip the hash for a clearly documented broader search. Decide and test the behavior for multiword tags rather than guessing from whitespace alone. Keep active query/filter labels and deep links consistent.

**Acceptance:** Whitespace around a query cannot cause an otherwise valid match to disappear. A visible hashtag leads to useful results. Exact tag counts and text search counts remain clearly distinguished. Existing query URLs still work.

**Source:** `src/pages/ArchivePage.tsx:259–285`.

### B. Preserve the user's place in the archive

**Observed:** Starting at `/prompts/?tag=moody`, opening a study and selecting “← Prompt archive” navigates to `/prompts` without the tag. The detail link is hardcoded. Browser Back is a separate mechanism and was not assessed as broken.

**Change:** Carry the originating query and browsing position into study navigation state. Return to that archive context when present, with a safe `/prompts` fallback for direct study links. Consider maintaining context through previous/next study navigation too; define whether these controls follow the full issue or filtered results.

**Acceptance:** Returning from a filtered archive visit preserves search, tags, saved state, and sensible scroll/focus position. Opening a study from an external URL still provides a valid archive destination. Avoid accepting arbitrary external return URLs.

**Source:** `src/pages/StudyPage.tsx:54–61`; archive StudyCard navigation.

### C. Hidden feedback must not contain interactive controls

**Observed:** The dismissed toast has `aria-hidden="true"` and zero opacity, but its Undo button remains enabled. Calling focus on that hidden button succeeded in the live browser. A complete native Tab traversal was not rerun; the source leaves the enabled button in normal focus navigation.

**Change:** Unmount dismissed interactive toast content or make it inert while hidden. Preserve an accessible live region for visible feedback as needed. If a toast expires while Undo is focused, handle focus deliberately.

**Acceptance:** No invisible Undo receives keyboard focus before a removal or after dismissal. Visible Undo works and restores the correct collection. Test expiration with focus inside the toast.

**Source:** `src/components/ui/Toast.tsx:17–35`, `src/App.tsx`.

### D. Improve the expanded tag experience without undoing discoverability

**Observed:** Expanding all 111 tags produces a 2,600px-tall section on a 390px viewport. Results move far below the discovery controls. The current behavior fulfills the previous wrapping-layout design; this is a new refinement proposal, not a failed implementation of PR #41.

**Change:** Explore a searchable tag picker with a bounded list or a dedicated dialog/sheet on phones. Keep popular and selected tags visible on the archive. Prefer a dialog with a clear completion action over adding an unexplained nested scroll region. Retain full access to every tag, counts, keyboard operation, and disclosure state.

**Acceptance:** Finding an uncommon tag does not require scrolling through several screens before reaching portraits. All 111 tags remain accessible; selection and dismissal restore useful focus. Check small-phone and landscape layouts serially.

**Source:** `src/pages/ArchivePage.tsx:638–675`, tag styles in `src/styles.css`.

### E. Give homepage visitors an immediate archive route in the main content

**Observed:** At 390×844, Explore begins around 905px down and selected studies around 1,533px. The hero and first introductory card both emphasize reading. Header Archive navigation exists, so archive access is available; the issue is main-content emphasis.

**Change:** Add “Browse studies” alongside “Start reading.” Shorten the introductory cards, reduce repeated reading explanations, or move selected portraits above the three-card onboarding section. Keep the editorial hero and returning-reader Resume action.

**Acceptance:** A first-time phone visitor can identify reading and browsing as distinct primary paths without scrolling through repeated instructions. Test long Resume labels and small widths.

**Source:** `src/pages/HomePage.tsx`, home layout styles.

### F. Make the issue contents accessible before the cover dominates mobile

**Observed:** The chapter directory begins around 847px down at 390×844, after the issue description, cover, and print/download actions.

**Change:** Put a “Browse chapters” jump link near the title or move chapters before the cover on phones. Make print a secondary action; use the same icon system as other controls instead of the printer emoji. Retain the helpful PDF size label.

**Acceptance:** Chapter navigation is obvious in the opening screen. Desktop retains a balanced cover/directory layout. Jump links account for the masthead and place focus appropriately.

**Source:** `src/pages/IssueOverviewPage.tsx`.

### G. Reduce duplicate actions and replace abbreviations

**Observed:** Adjust and Card repeat above the study title and in the prompt section. Mobile labels include `MD`, `+ Params`, and `Anatomy / X-Ray`. Accessible names help assistive technology but do not explain visible abbreviations to everyone.

**Change:** Keep “Copy prompt” primary, use “Customize prompt” for the studio, and group secondary formats under one menu with full labels: “Copy as Markdown,” “Copy with parameters,” and “Download recipe card.” Use one understandable label for prompt analysis. If an action appears twice for long-page convenience, distinguish its placement intentionally rather than showing two dense toolbars.

**Acceptance:** Actions remain reachable by keyboard and touch, success/failure feedback is visible, and primary controls do not wrap awkwardly at 320px. Preserve exact original prompt copy behavior.

**Source:** `src/components/Study.tsx`.

### H. Give empty collections a useful next action

**Observed:** The saved-only archive with no saves explains how to bookmark a study, but no studies are visible to save. Reset all and the Saved toggle exist elsewhere; the empty message itself offers no action.

**Change:** Add “Browse studies” directly in the empty state. Clear the saved-only filter deliberately and keep any remaining useful filters visible. Use collection terminology consistently instead of switching between collection, saved studies, and curation board without explanation.

**Acceptance:** An empty collection provides a direct path to populated results or explains which other filters remain active. Verify named collections as well as Default.

**Source:** `src/pages/ArchivePage.tsx:729–736`.

### I. Explain clipboard failures on study cards

**Observed:** The StudyCard copy handler catches clipboard errors without changing the interface. This failure path is confirmed by source inspection; clipboard failure was not injected into the live page.

**Change:** Display a brief failure message and offer manual copying when possible. Keep feedback attached to the relevant study and announce it accessibly.

**Acceptance:** Simulated clipboard rejection produces actionable feedback; success remains clear; delayed results cannot overwrite feedback for another operation.

**Source:** `src/components/StudyCard.tsx:85–99`.

## Additional low-priority refinements

- **Normalize future model metadata consistently:** Option generation trims strings, while matching uses raw values. Whitespace-padded and empty-string model values would not match their displayed option. Current null-only archive data is unaffected. Add focused regression cases when fixing this.
- **Improve 404 recovery:** The current page offers only “Back to the reader.” Add “Browse the archive” for missing study URLs; preserve the publication voice.
- **Make active filters individually removable:** Search/model/ratio chips currently describe state, while Reset all clears everything. Add accessible remove buttons when multiple filters are active; retain the existing Clear tag behavior.
- **Clarify selection versus source metadata:** Keep optional generated command parameters visually distinct from the study record's unknown original parameters. Existing explanatory copy helps; user testing could determine whether the difference is sufficiently clear.

These are refinements, not evidence for adding dependencies or rebuilding the design system.

## Visual evidence

| Capture | Purpose |
| --- | --- |
| [Phone archive, light](ui-ux-audit-2026-10-24/ux-archive-390-light.png) | Current hierarchy and explicit light theme |
| [Phone archive, dark](ui-ux-audit-2026-10-24/ux-archive-390-dark.png) | Current hierarchy and dark theme |
| [Phone reader, light](ui-ux-audit-2026-10-24/ux-reader-mobile-light.png) | Study actions, chapter strip, persistent page navigation |
| [Expanded tags, dark](ui-ux-audit-2026-10-24/portrait-tags-expanded.png) | Same-session screenshot of the long expanded list |

Screenshots are included as repository review artifacts; no separate image-hosting uploads were made. Geometry describes the measured browser contexts and can vary with fonts, scrollbar behavior, viewport height, or browser.

## Suggested implementation sequence and verification

1. Fix A, B, and C as focused behavior changes. Include the model normalization and clipboard feedback fixes if useful to the same reliability pass, keeping scope reviewable.
2. Prototype D and G; verify that reduced control density improves discovery without hiding important capabilities.
3. Apply E, F, and H as a mobile hierarchy and onboarding pass.

For implementation, run targeted unit tests for search normalization, return-context state, toast focusability, and clipboard rejection. Use the repository's Playwright workflow for touch/keyboard, deep links, dialog focus, saved states, and original/reading modes. Run large viewport cases serially. Check 320/390px phones, tablet, desktop, both themes, reduced motion, and the existing high-resolution matrix where layout changes apply. Run TypeScript, content/build checks, formatting, and the relevant full CI suite on the final commit. Prior PR validation is historical evidence, not proof for future changes.

Success should be judged by successful search and return journeys, accessible feedback, and quicker access to chapters/studies. No analytics conversion uplift or accessibility conformance claim is made without further measurement.
