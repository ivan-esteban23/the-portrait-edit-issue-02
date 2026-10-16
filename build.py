from pathlib import Path
import argparse, hashlib, json
import pymupdf
from PIL import Image
p=argparse.ArgumentParser(); p.add_argument('--pdf', required=True); p.add_argument('--layout', required=True); a=p.parse_args()
root=Path(__file__).resolve().parent
config=json.loads((root/'issue.json').read_text())
source=Path(a.pdf); doc=pymupdf.open(source)
assert len(doc)==config['pages']
layout=json.loads(Path(a.layout).read_text())
assert hashlib.sha256(source.read_bytes()).hexdigest()==layout['pdf_sha256']
studies={page:int(n) for n,page in layout['study_pages'].items()}
(root/'docs'/'references').mkdir(parents=True,exist_ok=True)
dist=root/'docs'; (dist/'pages').mkdir(parents=True,exist_ok=True)
for i,page in enumerate(doc):
    pix=page.get_pixmap(matrix=pymupdf.Matrix(2,2),alpha=False)
    image=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
    image.save(dist/'pages'/f'{i+1:03}.webp',quality=88,method=4)
    data={'text':page.get_text()}
    if i+1 in studies:
        boxes={box['kind']:box['text'] for box in layout['text_boxes'] if box['page']==i+1 and box['kind']!='label'}
        image_info=next(im for im in layout['images'] if im['page']==i+1)
        extracted=doc.extract_image(page.get_image_info(xrefs=True)[0]['xref'])
        image_name=hashlib.sha256(extracted['image']).hexdigest()+'.'+extracted['ext']
        (dist/'references'/image_name).write_bytes(extracted['image'])
        flags=next(box['text'] for box in layout['text_boxes'] if box['page']==i+1 and box['kind']=='label' and box['text'].startswith('Rights check'))
        data['study']={'number':studies[i+1],'title':boxes['study title'],'prompt':boxes['prompt'],'notes':boxes['working notes'],'try_this':boxes['try this'],'style':boxes['style'],'source':image_info['source'],'image':'references/'+image_name,'flags':flags}
    (dist/'pages'/f'{i+1:03}.json').write_text(json.dumps(data,ensure_ascii=False))
    if i==0:
        image.thumbnail((480,640)); image.save(dist/'cover.webp',quality=90)
    if (i+1)%25==0: print(f"Rendered {i+1}/{len(doc)}",flush=True)
chapters=[{'title':title,'page':page} for level,title,page in doc.get_toc() if level==1]
config['chapters']=chapters
config['sha256']=hashlib.sha256(source.read_bytes()).hexdigest()
config['pdf_bytes']=source.stat().st_size
(dist/'issue.json').write_text(json.dumps(config,ensure_ascii=False,indent=2)+'\n')
(dist/'.nojekyll').touch()
print(f"Built {len(doc)} pages; {sum(f.stat().st_size for f in dist.rglob('*') if f.is_file()):,} website bytes",flush=True)
