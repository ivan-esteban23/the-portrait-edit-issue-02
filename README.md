# The Portrait Edit — Issue 02 — The Prompt Issue

Independent magazine website: https://ivan-esteban23.github.io/the-portrait-edit-issue-02/

## Website: cohesive editorial system

The website automatically follows the visitor's light/dark preference. Warm paper and noir palettes share one sans-serif family, a six-step type scale, a four-pixel spacing rhythm and two-pixel corners. No theme chooser, stored theme preference, font download or client dependency is used.

Typography uses 12px captions, 13px secondary text and 16px body text at the default browser size. Section, study and display titles use fluid clamp scales (1.35–1.6rem, 1.6–2rem and 2.25–3.5rem). Shared tracking tokens distinguish balanced display titles, tracked labels, compact controls and normal prompt text. Kerning and common/contextual ligatures follow the system font's support; page, statistic and study figures use tabular numerals. Reading view uses a 40ch measure with 1.8 leading, a 38ch mobile target and inset phone text, while keeping the 16/18/20px choices. Light and Dark inherit the same typography tokens.

The compact hero pairs a small cover with the issue title, short description and **Start reading**. The reader follows immediately. Selected Studies form a horizontal, swipeable strip after the reader; Issue 01 discovery follows it, and the PDF download and production links live in the footer.

One sticky toolbar presents Chapter / Page / Focus. **Display** is the single native disclosure for Original page / Reading view, zoom, text size and keyboard help. The dismissible shortcut hint is marked as seen only when Display is opened. Focus hides the introductory and archive sections and uses warmer paper in Light mode.

Reference images, page artwork and issue metadata are unchanged. Existing reader features are preserved. The original noir magazine pages retain their artwork in both website themes. Issue 01 remains on its independent website.

At 700px and below, the fixed bottom Previous / page / Next bar is the primary navigation while the reader is in view, including Focus. Top arrow buttons are hidden on phones to avoid two competing navigation zones; the editable page-number field remains. Focus keeps an integrated current/total readout and Exit Focus above one quiet chapter-progress line. The chapter strip stays hidden in mobile Focus, with the same chapter select moved into the collapsed **Chapters & display** disclosure below the content. Desktop and normal-mode settings remain in the toolbar. Page navigation closes mobile Focus settings; resizing restores the appropriate control hierarchy without recreating controls or losing their values.

A native **Browse pages** range below either view spans all 196 pages, with nine chapter-opening marks and a visible page-number preview. Dragging updates only the preview; release commits one page navigation using the existing hash/history behavior. Keyboard interaction, cancellation, endpoint buttons and other navigation keep the range synchronized. No intermediate images are fetched while dragging.

Safe-area tokens cover all four edges. The viewport uses `viewport-fit=cover`; sticky toolbars and the masthead allow for the top inset, gutters protect landscape edges, and dock padding/content clearance account for the bottom gesture area. The full-width mobile page stage has no inner mat padding. Native disclosures close through their summary; mobile settings account for the safe area, with scrollable controls in the sticky toolbar and an inline layout below mobile Focus content. No custom sheet, focus trap or external dependency was added.

Reading view uses 32px between major blocks and restrained section dividers: study label with a quieter page reference, title and style form a header with 8px gaps; the reference follows, then Image Prompt / Copy and the unchanged prompt. Source filenames and all original Rights check / Review pairing / repeat flags stay with the reference caption. Prompt, notes and Try this content are preserved. Ordinary page-status text stays available to assistive technology without duplicating visible page/progress labels; errors and retry remain visible. Raw extracted text is hidden and closed in Focus and hidden while Reading view is active; it remains available in normal Original page mode.

The PDF has 196 Letter pages with 10.5 pt prompts, 10 pt working notes and contents, and 10.5 pt glossary definitions. It preserves all 174 prompts, titles, Source filenames, notes, original references and reviewed Try this lines. The source/build PR lives in `ivan-esteban23/the-portrait-edit`.

The website provides original-page mode and a flowing study view with 16 px body text (16/18/20 px choices). Narrow screens default to study view. It loads pages on demand and fetches exact prompt/notes data only as needed. The original reference images are extracted unchanged from the verified PDF and displayed without cropping. Selected Studies link to their exact study pages. Embedded PDF hyperlinks are available in the downloaded PDF; the web reader has its own page/chapter controls.

## Rebuild and verify

Requires Python with PyMuPDF and Pillow, plus Node for fixture checks. The magazine project's existing `.venv` provides the Python dependencies. No package or font was added for this redesign.

```sh
python build.py --pdf '/absolute/path/to/The_Portrait_Edit_Issue_02_Noir_Editorial.pdf' --layout '/absolute/path/to/noir-layout-checks.json'
python verify-content.py --layout '/absolute/path/to/noir-layout-checks.json'
node verify-reader.cjs
node verify-theme.cjs
python3 verify-layout.py
python -m http.server 8000 --directory docs
```

The content verifier checks all 174 study records against the verified layout and checks original image dimensions. Reader regression fixtures cover navigation, hashes, reading modes, Focus, swipes, adjacent prefetch, retry, prompt copying and all 174 exact study records at simulated small/large phone, tablet and desktop sizes (320/390/430/700/768/1280px). Scrubber checks cover preview without requests, commit, cancellation, chapter marks, bounds, history, synchronization and Start reading focus; all three text sizes are exercised. Theme checks cover both palettes, text/focus contrast, theme-independent typography/spacing/shapes and CSS-only preference handling. Layout checks parse the actual HTML to verify semantic nesting, retained reader targets, one toolbar and disclosed secondary controls.

These automated checks do not render a browser layout. Visual browser/device QA, native select styling and screen-reader behavior still need review: no browser is connected in this environment. `VERIFICATION.json` remains the earlier content/PDF verification record; it is not a browser sign-off for this design.

Current UI assets use `?v=ux-refinement-1`.

## Publication

GitHub Pages serves `main` → `/docs`. Commit and push verified output normally, then verify the Pages build and live assets. The complete unchanged PDF is a GitHub release asset rather than a large Git object. The `noir-editorial-1` release is the current download. Earlier `edition-1` and `larger-type-1` releases are preserved. Use a separate version for future PDF changes and never silently replace a historical download.

Reference publication rights/provenance and protected source inconsistencies are described in the source magazine's editorial records. No identity or clearance was inferred.
