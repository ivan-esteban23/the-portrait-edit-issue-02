"""Check actual reader markup after restructuring, using the standard library."""
from html.parser import HTMLParser
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent

class Markup(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.nodes = []
        self.ids = {}
        self.stack = []
        self.feed(text)
        assert not self.stack, 'Unclosed markup'

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        node = {'tag': tag, 'attrs': attrs, 'ancestors': list(self.stack)}
        self.nodes.append(node)
        if 'id' in attrs:
            assert attrs['id'] not in self.ids, f'Duplicate ID: {attrs["id"]}'
            self.ids[attrs['id']] = node
        if tag not in {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}:
            self.stack.append(node)

    def handle_endtag(self, tag):
        assert self.stack and self.stack[-1]['tag'] == tag, f'Misnested closing {tag}'
        self.stack.pop()

html = (ROOT / 'docs/index.html').read_text()
reader = (ROOT / 'docs/reader.js').read_text()
page = Markup(html)
for target in set(re.findall(r"\$\('([^']+)'\)", reader)) | {
    'previous', 'previous-bottom', 'next', 'next-bottom', 'other-issue-card', 'footer-issue-01',
}:
    assert target in page.ids, f'Missing reader target: {target}'

def has_class(node, name):
    return name in node['attrs'].get('class', '').split()

def inside(node, ancestor):
    return any(parent is ancestor for parent in node['ancestors'])

toolbars = [node for node in page.nodes if has_class(node, 'toolbar')]
assert len(toolbars) == 1, 'One sticky toolbar'
toolbar = toolbars[0]
for target in ['chapter', 'page-number', 'zoom', 'focus-toggle', 'chapter-progress', 'focus-context']:
    assert inside(page.ids[target], toolbar), target
preferences = page.ids['reader-preferences']
assert preferences['tag'] == 'details' and 'open' not in preferences['attrs']
assert inside(preferences, toolbar)
for target in ['reading-mode', 'text-size']:
    assert inside(page.ids[target], preferences), target
assert any(node['tag'] == 'summary' and inside(node, preferences) for node in page.nodes)
for target in ['retry-page', 'status', 'keys-hint', 'page-viewport', 'reading-text', 'bottom-controls', 'text-details']:
    assert inside(page.ids[target], page.ids['reader']), target
assert page.nodes.index(page.ids['status']) < page.nodes.index(page.ids['reading-text'])
assert not inside(page.ids['other-issue-card'], page.ids['reader'])
assert page.nodes.index(page.ids['other-issue-card']) > page.nodes.index(page.ids['bottom-controls'])
assert inside(page.ids['mobile-focus-progress'], toolbar)
assert 'hidden' in page.ids['mobile-focus-options']['attrs']
assert page.nodes.index(page.ids['mobile-focus-options']) > page.nodes.index(page.ids['bottom-controls'])
assert inside(page.ids['reader-preferences-summary'], preferences)
assert page.ids['page-image']['attrs']['fetchpriority'] == 'high'
assert page.ids['focus-toggle']['attrs']['aria-keyshortcuts'] == 'F'
assert page.ids['download']['attrs']['href'].endswith('/noir-editorial-1/The_Portrait_Edit_Issue_02.pdf')
assert all(node['attrs'].get('src', '').startswith('reader.js?v=mobile-focus-1') for node in page.nodes if node['tag'] == 'script')
for node in page.nodes:
    if node['tag'] in {'input', 'select'}:
        assert 'aria-label' in node['attrs'] or any(parent['tag'] == 'label' for parent in node['ancestors']), 'Named form control'
print('PASS: semantic markup, reader targets, one toolbar, native preferences disclosure, retained control labels, status before stage, archive after reader and PDF link.')
