import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { JSDOM } from "jsdom";

// GET follows redirects, including GitHub's signed release-asset redirects.
// Retry explicit rate limits; persistent limits still fail instead of hiding unchecked links.
async function get(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, {
      headers: { "User-Agent": "portrait-edit-link-check", Accept: "*/*" },
      signal: AbortSignal.timeout(30000),
    });
    const limited =
      response.status === 429 ||
      (response.status === 403 &&
        (response.headers.get("x-ratelimit-remaining") === "0" ||
          response.headers.has("retry-after")));
    if (!limited || attempt === 3) {
      assert.equal(
        response.status,
        200,
        `${url}: HTTP ${response.status}${limited ? " after rate-limit retries" : ""}`,
      );
      return response;
    }
    const retry = Number(response.headers.get("retry-after"));
    await response.body?.cancel();
    await delay(
      Math.min(
        10000,
        Math.max(
          1000 * 2 ** attempt,
          Number.isFinite(retry) ? retry * 1000 : 0,
        ),
      ),
    );
  }
}

const dom = new JSDOM(readFileSync("index.html", "utf8"));
const document = dom.window.document;
const urls = [
  ...new Set(
    [...document.querySelectorAll("[href], [src], meta[content]")]
      .map(
        (node) =>
          node.getAttribute("href") ??
          node.getAttribute("src") ??
          node.getAttribute("content"),
      )
      .filter((value) => /^https?:\/\//.test(value)),
  ),
];
const pdfLinks = urls.filter((url) => url.includes("/releases/download/"));
assert.ok(pdfLinks.length, "Expected the original release PDF link");

for (const url of urls) {
  test(
    `external index.html URL returns HTTP 200: ${url}`,
    { timeout: 120000 },
    async () => {
      const response = await get(url);
      if (pdfLinks.includes(url)) {
        assert.match(
          response.headers.get("content-type") ?? "",
          /pdf|octet-stream/,
        );
        const bytes = Buffer.from(await response.arrayBuffer());
        assert.equal(
          bytes.subarray(0, 5).toString(),
          "%PDF-",
          "Release asset is not a PDF",
        );
        assert.ok(
          bytes.subarray(-1024).includes(Buffer.from("%%EOF")),
          "Truncated PDF",
        );
      } else {
        await response.body?.cancel();
      }
    },
  );
}
for (const url of pdfLinks) {
  test(
    `release tag and exact asset exist: ${url}`,
    { timeout: 120000 },
    async () => {
      const match = new URL(url).pathname.match(
        /^\/([^/]+)\/([^/]+)\/releases\/download\/([^/]+)\/(.+)$/,
      );
      assert.ok(match, "Unexpected GitHub release URL");
      const [, owner, repo, tag, asset] = match;
      const release = await (
        await get(
          `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`,
        )
      ).json();
      assert.equal(release.tag_name, decodeURIComponent(tag));
      assert.ok(
        release.assets.some(
          (entry) =>
            entry.name === decodeURIComponent(asset) &&
            entry.browser_download_url === url,
        ),
        "Exact release asset not found",
      );
    },
  );
}
test(
  "production notes destination contains the editorial source and rebuild notes",
  { timeout: 120000 },
  async () => {
    assert.equal(
      document
        .querySelector(
          'a[href="https://github.com/ivan-esteban23/the-portrait-edit"]',
        )
        ?.textContent.trim(),
      "Source & production notes",
    );
    const notes = await (
      await get(
        "https://raw.githubusercontent.com/ivan-esteban23/the-portrait-edit/main/README.md",
      )
    ).text();
    assert.match(notes, /Issue 02/);
    assert.match(notes, /Editorial review/);
    assert.match(notes, /Rebuild instructions/);
  },
);
