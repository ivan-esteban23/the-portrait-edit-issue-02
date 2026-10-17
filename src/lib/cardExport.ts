import type { Prompt } from "@/content/schema";
import { assetUrl } from "@/content";

/**
 * Text wrapper for Canvas 2D context with word-boundary splitting and max lines limit
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number = 6,
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      if (lines.length === maxLines - 1) {
        // Last line, see if remainder fits or truncate with ellipsis
        const remainder = words.slice(i).join(" ");
        let truncated = remainder;
        while (
          ctx.measureText(`${truncated}…`).width > maxWidth &&
          truncated.length > 0
        ) {
          truncated = truncated.slice(0, -1).trim();
        }
        lines.push(`${truncated}…`);
        return lines;
      }
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/** Wait for a usable image; failed or stalled requests use the card placeholder. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const finish = (error?: Error) => {
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      if (error) reject(error);
      else resolve(img);
    };
    const timer = setTimeout(
      () => finish(new Error("Reference image timed out")),
      15000,
    );
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) finish();
      else finish(new Error("Reference image has no dimensions"));
    };
    img.onerror = () => finish(new Error("Reference image failed to load"));
    img.src = src;
  });
}

export interface CardExportOptions {
  theme?: "dark" | "paper" | "light";
}

/**
 * Renders an offscreen 1080x1350 editorial social recipe card on canvas
 * and triggers download as `portrait-edit-study-[number].png`.
 */
export async function exportStudyRecipeCard(
  prompt: Prompt,
  options: CardExportOptions = {},
): Promise<boolean> {
  if (typeof document === "undefined") return false;

  const width = 1080;
  const height = 1350;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  // Wait for fonts if available
  if (document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore font loading error */
    }
  }

  // Color scheme: Editorial dark slate by default
  const isPaper = options.theme === "paper";
  const isLight = options.theme === "light";

  const bgColor = isPaper ? "#f5f0e8" : isLight ? "#f8f7f4" : "#0d0d0d";
  const cardBorderColor = isPaper ? "#ded6c7" : isLight ? "#d9d5cb" : "#242424";
  const headerTextColor = isPaper ? "#7a756b" : isLight ? "#76746e" : "#8e8e8a";
  const titleColor = isPaper ? "#1c1a17" : isLight ? "#171614" : "#f4f4f0";
  const promptColor = isPaper ? "#2e2b26" : isLight ? "#2b2926" : "#e0e0dc";
  const accentColor = isPaper ? "#8c6b2d" : isLight ? "#8c6b2d" : "#d4af37";
  const metaColor = isPaper ? "#686359" : isLight ? "#63615b" : "#949490";
  const tagBgColor = isPaper ? "#eae3d2" : isLight ? "#e8e5dc" : "#1a1a1a";
  const tagTextColor = isPaper ? "#5c574c" : isLight ? "#57554f" : "#b0b0ac";

  // 1. Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Subtle outer framing border
  ctx.strokeStyle = cardBorderColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(32, 32, width - 64, height - 64);

  // 2. Watermark Header
  ctx.fillStyle = headerTextColor;
  ctx.font = "600 16px 'Inter Variable', Inter, system-ui, sans-serif";
  ctx.letterSpacing = "4px";
  ctx.fillText("THE PORTRAIT EDIT — ISSUE 02", 64, 82);

  ctx.letterSpacing = "1px";
  ctx.font = "500 14px 'Inter Variable', Inter, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("AI PROMPT ARCHIVE", width - 64, 82);
  ctx.textAlign = "left";

  // Dividing rule below header
  ctx.strokeStyle = cardBorderColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(64, 102);
  ctx.lineTo(width - 64, 102);
  ctx.stroke();

  // 3. Draw Study Reference Image
  const imgBoxX = 64;
  const imgBoxY = 126;
  const imgBoxW = width - 128; // 952
  const imgBoxH = 590;

  // Placeholder frame background while loading
  ctx.fillStyle = isPaper ? "#e9e3d5" : isLight ? "#e5e2d8" : "#141414";
  ctx.fillRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH);

  try {
    const imgSrc = assetUrl(prompt.referenceImage);
    const img = await loadImage(imgSrc);

    // Compute aspect ratio scaling (cover within box)
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const boxAspect = imgBoxW / imgBoxH;

    let sx = 0,
      sy = 0,
      sw = img.naturalWidth,
      sh = img.naturalHeight;

    if (imgAspect > boxAspect) {
      // Image is wider than box
      sw = img.naturalHeight * boxAspect;
      sx = (img.naturalWidth - sw) / 2;
    } else {
      // Image is taller than box
      sh = img.naturalWidth / boxAspect;
      sy = (img.naturalHeight - sh) / 2;
    }

    ctx.save();
    // Clip with rounded rect
    ctx.beginPath();
    ctx.roundRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, 8);
    ctx.clip();
    ctx.drawImage(img, sx, sy, sw, sh, imgBoxX, imgBoxY, imgBoxW, imgBoxH);
    ctx.restore();

    // Subtle image frame border
    ctx.strokeStyle = cardBorderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH);
  } catch {
    // If image fails to load, keep placeholder
    ctx.fillStyle = metaColor;
    ctx.font = "16px 'Inter Variable', Inter, system-ui, sans-serif";
    ctx.fillText("Reference Image Unavailable", imgBoxX + 32, imgBoxY + 300);
  }

  // 4. Study Eyebrow (Study number, Page, Model)
  let contentY = 760;
  ctx.letterSpacing = "2px";
  ctx.font = "600 15px 'Inter Variable', Inter, system-ui, sans-serif";
  ctx.fillStyle = accentColor;
  const studyNumStr = String(prompt.studyNumber).padStart(3, "0");
  const eyebrowText = `STUDY #${studyNumStr}  ·  PAGE ${prompt.page}  ·  ${(prompt.model || "MIDJOURNEY").toUpperCase()}`;
  ctx.fillText(eyebrowText, 64, contentY);

  // 5. Title (Newsreader Serif)
  contentY += 46;
  ctx.letterSpacing = "0px";
  ctx.font = "700 38px 'Newsreader Variable', Charter, Georgia, serif";
  ctx.fillStyle = titleColor;

  const titleLines = wrapText(ctx, prompt.title, width - 128, 2);
  for (const line of titleLines) {
    ctx.fillText(line, 64, contentY);
    contentY += 46;
  }

  // 6. Style Lead
  ctx.font = "italic 20px 'Newsreader Variable', Georgia, serif";
  ctx.fillStyle = metaColor;
  ctx.fillText(prompt.style, 64, contentY);
  contentY += 34;

  // Dividing rule before prompt text
  ctx.strokeStyle = cardBorderColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(64, contentY);
  ctx.lineTo(width - 64, contentY);
  ctx.stroke();
  contentY += 32;

  // 7. Prompt Body Text
  ctx.font = "400 21px/1.55 'Inter Variable', Inter, system-ui, sans-serif";
  ctx.fillStyle = promptColor;

  const promptLines = wrapText(ctx, `“${prompt.prompt}”`, width - 128, 5);
  for (const line of promptLines) {
    ctx.fillText(line, 64, contentY);
    contentY += 34;
  }

  // 8. Bottom Parameters & Tags Bar
  const footerY = 1220;
  ctx.strokeStyle = cardBorderColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(64, footerY);
  ctx.lineTo(width - 64, footerY);
  ctx.stroke();

  // Parameters row
  const paramsEntries = Object.entries(prompt.parameters || {});
  const paramsStr =
    paramsEntries.length > 0
      ? paramsEntries
          .map(([k, v]) => `${k.startsWith("--") ? k : `--${k}`} ${v}`)
          .join("   ")
      : "Standard editorial portrait parameters";

  ctx.font = "500 15px 'Inter Variable', Inter, ui-monospace, monospace";
  ctx.fillStyle = metaColor;
  ctx.fillText(paramsStr, 64, footerY + 36);

  // Style tags pills
  let tagX = 64;
  const tagY = footerY + 56;
  ctx.font = "500 14px 'Inter Variable', Inter, system-ui, sans-serif";

  const visibleTags = prompt.tags.slice(0, 5);
  for (const tag of visibleTags) {
    const tagText = `#${tag}`;
    const textWidth = ctx.measureText(tagText).width;
    const pillW = textWidth + 20;
    const pillH = 26;

    if (tagX + pillW < width - 260) {
      ctx.fillStyle = tagBgColor;
      ctx.beginPath();
      ctx.roundRect(tagX, tagY, pillW, pillH, 4);
      ctx.fill();

      ctx.fillStyle = tagTextColor;
      ctx.fillText(tagText, tagX + 10, tagY + 18);
      tagX += pillW + 10;
    }
  }

  // Issue branding on bottom right
  ctx.font = "600 13px 'Inter Variable', Inter, system-ui, sans-serif";
  ctx.letterSpacing = "1.5px";
  ctx.fillStyle = headerTextColor;
  ctx.textAlign = "right";
  ctx.fillText("THE-PORTRAIT-EDIT.COM", width - 64, footerY + 74);
  ctx.textAlign = "left";

  // 9. Trigger download
  const filename = `portrait-edit-study-${studyNumStr}.png`;

  if (canvas.toBlob) {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("Unable to encode recipe card"));
      }, "image/png");
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } else {
    // Fallback for environments lacking canvas.toBlob
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return true;
}
