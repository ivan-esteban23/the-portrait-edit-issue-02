import { escapeHtml as e } from "./static-reader.mjs";
export function staticStudy(study, issue, studies, base) {
  const index = studies.indexOf(study);
  const chapter = issue.chapters.find(
    (c) => study.page >= c.startPage && study.page <= c.endPage,
  );
  const neighbor = (other, rel, label) =>
    other
      ? `<a rel="${rel}" href="${base}prompts/${e(other.id)}/">${label}: #${other.studyNumber} — ${e(other.title)}</a>`
      : "";
  const record = {
    Style: study.style,
    "Working notes": study.workingNotes,
    "Try this": study.tryThis,
    Parameters:
      Object.entries(study.parameters)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · ") || "Not recorded",
    Model: study.model ?? "Not recorded",
    Date: study.date ?? "Not recorded",
    "Style tags": study.tags.join(" · "),
    "Review flags": study.flags,
  };
  return `<noscript><main class="noscript-main">
    <a href="${base}prompts/">Prompt archive</a><h1>Study #${study.studyNumber}: ${e(study.title)}</h1>
    <a href="${base}issues/${e(issue.slug)}/pages/${study.page}/">Read in the issue — ${e(chapter?.title ?? "Front matter")}, page ${study.page}</a>
    <img class="noscript-image" src="${base}${e(study.referenceImage)}" alt="Reference for Study #${study.studyNumber}: ${e(study.title)}">
    <h2>Prompt</h2><p class="noscript-page-text">${e(study.prompt)}</p><h2>Study record</h2>
    <dl>${Object.entries(record)
      .map(
        ([label, value]) =>
          `<dt>${e(label)}</dt><dd class="noscript-page-text">${e(value)}</dd>`,
      )
      .join("")}</dl>
    <nav aria-label="Study navigation">${neighbor(studies[index - 1], "prev", "Previous study")}${neighbor(studies[index + 1], "next", "Next study")}</nav>
  </main></noscript>`;
}
