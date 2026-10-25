// Resolve axe's transparent card-link overlaps and check image overlays against
// both black and white pixels. This supplements axe; it never suppresses a violation.
export async function checkRenderedContrast(page, incomplete) {
  const targets = incomplete.flatMap((entry) =>
    entry.nodes.map((node) => node.target[0]),
  );
  return page.evaluate((targets) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const paint = canvas.getContext("2d", { willReadFrequently: true });
    const rgba = (value) => {
      paint.clearRect(0, 0, 1, 1);
      paint.fillStyle = value;
      paint.fillRect(0, 0, 1, 1);
      const channels = [...paint.getImageData(0, 0, 1, 1).data];
      channels[3] /= 255;
      return channels;
    };
    const over = (foreground, background) =>
      foreground
        .slice(0, 3)
        .map(
          (value, index) =>
            value * foreground[3] + background[index] * (1 - foreground[3]),
        );
    const luminance = (rgb) =>
      rgb
        .map((value) => value / 255)
        .map((value) =>
          value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
        )
        .reduce(
          (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
          0,
        );
    const contrast = (a, b) => {
      const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y);
      return (high + 0.05) / (low + 0.05);
    };
    const chain = (node, stop) => {
      const ancestors = [];
      for (; node; node = node.parentElement) {
        ancestors.unshift(node);
        if (node === stop) break;
      }
      return ancestors;
    };
    const background = (ancestors, base) =>
      ancestors.reduce(
        (color, node) =>
          over(rgba(getComputedStyle(node).backgroundColor), color),
        base,
      );
    const checks = [];
    for (const selector of [...new Set(targets)]) {
      const node = document.querySelector(selector);
      if (
        !node ||
        !node.getClientRects().length ||
        node.closest(
          'button:disabled, [aria-disabled="true"], label:has(input:disabled)',
        )
      )
        continue;
      const style = getComputedStyle(node);
      if (style.visibility !== "visible") continue;
      const ancestors = chain(node);
      const opacity = ancestors.reduce(
        (alpha, ancestor) => alpha * Number(getComputedStyle(ancestor).opacity),
        1,
      );
      if (opacity === 0) continue;
      const text = node.textContent.trim();
      const size = parseFloat(style.fontSize);
      const large =
        size >= 24 || (size >= 56 / 3 && Number(style.fontWeight) >= 700);
      const threshold = large || !/[\p{L}\p{N}]/u.test(text) ? 3 : 4.5;
      const bg = background(ancestors, [255, 255, 255]);
      const color = rgba(style.color);
      color[3] *= opacity;
      const fg = over(color, bg);
      const ratio = contrast(fg, bg);
      checks.push({
        selector,
        kind: "axe-incomplete",
        foreground: fg,
        background: bg,
        ratio,
        threshold,
        pass: ratio >= threshold,
      });
    }
    for (const selector of [
      ".inspect-badge",
      ".compare-inspect-hint",
      ".split-side-badge",
      ".split-handle-thumb",
      ".masthead",
      "#reader-toolbar",
      ".reader-bottom",
      ".reader-hover-paused-indicator",
    ]) {
      const node = document.querySelector(selector);
      if (!node) continue;
      const style = getComputedStyle(node);
      if (!node.getClientRects().length || style.visibility !== "visible")
        continue;
      const surface = rgba(style.backgroundColor);
      if (surface[3] === 0) continue;
      const colors =
        selector === ".masthead" ||
        selector === "#reader-toolbar" ||
        selector === ".reader-bottom"
          ? ["--text", "--muted", "--accent"].map((token) => ({
              token,
              color: rgba(getComputedStyle(node).getPropertyValue(token)),
            }))
          : [{ token: "color", color: rgba(style.color) }];
      for (const { token, color } of colors) {
        const ratios = [
          [0, 0, 0],
          [255, 255, 255],
        ].map((pixel) => {
          const bg = over(surface, pixel);
          const fg = over(color, bg);
          // The fixed grain overlay has 2.5% opacity. Bound its worst effect,
          // conservatively allowing opposite noise pixels on text and backdrop.
          const lightText = luminance(fg) > luminance(bg);
          const fadedFg = over(
            [...(lightText ? [0, 0, 0] : [255, 255, 255]), 0.025],
            fg,
          );
          const fadedBg = over(
            [...(lightText ? [255, 255, 255] : [0, 0, 0]), 0.025],
            bg,
          );
          return contrast(fadedFg, fadedBg);
        });
        const ratio = Math.min(...ratios);
        checks.push({
          selector,
          token,
          kind: "worst-case-image-and-grain",
          ratio,
          threshold: 4.5,
          pass: ratio >= 4.5,
        });
      }
    }
    return checks;
  }, targets);
}
