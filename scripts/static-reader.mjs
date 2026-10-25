import { readFileSync } from "node:fs";

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );

// Use absolute URLs under Vite's base so every generated nested route works.
export function staticReader(issue, base, page) {
  const href = (path) => escapeHtml(`${base}${path}`);
  const reader = (number) => href(`issues/${issue.slug}/pages/${number}/`);
  const title = escapeHtml(issue.title);
  const resources = `<nav aria-label="Publication resources"><ul>
    <li><a href="${reader(1)}">Read the issue</a></li>
    <li><a href="${escapeHtml(issue.pdfUrl)}">Download original PDF</a></li>
    <li><a href="https://github.com/ivan-esteban23/the-portrait-edit">Source &amp; production notes</a></li>
    ${issue.otherIssueUrl ? `<li><a href="${escapeHtml(issue.otherIssueUrl)}">Explore the other issue</a></li>` : ""}
  </ul></nav>`;
  const chapters = `<nav aria-label="Issue chapters"><h2>Chapters</h2><ul>${issue.chapters
    .map(
      (chapter) =>
        `<li><a href="${reader(chapter.startPage)}">${escapeHtml(chapter.title)} · page ${chapter.startPage}</a></li>`,
    )
    .join("")}</ul></nav>`;
  let content = `<p>${escapeHtml(issue.description)}</p>
    <a href="${reader(1)}"><img src="${href(issue.cover)}" alt="${title} cover" width="480" height="622" style="max-width: 100%; height: auto"></a>`;
  if (page !== undefined) {
    const filename = String(page).padStart(3, "0");
    const { text } = JSON.parse(
      readFileSync(`docs/${issue.pageDirectory}/${filename}.json`, "utf8"),
    );
    const pagination = `<nav aria-label="Page navigation" style="display: flex; flex-wrap: wrap; gap: 1rem; margin: 1rem 0">
      ${page > 1 ? `<a href="${reader(page - 1)}">← Previous page</a>` : ""}
      <span>Page ${page} of ${issue.pages}</span>
      ${page < issue.pages ? `<a href="${reader(page + 1)}">Next page →</a>` : ""}
    </nav>`;
    content = `<h2>Page ${page} of ${issue.pages}</h2>${pagination}
      <img src="${href(`${issue.pageDirectory}/${filename}.webp`)}" alt="Issue ${escapeHtml(issue.number)}, page ${page}" width="1224" height="1584" style="display: block; max-width: 100%; height: auto">
      <details><summary>Read this page as text</summary><pre style="white-space: pre-wrap; overflow-wrap: anywhere; font: inherit">${escapeHtml(text)}</pre></details>
      ${pagination}`;
  }
  return `<noscript><main style="max-width: 60rem; margin: auto; padding: 2rem; overflow-wrap: anywhere">
    <h1>The Portrait Edit — ${title}</h1>${resources}${content}${chapters}
  </main></noscript>`;
}
