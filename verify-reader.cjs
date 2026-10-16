const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const root = __dirname;
const issue = JSON.parse(fs.readFileSync(`${root}/docs/issue.json`));
const source = fs.readFileSync(`${root}/docs/reader.js`, 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));

async function fixture(scenario = {}) {
  const elements = new Map();
  const events = {};
  const windowEvents = {};
  const scrolls = [];
  const focuses = [];
  const animations = [];
  const hintStorage = scenario.storage || new Map(scenario.seen ? [['portrait-edit-keys-hint', 'shown']] : []);
  const prefetches = [], copies = [], timers = new Map();
  let nextTimer = 1, clipboardResolve;
  let observer;
  let context;
  let selectedText = "";

  function element(id, tagName = 'DIV') {
    const classes = new Set();
    let text = '';
    return {
      id, tagName, value: '1', open: false, disabled: false,
      scrollLeft: 0, clientWidth: 300, scrollWidth: 1500,
      listeners: {},
      addEventListener(name, callback) { this.listeners[name] = callback; },
      getBoundingClientRect() { return this.rect || {top: 900, bottom: 2000, left: 20, right: 280}; },
      closest() { return null; },
      select() { context.selected = this.value; },
      remove() { this.parent.children = this.parent.children.filter(child => child !== this); this.parent = null; },
      get textContent() { return text + this.children.map(child => child.textContent).join(''); },
      set textContent(value) {
        text = String(value);
        for (const child of this.children || []) child.parent = null;
        this.children = [];
      },
      classList: {
        toggle(name, active) { if (active) classes.add(name); else classes.delete(name); },
        contains(name) { return classes.has(name); }
      },
      style: { setProperty(key, value) { this[key] = value; } },
      children: [],
      append(child) { if (child.parent) child.remove(); child.parent = this; this.children.push(child); },
      insertBefore(child, before) {
        if (child.parent) child.remove();
        child.parent = this;
        const index = this.children.indexOf(before);
        if (index < 0) this.children.push(child); else this.children.splice(index, 0, child);
      },
      replaceChildren() { this.textContent = ''; },
      contains(node) {
        for (let current = node; current; current = current.parent) {
          if (current === this) return true;
        }
        return false;
      },
      focus(options) { context.document.activeElement = this; focuses.push({ id, options }); },
      scrollIntoView(options) { scrolls.push({ id, options }); },
      animate: scenario.noAnimation ? undefined : (frames, options) => {
        const effect = { frames, options, cancelled: false, cancel() { this.cancelled = true; } };
        animations.push(effect);
        return effect;
      }
    };
  }
  function el(id) {
    if (!elements.has(id)) elements.set(id, element(id));
    return elements.get(id);
  }
  const attach = (parent, ...children) => children.forEach(child => el(parent).append(el(child)));
  attach('reader', 'chapter-overview-shell', 'reader-toolbar', 'reading-text', 'reader-status', 'page-viewport', 'bottom-controls', 'mobile-focus-options');
  attach('chapter-overview-shell', 'chapter-overview');
  attach('reader-toolbar', 'focus-context', 'toolbar-main', 'toolbar-secondary');
  attach('toolbar-main', 'chapter-control', 'page-controls', 'focus-toggle');
  attach('chapter-control', 'chapter');
  attach('page-controls', 'previous', 'page-position', 'next');
  attach('page-position', 'page-number', 'page-total');
  attach('page-zoom-label', 'zoom');
  attach('toolbar-secondary', 'chapter-progress', 'mobile-focus-progress', 'reader-preferences');
  attach('reader-preferences', 'reader-preferences-summary', 'reading-options');
  attach('reading-options', 'view-control', 'page-zoom-label', 'text-size-label', 'keys-hint');
  attach('view-control', 'reading-mode');
  el('chapter-overview-shell').hidden = false;
  attach('text-size-label', 'text-size');
  attach('reader-status', 'status', 'retry-page');
  el('mobile-focus-options').hidden = true;
  el('reader-preferences-summary').textContent = 'Display';
  const location = { hash: scenario.hash || '' };
  const historyCalls = [];
  const storage = {
    getItem(key) { if (scenario.blocked) throw Error('Storage blocked'); return hintStorage.get(key) || null; },
    setItem(key, value) { if (scenario.blocked) throw Error('Storage blocked'); hintStorage.set(key, value); }
  };
  context = {
    localStorage: storage,
    navigator: scenario.noClipboard ? {} : { clipboard: { writeText: async text => {
      if (scenario.clipboardReject) throw Error('Clipboard permission denied');
      copies.push(text);
      if (scenario.clipboardDeferred) return new Promise(resolve => { clipboardResolve = resolve; });
    }}},
    setTimeout(callback, delay) { const id = nextTimer++; timers.set(id, {callback, delay}); return id; },
    clearTimeout(id) { timers.delete(id); },
    matchMedia: query => ({ matches: query.includes('reduced-motion') ? Boolean(scenario.reduced) : Boolean(scenario.mobile) }),
    document: {
      body: el('body'),
      activeElement: el('body'),
      getElementById: el,
      execCommand(command) {
        assert.equal(command, 'copy');
        const textarea = el('body').children.at(-1);
        assert.equal(textarea.tagName, 'TEXTAREA');
        assert(textarea.style.cssText.includes('left:-9999px'));
        copies.push(context.selected);
        return !scenario.fallbackReject;
      },
      querySelectorAll: () => [el('start-reading'), el('cover-link')],
      querySelector: selector => selector === '.toolbar' ? el('reader-toolbar') : selector === '.page-viewport' ? el('page-viewport') : selector === '.reader-status' ? el('reader-status') : el('holder'),
      createElement: tag => element(undefined, tag.toUpperCase()),
      addEventListener: (name, callback) => { events[name] = callback; }
    },
    window: {
      innerWidth: scenario.width || (scenario.mobile ? 390 : 1280), innerHeight: 800,
      getSelection: () => ({toString: () => selectedText, rangeCount: 0, removeAllRanges() {}}),
      addEventListener: (name, callback) => { windowEvents[name] = callback; }
    },
    location,
    history: {
      replaceState(a, b, hash) { location.hash = hash; historyCalls.push('replace'); },
      pushState(a, b, hash) { location.hash = hash; historyCalls.push('push'); }
    },
    fetch: async path => ({
      ok: fs.existsSync(`${root}/docs/${path}`),
      json: async () => JSON.parse(fs.readFileSync(`${root}/docs/${path}`))
    })
  };
  if (!scenario.noPrefetch) context.Image = class {
    set src(value) {
      this.source = value;
      const current = Number(el('page-number').value);
      assert.equal(el('page-image').src, `pages/${String(current).padStart(3, '0')}.webp`);
      prefetches.push({source: value, current, priority: this.fetchPriority, decoding: this.decoding});
    }
    get src() { return this.source; }
  };
  if (scenario.observed) context.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; observer = this; }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
  };
  await vm.runInNewContext(source, context);
  await flush();
  return { el, context, events, windowEvents, location, historyCalls, scrolls, focuses, animations, hintStorage, observer,
    prefetches, copies, timers,
    selectText(text) { selectedText = text; },
    resize(width) { scenario.mobile = width <= 700; context.window.innerWidth = width; windowEvents.resize(); },
    resolveClipboard() { clipboardResolve(); },
    runTimers() { const pending = [...timers.values()]; timers.clear(); pending.forEach(timer => timer.callback()); }
  };
}

function descendant(node, className) {
  if (node.className === className) return node;
  for (const child of node.children) {
    const found = descendant(child, className);
    if (found) return found;
  }
}

function clickEvent(extra = {}) {
  return { button: 0, prevented: false, preventDefault() { this.prevented = true; }, ...extra };
}

(async () => {
  for (const scenario of [
    { observed: true },
    { mobile: true, seen: true, reduced: true },
    { blocked: true }
  ]) {
    const f = await fixture(scenario);
    const { el, context, events, windowEvents, location, scrolls, focuses, animations, hintStorage, observer } = f;
    const page = number => { el('page-number').value = number; el('page-number').onchange(); };
    const cards = el('selected-studies').children;
    assert.equal(cards.length, 3);
    cards.forEach((card, index) => {
      const study = issue.featured[index];
      assert.equal(card.href, `#page=${study.page}`);
      assert.equal(card.children[0].src, study.image);
      assert.equal(card.children[1].children[0].textContent, `${String(study.number).padStart(3, '0')} / ${study.title}`);
      assert.equal(card.children[1].children[1].textContent, study.style);
    });
    assert.equal(context.document.body.classList.contains('focus-mode'), false);
    assert.equal(el('focus-toggle').ariaPressed, 'false');
    assert.equal(el('focus-toggle').textContent, 'Focus');
    assert.equal(f.prefetches.length, 1);
    assert.equal(f.prefetches[0].source, 'pages/002.webp');
    assert.equal(el('reading-mode').value, scenario.mobile ? 'text' : 'page');
    assert.equal(el('page-image').src, 'pages/001.webp');
    assert(el('previous').disabled);
    assert.equal(el('chapter').children.length, 9);
    assert.equal(el('download').href, issue.download);
    for (const id of ['other-issue', 'other-issue-card', 'footer-issue-01']) assert.equal(el(id).href, issue.other_url);
    assert.equal(el('chapter-progress').textContent, 'Front matter · pages 1–13 · 1 of 13');
    const chapters = el('chapter-overview').children;
    assert.equal(chapters.length, 9);
    chapters.forEach((button, i) => {
      assert.equal(button.children[0].textContent, issue.chapters[i].title);
      const end = issue.chapters[i + 1] ? issue.chapters[i + 1].page - 1 : issue.pages;
      assert.equal(button.children[1].textContent, ` · ${issue.chapters[i].page}–${end}`);
      assert.equal(button.value, issue.chapters[i].page);
      assert.equal(button.ariaCurrent, 'false');
    });
    assert.equal(scrolls.length, 0);
    assert.equal(focuses.length, 0);

    assert.equal(el('keys-hint').hidden, true);
    assert.equal(hintStorage.has('portrait-edit-keys-hint'), Boolean(scenario.seen));
    el('reader-preferences').open = true;
    el('reader-preferences').listeners.toggle();
    assert.equal(el('keys-hint').hidden, Boolean(scenario.seen));
    if (!scenario.seen && !scenario.blocked) assert.equal(hintStorage.get('portrait-edit-keys-hint'), 'shown');
    el('reader-preferences').open = false;
    if (!scenario.seen) {
      el('dismiss-keys-hint').onclick();
      assert.equal(el('keys-hint').hidden, true);
      if (!scenario.blocked) assert.equal(hintStorage.get('portrait-edit-keys-hint'), 'dismissed');
    }

    assert.equal(el('page-loading').hidden, false);
    assert.equal(el('page-viewport').ariaBusy, 'true');
    el('page-image').onload();
    assert.equal(el('page-loading').hidden, true);
    assert.equal(el('page-viewport').ariaBusy, 'false');
    assert.equal(animations.length, scenario.reduced ? 0 : 1);
    if (!scenario.reduced) assert.equal(animations[0].options.duration, 170);
    el('next').onclick();
    assert.equal(el('page-number').value, 2);
    if (!scenario.reduced) assert(animations[0].cancelled);
    const staleLoad = el('page-image').onload, staleError = el('page-image').onerror;
    el('next-bottom').onclick();
    assert.equal(el('page-number').value, 3);
    staleLoad(); staleError();
    assert.equal(el('page-loading').hidden, false);
    el('page-image').onerror();
    assert.equal(el('page-loading').hidden, true);
    assert(el('status').textContent.includes('could not load'));
    assert.equal(animations.length, scenario.reduced ? 0 : 1);

    el('chapter').value = issue.chapters[1].page;
    el('chapter').onchange();
    assert.equal(el('page-number').value, 37);
    page(999); assert.equal(el('page-number').value, 196); assert(el('next').disabled);
    page(0); assert.equal(el('page-number').value, 1);
    events.keydown({ target: { tagName: 'DIV' }, key: 'ArrowRight', preventDefault() {} });
    assert.equal(el('page-number').value, 2);
    events.keydown({ target: { tagName: 'INPUT' }, key: 'ArrowRight', preventDefault() {} });
    assert.equal(el('page-number').value, 2);
    el('zoom').value = '200'; el('zoom').onchange();
    assert.equal(el('holder').style.width, '200%');
    assert.equal(scrolls.length, 0); assert.equal(focuses.length, 0);

    // Incoming hashes from outside enter the visible reading mode exactly once.
    location.hash = '#page=17'; windowEvents.hashchange();
    assert.equal(el('page-number').value, 17);
    assert.equal(scrolls.length, 1); assert.equal(focuses.length, 1);
    assert.equal(focuses[0].id, scenario.mobile ? 'reading-text' : 'page-viewport');
    assert.equal(focuses[0].options.preventScroll, true);
    assert.equal(scrolls[0].options.behavior, scenario.reduced ? 'instant' : 'smooth');
    location.hash = '#page=18'; windowEvents.hashchange();
    assert.equal(scrolls.length, 1); assert.equal(focuses.length, 1);

    el('text-details').open = true; el('text-details').ontoggle(); await flush();
    assert.equal(el('page-text').textContent, JSON.parse(fs.readFileSync(`${root}/docs/pages/018.json`)).text);
    el('reading-mode').value = 'text'; el('reading-mode').onchange(); await flush();
    assert(el('page-viewport').hidden); assert(!el('reading-text').hidden);
    page(60); await flush();
    const study = JSON.parse(fs.readFileSync(`${root}/docs/pages/060.json`)).study;
    assert.equal(descendant(el('reading-text'), 'copy').textContent, study.prompt);
    assert.equal(descendant(el('reading-text'), 'reference').src, study.image);
    assert.equal(descendant(el('reading-text'), 'reference-figure').tagName, 'FIGURE');
    assert.equal(descendant(el('reading-text'), 'reference-caption').textContent, 'Source: ' + study.source);
    const copy = descendant(el('reading-text'), 'copy-prompt');
    const feedback = descendant(el('reading-text'), 'copy-feedback');
    assert(copy); assert.equal(copy.textContent, 'Copy prompt');
    await copy.onclick();
    assert.equal(f.copies.at(-1), study.prompt);
    assert.equal(copy.textContent, 'Copied');
    assert.equal(feedback.textContent, 'Prompt copied.');
    assert.equal([...f.timers.values()][0].delay, 1600);
    f.runTimers();
    assert.equal(copy.textContent, 'Copy prompt'); assert.equal(feedback.textContent, '');
    await copy.onclick(); assert.equal(f.timers.size, 1);
    page(61); assert.equal(f.timers.size, 0); await flush();
    el('text-size').value = '20'; el('text-size').onchange();
    assert.equal(el('reading-text').style['--reading-size'], '20px');
    el('reading-mode').value = 'page'; el('reading-mode').onchange();
    assert(!el('page-viewport').hidden); assert(el('reading-text').hidden);

    for (const [number, expected] of [
      [13, 'Front matter · pages 1–13 · 13 of 13'],
      [14, 'Portraits & Light · pages 14–36 · 1 of 23'],
      [127, 'Studio · pages 127–149 · 1 of 23'],
      [138, 'Studio · pages 127–149 · 12 of 23'],
      [149, 'Studio · pages 127–149 · 23 of 23'],
      [150, 'Night & Lifestyle · pages 150–169 · 1 of 20'],
      [196, 'Street & City · pages 170–196 · 27 of 27']
    ]) {
      page(number);
      assert.equal(el('chapter-progress').textContent, expected);
      chapters.forEach((button, i) => {
        const start = issue.chapters[i].page, end = issue.chapters[i + 1]?.page || 197;
        assert.equal(button.ariaCurrent, number >= start && number < end ? 'location' : 'false');
      });
      el('page-image').onload(); assert.equal(el('page-loading').hidden, true);
    }
    chapters[6].onclick();
    assert.equal(el('page-number').value, 127); assert.equal(chapters[6].ariaCurrent, 'location');
    assert.equal(scrolls.length, 1); assert.equal(focuses.length, 1);

    const modified = clickEvent({ ctrlKey: true });
    cards[0].onclick(modified);
    assert(!modified.prevented); assert.equal(el('page-number').value, 127);
    const selected = clickEvent(); cards[0].onclick(selected);
    assert(selected.prevented); assert.equal(el('page-number').value, issue.featured[0].page);
    assert.equal(f.historyCalls.at(-1), 'push');
    assert.equal(scrolls.length, 2); assert.equal(focuses.length, 2);
    assert.equal(context.document.activeElement, el('page-viewport'));
    const pushed = f.historyCalls.filter(call => call === 'push').length;
    cards[0].onclick(clickEvent());
    assert.equal(scrolls.length, 3); assert.equal(f.historyCalls.filter(call => call === 'push').length, pushed);
    el('next').onclick();
    assert.equal(scrolls.length, 3); assert.equal(focuses.length, 3);
    for (const item of f.prefetches) {
      const number = Number(item.source.match(/pages\/(\d+)\.webp/)[1]);
      assert(number >= 1 && number <= 196 && Math.abs(number - item.current) === 1);
      assert.equal(item.priority, 'low'); assert.equal(item.decoding, 'async');
    }
    const unchangedPage = el('page-number').value;
    el('focus-toggle').onclick();
    assert(context.document.body.classList.contains('focus-mode'));
    assert.equal(el('focus-toggle').textContent, 'Exit Focus');
    assert.equal(el('focus-toggle').ariaPressed, 'true');
    if (!scenario.blocked) assert.equal(hintStorage.get('portrait-edit-focus-mode'), 'true');
    el('focus-toggle').onclick();
    assert(!context.document.body.classList.contains('focus-mode'));
    assert.equal(el('focus-toggle').textContent, 'Focus');
    if (!scenario.blocked) assert.equal(hintStorage.get('portrait-edit-focus-mode'), 'false');
    assert.equal(el('page-number').value, unchangedPage);
    console.log(`PASS ${scenario.mobile ? 'mobile/reduced motion' : scenario.blocked ? 'blocked storage' : 'desktop'}: all existing controls, chapters, fade, hints, loading and deliberate deep-link focus.`);
  }

  for (const scenario of [{ hash: '#page=138' }, { hash: '#page=138', mobile: true, reduced: true }, { hash: '#page=20', noAnimation: true }]) {
    const f = await fixture(scenario);
    assert.equal(f.el('page-number').value, Number(scenario.hash.slice(6)));
    assert.equal(f.scrolls.length, 1); assert.equal(f.focuses.length, 1);
    assert.equal(f.focuses[0].id, scenario.mobile ? 'reading-text' : 'page-viewport');
    f.el('page-image').onload();
    if (scenario.noAnimation) assert.equal(f.animations.length, 0);
    f.el('next').onclick();
    assert.equal(f.scrolls.length, 1); assert.equal(f.focuses.length, 1);
  }
  const focused = await fixture();
  focused.el('focus-toggle').onclick();
  const restored = await fixture({storage: focused.hintStorage});
  assert(restored.context.document.body.classList.contains('focus-mode'));
  assert.equal(restored.el('focus-toggle').textContent, 'Exit Focus');
  restored.el('focus-toggle').onclick();
  const exited = await fixture({storage: focused.hintStorage});
  assert(!exited.context.document.body.classList.contains('focus-mode'));

  const neighbors = await fixture({hash: '#page=138'});
  assert.deepEqual(neighbors.prefetches.map(item => item.source), ['pages/137.webp', 'pages/139.webp']);
  neighbors.el('page-number').value = 138; neighbors.el('page-number').onchange();
  assert.equal(neighbors.prefetches.length, 2);
  neighbors.el('page-number').value = 196; neighbors.el('page-number').onchange();
  assert.equal(neighbors.prefetches.at(-1).source, 'pages/195.webp');
  const noPrefetch = await fixture({noPrefetch: true});
  assert.equal(noPrefetch.prefetches.length, 0);

  for (const option of [{clipboardReject: true}, {noClipboard: true, fallbackReject: true}]) {
    const failed = await fixture({hash: '#page=60', mobile: true, ...option});
    const copy = descendant(failed.el('reading-text'), 'copy-prompt');
    await copy.onclick();
    assert.equal(copy.textContent, 'Copy prompt');
    assert(descendant(failed.el('reading-text'), 'copy-feedback').textContent.startsWith('Copy unavailable.'));
    assert.equal(failed.timers.size, 0);
  }
  const pending = await fixture({hash: '#page=60', mobile: true, clipboardDeferred: true});
  const original = descendant(pending.el('reading-text'), 'copy-prompt');
  const copying = original.onclick();
  pending.el('page-number').value = 61; pending.el('page-number').onchange(); await flush();
  pending.resolveClipboard(); await copying;
  assert.equal(descendant(pending.el('reading-text'), 'copy-prompt').textContent, 'Copy prompt');
  assert.equal(descendant(pending.el('reading-text'), 'copy-feedback').textContent, '');
  assert.equal(pending.timers.size, 0);
  pending.el('page-number').value = 3; pending.el('page-number').onchange(); await flush();
  assert.equal(descendant(pending.el('reading-text'), 'copy-prompt'), undefined);
  console.log('PASS Focus restoration/exit, only adjacent low-priority images, chapter ranges, exact prompt copy, timed confirmation, denied/unavailable clipboard and stale-copy isolation.');
  // Responsive geometry/state checks: same DOM navigation at all breakpoints.
  for (const width of [320, 390, 700, 768, 1280]) {
    const f = await fixture({width, mobile: width <= 700, hash: '#page=138'});
    const {el, windowEvents, context} = f;
    el('reader').rect = {top: 100, bottom: 2500};
    windowEvents.scroll();
    assert.equal(context.document.body.classList.contains('reader-docked'), width <= 700);
    el('reader').rect = {top: 900, bottom: 3000}; windowEvents.scroll();
    assert(!context.document.body.classList.contains('reader-docked'));
    el('reader').rect = {top: -2000, bottom: -1}; windowEvents.scroll();
    assert(!context.document.body.classList.contains('reader-docked'));
    const strip = el('chapter-overview'), shell = el('chapter-overview-shell');
    strip.scrollLeft = 0; strip.listeners.scroll();
    assert(!shell.classList.contains('more-left')); assert(shell.classList.contains('more-right'));
    strip.scrollLeft = 1200; strip.listeners.scroll();
    assert(shell.classList.contains('more-left')); assert(!shell.classList.contains('more-right'));
    const studio = strip.children[6];
    strip.scrollLeft = 0;
    studio.rect = {left: 500, right: 650};
    const before = f.scrolls.length;
    windowEvents.resize();
    assert(strip.scrollLeft > 0); assert.equal(f.scrolls.length, before);
    assert.equal(studio.style['--chapter-progress'], `${100 * 12 / 23}%`);
    el('page-number').value = 149; el('page-number').onchange();
    assert.equal(studio.style['--chapter-progress'], '100%');
    console.log(`PASS ${width}px responsive geometry: reader-only mobile dock, edge fades, active chapter reveal/progress.`);
  }

  const touch = await fixture({mobile: true, hash: '#page=138'});
  const viewport = touch.el('page-viewport');
  touch.el('zoom').value = '100';
  const gesture = (dx, dy = 0, extra = {}) => {
    const target = extra.target || viewport;
    viewport.listeners.touchstart({target, touches: [{clientX: 200, clientY: 200}]});
    viewport.listeners.touchmove({touches: [{clientX: 200 + dx, clientY: 200 + dy}]});
    viewport.listeners.touchend({touches: [], changedTouches: [{clientX: 200 + dx, clientY: 200 + dy}]});
  };
  gesture(-80); assert.equal(touch.el('page-number').value, 139);
  gesture(80); assert.equal(touch.el('page-number').value, 138);
  gesture(-69); gesture(-80, 160);
  assert.equal(touch.el('page-number').value, 138);
  touch.selectText('selected'); gesture(-100); touch.selectText('');
  gesture(-100, 0, {target: {tagName: 'INPUT'}});
  gesture(-100, 0, {target: {tagName: 'DIV', isContentEditable: true}});
  gesture(-100, 0, {target: {tagName: 'BUTTON', closest: () => ({})}});
  touch.el('zoom').value = '200'; gesture(-100); touch.el('zoom').value = '100';
  viewport.listeners.touchstart({target: viewport, touches: [{clientX: 200, clientY: 200}]});
  viewport.listeners.touchmove({touches: [{clientX: 200, clientY: 220}]});
  viewport.listeners.touchend({touches: [], changedTouches: [{clientX: 100, clientY: 200}]});
  viewport.listeners.touchstart({target: viewport, touches: [{clientX: 200, clientY: 200}]});
  viewport.listeners.touchcancel();
  viewport.listeners.touchend({touches: [], changedTouches: [{clientX: 100, clientY: 200}]});
  viewport.listeners.touchstart({target: viewport, touches: [{}, {}]});
  viewport.listeners.touchend({touches: [], changedTouches: [{clientX: 100, clientY: 200}]});
  assert.equal(touch.el('page-number').value, 138);

  const key = (name, extra = {}) => touch.events.keydown({target: viewport, key: name, preventDefault() {}, ...extra});
  key('f'); assert(touch.context.document.body.classList.contains('focus-mode'));
  assert.equal(touch.el('focus-context').hidden, false);
  assert.equal(touch.el('focus-context').textContent, 'Issue 02 · The Prompt Issue · Page 138');
  key('ArrowRight'); assert(touch.el('focus-context').textContent.endsWith('Page 139'));
  for (const extra of [{ctrlKey: true}, {altKey: true}, {metaKey: true}, {shiftKey: true}, {repeat: true}, {target: {tagName: 'INPUT'}}, {target: {tagName: 'SELECT'}}, {target: {tagName: 'TEXTAREA'}}, {target: {isContentEditable: true}}]) key('f', extra);
  key('Escape'); assert(touch.context.document.body.classList.contains('focus-mode'));
  key('F'); assert(!touch.context.document.body.classList.contains('focus-mode'));
  assert(touch.el('focus-context').hidden);

  const retry = await fixture({mobile: true, hash: '#page=60'});
  const oldPrompt = descendant(retry.el('reading-text'), 'copy');
  const beforePrefetch = retry.prefetches.length, beforeHistory = retry.historyCalls.length;
  const image = retry.el('page-image');
  assert.equal(image.fetchPriority, 'high'); assert.equal(image.decoding, 'async');
  image.onerror(); assert.equal(retry.el('retry-page').hidden, false);
  const staleError = image.onerror;
  retry.el('retry-page').onclick();
  assert(image.src.startsWith('pages/060.webp?retry='));
  assert(retry.el('retry-page').hidden); assert(!retry.el('page-loading').hidden);
  assert.equal(descendant(retry.el('reading-text'), 'copy'), oldPrompt);
  assert.equal(retry.prefetches.length, beforePrefetch); assert.equal(retry.historyCalls.length, beforeHistory);
  staleError(); assert(retry.el('retry-page').hidden);
  image.onerror(); assert(!retry.el('retry-page').hidden);
  retry.el('retry-page').onclick(); image.onload();
  assert(retry.el('retry-page').hidden); assert(retry.el('page-loading').hidden);
  assert.equal(retry.el('page-number').value, 60);

  const legacy = await fixture({mobile: true, hash: '#page=60', noClipboard: true});
  const legacyCopy = descendant(legacy.el('reading-text'), 'copy-prompt');
  legacyCopy.focus({preventScroll: true});
  await legacyCopy.onclick();
  assert.equal(legacyCopy.textContent, 'Copied');
  assert.equal(legacy.copies[0], JSON.parse(fs.readFileSync(`${root}/docs/pages/060.json`)).study.prompt);
  assert.equal(legacy.context.document.activeElement, legacyCopy);
  assert.equal(legacy.el('body').children.length, 0);
  legacy.runTimers(); assert.equal(legacyCopy.textContent, 'Copy prompt');

  for (const width of [320, 390, 700]) {
    const f = await fixture({mobile: true, width, hash: '#page=152'});
    const {el} = f;
    const preferences = el('reader-preferences'), chapters = el('chapter-overview-shell'), zoom = el('page-zoom-label');
    const originalChapter = el('chapter-overview').children[7];
    preferences.open = true;
    el('text-details').open = true;
    el('focus-toggle').onclick();
    assert.equal(el('focus-toggle').textContent, 'Exit Focus');
    assert.equal(preferences.open, false);
    assert.equal(preferences.parent, el('mobile-focus-options'));
    assert.equal(el('mobile-focus-options').hidden, false);
    assert.equal(chapters.parent, el('reader'));
    assert.equal(chapters.hidden, true);
    assert.equal(el('chapter-control').parent, el('reading-options'));
    assert.equal(el('text-details').open, false);
    assert.equal(zoom.parent, el('reading-options'));
    assert(!el('reader-toolbar').contains(preferences));
    assert(!el('reader-toolbar').contains(chapters));
    assert.equal(el('reader-preferences-summary').textContent, 'Chapters & display');
    assert.equal(el('mobile-focus-progress').textContent, 'Night & Lifestyle · 3 of 20');
    // Reuse the same controls/handlers, without closing on a scroll or toggle.
    preferences.open = true; preferences.listeners.toggle(); f.windowEvents.scroll();
    assert(preferences.open);
    assert(chapters.hidden);
    el('reading-mode').value = 'page'; el('reading-mode').onchange();
    assert.equal(el('page-viewport').hidden, false); assert.equal(zoom.hidden, false);
    el('zoom').value = '125'; el('zoom').onchange(); assert.equal(el('holder').style.width, '125%');
    el('reading-mode').value = 'text'; el('reading-mode').onchange(); await flush();
    assert.equal(el('reading-text').hidden, false); assert(zoom.hidden);
    assert(f.context.document.body.classList.contains('reading-view'));
    el('text-size').value = '20'; el('text-size').onchange();
    assert.equal(el('reading-text').style['--reading-size'], '20px');
    const copy = descendant(el('reading-text'), 'copy-prompt');
    await copy.onclick(); assert.equal(copy.textContent, 'Copied');
    el('next').onclick(); await flush();
    assert.equal(el('page-number').value, 153); assert.equal(preferences.open, false);
    assert.equal(el('mobile-focus-progress').textContent, 'Night & Lifestyle · 4 of 20');
    preferences.open = true; el('chapter').focus({preventScroll: true}); el('chapter').value = '150'; el('chapter').onchange();
    assert.equal(f.context.document.activeElement, el('reading-text'));
    assert.equal(el('page-number').value, 150); assert.equal(preferences.open, false);
    assert.equal(el('chapter-overview').children[7], originalChapter);
    el('page-image').onerror(); assert(el('reader-status').classList.contains('has-error'));
    assert(!el('retry-page').hidden);
    el('retry-page').onclick(); assert(!el('reader-status').classList.contains('has-error'));
    el('page-image').onload();
    // Desktop regains the original hierarchy; returning to mobile closes it.
    f.resize(768);
    assert.equal(preferences.parent, el('toolbar-secondary'));
    assert.equal(chapters.parent, el('reader'));
    assert.equal(chapters.hidden, false);
    assert.equal(el('chapter-control').parent, el('toolbar-main'));
    assert.equal(el('toolbar-main').children[0], el('chapter-control'));
    assert.equal(zoom.parent, el('reading-options'));
    assert(el('reader').children.indexOf(chapters) < el('reader').children.indexOf(el('reader-toolbar')));
    assert(!el('toolbar-main').contains(zoom));
    assert.equal(el('mobile-focus-options').hidden, true);
    assert.equal(el('reader-preferences-summary').textContent, 'Display');
    preferences.open = true; f.windowEvents.scroll(); assert(preferences.open);
    f.resize(width); assert.equal(preferences.open, false);
    assert.equal(preferences.parent, el('mobile-focus-options'));
    el('focus-toggle').onclick();
    assert.equal(preferences.parent, el('toolbar-secondary'));
    assert.equal(chapters.parent, el('reader'));
    assert.equal(chapters.hidden, false);
    assert.equal(el('chapter-control').parent, el('toolbar-main'));
    assert.equal(el('toolbar-main').children[0], el('chapter-control'));
    assert.equal(zoom.parent, el('reading-options'));
    assert.equal(el('mobile-focus-options').hidden, true);
    assert.equal(el('text-size').value, '20'); assert.equal(el('zoom').value, '125');
    assert.equal(el('chapter-overview').children.length, 9);
    el('reading-mode').value = 'page'; el('reading-mode').onchange();
    assert(!f.context.document.body.classList.contains('reading-view'));
    el('text-details').open = true; el('text-details').ontoggle(); await flush();
    assert(el('text-details').open); // Raw extraction is still available outside Focus.
    el('focus-toggle').onclick(); assert.equal(el('text-details').open, false);
    el('page-number').value = '1'; el('page-number').onchange();
    assert(el('previous').disabled); assert(el('previous-bottom').disabled);
    el('page-number').value = '196'; el('page-number').onchange();
    assert(el('next').disabled); assert(el('next-bottom').disabled);
    console.log(`PASS ${width}px Focus: short progress, collapsed relocated settings, reused navigation/copy/zoom, visible errors, and desktop/exit restoration.`);
  }
  const persistedMobile = await fixture({mobile: true, hash: '#page=152', storage: new Map([['portrait-edit-focus-mode', 'true']])});
  assert.equal(persistedMobile.el('reader-preferences').parent, persistedMobile.el('mobile-focus-options'));
  assert.equal(persistedMobile.el('reader-preferences').open, false);
  assert.equal(persistedMobile.el('mobile-focus-progress').textContent, 'Night & Lifestyle · 3 of 20');

  // Scrubbing previews never request intermediate pages or alter history.
  for (const width of [320, 430, 700, 768, 1280]) {
    const f = await fixture({mobile: width <= 700, width, hash: '#page=60'});
    const slider = f.el('page-scrubber');
    slider.tagName = 'INPUT';
    f.events.keydown({target: slider, key: 'ArrowRight', preventDefault() { throw Error('Range keyboard input must stay native'); }});
    assert.equal(f.el('page-number').value, 60);
    assert.equal(slider.max, 196);
    assert.equal(f.el('chapter-ticks').children.length, 9);
    for (const [i, tick] of f.el('chapter-ticks').children.entries()) {
      assert.equal(tick.style.left, `${100 * (issue.chapters[i].page - 1) / 195}%`);
    }
    const before = f.prefetches.length, historyBefore = f.historyCalls.length;
    for (const n of [1, 37, 150, 196]) {
      slider.value = n; slider.oninput();
      assert.equal(f.el('scrubber-page').textContent, `Page ${n} of 196`);
      assert.equal(slider.ariaValueText, `Page ${n} of 196`);
      assert.equal(f.el('page-number').value, 60);
    }
    assert.equal(f.prefetches.length, before);
    assert.equal(f.historyCalls.length, historyBefore);
    slider.onchange();
    assert.equal(f.el('page-number').value, 196);
    assert.equal(f.location.hash, '#page=196');
    assert(f.el('next-bottom').disabled);
    slider.onchange(); assert.equal(f.historyCalls.length, historyBefore + 1);
    slider.value = 1; slider.oninput(); slider.listeners.pointercancel();
    assert.equal(slider.value, 196);
    f.el('previous-bottom').onclick(); assert.equal(slider.value, 195);
    f.location.hash = '#page=37'; f.windowEvents.hashchange();
    assert.equal(slider.value, 37);
    f.el('focus-toggle').onclick();
    slider.value = 1; slider.oninput(); slider.onchange();
    assert.equal(f.el('page-number').value, 1); assert(f.el('previous-bottom').disabled);
    let prevented = false;
    f.el('start-reading').listeners.click({button: 0, preventDefault() { prevented = true; }});
    assert(prevented); assert.equal(f.focuses.at(-1).id, width <= 700 ? 'reading-text' : 'page-viewport');
    const scrollCount = f.scrolls.length;
    f.el('cover-link').listeners.click({ctrlKey: true}); assert.equal(f.scrolls.length, scrollCount);
    for (const size of ['16', '18', '20']) {
      f.el('text-size').value = size; f.el('text-size').onchange();
      assert.equal(f.el('reading-text').style['--reading-size'], size + 'px');
    }
    console.log(`PASS ${width}px: scrub preview/commit/cancel, endpoints, hash synchronization, Start reading focus, all text sizes.`);
  }

  // Every published study retains its prompt, notes, image and source in flowing mode.
  const content = await fixture({mobile: true, noPrefetch: true});
  let studyCount = 0;
  for (let number = 1; number <= issue.pages; number++) {
    const data = JSON.parse(fs.readFileSync(`${root}/docs/pages/${String(number).padStart(3, '0')}.json`));
    if (!data.study) continue;
    content.el('page-number').value = number; content.el('page-number').onchange(); await flush();
    const tree = content.el('reading-text'), study = data.study;
    assert.equal(descendant(tree, 'copy').textContent, study.prompt);
    assert.equal(descendant(tree, 'reference').src, study.image);
    assert.equal(descendant(tree, 'reference-caption').textContent, 'Source: ' + study.source);
    const header = descendant(tree, 'study-metadata');
    assert.equal(header.children.length, 3);
    assert.equal(header.children[0].textContent, `STUDY ${String(study.number).padStart(3, '0')} · Page ${number}`);
    assert.equal(descendant(header, 'study-page').textContent, ` · Page ${number}`);
    assert.equal(header.children[1].textContent, study.title);
    assert.equal(header.children[2].textContent, study.style);
    assert.equal(descendant(tree, 'reference-flags').textContent, study.flags);
    assert(descendant(tree, 'reference-figure').contains(descendant(tree, 'reference-flags')));
    assert(tree.textContent.includes(study.title)); assert(tree.textContent.includes(study.notes));
    assert(tree.textContent.includes(study.try_this)); studyCount++;
  }
  assert.equal(studyCount, 174);
  console.log('PASS swipes and cancellation, F/context/Escape guards, image-only retry races, legacy clipboard cleanup, and exact content for all 174 studies.');
  assert(fs.readFileSync(`${root}/docs/style.css`, 'utf8').includes('--reading-size:16px'));
  assert(fs.readFileSync(`${root}/docs/index.html`, 'utf8').includes('<option value="16" selected>16 px</option>'));
  console.log('PASS initial page links: focus visible mode once, reduced-motion/fade fallback, no scrolling on ordinary turns.');
})().catch(error => { console.error(error); process.exit(1); });
