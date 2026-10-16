# The Portrait Edit — Issue 02 — The Prompt Issue

Independent magazine website: https://ivan-esteban23.github.io/the-portrait-edit-issue-02/

## Website: cohesive editorial system

The website automatically follows the visitor's light/dark preference. Warm paper and noir palettes share one sans-serif family, a six-step type scale, a four-pixel spacing rhythm and two-pixel corners. No theme chooser, stored theme preference, font download or client dependency is used.

Typography uses 12px captions, 13px secondary text and 16px body text at the default browser size. Section, study and display titles use fluid clamp scales (1.35–1.6rem, 1.6–2rem and 2.25–3.5rem). Shared tracking tokens distinguish balanced display titles, tracked labels, compact controls and normal prompt text. Kerning and common/contextual ligatures follow the system font's support; page, statistic and study figures use tabular numerals. Reading view uses a 40ch measure with 1.8 leading, a 38ch mobile target and inset phone text, while keeping the 16/18/20px choices. Light and Dark inherit the same typography tokens.

The reader has one sticky Chapter / Page / Zoom / Focus toolbar. Reading view and text size live in its native **Reading options** disclosure; chapter progress remains visible. On phones, the same toolbar is compact and Previous/Next are consolidated into the existing bottom navigation. Selected Studies use equal cards and quiet captions; Issue 01 discovery follows the reader. Focus keeps chapter navigation, context and preferences while hiding publication/discovery sections. Focus paper warms in Light mode, with normal control and page-mat surfaces.

Reference images, page artwork, issue metadata and `reader.js` are unchanged by this pass. The original noir magazine pages retain their artwork in both website themes. Issue 01 remains on its independent website.

The PDF has 196 Letter pages with 10.5 pt prompts, 10 pt working notes and contents, and 10.5 pt glossary definitions. It preserves all 174 prompts, titles, Source filenames, notes, original references and reviewed Try this lines. The source/build PR lives in `ivan-esteban23/the-portrait-edit`.

The website provides original-page mode and a flowing study view with 16 px body text (16/18/20 px choices). Narrow screens default to study view. It loads pages on demand and fetches exact prompt/notes data only as needed. The original reference images are extracted unchanged from the verified PDF and displayed without cropping. The front selection links to its exact study pages. Embedded PDF hyperlinks are available in the downloaded PDF; the web reader has its own page/chapter controls.

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

The content verifier checks all 174 study records against the verified layout and checks original image dimensions. Reader regression fixtures cover navigation, hashes, reading modes, Focus, swipes, adjacent prefetch, retry, prompt copying and all 174 exact study records at simulated mobile/tablet/desktop sizes (320–1280px). Theme checks cover both palettes, text/focus contrast, theme-independent typography/spacing/shapes and CSS-only preference handling. Layout checks parse the actual HTML to verify semantic nesting, retained reader targets, one toolbar and disclosed secondary controls.

These automated checks do not render a browser layout. Visual browser/device QA, native select styling and screen-reader behavior still need review: no browser is connected in this environment. `VERIFICATION.json` remains the earlier content/PDF verification record; it is not a browser sign-off for this design.

## Publication

GitHub Pages serves `main` → `/docs`. Commit and push verified output normally, then verify the Pages build and live assets. The complete unchanged PDF is a GitHub release asset rather than a large Git object. The `noir-editorial-1` release is the current download. Earlier `edition-1` and `larger-type-1` releases are preserved. Use a separate version for future PDF changes and never silently replace a historical download.

Reference publication rights/provenance and protected source inconsistencies are described in the source magazine's editorial records. No identity or clearance was inferred.
