import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(
    process.env.PORTRAIT_IMAGE_PACKAGE || resolve("package.json"),
  ),
  sharp = require("sharp");
const root = resolve("dist");
const { studies: records } = await import("./route-metadata.mjs");
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function lines(text, limit) {
  const result = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if ((line + " " + word).trim().length > limit && line) {
      result.push(line);
      line = word;
    } else line = (line + " " + word).trim();
  }
  if (line) result.push(line);
  return result;
}
await mkdir(resolve(root, "social/studies"), { recursive: true });
let bytes = 0;
for (const p of records) {
  const title = lines(p.title, 20).slice(0, 4),
    style = lines(p.style, 34).slice(0, 2);
  const portrait = await sharp(resolve(root, p.referenceImage))
    .rotate()
    .resize(500, 550, { fit: "inside", withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#f6f3ec"/><rect x="30" y="30" width="520" height="570" fill="#e9e6dd"/><text x="600" y="63" font-family="Arial,sans-serif" font-size="29" font-weight="600" fill="#1d211d">the portrait edit<tspan font-size="14" baseline-shift="super"> 02</tspan></text><text x="600" y="104" font-family="Arial,sans-serif" font-size="14" letter-spacing="2" fill="#a73c2d">STUDY ${String(p.studyNumber).padStart(3, "0")} / THE PROMPT ISSUE</text>${title.map((line, i) => `<text x="600" y="${169 + i * 62}" font-family="Georgia,serif" font-size="52" fill="#1d211d">${escape(line)}</text>`).join("")}${style.map((line, i) => `<text x="600" y="${Math.max(374, 188 + title.length * 62) + i * 28}" font-family="Georgia,serif" font-size="23" fill="#64665e">${escape(line)}</text>`).join("")}<path d="M600 523H1160" stroke="#cecfc4"/><text x="600" y="555" font-family="Arial,sans-serif" font-size="17" fill="#1d211d">Reference · Prompt · Working notes</text><text x="600" y="589" font-family="Arial,sans-serif" font-size="13" letter-spacing="1" fill="#64665e">ISSUE 02 / PAGE ${p.page}</text></svg>`;
  const result = await sharp({
    create: { width: 1200, height: 630, channels: 3, background: "#f6f3ec" },
  })
    .composite([
      { input: Buffer.from(svg), top: 0, left: 0 },
      {
        input: portrait.data,
        left: Math.round(40 + (500 - portrait.info.width) / 2),
        top: Math.round(40 + (550 - portrait.info.height) / 2),
      },
    ])
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(resolve(root, `social/studies/${p.id}.jpg`));
  bytes += result.size;
}
console.log(
  JSON.stringify({
    cards: records.length,
    width: 1200,
    height: 630,
    format: "JPEG",
    bytes,
  }),
);
