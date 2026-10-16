"use strict";
(async()=>{
const $=id=>document.getElementById(id);let issue,current=1,request=0,pageData=null,pageFade=null,copyResetTimer=null;
// Restore Focus mode before the issue metadata request completes.
const focusStorageKey = 'portrait-edit-focus-mode';
let focusMode = false;
let mobileFocusLayout = false;
try {
  focusMode = localStorage.getItem(focusStorageKey) === 'true';
} catch (_) {}
// Reuse the existing controls rather than creating a second mobile settings UI.
// Only transition the layout on entry/exit or a breakpoint change, so scrolling
// never closes options that the reader deliberately opened.
function syncMobileFocusLayout() {
  const active = focusMode && typeof matchMedia === 'function' &&
    matchMedia('(max-width: 700px)').matches;
  if (active === mobileFocusLayout) return;
  mobileFocusLayout = active;
  const preferences = $('reader-preferences');
  const chapters = $('chapter-overview-shell');
  const zoom = $('page-zoom-label');
  const chapterControl = $('chapter-control');
  chapters.hidden = active;
  if (active) {
    preferences.open = false;
    $('mobile-focus-options').append(preferences);
    $('reading-options').insertBefore(chapterControl, $('view-control'));
    $('reading-options').append(zoom);
    $('reader-preferences-summary').textContent = 'Chapters & reading options';
  } else {
    $('toolbar-main').insertBefore(chapterControl, $('page-controls'));
    $('toolbar-main').insertBefore(zoom, $('focus-toggle'));
    $('toolbar-secondary').append(preferences);
    $('reader-preferences-summary').textContent = 'Reading options';
  }
  $('mobile-focus-options').hidden = !active;
}
function setFocusMode(enabled, persist = false) {
  focusMode = enabled;
  document.body.classList.toggle('focus-mode', enabled);
  $('focus-toggle').ariaPressed = String(enabled);
  $('focus-toggle').textContent = enabled ? 'Exit Focus' : 'Focus';
  $('focus-context').hidden = !enabled;
  syncMobileFocusLayout();
  if (enabled) $('text-details').open = false;
  if (persist) {
    try { localStorage.setItem(focusStorageKey, String(enabled)); } catch (_) {}
  }
}
setFocusMode(focusMode);
$('focus-toggle').onclick = () => {
  setFocusMode(!focusMode, true);
  $('reader').scrollIntoView({behavior: 'instant', block: 'start'});
  updateReaderChrome();
};

try{const response=await fetch('issue.json',{cache:'no-cache'});if(!response.ok)throw Error('Issue metadata unavailable');issue=await response.json();}catch(e){$('status').textContent='The reader could not load. Please refresh or use the PDF download.';document.querySelector('.reader-status').classList.toggle('has-error', true);return;}
document.title=`The Portrait Edit — ${issue.title}`;$('issue-label').textContent=`Issue ${issue.number}`;$('issue-number').textContent=`ISSUE ${issue.number} / THE PORTRAIT EDIT`;$('title').textContent=issue.title;$('description').textContent=issue.description;$('stats').textContent=`${issue.studies} studies · ${issue.pages} pages · ${issue.navigation_label || `${issue.chapters.length} chapters`}`;
$('cover').alt=`The Portrait Edit — Issue ${issue.number} — ${issue.title} cover`;$('download').href=issue.download;$('download-note').textContent=`Original PDF · ${(issue.pdf_bytes/1000000).toFixed(1)} MB. The reader loads one page at a time.`;$('other-issue').href=issue.other_url;$('other-issue-card').href=issue.other_url;$('footer-issue-01').href=issue.other_url;$('other-issue').textContent=`Explore Issue ${issue.other_number} ↗`;$('page-total').textContent=`/ ${issue.pages}`;$('page-number').max=issue.pages;
const chapterButtons = [];
for (const [index, chapter] of issue.chapters.entries()) {
  const option = document.createElement('option');
  option.value = chapter.page;
  option.textContent = chapter.title;
  $('chapter').append(option);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'chapter-button';
  const name = document.createElement('span');
  name.textContent = chapter.title;
  const range = document.createElement('span');
  range.className = 'chapter-range';
  const end = issue.chapters[index + 1] ? issue.chapters[index + 1].page - 1 : issue.pages;
  range.textContent = ` · ${chapter.page}–${end}`;
  button.append(name);
  button.append(range);
  button.value = String(chapter.page);
  button.ariaCurrent = 'false';
  button.onclick = () => show(chapter.page);
  $('chapter-overview').append(button);
  chapterButtons.push(button);
}
for (const study of issue.featured || []) {
  const link = document.createElement('a');
  link.href = `#page=${study.page}`;
  link.onclick = event => {
    // Preserve native modified-click/new-tab behavior and the study's URL.
    if (event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const hash = `#page=${study.page}`;
    if (location.hash !== hash) history.pushState(null, '', hash);
    show(study.page, false);
    enterReader();
  };

  const image = document.createElement('img');
  image.src = study.image;
  image.alt = study.title;
  image.loading = 'lazy';

  const caption = document.createElement('span');
  caption.className = 'study-caption';
  const title = document.createElement('span');
  title.className = 'study-title';
  title.textContent = `${String(study.number).padStart(3, '0')} / ${study.title}`;
  caption.append(title);

  if (study.style) {
    const style = document.createElement('span');
    style.className = 'study-style';
    style.textContent = study.style;
    caption.append(style);
  }

  link.append(image);
  link.append(caption);
  $('selected-studies').append(link);
}
// Store the hint only when the reader is actually reached. Storage failures
// leave the reader usable and limit the hint to this page session.
const keysHintKey = 'portrait-edit-keys-hint';
let keysHintSeen = false;
try {
  keysHintSeen = Boolean(localStorage.getItem(keysHintKey));
} catch (_) {}
$('keys-hint').hidden = true;
function rememberKeysHint(value) {
  keysHintSeen = true;
  try {
    localStorage.setItem(keysHintKey, value);
  } catch (_) {}
}
function revealKeysHint() {
  if (keysHintSeen) return;
  $('keys-hint').hidden = false;
  rememberKeysHint('shown');
}
$('dismiss-keys-hint').onclick = () => {
  $('keys-hint').hidden = true;
  rememberKeysHint('dismissed');
};
if (!keysHintSeen) {
  if (typeof IntersectionObserver === 'function') {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        revealKeysHint();
        observer.disconnect();
      }
    });
    observer.observe(document.querySelector('.toolbar'));
  } else {
    revealKeysHint();
  }
}

// Keep references only to the immediate neighbors; low priority lets the
// visible page request proceed first. The browser reuses its normal cache.
const adjacentImages = new Map();
function prefetchAdjacentPages() {
  if (typeof Image !== 'function') return;
  const neighbors = [current - 1, current + 1].filter(page => page >= 1 && page <= issue.pages);
  for (const page of adjacentImages.keys()) {
    if (!neighbors.includes(page)) adjacentImages.delete(page);
  }
  for (const page of neighbors) {
    if (adjacentImages.has(page)) continue;
    const image = new Image();
    image.decoding = 'async';
    image.fetchPriority = 'low';
    image.src = `pages/${String(page).padStart(3, '0')}.webp`;
    adjacentImages.set(page, image);
  }
}

function clearCopyConfirmation() {
  if (copyResetTimer !== null) {
    clearTimeout(copyResetTimer);
    copyResetTimer = null;
  }
}

// Legacy copying is synchronous and leaves neither an element nor a focus jump.
function copyWithTextarea(prompt) {
  const previousFocus = document.activeElement;
  const selection = window.getSelection?.();
  const ranges = [];
  if (selection) {
    for (let i = 0; i < selection.rangeCount; i++) ranges.push(selection.getRangeAt(i).cloneRange());
  }
  const textarea = document.createElement('textarea');
  textarea.value = prompt;
  textarea.readOnly = true;
  textarea.tabIndex = -1;
  textarea.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
  document.body.append(textarea);
  try {
    textarea.focus({preventScroll: true});
    textarea.select();
    if (!document.execCommand?.('copy')) throw new Error('Clipboard unavailable');
  } finally {
    textarea.remove();
    previousFocus?.focus({preventScroll: true});
    if (selection) {
      selection.removeAllRanges();
      for (const range of ranges) selection.addRange(range);
    }
  }
}

async function copyPrompt(prompt, button, feedback) {
  clearCopyConfirmation();
  const copyRequest = request;
  const copyFocus = document.activeElement;
  const useLegacyCopy = typeof navigator === 'undefined' || !navigator.clipboard?.writeText;
  button.disabled = true;
  button.textContent = 'Copying…';
  feedback.textContent = '';
  try {
    if (useLegacyCopy) {
      copyWithTextarea(prompt);
    } else {
      await navigator.clipboard.writeText(prompt);
    }
    if (copyRequest !== request || !$('reading-text').contains(button)) return;
    button.textContent = 'Copied';
    feedback.textContent = 'Prompt copied.';
    copyResetTimer = setTimeout(() => {
      if (copyRequest === request) {
        button.textContent = 'Copy prompt';
        feedback.textContent = '';
      }
      copyResetTimer = null;
    }, 1600);
  } catch (_) {
    if (copyRequest !== request || !$('reading-text').contains(button)) return;
    button.textContent = 'Copy prompt';
    feedback.textContent = 'Copy unavailable. Select the prompt text to copy it.';
  } finally {
    button.disabled = false;
    if (useLegacyCopy && copyRequest === request && $('reading-text').contains(button)) {
      copyFocus?.focus({preventScroll: true});
    }
  }
}

function setPageLoading(loading) {
  if (loading) document.querySelector('.reader-status').classList.toggle('has-error', false);
  $('page-loading').hidden = !loading;
  $('page-viewport').ariaBusy = String(loading);
}

function prefersReducedMotion() {
  return typeof matchMedia === 'function' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function enterReader() {
  const target = $('reading-mode').value === 'text' ? $('reading-text') : $('page-viewport');
  target.focus({preventScroll: true});
  $('reader').scrollIntoView({
    behavior: prefersReducedMotion() ? 'instant' : 'smooth',
    block: 'start'
  });
}

function fadePageImage(image) {
  if (prefersReducedMotion() || typeof image.animate !== 'function') return;
  pageFade = image.animate([{opacity: 0.65}, {opacity: 1}], {
    duration: 170,
    easing: 'ease-out'
  });
}

function updateChapterProgress() {
  let index = -1;
  for (let i = 0; i < issue.chapters.length; i++) {
    if (issue.chapters[i].page <= current) index = i;
  }
  const chapter = issue.chapters[index];
  const start = chapter ? chapter.page : 1;
  const next = issue.chapters[index + 1];
  const end = next ? next.page - 1 : issue.pages;
  const title = chapter ? chapter.title : 'Front matter';
  $('chapter').value = start;
  chapterButtons.forEach((button, i) => {
    button.ariaCurrent = i === index ? 'location' : 'false';
    button.style.setProperty('--chapter-progress', i === index ? `${100 * (current - start + 1) / (end - start + 1)}%` : '0%');
  });
  // Scroll only the strip, never the document (including ordinary page turns).
  const active = chapterButtons[index];
  const strip = $('chapter-overview');
  if (active) {
    const bounds = strip.getBoundingClientRect();
    const buttonBounds = active.getBoundingClientRect();
    if (buttonBounds.left < bounds.left + 20) strip.scrollLeft -= bounds.left + 20 - buttonBounds.left;
    else if (buttonBounds.right > bounds.right - 20) strip.scrollLeft += buttonBounds.right - bounds.right + 20;
  }
  updateChapterEdges();
  $('chapter-progress').textContent =
    `${title} · pages ${start}–${end} · ${current - start + 1} of ${end - start + 1}`;
  $('mobile-focus-progress').textContent = `${title} · ${current - start + 1} of ${end - start + 1}`;
}

function renderReading() {
  clearCopyConfirmation();
  const target = $('reading-text');
  target.replaceChildren();
  if (!pageData) return;
  const add = (tag, content, cls, parent = target) => {
    const node = document.createElement(tag);
    node.textContent = content;
    if (cls) node.className = cls;
    parent.append(node);
    return node;
  };
  const study = pageData.study;
  if (study) {
    const metadata = add('header', '', 'study-metadata');
    const label = add('p', `STUDY ${String(study.number).padStart(3, '0')}`, 'metadata', metadata);
    add('span', ` · Page ${current}`, 'study-page', label);
    add('h2', study.title, '', metadata);
    add('p', study.style, 'style-line', metadata);
    const figure = add('figure', '', 'reference-figure');
    const image = add('img', '', 'reference', figure);
    image.src = study.image;
    image.decoding = 'async';
    image.alt = `Reference for Study ${study.number}: ${study.title}`;
    const caption = add('figcaption', '', 'reference-details', figure);
    add('span', 'Source: ' + study.source, 'reference-caption', caption);
    add('span', study.flags, 'reference-flags', caption);
    const promptSection = add('section', '', 'study-section');
    const heading = add('div', '', 'prompt-heading', promptSection);
    const title = document.createElement('h3');
    title.textContent = 'Image Prompt';
    const actions = document.createElement('div');
    actions.className = 'prompt-actions';
    const feedback = document.createElement('span');
    feedback.className = 'copy-feedback';
    feedback.role = 'status';
    feedback.ariaLive = 'polite';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'copy-prompt';
    copy.textContent = 'Copy prompt';
    copy.ariaLabel = 'Copy full image prompt';
    copy.onclick = () => copyPrompt(study.prompt, copy, feedback);
    actions.append(feedback);
    actions.append(copy);
    heading.append(title);
    heading.append(actions);
    add('p', study.prompt, 'copy', promptSection);
    const notes = add('section', '', 'study-section');
    add('h3', 'Working notes', '', notes);
    add('p', study.notes, 'copy', notes);
    const experiment = add('section', '', 'study-section');
    add('h3', 'Try this', '', experiment);
    add('p', study.try_this, 'copy', experiment);
  } else if (current === 1) {
    const cover = add('img', '', 'reference');
    cover.src = 'cover.webp';
    cover.alt = 'Issue 02 cover';
    add('pre', pageData.text);
  } else {
    add('pre', pageData.text);
  }
  updateReaderChrome();
}
function readingMode() {
  const flowing = $('reading-mode').value === 'text';
  document.body.classList.toggle('reading-view', flowing);
  $('reading-text').hidden = !flowing;
  $('page-viewport').hidden = flowing;
  $('text-size-label').hidden = !flowing;
  $('page-zoom-label').hidden = flowing;
  if (flowing) {
    $('text-details').open = false;
    if (!pageData) text();
  }
}
$('reading-mode').value=typeof matchMedia==='function'&&matchMedia('(max-width: 700px)').matches?'text':'page';
$('reading-mode').onchange=readingMode;$('text-size').onchange=()=>{$('reading-text').style.setProperty('--reading-size',$('text-size').value+'px');};
function hashPage(){const match=location.hash.match(/^#page=(\d+)$/);return match?Number(match[1]):current;}
async function text(){const id=request,n=current;try{const r=await fetch(`pages/${String(n).padStart(3,'0')}.json`,{cache:'no-cache'});if(!r.ok)throw Error();const data=await r.json();if(id===request){pageData=data;$('page-text').textContent=data.text||'No extractable text on this page.';renderReading();}}catch(e){if(id===request){$('page-text').textContent='Page text is unavailable. Please use the original PDF.';$('reading-text').textContent='Text could not load. Choose Original page or download the PDF.';}}}
let imageAttempt = 0;
function loadCurrentPageImage(retry = false) {
  const image = $('page-image');
  const pageRequest = request, attempt = ++imageAttempt;
  $('retry-page').hidden = true;
  $('status').textContent = `Loading page ${current}…`;
  setPageLoading(true);
  image.decoding = 'async';
  image.fetchPriority = 'high';
  image.onload = () => {
    if (pageRequest !== request || attempt !== imageAttempt) return;
    setPageLoading(false);
    fadePageImage(image);
    $('status').textContent = `Page ${current} · ${issue.title}`;
    updateReaderChrome();
  };
  image.onerror = () => {
    if (pageRequest !== request || attempt !== imageAttempt) return;
    setPageLoading(false);
    $('status').textContent = 'This page could not load. Refresh or download the PDF.';
    $('retry-page').hidden = false;
    document.querySelector('.reader-status').classList.toggle('has-error', true);
  };
  image.alt = `Issue ${issue.number}, magazine page ${current}`;
  image.src = `pages/${String(current).padStart(3, '0')}.webp${retry ? `?retry=${attempt}` : ''}`;
}
$('retry-page').onclick = () => loadCurrentPageImage(true);

function updateChapterEdges() {
  const strip = $('chapter-overview');
  $('chapter-overview-shell').classList.toggle('more-left', strip.scrollLeft > 2);
  $('chapter-overview-shell').classList.toggle('more-right', strip.scrollWidth - strip.clientWidth - strip.scrollLeft > 2);
}
function updateReaderChrome() {
  syncMobileFocusLayout();
  const rect = $('reader').getBoundingClientRect();
  const visible = rect.top < window.innerHeight && rect.bottom > 0;
  const mobile = matchMedia('(max-width: 700px)').matches;
  document.body.classList.toggle('reader-docked', mobile && visible);
  updateChapterEdges();
}
$('reader-preferences').addEventListener('toggle', () => {
  if ($('reader-preferences').open) updateChapterProgress();
});
$('chapter-overview').addEventListener('scroll', updateChapterEdges, {passive: true});
window.addEventListener('scroll', updateReaderChrome, {passive: true});
window.addEventListener('resize', () => { updateChapterProgress(); updateReaderChrome(); });
if (typeof ResizeObserver === 'function') {
  new ResizeObserver(updateReaderChrome).observe($('reader'));
}

function isEditing(target) {
  return /^(INPUT|SELECT|TEXTAREA)$/.test(target?.tagName) ||
    target?.isContentEditable || Boolean(target?.closest?.('[contenteditable]:not([contenteditable="false"])'));
}
function hasSelection() { return Boolean(window.getSelection?.()?.toString()); }
// Passive touch listeners never block vertical scrolling or pinch zoom. Once a
// gesture turns vertical, it stays cancelled. Zoomed pages keep native panning.
let swipe = null;
const viewport = $('page-viewport');
viewport.addEventListener('touchstart', event => {
  swipe = null;
  if (event.touches.length !== 1 || hasSelection() || isEditing(event.target) ||
      event.target.closest?.('button, a, input, select, textarea') || Number($('zoom').value) > 100) return;
  const point = event.touches[0];
  swipe = {x: point.clientX, y: point.clientY};
}, {passive: true});
viewport.addEventListener('touchmove', event => {
  if (!swipe) return;
  if (event.touches.length !== 1 || hasSelection()) { swipe = null; return; }
  const point = event.touches[0];
  const dx = Math.abs(point.clientX - swipe.x), dy = Math.abs(point.clientY - swipe.y);
  if (dy > 12 && dy >= dx) swipe = null;
}, {passive: true});
viewport.addEventListener('touchend', event => {
  const start = swipe;
  swipe = null;
  if (!start || hasSelection() || event.touches.length || event.changedTouches.length !== 1) return;
  const point = event.changedTouches[0];
  const dx = point.clientX - start.x, dy = point.clientY - start.y;
  if (Math.abs(dx) >= 70 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1));
}, {passive: true});
viewport.addEventListener('touchcancel', () => { swipe = null; }, {passive: true});

function show(n, update = true) {
  current = Math.min(issue.pages, Math.max(1, Number(n) || 1));
  request++;
  const leavingOptions = mobileFocusLayout && $('reader-preferences').contains(document.activeElement);
  if (mobileFocusLayout) $('reader-preferences').open = false;
  clearCopyConfirmation();
  if (pageFade) {
    pageFade.cancel();
    pageFade = null;
  }
  pageData = null;
  $('reading-text').textContent = 'Loading page text…';
  $('page-number').value = current;
  $('current-label').textContent = `Page ${current} of ${issue.pages}`;
  $('status').textContent = `Loading page ${current}…`;
  $('page-text').textContent = 'Loading page text…';

  loadCurrentPageImage();

  for (const name of ['previous', 'previous-bottom']) $(name).disabled = current === 1;
  for (const name of ['next', 'next-bottom']) $(name).disabled = current === issue.pages;
  updateChapterProgress();
  $('focus-context').textContent = `Issue ${issue.number} · ${issue.title} · Page ${current}`;
  updateReaderChrome();
  if (update) history.replaceState(null, '', `#page=${current}`);
  readingMode();
  if (leavingOptions) {
    const target = $('reading-mode').value === 'text' ? $('reading-text') : $('page-viewport');
    target.focus({preventScroll: true});
  }
  if ($('text-details').open && $('reading-mode').value !== 'text') text();
  prefetchAdjacentPages();
}
for(const name of ['previous','previous-bottom'])$(name).onclick=()=>show(current-1);for(const name of ['next','next-bottom'])$(name).onclick=()=>show(current+1);$('page-number').onchange=()=>show($('page-number').value);$('chapter').onchange=()=>show($('chapter').value);$('zoom').onchange=()=>{const holder=document.querySelector('.page-holder');holder.style.width=`${$('zoom').value}%`;holder.style.maxWidth=$('zoom').value==='100'?'950px':'none';};$('text-details').ontoggle=()=>{readingMode();if($('text-details').open&&$('reading-mode').value!=='text')text();};document.addEventListener('keydown', e => {
  if (isEditing(e.target) || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  if (e.key.toLowerCase() === 'f' && !e.repeat) {
    e.preventDefault();
    $('focus-toggle').onclick();
  }
  if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1); }
});
window.addEventListener('hashchange', () => {
  if (!/^#page=\d+$/.test(location.hash)) return;
  const arrivingFromOutside = !$('reader').contains(document.activeElement);
  show(hashPage(), false);
  if (arrivingFromOutside) enterReader();
});
const arrivingViaPageLink = /^#page=\d+$/.test(location.hash);
show(hashPage(), false);
if (arrivingViaPageLink) enterReader();
})();
