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

  function element(id, tagName = 'DIV') {
    const classes = new Set();
    let text = '';
    return {
      id, tagName, value: '1', open: false, disabled: false,
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
      append(child) { child.parent = this; this.children.push(child); },
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
  for (const id of ['page-viewport', 'reading-text', 'page-number', 'chapter', 'chapter-overview']) {
    el(id).parent = el('reader');
  }
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
      querySelector: selector => selector === '.toolbar' ? el('toolbar') : selector === '.page-viewport' ? el('page-viewport') : el('holder'),
      createElement: tag => element(undefined, tag.toUpperCase()),
      addEventListener: (name, callback) => { events[name] = callback; }
    },
    window: { addEventListener: (name, callback) => { windowEvents[name] = callback; } },
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

    if (scenario.observed) {
      assert.equal(el('keys-hint').hidden, true);
      observer.callback([{ isIntersecting: false }]);
      assert.equal(el('keys-hint').hidden, true);
      observer.callback([{ isIntersecting: true }]);
      assert.equal(el('keys-hint').hidden, false);
      assert.equal(hintStorage.get('portrait-edit-keys-hint'), 'shown');
      assert(observer.disconnected);
    } else assert.equal(el('keys-hint').hidden, Boolean(scenario.seen));
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
    assert(el('reading-text').children.some(node => node.textContent === study.prompt));
    assert(el('reading-text').children.some(node => node.src === study.image));
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

  for (const option of [{clipboardReject: true}, {noClipboard: true}]) {
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
  assert(fs.readFileSync(`${root}/docs/style.css`, 'utf8').includes('--reading-size:16px'));
  assert(fs.readFileSync(`${root}/docs/index.html`, 'utf8').includes('<option value="16" selected>16 px</option>'));
  console.log('PASS initial page links: focus visible mode once, reduced-motion/fade fallback, no scrolling on ordinary turns.');
})().catch(error => { console.error(error); process.exit(1); });
