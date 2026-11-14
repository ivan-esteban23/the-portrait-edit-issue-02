import dimensions from "@/content/imageDimensions.json";
import { assetUrl } from "./assetUrl";

type ImageKind =
  | "hero"
  | "archive"
  | "selected"
  | "selection"
  | "detail"
  | "reader"
  | "related"
  | "connection"
  | "search";
const sizes: Record<ImageKind, string> = {
  search: "64px",
  connection:
    "(max-width: 767px) calc(100vw - 40px), (max-width: 1320px) calc((100vw - 128px) / 3), 400px",
  hero: "(max-width: 767px) calc(100vw - 40px), (max-width: 1320px) calc((100vw - 136px) * .524), 620px",
  archive:
    "(max-width: 359px) calc(100vw - 40px), (max-width: 767px) calc((100vw - 56px) / 2), (max-width: 1320px) calc((100vw - 120px) / 3), 400px",
  selected:
    "(max-width: 767px) calc(100vw - 40px), (max-width: 1320px) calc((100vw - 120px) / 3), 400px",
  selection:
    "(max-width: 700px) calc((100vw - 56px) / 2), (max-width: 1320px) calc((100vw - 136px) / 4), 296px",
  detail:
    "(max-width: 899px) calc(100vw - 40px), (max-width: 1320px) calc((100vw - 128px) / 2), 596px",
  reader: "(max-width: 767px) calc(100vw - 40px), 760px",
  related:
    "(max-width: 767px) calc((100vw - 60px) / 2), (max-width: 1320px) calc((100vw - 128px) / 2), 580px",
};

export function responsiveImageProps(path: string, kind: ImageKind) {
  const metadata = (
    dimensions as Record<string, { width: number; height: number }>
  )[path];
  if (!metadata) return {};
  const { width, height } = metadata;
  if (import.meta.env.DEV) return { width, height };
  const filename = path.split("/").pop()!;
  const widths = [
    ...new Set(
      [320, 640, 960, 1280, Math.min(width, 1600)].filter((w) => w <= width),
    ),
  ].sort((a, b) => a - b);
  return {
    width,
    height,
    srcSet: widths
      .map(
        (w) =>
          `${assetUrl(`references/responsive/${filename}-${w}.webp`)} ${w}w`,
      )
      .join(", "),
    sizes: sizes[kind],
  };
}
