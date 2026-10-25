// @vitest-environment node
import { readFileSync } from "node:fs";
import postcss from "postcss";
import { expect, test } from "vitest";

const css = postcss.parse(readFileSync("src/styles.css", "utf8"));
function tokensFor(theme: string) {
  const tokens: Record<string, string> = {};
  for (const selector of [":root", `:root[data-theme="${theme}"]`])
    css.walkRules(selector, (rule) => {
      rule.walkDecls((declaration) => {
        if (declaration.prop.startsWith("--"))
          tokens[declaration.prop] = declaration.value;
      });
    });
  const resolve = (value: string): string =>
    value.replace(/var\((--[\w-]+)\)/g, (_, token: string) =>
      resolve(tokens[token]),
    );
  return Object.fromEntries(
    Object.entries(tokens).map(([token, value]) => [token, resolve(value)]),
  );
}
const rgb = (hex: string) =>
  [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
function luminance(color: number[]) {
  return color
    .map((value) => value / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    )
    .reduce(
      (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
      0,
    );
}
function contrast(a: number[], b: number[]) {
  const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (high + 0.05) / (low + 0.05);
}

test.each(["light", "dark"])(
  "%s body, captions, accent and status text meet 4.5:1 on every shared surface",
  (theme) => {
    const tokens = tokensFor(theme);
    for (const foreground of [
      "--text",
      "--muted",
      "--idle-text",
      "--accent",
      "--danger",
      "--success",
    ])
      for (const background of [
        "--bg",
        "--surface",
        "--surface-raised",
        "--surface-hover",
        "--focus-paper",
      ])
        expect(
          contrast(rgb(tokens[foreground]), rgb(tokens[background])),
          `${theme}: ${foreground} on ${background}`,
        ).toBeGreaterThanOrEqual(4.5);
  },
);

test.each(["light", "dark"])(
  "%s image labels retain contrast over the brightest image, including grain",
  (theme) => {
    const tokens = tokensFor(theme);
    const alpha = Number(tokens["--image-scrim"].match(/(\d+)%/)![1]) / 100;
    const background = [255, 255, 255].map((channel) => channel * (1 - alpha));
    const foreground = rgb(tokens["--image-label"]);
    const grainForeground = foreground.map((channel) => channel * 0.975);
    const grainBackground = background.map(
      (channel) => channel * 0.975 + 255 * 0.025,
    );
    expect(contrast(grainForeground, grainBackground)).toBeGreaterThanOrEqual(
      4.5,
    );
    let draggingBackground = "";
    css.walkRules(
      ".split-curtain-frame.is-dragging .split-handle-thumb",
      (rule) => {
        rule.walkDecls("background", (declaration) => {
          draggingBackground = declaration.value;
        });
      },
    );
    const draggingToken = draggingBackground.match(/var\((--[\w-]+)\)/)![1];
    expect(
      contrast(rgb(tokens["--image-handle-text"]), rgb(tokens[draggingToken])),
    ).toBeGreaterThanOrEqual(4.5);
  },
);
