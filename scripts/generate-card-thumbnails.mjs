import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import sharp from "sharp";

const promptDirectory = "src/content/prompts";
const sourceDirectory = "docs";
const outputDirectory = "dist/references/cards";
const promptFiles = (await readdir(promptDirectory)).filter((file) =>
  file.endsWith(".json"),
);
const references = new Set();

for (const file of promptFiles) {
  const prompt = JSON.parse(
    await readFile(join(promptDirectory, file), "utf8"),
  );
  const image = prompt.referenceImage;
  if (
    typeof image !== "string" ||
    !image.startsWith("references/") ||
    image.split("/").includes("..")
  ) {
    throw new Error(`Invalid referenceImage in ${file}`);
  }
  references.add(image);
}

const dimensions = {};
for (const image of references) {
  const meta = await sharp(join(sourceDirectory, image)).metadata();
  dimensions[image] = meta.autoOrient ?? {
    width: meta.width,
    height: meta.height,
  };
  dimensions[image] = {
    width: dimensions[image].width,
    height: dimensions[image].height,
  };
}
if (process.argv.includes("--metadata-only")) {
  await writeFile(
    "src/content/imageDimensions.json",
    JSON.stringify(dimensions, null, 2) + "\n",
  );
  console.log(
    `Recorded dimensions for ${references.size} portrait references.`,
  );
  process.exit(0);
}
await mkdir(outputDirectory, { recursive: true });
await mkdir("dist/references/responsive", { recursive: true });
sharp.concurrency(4);

let sourceBytes = 0;
let thumbnailBytes = 0;
for (const image of references) {
  const source = join(sourceDirectory, image);
  const destination = join(outputDirectory, `${basename(image)}.webp`);
  const result = await sharp(source)
    .rotate()
    .resize(640, 854, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 5 })
    .toFile(destination);
  const width = dimensions[image].width;
  const widths = [
    ...new Set(
      [320, 640, 960, 1280, Math.min(width, 1600)].filter((w) => w <= width),
    ),
  ].sort((a, b) => a - b);
  for (const renditionWidth of widths) {
    await sharp(source)
      .rotate()
      .resize({ width: renditionWidth, withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 })
      .toFile(
        join(
          "dist/references/responsive",
          `${basename(image)}-${renditionWidth}.webp`,
        ),
      );
  }
  sourceBytes += (await stat(source)).size;
  thumbnailBytes += result.size;
}

const reduction =
  sourceBytes === 0 ? 0 : Math.round((1 - thumbnailBytes / sourceBytes) * 100);
console.log(
  `Generated ${references.size} archive thumbnails (${(thumbnailBytes / 1024 / 1024).toFixed(2)} MiB; ${reduction}% smaller than originals).`,
);
