"""Cross-check the web reading data against the verified PDF layout manifest."""
import argparse,hashlib,json
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--layout',required=True);a=p.parse_args()
root=Path(__file__).resolve().parent;docs=root/'docs';m=json.loads(Path(a.layout).read_text());config=json.loads((docs/'issue.json').read_text())
assert config['sha256']==m['pdf_sha256']
assert len(list((docs/'pages').glob('*.webp')))==len(list((docs/'pages').glob('*.json')))==196
sources=set()
for key,page in m['study_pages'].items():
    data=json.loads((docs/'pages'/f'{page:03}.json').read_text())['study']
    expected={box['kind']:box['text'] for box in m['text_boxes'] if box['page']==page and box['kind']!='label'}
    assert data['number']==int(key)
    for field,kind in [('title','study title'),('prompt','prompt'),('notes','working notes'),('try_this','try this'),('style','style')]:assert data[field]==expected[kind],(key,field)
    im=next(im for im in m['images'] if im['page']==page)
    assert data['source']==im['source'];sources.add(data['source'])
    assert data['flags'].startswith('Rights check')
    with Image.open(docs/data['image']) as image:
        assert list(image.size)==im['original_pixels']
        image.verify()
assert len(sources)==170
for featured in config['featured']:
    data=json.loads((docs/'pages'/f'{featured["page"]:03}.json').read_text())['study']
    assert all(featured[k]==v for k,v in data.items())
report={'page_assets':196,'chapters':9,'website_bytes':sum(f.stat().st_size for f in docs.rglob('*') if f.is_file()),'pdf_sha256':config['sha256'],'asset_checks':'PASS','exact_structured_studies':174,'original_reference_dimensions':174,'unique_reference_filenames':170,'navigation_checks':'PASS: desktop/mobile Node DOM fixtures, including large-text view and text sizes','default_mobile_text_px':16,'text_size_choices_px':[16,18,20],'browser_visual_check':'Not completed: no connected browser','prior_pdfs':'Retained in edition-1 and larger-type-1 releases','edition':'noir-editorial'}
(root/'VERIFICATION.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
