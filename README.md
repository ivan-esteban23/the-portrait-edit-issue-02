# The Portrait Edit — Issue 02 — The Prompt Issue

Independent GitHub Pages reader: https://ivan-esteban23.github.io/the-portrait-edit-issue-02/

Served from `main` → `/docs`. The complete original PDF is a release asset, not a Git object. The reader fetches one optimized page image at a time; page text is fetched only when opened. All magazine content remains in the original PDF. WebP pages are reading derivatives, not replacement reference images.

## Rebuild

Use Python with PyMuPDF and Pillow installed (the magazine project's existing `.venv` supplies both).

```sh
python build.py --pdf '/absolute/path/to/the/original.pdf'
python -m http.server 8000 --directory docs
```

Source PDF: the approved final 196-page merged editorial revision. No original PDF, prompt, note or image file is altered. The reader preserves complete page designs, supplies chapter navigation, keyboard page controls, zoom, deep page links and extractable text. It does not reproduce embedded PDF hyperlinks; use the original PDF for those.

To update, rebuild, verify the output, commit/push normally, and update the explicitly versioned release download link if publishing a new edition. Never silently replace a historical PDF release. Publication rights and provenance remain the publisher's responsibility.

## Verification

`node verify-reader.cjs` checks navigation with a DOM fixture; it does not replace a real-browser test. `VERIFICATION.json` records asset validation and current limitations.
