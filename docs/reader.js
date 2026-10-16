"use strict";
(async()=>{
const $=id=>document.getElementById(id);let issue,current=1,request=0,pageData=null,pageFade=null,copyResetTimer=null;
// Restore Focus mode before the issue metadata request completes.
const focusStorageKey = 'portrait-edit-focus-mode';
let focusMode = false;
try {
  focusMode = localStorage.getItem(focusStorageKey) === 'true';
} catch (_) {}
function setFocusMode(enabled, persist = false) {
  focusMode = enabled;
  document.body.classList.toggle('focus-mode', enabled);
  $('focus-toggle').ariaPressed = String(enabled);
  $('focus-toggle').textContent = enabled ? 'Exit Focus' : 'Focus';
  if (persist) {
    try { localStorage.setItem(focusStorageKey, String(enabled)); } catch (_) {}
  }
}
setFocusMode(focusMode);
$('focus-toggle').onclick = () => {
  setFocusMode(!focusMode, true);
  $('reader').scrollIntoView({behavior: 'instant', block: 'start'});
};

try{const response=await fetch('issue.json',{cache:'no-cache'});if(!response.ok)throw Error('Issue metadata unavailable');issue=await response.json();}catch(e){$('status').textContent='The reader could not load. Please refresh or use the PDF download.';return;}
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

async function copyPrompt(prompt, button, feedback) {
  clearCopyConfirmation();
  const copyRequest = request;
  button.disabled = true;
  button.textContent = 'Copying…';
  feedback.textContent = '';
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      throw new Error('Clipboard unavailable');
    }
    await navigator.clipboard.writeText(prompt);
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
  }
}

function setPageLoading(loading) {
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
  });
  $('chapter-progress').textContent =
    `${title} · pages ${start}–${end} · ${current - start + 1} of ${end - start + 1}`;
}

function renderReading() {
  clearCopyConfirmation();
  const target = $('reading-text');
  target.replaceChildren();
  if (!pageData) return;
  const add = (tag, content, cls) => {
    const node = document.createElement(tag);
    node.textContent = content;
    if (cls) node.className = cls;
    target.append(node);
    return node;
  };
  const study = pageData.study;
  if (study) {
    add('p', `STUDY ${String(study.number).padStart(3, '0')} · Page ${current}`, 'metadata');
    add('h2', study.title);
    add('p', study.flags, 'metadata');
    const image = add('img', '', 'reference');
    image.src = study.image;
    image.alt = `Reference for Study ${study.number}: ${study.title}`;
    add('p', 'Source: ' + study.source, 'metadata');
    add('p', study.style, 'style-line');

    const heading = add('div', '', 'prompt-heading');
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
    add('p', study.prompt, 'copy');
    add('h3', 'Working notes');
    add('p', study.notes, 'copy');
    add('p', study.try_this, 'copy');
  } else if (current === 1) {
    const cover = add('img', '', 'reference');
    cover.src = 'cover.webp';
    cover.alt = 'Issue 02 cover';
    add('pre', pageData.text);
  } else {
    add('pre', pageData.text);
  }
}
function readingMode(){const large=$('reading-mode').value==='text';$('reading-text').hidden=!large;document.querySelector('.page-viewport').hidden=large;$('text-size-label').hidden=!large;$('page-zoom-label').hidden=large;if(large&&!pageData)text();}
$('reading-mode').value=typeof matchMedia==='function'&&matchMedia('(max-width: 700px)').matches?'text':'page';
$('reading-mode').onchange=readingMode;$('text-size').onchange=()=>{$('reading-text').style.setProperty('--reading-size',$('text-size').value+'px');};
function hashPage(){const match=location.hash.match(/^#page=(\d+)$/);return match?Number(match[1]):current;}
async function text(){const id=request,n=current;try{const r=await fetch(`pages/${String(n).padStart(3,'0')}.json`,{cache:'no-cache'});if(!r.ok)throw Error();const data=await r.json();if(id===request){pageData=data;$('page-text').textContent=data.text||'No extractable text on this page.';renderReading();}}catch(e){if(id===request){$('page-text').textContent='Page text is unavailable. Please use the original PDF.';$('reading-text').textContent='Text could not load. Choose Original page or download the PDF.';}}}
function show(n, update = true) {
  current = Math.min(issue.pages, Math.max(1, Number(n) || 1));
  request++;
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

  const image = $('page-image');
  const id = request;
  setPageLoading(true);
  image.onload = () => {
    if (id !== request) return;
    setPageLoading(false);
    fadePageImage(image);
    $('status').textContent = `Page ${current} · ${issue.title}`;
  };
  image.onerror = () => {
    if (id !== request) return;
    setPageLoading(false);
    $('status').textContent = 'This page could not load. Refresh or download the PDF.';
  };
  image.alt = `Issue ${issue.number}, magazine page ${current}`;
  image.src = `pages/${String(current).padStart(3, '0')}.webp`;

  for (const name of ['previous', 'previous-bottom']) $(name).disabled = current === 1;
  for (const name of ['next', 'next-bottom']) $(name).disabled = current === issue.pages;
  updateChapterProgress();
  if (update) history.replaceState(null, '', `#page=${current}`);
  readingMode();
  if ($('text-details').open && $('reading-mode').value !== 'text') text();
  prefetchAdjacentPages();
}
for(const name of ['previous','previous-bottom'])$(name).onclick=()=>show(current-1);for(const name of ['next','next-bottom'])$(name).onclick=()=>show(current+1);$('page-number').onchange=()=>show($('page-number').value);$('chapter').onchange=()=>show($('chapter').value);$('zoom').onchange=()=>{const holder=document.querySelector('.page-holder');holder.style.width=`${$('zoom').value}%`;holder.style.maxWidth=$('zoom').value==='100'?'950px':'none';};$('text-details').ontoggle=()=>{readingMode();if($('text-details').open&&$('reading-mode').value!=='text')text();};document.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.altKey||e.ctrlKey||e.metaKey)return;if(e.key==='ArrowRight'){e.preventDefault();show(current+1);}if(e.key==='ArrowLeft'){e.preventDefault();show(current-1);}});window.addEventListener('hashchange', () => {
  if (!/^#page=\d+$/.test(location.hash)) return;
  const arrivingFromOutside = !$('reader').contains(document.activeElement);
  show(hashPage(), false);
  if (arrivingFromOutside) enterReader();
});
const arrivingViaPageLink = /^#page=\d+$/.test(location.hash);
show(hashPage(), false);
if (arrivingViaPageLink) enterReader();
})();
