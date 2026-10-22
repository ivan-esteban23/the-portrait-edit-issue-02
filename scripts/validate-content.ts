import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import { createHash } from "node:crypto";
import { issueSchema, promptSchema, pageSchema } from "../src/content/schema";
import type { ZodType } from "zod";
const root = process.cwd();
function load<T>(file: string, schema: ZodType<T>): T {
  const result = schema.safeParse(JSON.parse(readFileSync(file, "utf8")));
  if (!result.success)
    throw Error(
      `${file}\n${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n")}`,
    );
  return result.data;
}
function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw Error(message);
}
function image(path: string, record: string) {
  assert(
    existsSync(resolve(root, "docs", path)),
    `${record}: missing image docs/${path}`,
  );
}
function jpegDimensions(path: string, record: string) {
  const bytes = readFileSync(resolve(root, "docs", path));
  const startOfFrame = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
    0xcf,
  ]);
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (
      marker === 0x00 ||
      marker === 0x01 ||
      marker === 0xd8 ||
      marker === 0xd9 ||
      (marker >= 0xd0 && marker <= 0xd7)
    )
      continue;
    const segmentLength = bytes.readUInt16BE(offset);
    if (startOfFrame.has(marker))
      return {
        height: bytes.readUInt16BE(offset + 3),
        width: bytes.readUInt16BE(offset + 5),
      };
    offset += segmentLength;
  }
  throw Error(`${record}: docs/${path} is not a supported JPEG`);
}
const issues = readdirSync("src/content/issues").map((slug) => {
  const file = `src/content/issues/${slug}/issue.json`;
  const issue = load(file, issueSchema);
  assert(issue.slug === slug, `${file}: slug must match folder`);
  image(issue.cover, file);
  issue.chapters.forEach((c, i) => {
    assert(c.endPage <= issue.pages, `${file}: ${c.title} exceeds page count`);
    if (i)
      assert(
        c.startPage === issue.chapters[i - 1].endPage + 1,
        `${file}: chapter gap/overlap at ${c.title}`,
      );
  });
  assert(
    issue.chapters.at(-1)!.endPage === issue.pages,
    `${file}: final chapter does not reach last page`,
  );
  for (let n = 1; n <= issue.pages; n++) {
    const page = String(n).padStart(3, "0");
    image(`${issue.pageDirectory}/${page}.webp`, file);
    load(`docs/${issue.pageDirectory}/${page}.json`, pageSchema);
  }
  return issue;
});
const prompts = readdirSync("src/content/prompts")
  .filter((f) => f.endsWith(".json"))
  .map((file) => {
    const p = load(`src/content/prompts/${file}`, promptSchema);
    assert(p.id === basename(file, ".json"), `${file}: ID must match filename`);
    const issue = issues.find((i) => i.slug === p.issueSlug);
    assert(
      issue && p.page <= issue.pages,
      `${file}: missing issue or invalid page`,
    );
    image(p.referenceImage, file);
    return p;
  });
// These archive assets are upscaled copies; the protected reader-page JSON
// deliberately retains the original extracted image paths.
const archiveUpscaledStudies = new Set([
  "issue-02-study-018",
  "issue-02-study-064",
  "issue-02-study-070",
  "issue-02-study-084",
  "issue-02-study-085",
  "issue-02-study-089",
  "issue-02-study-117",
  "issue-02-study-125",
  "issue-02-study-129",
  "issue-02-study-130",
  "issue-02-study-131",
  "issue-02-study-142",
  "issue-02-study-162",
  "issue-02-study-163",
]);
for (const p of prompts.filter((prompt) =>
  archiveUpscaledStudies.has(prompt.id),
)) {
  const pageFile = `docs/pages/${String(p.page).padStart(3, "0")}.json`;
  const published = JSON.parse(readFileSync(pageFile, "utf8")).study;
  const source = jpegDimensions(published.image, p.id);
  const archive = jpegDimensions(p.referenceImage, p.id);
  assert(
    archive.width === source.width * 2 && archive.height === source.height * 2,
    `${p.id}: archive image must be a faithful 2× raster of its published source`,
  );
}
for (const issue of issues) {
  const studies = prompts.filter((p) => p.issueSlug === issue.slug);
  assert(
    studies.length === issue.studies,
    `${issue.slug}: expected ${issue.studies} studies, got ${studies.length}`,
  );
  assert(
    new Set(studies.map((p) => p.page)).size === studies.length,
    `${issue.slug}: duplicate page assignment`,
  );
  assert(
    new Set(studies.map((p) => p.studyNumber)).size === studies.length,
    `${issue.slug}: duplicate study number`,
  );
  for (const id of issue.featured)
    assert(
      studies.some((p) => p.id === id),
      `${issue.slug}: missing featured study ${id}`,
    );
}
// The migrated publication remains byte-exact, including duplicates and review flags.
const original = JSON.parse(readFileSync("docs/issue.json", "utf8"));
const migrated = issues.find((i) => i.number === "02")!;
assert(migrated.pdfUrl === original.download, "Release PDF link changed");
for (const p of prompts.filter((p) => p.issueSlug === migrated.slug)) {
  const old = JSON.parse(
    readFileSync(`docs/pages/${String(p.page).padStart(3, "0")}.json`, "utf8"),
  ).study;
  for (const [key, value] of Object.entries({
    number: p.studyNumber,
    title: p.title,
    prompt: p.prompt,
    notes: p.workingNotes,
    try_this: p.tryThis,
    style: p.style,
    source: p.source,
    ...(archiveUpscaledStudies.has(p.id) ? {} : { image: p.referenceImage }),
    flags: p.flags,
  }))
    assert(
      old?.[key] === value,
      `${p.id}: protected ${key} differs from published source`,
    );
}
const manifest: Record<string, string> = JSON.parse(
  readFileSync("legacy/asset-sha256.json", "utf8"),
);
for (const [path, sha] of Object.entries(manifest))
  assert(
    createHash("sha256")
      .update(readFileSync(`docs/${path}`))
      .digest("hex") === sha,
    `Preserved asset changed: ${path}`,
  );
console.log(
  `Validated ${issues.length} issue(s), ${prompts.length} exact studies and ${Object.keys(manifest).length} preserved assets/text records.`,
);
