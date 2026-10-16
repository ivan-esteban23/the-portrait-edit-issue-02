// CSS architecture and contrast checks; no browser or dependencies required.
// These complement verify-reader.cjs; they do not substitute for visual QA.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const css = fs.readFileSync(`${__dirname}/docs/style.css`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const html = fs.readFileSync(`${__dirname}/docs/index.html`, 'utf8');
const reader = fs.readFileSync(`${__dirname}/docs/reader.js`, 'utf8');
const declarations = block => Object.fromEntries(block.split(';').filter(line => line.includes(':')).map(line => {
  const colon = line.indexOf(':');
  return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
}));
const root = css.match(/:root\s*\{([^{}]+)\}/)[1];
const darkQuery = css.match(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([^{}]+)\}\s*\}/);
assert(darkQuery, 'Dark preference must override root tokens only');
const light = declarations(root);
const overrides = declarations(darkQuery[1]);
assert(Object.keys(overrides).every(key => key.startsWith('--') || key === 'color-scheme'));
const dark = {...light, ...overrides};
const expectedDark = {
  '--bg': '#0a0a0a', '--surface': '#111111', '--text': '#f4f4f0',
  '--muted': '#a8a8a4', '--border': '#2a2a2a'
};
for (const [token, value] of Object.entries(expectedDark)) assert.equal(dark[token], value, token);
assert.equal(light['color-scheme'], 'light');
assert.equal(dark['color-scheme'], 'dark');
for (const [token, value] of Object.entries({
  '--bg': '#f6f4ef', '--surface': '#fffdf8', '--text': '#171614',
  '--muted': '#5d5b55', '--border': '#d9d5cb'
})) assert.equal(light[token], value, token);
assert.equal(light['--focus-bg'], '#efece4');
const resolve = (value, tokens) => value.replace(/var\((--[\w-]+)\)/g, (_, token) => {
  assert(token in tokens, `Undefined token: ${token}`);
  return resolve(tokens[token], tokens);
});
// Component paint has no hard-coded colors; one shared component rule set.
const components = css.replace(root, '').replace(darkQuery[0], '');
for (const [, block] of components.matchAll(/\{([^{}]*)\}/g)) {
  assert(!/#(?:[\da-f]{3}){1,2}\b|\b(?:rgb|hsl)a?\(|\btransparent\b/i.test(block.replace(/var\([^)]*\)/g, '')), block);
}
for (const [, token] of css.matchAll(/var\((--[\w-]+)/g)) {
  // These are intentionally local variables, not theme colors.
  if (['--reading-size', '--chapter-progress'].includes(token)) continue;
  assert(token in light, `Undefined root token: ${token}`);
}
function luminance(hex) {
  const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels.reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}
function contrast(a, b) {
  const [low, high] = [luminance(a), luminance(b)].sort((a, b) => a - b);
  return (high + 0.05) / (low + 0.05);
}
for (const [theme, tokens] of [['Light', light], ['Dark', dark]]) {
  let minimum = Infinity;
  for (const surface of ['--bg', '--surface', '--surface-hover', '--focus-bg']) {
    for (const foreground of ['--text', '--muted']) {
      const ratio = contrast(resolve(tokens[foreground], tokens), resolve(tokens[surface], tokens));
      assert(ratio >= 4.5, `${theme} ${foreground} on ${surface}: ${ratio}`);
      minimum = Math.min(minimum, ratio);
    }
    assert(contrast(resolve(tokens['--focus'], tokens), resolve(tokens[surface], tokens)) >= 3);
  }
  assert(contrast(tokens['--text'], tokens['--bg']) >= 7, 'Selection and inverted buttons');
  console.log(`PASS ${theme}: body, metadata, captions, Focus, hover surfaces and focus rings; minimum text contrast ${minimum.toFixed(2)}:1.`);
}
for (const name of ['image', 'toolbar', 'mobile-nav']) {
  const opacity = tokens => Number(tokens[`--${name}-shadow`].match(/\/ (\d+)%/)[1]);
  assert(opacity(light) < opacity(dark), `${name} Light shadow must be softer`);
}
assert.match(css, /body\.focus-mode\s*\{\s*--canvas-bg:\s*var\(--focus-bg\)/);
assert.match(css, /body\s*\{[^}]*background:\s*var\(--canvas-bg\)/);
assert.match(css, /#reading-text\s*\{[^}]*background:\s*var\(--canvas-bg\)/);
assert.match(css, /\.page-viewport\s*\{[^}]*background:\s*var\(--surface\)/);
assert.match(css, /linear-gradient\(to right, var\(--canvas-bg\), var\(--transparent\)\)/);
assert.match(css, /linear-gradient\(to left, var\(--canvas-bg\), var\(--transparent\)\)/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
assert(!reader.includes('prefers-color-scheme'), 'Theme selection must stay in CSS');
assert(!/theme/i.test(reader), 'No theme persistence or manual UI');
for (const [scheme, color] of [['light', '#f6f4ef'], ['dark', '#0a0a0a']]) {
  assert(html.includes(`<meta name="theme-color" content="${color}" media="(prefers-color-scheme: ${scheme})">`));
}
assert(html.includes('<meta name="color-scheme" content="light dark">'));
assert(html.includes('style.css?v=perfect-2'));
assert(html.includes('reader.js?v=perfect-2'));
assert.equal(light['--radius'], '2px');
assert(!css.includes('--subtle'), 'Use one consistent secondary text role');
assert(Object.keys(overrides).every(key => !/space|type-|radius|tracking|font|width|gutter/.test(key)), 'Themes must share all geometry and typography');
for (const [, block] of components.matchAll(/\{([^{}]*)\}/g)) {
  const props = declarations(block);
  if (props['font-size']) assert(/var\(--(?:type-|reading-size)/.test(props['font-size']) || props['font-size'] === 'inherit', 'Shared type scale');
  if (props['border-radius']) assert(['0', 'var(--radius)'].includes(props['border-radius']), 'Only shared 2px corners or square inner segments');
}
assert.match(css, /body\.focus-mode #chapter-overview-shell,[^{}]*\{ display: none; \}/);
assert.match(css, /body\.focus-mode #text-details, body\.reading-view #text-details \{ display: none; \}/);
assert.match(css, /body\.focus-mode \.toolbar-main \.pagination\s*\{[^}]*display: inline-flex/);
assert.match(css, /body\.focus-mode \.page-position\s*\{[^}]*align-items: center/);
assert.match(css, /body\.focus-mode \.bottom-controls,[^{}]*\{[^}]*position: static/);
assert.match(css, /body\.focus-mode \.bottom-nav-slot \{ min-height: 0; \}/);
for (const edge of ['top', 'right', 'bottom', 'left']) {
  assert.equal(light[`--safe-${edge}`], `env(safe-area-inset-${edge}, 0px)`);
}
assert.match(css, /body\.focus-mode \.reading \{[^}]*padding-bottom: calc\(var\(--space-4\) \+ var\(--safe-bottom\)\)/);
assert.match(css, /body\.focus-mode \.toolbar \{[^}]*var\(--safe-top\)[^}]*var\(--safe-right\)[^}]*var\(--safe-left\)/);
assert.match(css, /padding: var\(--space-1\) max\(var\(--space-3\), var\(--safe-right\)\) calc\(var\(--space-1\) \+ var\(--safe-bottom\)\) max\(var\(--space-3\), var\(--safe-left\)\)/);
console.log('PASS: exact requested Light/Dark palettes, automatic themes, one type/spacing/shape system, warm Focus canvas, adaptive browser colors and perfect-2 cache busting.');
