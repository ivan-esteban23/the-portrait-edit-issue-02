# The Portrait Edit — Issue 02 — The Prompt Issue

Independent magazine website: https://ivan-esteban23.github.io/the-portrait-edit-issue-02/

## Current edition: noir editorial

Black backgrounds, white/light-gray sans-serif type, a selected-study grid and restrained font sizes, inspired by the user's supplied Canva portfolio screenshots. No Canva template file or licensed assets were imported. Issue 01 remains on its independent website.

The PDF has 196 Letter pages with 10.5 pt prompts, 10 pt working notes and contents, and 10.5 pt glossary definitions. It preserves all 174 prompts, titles, Source filenames, notes, original references and reviewed Try this lines. The source/build PR lives in `ivan-esteban23/the-portrait-edit`.

The website provides original-page mode and a flowing study view with 16 px body text (16/18/20 px choices). Narrow screens default to study view. It loads pages on demand and fetches exact prompt/notes data only as needed. The original reference images are extracted unchanged from the verified PDF and displayed without cropping. The front selection links to its exact study pages. Embedded PDF hyperlinks are available in the downloaded PDF; the web reader has its own page/chapter controls.

## Rebuild and verify

Requires Python with PyMuPDF and Pillow, plus Node for fixture checks. The magazine project's existing `.venv` provides the Python dependencies. No package or font was added for this redesign.

```sh
python build.py --pdf '/absolute/path/to/The_Portrait_Edit_Issue_02_Noir_Editorial.pdf' --layout '/absolute/path/to/noir-layout-checks.json'
python verify-content.py --layout '/absolute/path/to/noir-layout-checks.json'
node verify-reader.cjs
python -m http.server 8000 --directory docs
```

The content verifier checks all 174 study records against the verified layout and checks original image dimensions. The navigation tests use desktop/mobile DOM fixtures, including selected-study links, reading modes and font-size controls. `VERIFICATION.json` records the results. Browser visual QA is not claimed: no connected browser was available.

## Publication

GitHub Pages serves `main` → `/docs`. Commit and push verified output normally, then verify the Pages build and live assets. The complete unchanged PDF is a GitHub release asset rather than a large Git object. The `noir-editorial-1` release is the current download. Earlier `edition-1` and `larger-type-1` releases are preserved. Use a separate version for future PDF changes and never silently replace a historical download.

Reference publication rights/provenance and protected source inconsistencies are described in the source magazine's editorial records. No identity or clearance was inferred.
