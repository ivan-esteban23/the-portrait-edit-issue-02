# The Portrait Edit — Issue 02 — The Prompt Issue

Independent GitHub Pages reader: https://ivan-esteban23.github.io/the-portrait-edit-issue-02/

Served from `main` → `/docs`. The complete original PDF is a release asset, not a Git object. The reader fetches one optimized page image at a time; page text is fetched only when opened. All magazine content remains in the original PDF. WebP pages are reading derivatives, not replacement reference images.

## Rebuild

Use Python with PyMuPDF and Pillow installed (the magazine project's existing `.venv` supplies both).

```sh
python build.py --pdf '/absolute/path/to/The_Portrait_Edit_Issue_02_Larger_Type.pdf' --layout '/absolute/path/to/larger-type-layout-checks.json'
python -m http.server 8000 --directory docs
```

Source PDF: the approved final 196-page merged editorial revision. No original PDF, prompt, note or image file is altered. The reader preserves complete page designs, supplies chapter navigation, keyboard page controls, zoom, deep page links and extractable text. It does not reproduce embedded PDF hyperlinks; use the original PDF for those.

To update, rebuild, verify the output, commit/push normally, and update the explicitly versioned release download link if publishing a new edition. Never silently replace a historical PDF release. Publication rights and provenance remain the publisher's responsibility.

## Verification

`node verify-reader.cjs` checks navigation with a DOM fixture; it does not replace a real-browser test. `VERIFICATION.json` records asset validation and current limitations.

## Larger type update

The current reader uses the separately verified larger-type PDF: prompts 12 pt, notes/glossary 11.5 pt, contents 11 pt. The original page layout remains available. Large-text mode shows exact study text with its original reference, uses 20 px body text with 18/20/24 px choices, and is the narrow-screen default.

`python verify-content.py --layout '/absolute/path/to/larger-type-layout-checks.json'` verifies all 174 structured studies and reference dimensions. `node verify-reader.cjs` checks desktop/mobile navigation and font-size controls using DOM fixtures. No real-browser visual QA is claimed.

Current PDF release: `larger-type-1`. Earlier PDF release: `edition-1`, retained unchanged. No package was added.
