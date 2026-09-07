"""Rebuild the placeholder bank. Replace data/questions.json with the real PDF bank later."""
import json, pathlib, struct, zlib
root = pathlib.Path(__file__).resolve().parent.parent
existing = root / 'data/questions.json'
if existing.exists() and any(not q['id'].startswith('demo-') for q in json.loads(existing.read_text())):
    raise SystemExit('Odmowa: questions.json zawiera właściwą bazę pytań. Generator demo nie może jej nadpisać.')
bank=[]
def add(text,answer,wrong,explanation,category,image=None):
    idx=len(bank); options=[str(answer), *map(str,wrong)]; shift=idx%3; options=options[shift:]+options[:shift]
    item=dict(id=f'demo-{idx+1:03d}',category=category,text=text,options=options,correctAnswer=options.index(str(answer)),explanation=explanation)
    if image: item['image']=image
    bank.append(item)
for n in range(1,51):
    a=n+3;b=(n%9)+2
    add(f'Ile wynosi {a} + {b} × 2?', a+b*2,[(a+b)*2,a+b*2+1],f'Najpierw mnożenie: {b} × 2 = {b*2}. Następnie {a} + {b*2} = {a+b*2}.','Kolejność działań')
for n in range(1,51):
    step=n%7+2; start=n*3
    add(f'Jaka liczba jest następna w ciągu: {start}, {start+step}, {start+2*step}, …?',start+3*step,[start+3*step+1,start+4*step],f'Każda kolejna liczba jest większa o {step}. Zatem {start+2*step} + {step} = {start+3*step}.','Logika')
for n in range(1,51):
    a=n+4;b=n%8+2
    add(f'Prostokąt ma boki {a} cm i {b} cm. Ile wynosi jego obwód?',f'{2*(a+b)} cm',[f'{2*(a+b)+2} cm',f'{a+b} cm'],f'Obwód to suma wszystkich boków: 2 × ({a} + {b}) = {2*(a+b)} cm.','Geometria')
for n in range(1,51):
    a=n%9+2;b=n//9+2; value=a*b
    name=f'grid-{a}-{b}.svg'
    cells=''.join(f'<rect x="{(640-a*24)/2+x*24}" y="{(240-b*24)/2+y*24}" width="19" height="19" rx="3" fill="#288875"/>' for x in range(a) for y in range(b))
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="260" viewBox="0 0 640 260"><rect width="640" height="260" fill="#f1f7f6"/>{cells}</svg>'
    (root/'public/questions'/name).write_text(svg)
    add('Ile kwadratów znajduje się na ilustracji?',value,[value+a,value-1],f'Na ilustracji jest {b} rzędów po {a} kwadratów: {b} × {a} = {value}.','Pytanie z obrazkiem',dict(src='/questions/'+name,alt=f'Układ kwadratów: {b} rzędów, w każdym po {a} elementów.'))
(root/'data/questions.json').write_text(json.dumps(bank,ensure_ascii=False,indent=2)+'\n')
# A geometric P monogram, kept well within the maskable safe zone.
for size,name in [(192,'icon-192.png'),(512,'icon-512.png'),(180,'apple-touch-icon.png')]:
    rows=[]
    for y in range(size):
        row=bytearray()
        for x in range(size):
            u=x/size;v=y/size
            ink=(.30<u<.41 and .25<v<.76) or (.40<u<.66 and .25<v<.36) or (.40<u<.66 and .46<v<.57) or (.60<u<.71 and .31<v<.51)
            row.extend((124,224,195) if ink else (17,43,54))
        rows.append(b'\x00'+row)
    def chunk(t,d): return struct.pack('!I',len(d))+t+d+struct.pack('!I',zlib.crc32(t+d)&0xffffffff)
    png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows)))+chunk(b'IEND',b'')
    (root/'public/icons'/name).write_bytes(png)
print(f'Generated {len(bank)} demo questions; {sum("image" in q for q in bank)} with images.')
