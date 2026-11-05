from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
root=Path(__file__).resolve().parent
W,H=1600,1460
im=Image.new('RGB',(W,H),'#f8faf8')
d=ImageDraw.Draw(im)
fontroot='/usr/share/fonts/truetype'
def f(sz,kind='sans'):
    paths={'sans':fontroot+'/lato/Lato-Medium.ttf','bold':fontroot+'/lato/Lato-Heavy.ttf','serif':fontroot+'/dejavu/DejaVuSerif-Bold.ttf','small':fontroot+'/lato/Lato-Bold.ttf'}
    return ImageFont.truetype(paths[kind],sz)
def rounded(box,r,fill,outline=None,width=1):d.rounded_rectangle(box,radius=r,fill=fill,outline=outline,width=width)
def txt(x,y,t,size=18,fill='#1c3d55',kind='sans'):
 d.text((x,y),t,font=f(size,kind),fill=fill)
def cover(path,box,focus=.5):
 a=Image.open(path).convert('RGB'); bw=box[2]-box[0]; bh=box[3]-box[1]; scale=max(bw/a.width,bh/a.height);a=a.resize((round(a.width*scale),round(a.height*scale)),Image.Resampling.LANCZOS); left=max(0,(a.width-bw)//2);top=max(0,round((a.height-bh)*focus));im.paste(a.crop((left,top,left+bw,top+bh)),(box[0],box[1]));
# topbar
rounded((0,0,W,51),0,'#0d4559');txt(90,17,'◆   Rongpur, Silchar, Assam',16,'#f2f8f8');txt(1050,17,'School Code 35669   |   CBSE Affiliation 230354',16,'#d5eaeb')
# hero building original
cover(root/'assets/building.jpeg',(0,51,W,840),.45)
overlay=Image.new('RGBA',(W,789),(0,0,0,0));o=ImageDraw.Draw(overlay)
for x in range(W):
 alpha=int(234-95*(x/W));o.line((x,0,x,789),fill=(5,30,50,alpha))
im.paste(overlay,(0,51),overlay);d=ImageDraw.Draw(im)
# floating header
rounded((54,69,1546,178),34,(250,254,255,244),'#ffffff',2)
logo=Image.open(root/'assets/logo.png').convert('RGBA');logo.thumbnail((125,93));im.paste(logo,(86,76),logo)
txt(220,92,'Red Rose Academy',34,'#17334f','serif');txt(224,143,'S I L C H A R   ·   A S S A M',12,'#a47736','small')
rounded((683,103,761,149),24,'#0d6a75');txt(700,118,'Home',18,'#ffffff','bold')
labels=['About Us','Academics','Facilities','Activities','Gallery','Circulars','Contact']
x=777
for label in labels:
 txt(x,119,label,16,'#17344b','bold');x+=len(label)*8+28
# hero content
rounded((105,270,461,314),25,(22,75,86,200),'#cde6e7',2)
txt(128,283,'LEARNING   ·   GROWTH   ·   COMMUNITY',15,'#eff4f3','small')
txt(105,344,'Red Rose',90,'#ffffff','serif');txt(105,445,'Academy',90,'#ffdc9d','serif');txt(108,555,'Silchar',54,'#ffffff','serif')
rounded((108,633,199,638),2,'#e7c27e');txt(108,670,'A place to learn and grow',27,'#ffffff','serif')
txt(108,721,'Our school is a welcoming place to explore, discover,',18,'#f3f7f6');txt(108,747,'and thrive. Every day brings new ideas and new skills.',18,'#f3f7f6')
rounded((106,794,341,848),28,'#ffda9b');txt(136,811,'Explore Our School   →',18,'#193c56','bold')
# glass notice card
rounded((1081,266,1511,760),35,(247,251,251,238),'#ffffff',2)
rounded((1101,289,1301,335),24,'#0b6574');txt(1131,303,'♧   Notice Board',19,'#ffffff','bold')
rounded((1312,289,1492,335),24,'#ffffff');txt(1337,303,'▤   Circulars',19,'#183d51','bold')
rounded((1101,353,1492,673),24,'#ffffff');txt(1271,416,'♧',39,'#147180')
txt(1163,496,'No notices published yet',22,'#193a53','bold');txt(1156,540,'Official circulars will appear here',16,'#677d8b');txt(1176,569,'when the school publishes them.',16,'#677d8b')
rounded((1102,696,1491,741),26,'#0e6372');txt(1166,708,'View All Notices & Circulars   →',17,'#ffffff','bold')
# quick row
rounded((67,816,1534,933),33,'#f8fcfb','#ffffff',3)
quick=[('♙','About Us'),('▤','Academics'),('⌂','Facilities'),('☆','Activities'),('▧','Gallery'),('☎','Contact Us')]
for i,(ic,label) in enumerate(quick):
 x=99+i*240
 rounded((x,839,x+62,909),20,'#e4f2f2');txt(x+18,855,ic,34,'#0f6f7f');txt(x+73,867,label,18,'#183a51','bold')
# about panel
rounded((0,930,W,H),0,'#fafaf7')
cover(root/'assets/building.jpeg',(100,1034,793,1380),.45)
rounded((100,1034,793,1380),24,None,'#ffffff',9)
rounded((130,1302,474,1356),16,(240,250,249,240));txt(154,1320,'⌂   Red Rose Academy, Silchar',18,'#244457','bold')
txt(856,1045,'●   A B O U T   T H E   S C H O O L',14,'#a77637','bold')
txt(854,1090,'A Place to',49,'#123b55','serif');txt(854,1153,'Learn and Grow',49,'#a97830','serif')
txt(857,1240,'Our school is a welcoming place to explore,',18,'#617783');txt(857,1267,'discover, and thrive. Every day brings new ideas,',18,'#617783');txt(857,1294,'new skills, and new opportunities to grow.',18,'#617783')
rounded((856,1346,1130,1403),25,'#0e6273');txt(887,1365,'Know More About Us   →',18,'#ffffff','bold')
out=root/'preview.png';im.save(out,optimize=True)
print('Saved',out,out.stat().st_size)
# mobile: show scaled layout simple realistic
wm,hm=430,1040
mob=Image.new('RGB',(wm,hm),'#fbf9f6');md=ImageDraw.Draw(mob)
def mt(x,y,text,size,color,kind='sans'):md.text((x,y),text,font=f(size,kind),fill=color)
md.rectangle((0,0,wm,40),fill='#0d4559');mt(17,13,'Red Rose Academy  ·  Silchar, Assam',13,'#e9f4f4')
md.rounded_rectangle((11,48,419,131),18,fill='#fdfefd');logo2=Image.open(root/'assets/logo.png').convert('RGBA');logo2.thumbnail((80,76));mob.paste(logo2,(29,50),logo2);mt(114,71,'Red Rose Academy',22,'#123d55','serif');mt(116,104,'S I L C H A R',10,'#a97830','bold')
cover1=Image.open(root/'assets/building.jpeg').convert('RGB').resize((wm,610));mob.paste(cover1,(0,134))
ov=Image.new('RGBA',(wm,610),(5,25,42,185));mob.paste(ov,(0,134),ov);md=ImageDraw.Draw(mob)
md.rounded_rectangle((25,159,342,191),15,fill='#1b5867');mt(43,168,'LEARNING · GROWTH · COMMUNITY',12,'#f5f5f5','bold')
mt(25,224,'Red Rose',47,'#ffffff','serif');mt(25,281,'Academy',47,'#f2cc87','serif');mt(26,349,'Silchar',31,'#ffffff','serif');mt(26,397,'A place to learn and grow',22,'#ffffff','serif');mt(26,445,'Our school is a welcoming place',15,'#f2f5f6');mt(26,468,'to explore, discover, and thrive.',15,'#f2f5f6')
md.rounded_rectangle((26,518,230,562),22,fill='#f5ce90');mt(43,532,'Explore Our School →',14,'#1d3b51','bold')
md.rounded_rectangle((18,606,412,894),24,fill='#f3faf9');md.rounded_rectangle((34,622,225,667),20,fill='#0b6271');mt(53,633,'♧ Notice Board',16,'#fff','bold');mt(250,636,'Circulars',16,'#164257','bold');mt(96,739,'No notices published yet',17,'#163d55','bold');mt(95,776,'Circulars appear here when',13,'#566b75');mt(118,797,'published by the admin.',13,'#566b75');md.rounded_rectangle((34,837,396,879),22,fill='#0c6171');mt(91,850,'View All Notices & Circulars →',14,'#fff','bold')
md.rounded_rectangle((14,907,416,1025),23,fill='#ffffff');q2=['About Us','Academics','Facilities','Activities','Gallery','Contact Us']
for i,l in enumerate(q2): mt(30+(i%2)*200,928+(i//2)*32,'◆ '+l,14,'#133c54','bold')
mob.save(root/'mobile-preview.png',optimize=True)
