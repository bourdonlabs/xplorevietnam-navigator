"""Assemble pages: src/pages/*.html + partials -> dist/ (full HTML documents, served as-is by Vercel)."""
import re, os, glob, shutil
ROOT=os.path.dirname(os.path.abspath(__file__)); SRC=ROOT+'/src'; DIST=ROOT+'/dist'
FONTS='<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700&family=Inter:wght@400;500&family=Inter+Tight:wght@300;400;500;600&display=swap">'
DESCRIPTION='Visas, residence cards, business setup and relocation support for people moving to Vietnam. Plan your move for free with XploreVietnam Navigator.'
def part(name): return open(f'{SRC}/partials/{name}.html').read()
REVIEWS=[
    {'name':'Kristin Forbes','date':'January 2025','photo':'img/reviews/kristin-forbes.jpg','avatar':'img/reviews/kristin-forbes-avatar.jpg','flag':'ca',
     'text':'XploreVietnam does not only offer you a TESOL / TEFL certificate and a new set of skills but they also kick start you on an awesome experience that you will keep with you for the rest of your life.'},
    {'name':'Abed Mahsen','date':'March 2026','photo':'img/reviews/abed-mahsen.jpg','avatar':'img/reviews/abed-mahsen-avatar.jpg','flag':'eg','note':'Received a thank-you incentive for this review.',
     'text':'I had overstayed my visa in Vietnam and had no idea how to fix the situation without making things worse. XploreVietnam explained the process clearly, told me exactly what documents I needed, and handled the case step by step. Communication was fast, professional, and reassuring throughout. In the end, I was able to resolve the overstay and leave Vietnam properly. I’d definitely recommend XploreVietnam to anyone facing a similar immigration issue.'},
    {'name':'Gustav Helverskov','date':'January 2026','photo':'img/reviews/gustav-helverskov.jpg','avatar':'img/reviews/gustav-helverskov-avatar.jpg','flag':'dk',
     'text':'Vietnam has been an amazing place for me both personally and professionally. I’ve worked as an actor, model, and teacher here, and XploreVietnam helped make the transition much easier. Whenever I had questions about living and working in Vietnam, I had someone I could rely on for clear answers and practical support. It took a lot of stress out of the process and let me focus on building my life here.'},
    {'name':'Joyce Dunbar','date':'February 2026','photo':'img/reviews/joyce-dunbar.jpg','avatar':'img/reviews/joyce-dunbar-avatar.jpg','flag':'us',
     'text':'I expected relocating to Vietnam for retirement to be complicated, but XploreVietnam made the whole process incredibly smooth. They guided me through the visa requirements, paperwork, and practical steps, and I always knew what needed to happen next. It took a huge amount of stress out of the move.'},
    {'name':'Thomas, Sarah and Linda','date':'December 2025','photo':'img/reviews/thomas-sarah-linda.jpg','avatar':'img/reviews/thomas-sarah-linda-avatar.jpg','flag':'ca',
     'text':'XploreVietnam made the whole family visa process much easier than we expected. They gave us clear guidance from the start, helped us understand what documents we needed, and saved us a huge amount of time and stress.'},
    {'name':'Mārcis Roziņš','date':'February 2024','photo':'img/reviews/marcis-rozins.jpg','avatar':'img/reviews/marcis-rozins-avatar.jpg','flag':'lv',
     'text':'Relocating to Vietnam came with a lot of questions, but XploreVietnam made the process straightforward and easy to understand.'},
]
FLAGS={
 'ca':('Canada','<svg viewBox="0 0 9600 4800" preserveAspectRatio="none"><path fill="#D52B1E" d="M0 0h2400l99 99h4602l99-99h2400v4800H7200l-99-99H2499l-99 99H0z"/><path fill="#fff" d="M2400 0h4800v4800H2400zm2490 4430-45-863a95 95 0 0 1 111-98l859 151-116-320a65 65 0 0 1 20-73l941-762-212-99a65 65 0 0 1-34-79l186-572-542 115a65 65 0 0 1-73-38l-105-247-423 454a65 65 0 0 1-111-57l204-1052-327 189a65 65 0 0 1-91-27l-332-652-332 652a65 65 0 0 1-91 27l-327-189 204 1052a65 65 0 0 1-111 57l-423-454-105 247a65 65 0 0 1-73 38l-542-115 186 572a65 65 0 0 1-34 79l-212 99 941 762a65 65 0 0 1 20 73l-116 320 859-151a95 95 0 0 1 111 98l-45 863z"/></svg>'),
 'eg':('Egypt','<svg viewBox="0 0 30 20" preserveAspectRatio="none"><path fill="#CE1126" d="M0 0h30v6.67H0z"/><path fill="#fff" d="M0 6.67h30v6.66H0z"/><path d="M0 13.33h30V20H0z"/><path fill="#C09300" d="M15 7.3c-.9 0-1.3.6-1.3 1.2v2.4l-1.8-1.1.3 2.1 2.8.9 2.8-.9.3-2.1-1.8 1.1V8.5c0-.6-.4-1.2-1.3-1.2z"/></svg>'),
 'us':('USA','<svg viewBox="0 0 7410 3900" preserveAspectRatio="none"><path fill="#B22234" d="M0 0h7410v3900H0z"/><path stroke="#fff" stroke-width="300" d="M0 450h7410M0 1050h7410M0 1650h7410M0 2250h7410M0 2850h7410M0 3450h7410"/><path fill="#3C3B6E" d="M0 0h2964v2100H0z"/><g fill="#fff"><circle cx="494" cy="420" r="120"/><circle cx="1482" cy="420" r="120"/><circle cx="2470" cy="420" r="120"/><circle cx="988" cy="1050" r="120"/><circle cx="1976" cy="1050" r="120"/><circle cx="494" cy="1680" r="120"/><circle cx="1482" cy="1680" r="120"/><circle cx="2470" cy="1680" r="120"/></g></svg>'),
 'dk':('Denmark','<svg viewBox="0 0 37 28" preserveAspectRatio="none"><path fill="#C8102E" d="M0 0h37v28H0z"/><path fill="#fff" d="M12 0h4v28h-4zM0 12h37v4H0z"/></svg>'),
 'lv':('Latvia','<svg viewBox="0 0 20 10" preserveAspectRatio="none"><path fill="#9E3039" d="M0 0h20v10H0z"/><path fill="#fff" d="M0 4h20v2H0z"/></svg>'),
}
def flag(code):
    n,svg=FLAGS[code]; return f'<span class="t-flag" role="img" aria-label="{n}" title="{n}">{svg}</span>'
def review_cols(n=6):
    out=[]
    for i in range(n):
        rev=' rev' if i%2==0 else ''
        if i<len(REVIEWS):
            r=REVIEWS[i]
            out.append(f'''      <div class="t-col{rev}"><div class="t-photo" role="img" aria-label="{r['name']}" style="background:#C9D2DC url({r['photo']}) 50% 50%/cover no-repeat"></div><div class="t-card"><div class="t-who"><img class="t-av" src="{r['avatar']}" alt="" width="38" height="38"><h4>{r['name']}</h4>{flag(r['flag']) if r.get('flag') else ''}</div><p>“{r['text']}”</p><h6>{r['date']}</h6>{'<small class="t-note">'+r['note']+'</small>' if r.get('note') else ''}</div></div>''')
        else:
            out.append(f'''      <div class="t-col{rev}"><div class="t-photo ph" data-ph="Client photo · 1:1"></div><div class="t-card"><div class="t-who"><div class="t-av ph"></div><h4>Client name</h4></div><p>“Placeholder for review {i+1}. Paste a real client review here, two to four sentences long, so it fits the card the same way.”</p><h6>Month YYYY</h6></div></div>''')
    return '\n'.join(out)
def members(roles,cls=''):
    return '\n'.join(f'      <div class="member"><div class="m-photo ph" data-ph="Photo · 1:1"></div><h3>Team member</h3><p>{r}</p></div>' for r in roles)
import sys; sys.path.insert(0, SRC+'/data')
import services as SV
CHECK='{{i:check ck}}'
def svc_tabs():
    btns=''.join(f'<button type="button" class="s-tab{" is-active" if i==0 else ""}" data-tab="svc:{t["id"]}" aria-selected="{"true" if i==0 else "false"}">{t["tab"]}</button>' for i,t in enumerate(SV.TABS))
    out=[f'  <section class="s-tabs" id="packages"><div class="s-tab-row" role="tablist">{btns}</div>']
    for i,t in enumerate(SV.TABS):
        if t.get('single'):
            o=t['single']; pts=''.join(f'<li><i></i>{x}</li>' for x in o['points'])
            out.append(f'''  <div class="s-panel" data-panel="svc:{t["id"]}"{'' if i==0 else ' hidden'}>
    <div class="s-head">
      <div class="split s70"><div class="l"><h2 class="sub">{t["title"]}</h2></div><div class="r"><h3 class="lead">{t["note"]}</h3></div></div>
      <div class="one-card">
        <div class="one-l">
          <h3>{o["name"]}</h3>
          <p class="amt">{o["price"]}</p>
          <p>{o["desc"]}</p>
          <ul class="s-pay"><li>{{{{i:info}}}}Payment due in full at booking</li></ul>
          <div class="s-actions"><a class="btn-line" href="cart.html">Book a Case Review <svg class="arr"><use href="#i-arr"/></svg></a><a class="s-ask" href="get-started.html">Have questions? Talk to an expert.</a></div>
        </div>
        <ul class="one-list">{pts}</ul>
      </div>
      <p class="s-fine one-fine">*{o["fine"]}</p>
    </div>
  </div>''')
            continue
        cards=[]
        for p in t['packages']:
            badge=f'<div class="s-badge">{p["badge"]}</div>' if p.get('badge') else ''
            fees=''.join(f'<span>{f}</span>' for f in p['fees'])
            dep=f'<div class="s-fees dep">{"".join(f"<span>{d}</span>" for d in p["dep"])}</div>' if p.get('dep') else ''
            cards.append(f'''      <div class="s-pkg{' has-badge' if badge else ''}">{badge}<div class="s-card">
        <div class="s-top">
          <h3>{p["name"]}</h3>
          <p class="s-desc">{p["desc"]}</p>
          <div class="s-price"><b>{p["price"]}</b><small>/total</small></div>
          <div class="s-fees">{fees}</div>{dep}
          <div class="s-div"></div>
          <label class="s-lab" for="dep-{t["id"]}-{len(cards)}">Dependents</label>
          <select id="dep-{t["id"]}-{len(cards)}"><option>None</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select>
          <ul class="s-pay"><li>{{{{i:info}}}}Pay 70% at booking</li><li>{{{{i:info}}}}Pay 30% after your application is submitted</li></ul>
          <div class="s-div"></div>
          <p class="s-fine">*Government fees are passed through at cost and paid to the relevant Vietnamese authority. You would pay these whoever handles your case. Other providers may add them on top of their quote; we show them upfront.</p>
          <p class="s-get"><b>You get:</b> {p["get"]}<br><br><b>Best for:</b> {p["best"]}</p>
        </div>
        <div class="s-actions"><a class="btn-line" href="cart.html">Add to Cart <svg class="arr"><use href="#i-arr"/></svg></a><a class="s-ask" href="get-started.html">Have questions? Talk to an expert.</a></div>
      </div></div>''')
        rows=''.join(f'<div class="t-row"><div class="t-f">{f}</div>'+''.join(f'<div class="t-c">{CHECK if x else "{{i:dash dsh}}"}</div>' for x in inc)+'</div>' for f,inc in SV.FEATURES)
        names=[p['name'].replace('<br>',' ') for p in t['packages']]
        prices=''.join(f'<div class="t-c"><b>{p["price"]}</b></div>' for p in t['packages'])
        out.append(f'''  <div class="s-panel" data-panel="svc:{t["id"]}"{'' if i==0 else ' hidden'}>
    <div class="s-head">
      <div class="split s70"><div class="l"><h2 class="sub">{t["title"]}</h2></div><div class="r"><h3 class="lead">{t["note"]}</h3><a class="btn-orange sm" href="#compare-{t["id"]}">Compare Packages <svg class="arr"><use href="#i-arr"/></svg></a></div></div>
      <div class="s-cards">
{chr(10).join(cards)}
      </div>
      <p class="s-foot">*Please note that our fee does not include 1) costs of obtaining documents in your home country, and 2) government fees that change after booking. We confirm all government fees with you before we file.</p>
    </div>
    <div class="s-compare" id="compare-{t["id"]}">
      <div class="split w40"><div class="l"><h2 class="sub dk">How our packages stack up.</h2></div><div class="r"><h3 class="lead">Compare all packages. A high-level view across all service tiers.</h3></div></div>
      <div class="table-wrap"><div class="c-table">
        <div class="t-head"><div class="t-f"></div><div class="t-c">{names[0]}</div><div class="t-c">{names[1]}</div><div class="t-c hl">{names[2]}</div></div>
        {rows}
        <div class="t-row price"><div class="t-f"></div>{prices}</div>
        <div class="t-hl" aria-hidden="true"><span>Full Service</span></div>
      </div></div>
    </div>
  </div>''')
    out.append('  </section>')
    return '\n'.join(out)
def faqs():
    return '\n'.join(f'      <details{" open" if i==0 else ""}><summary>{q}</summary><div class="faq-b">{a}</div></details>' for i,(q,a) in enumerate(SV.FAQS))

RL_ROWS=[("Visa application preparation and review",[1,1,1]),("Document legalisation and translation guidance",[1,1,1]),("In-person support at the immigration office",[1,1,1]),
 ("XploreVietnam client tracker",[1,1,1]),("Connections to XploreVietnam’s partner network",[1,1,1]),("Comprehensive relocation guides on shipping, pet relocation, housing, and more",[1,1,1]),
 ("Vietnam cost of living guide",[1,1,1]),("Vietnamese tax code (MST)",['o','o',1]),("Vietnamese bank account",['o','o',1]),("Driving licence conversion",['o','o',1]),
 ("Rental search support",[0,1,1]),("Dedicated relocation specialist",[0,1,1]),("Four 30-minute one-on-one coaching calls",[0,1,1]),("Unlimited coaching calls",[0,0,1]),
 ("Utilities set-up (electric, water, internet, phone)",[0,0,1]),("Airport pickup",[0,0,1]),("Medical planning support",[0,0,1]),("Temporary residence registration",[0,0,1]),("Access to Concierge WhatsApp line",[0,0,1])]
def rl_rows():
    cell=lambda x: '{{i:check ck}}' if x==1 else ('optional' if x=='o' else '{{i:dash dsh}}')
    return '\n'.join('      <div class="t-row"><div class="t-f">'+f+'</div>'+''.join(f'<div class="t-c">{cell(x)}</div>' for x in inc)+'</div>' for f,inc in RL_ROWS)
RL_FAQS=[
 ("Is Vietnam a good place to live for expats?","Yes, for many people. Vietnam offers a low cost of living, a warm climate, great food and fast-growing cities with large expat communities. Paperwork, traffic and air quality in the big cities take some getting used to, and the rules change often. Going in with a realistic picture of both the advantages and the friction points makes a considerable difference."),
 ("What visas are available for moving to Vietnam?","Most people start on an e-visa, which citizens of every country can apply for online, valid for up to 90 days with single or multiple entry. To live here long-term, you usually need a work visa with a work permit, an investor visa or a family visa, each of which can lead to a Temporary Residence Card (TRC). See our <a href=\"visas.html\">visa guide</a> for the details."),
 ("How long can I stay on a Temporary Residence Card?","It depends on your visa category. Cards for employees usually match your work permit, for up to 2 years. Family cards can be issued for up to 3 years, and investor cards for up to 10 years, depending on the size of the investment. Permanent residence is only available in limited cases."),
 ("Can I own property in Vietnam as a foreigner?","Foreigners who have legally entered Vietnam can own apartments and houses in approved residential projects, for 50 years, renewable once, within the foreign quota. You can’t own land, and foreigners can own no more than 30% of the units in an apartment building."),
 ("What is the cost of living in Vietnam?","Much lower than in North America, Western Europe or Australia. Many couples live comfortably on $2,000–$3,000 a month, depending on the city, and a comfortable lifestyle in Da Nang or Hoi An can cost well under $2,000 a month. International schools and private healthcare are the biggest extra costs."),
 ("What are the best places to live in Vietnam for expats?","The most popular choices are Ho Chi Minh City, Hanoi, Da Nang, Hoi An and Nha Trang. Ho Chi Minh City has the widest choice of jobs, housing and international schools, Hanoi suits people who want history and four seasons, and Da Nang, Hoi An and Nha Trang offer beach life at a slower pace."),
 ("How safe is Vietnam?","Vietnam is generally considered safe, and violent crime against foreigners is rare. Petty theft, such as bag and phone snatching from passing motorbikes, happens in the big cities, and traffic is the biggest everyday risk. Normal city precautions go a long way."),
 ("Do I need to speak Vietnamese to live in Vietnam?","No. In the big cities and expat areas you can manage in English, and apps like Grab make transport and deliveries easy. But official processes are in Vietnamese and English is less common outside the main areas, so learning some basics makes daily life much easier."),
 ("How are expats taxed in Vietnam?","If you spend 183 days or more in Vietnam in a year, you usually become a tax resident and are taxed on your worldwide income at progressive rates. Non-residents are only taxed on income from Vietnam, and employment income is taxed at a flat 20%. See our <a href=\"taxes.html\">tax guide</a> for more detail."),
]
def rl_faqs():
    return '\n'.join(f'      <details{" open" if i==0 else ""}><summary>{q}</summary><div class="faq-b">{a}</div></details>' for i,(q,a) in enumerate(RL_FAQS))
ARR='<svg viewBox="0 0 20 14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 7h17M12 1.5L18 7l-6 5.5"/></svg>'
def dive_rows():
    items=[('Visas','visas.html'),('Tax outlook','taxes.html'),('Cost of living','cost-of-living.html'),('Healthcare &amp; health insurance','healthcare.html'),('Housing &amp; rentals','real-estate.html'),('Schools &amp; childcare','schools.html'),('Pet relocation','pets.html'),('Shipping household goods','shipping.html'),('Popular destinations','destinations.html')]
    ico=''
    return '\n'.join(f'      <a href="{h}"><span class="inner">{{{{i:dv{n+1} di}}}}<h3>{t}</h3></span>{{{{i:dvgo go}}}}</a>' for n,(t,h) in enumerate(items))
def video_cards():
    return '\n'.join(f'      <a class="v-card" href="videos.html"><div class="v-thumb ph">{{{{i:play play}}}}</div><h3>Video title {i+1}</h3><p>Add one of your YouTube videos here: a one-line summary of what viewers will learn.</p></a>' for i in range(5))
STATS='<span>{{i:st-views}} [views]</span><span>{{i:st-likes}} [likes]</span><span>{{i:st-com}} [comments]</span>'
def feat_slides():
    return '\n'.join(f'      <a class="f-slide{" is-active" if i==0 else ""}" href="#"><div class="f-thumb ph">{{{{i:play play}}}}</div><h3>Featured video title {i+1}: replace with one of your YouTube videos</h3><p>[view count]</p></a>' for i in range(5))
def video_grid():
    topics=['Vietnam e-visa explained','Extending your visa without leaving','Temporary Residence Card, step by step','Cost of living in Ho Chi Minh City','Best neighbourhoods for expats in Saigon','Moving to Da Nang: what to expect','Opening a bank account as a foreigner','International schools in Vietnam','Healthcare and insurance for expats','Renting an apartment in Hanoi','Opening a company in Vietnam','A week in our office']
    return '\n'.join(f'    <a class="v-item" href="#"><div class="v-th ph">{{{{i:play play}}}}</div><div class="v-stats">{STATS}</div><h3>[Video] {t}</h3></a>' for t in topics)
POSTS=[('How to extend your visa in Vietnam without leaving','A step-by-step look at in-country extensions: who qualifies, what it costs and how long it takes.'),
 ('Temporary Residence Card: the complete guide','Who can get a TRC, which documents you need and how to avoid the most common delays.'),
 ('Cost of living in Da Nang for expats','Rent, food, transport and healthcare costs, with example monthly budgets for singles and families.'),
 ('Choosing an international school in Ho Chi Minh City','What to look for, typical fees and how early you need to apply.'),
 ('Opening a bank account as a foreigner','Which banks work well for expats, what documents they ask for and how to transfer money in.'),
 ('Renting an apartment in Hanoi','Neighbourhoods, deposits, contracts and the questions to ask before you sign.'),
 ('Healthcare and insurance in Vietnam','How private hospitals work, what care costs and how to choose international insurance.'),
 ('Setting up a company in Vietnam','The main steps, timelines and licences, and how your own visa fits in.'),
 ('Moving to Vietnam with pets','Import rules, vaccinations and airline tips for bringing cats and dogs.')]
def blog_posts():
    return '\n'.join(f'''    <a class="post" href="#"><div class="p-img ph" data-ph="Photo · 329×230"></div><div class="meta"><span>Month DD, YYYY</span><span>X-Minute Read</span></div><h3>{t}</h3><p>{d}</p><div class="by"><span><i></i>Author name</span><svg viewBox="0 0 20 14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 7h17M12 1.5L18 7l-6 5.5"/></svg></div></a>''' for t,d in POSTS)
def blog_feat():
    return '\n'.join(f'''      <a class="bf-slide ph" href="#" data-ph="Photo · 1389×460 · article cover"><div class="bf-l"><span class="bf-pill">Featured Article</span><h3>{POSTS[i][0]}</h3></div><div class="bf-r"><div class="bf-who"><span></span>Author name</div><div class="bf-meta"><span>Month DD, YYYY</span><span>·</span><span>X-Minute Read</span></div></div></a>''' for i in range(3))
MACROS={'ref_symbols':lambda: '\n'.join(symbol(n,i) for n,i in [('chev','i-chev'),('arr','i-arr'),('prev','i-prev'),('next','i-next'),('go','i-go'),('gow','i-go-w')]),'review_cols':review_cols,'blog_posts':blog_posts,'blog_feat':blog_feat,'feat_slides':feat_slides,'video_grid':video_grid,'dive_rows':dive_rows,'video_cards':video_cards,'svc_tabs':svc_tabs,'svc_faqs':faqs,'rl_rows':rl_rows,'rl_faqs':rl_faqs,
 'team_members':lambda: members(['Case Manager','Immigration Specialist','Relocation Manager','Client Operations','Business Setup','Partnerships','Social Media']),
 'partner_members':lambda: members(['Immigration Lawyer','Notary Services','Real Estate Advisor','Real Estate Advisor','Accounting Services','Translation Services','School Placement','Healthcare Liaison','Moving &amp; Shipping','Banking Support'])}
ICONS=SRC+'/data/icons/'
def icon(name, cls=''):
    s=open(ICONS+name+'.svg').read().strip()
    s=re.sub(r'\sclass="[^"]*"','',s,count=1)
    s=re.sub(r'\saria-hidden="[^"]*"','',s,count=1)
    return s.replace('<svg','<svg aria-hidden="true"'+(f' class="{cls}"' if cls else ''),1)
def symbol(name, sid):
    s=open(ICONS+name+'.svg').read()
    vb=re.search(r'viewBox="([^"]*)"',s).group(1)
    fill=re.search(r'<svg[^>]*\sfill="([^"]*)"',s)
    inner=re.sub(r'^.*?<svg[^>]*>|</svg>\s*$','',s,flags=re.S)
    return f'<symbol id="{sid}" viewBox="{vb}"'+(f' fill="{fill.group(1)}"' if fill else '')+f'>{inner}</symbol>'
def expand(text, depth=0):
    def inc(m):
        name=m.group(1); args=dict(re.findall(r'(\w+)="(.*?)"',m.group(2) or ''))
        body=part(name)
        for k,v in args.items(): body=body.replace('{{'+k+'}}',v)
        body=re.sub(r'\{\{(\w+)\|(.*?)\}\}',lambda mm: args.get(mm.group(1),mm.group(2)),body)
        return expand(body, depth+1)
    text=re.sub(r'\{\{>\s*(\w+)((?:\s+\w+=".*?")*)\s*\}\}',inc,text)
    text=re.sub(r'\{\{@(\w+)\}\}',lambda m: MACROS[m.group(1)](),text)
    text=re.sub(r'\{\{i:([\w-]+)(?: ([\w -]+))?\}\}',lambda m: icon(m.group(1),m.group(2) or ''),text)
    return text
def build():
    os.makedirs(DIST,exist_ok=True)
    for f in ('site.css','site.js'): shutil.copy(f'{ROOT}/assets/{f}',f'{DIST}/{f}')
    shutil.copytree(f'{ROOT}/assets/img',f'{DIST}/img',dirs_exist_ok=True)
    pages=sorted(glob.glob(f'{SRC}/pages/*.html'))
    for p in pages:
        name=os.path.basename(p); src=open(p).read()
        title=re.search(r'<!-- title: (.*?) -->',src).group(1)
        style=re.search(r'<!-- style -->(.*?)<!-- /style -->',src,re.S)
        src=re.sub(r'<!-- title: .*? -->\n?','',src); src=re.sub(r'<!-- style -->.*?<!-- /style -->\n?','',src,flags=re.S)
        page_css=f'<style>{style.group(1)}</style>\n' if style else ''
        head=(f'<title>{title}</title>\n<meta name="description" content="{DESCRIPTION}">\n<link rel="icon" href="img/logo-icon.png">\n'
              f'<meta property="og:title" content="{title}">\n<meta property="og:description" content="{DESCRIPTION}">\n'
              f'<meta property="og:image" content="https://xplorevietnam.org/img/hero-home.jpg">\n{FONTS}\n<link rel="stylesheet" href="site.css">\n{page_css}')
        body=expand(part('sprite')+part('header')+src+part('footer'))+'<script src="site.js"></script>\n'
        # mark current page in nav
        body=body.replace(f'href="{name}"',f'href="{name}" aria-current="page"',1) if name!='index.html' else body
        out=f'<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n{head}</head>\n<body>\n{body}</body>\n</html>\n'
        open(f'{DIST}/{name}','w').write(out)
    if os.environ.get('VERCEL'):
        print('built',len(pages),'pages'); return
    # local preview copies: full documents with local fonts (Google Fonts is unreachable from the sandbox)
    os.makedirs(f'{ROOT}/local',exist_ok=True)
    shutil.copytree(f'{DIST}/img',f'{ROOT}/local/img',dirs_exist_ok=True)
    for f in glob.glob(f'{DIST}/*.*'):
        n=os.path.basename(f); t=open(f).read()
        if n.endswith('.html'):
            t=t.replace(FONTS,'<link rel="stylesheet" href="file:///home/claude/kit/fonts.css">')
            if not t.startswith('<!doctype'):
                t='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui;background:#fafafa}img{max-width:100%}[hidden]{display:none!important}</style>'+t.replace('<svg width="0"','</head><body><svg width="0"',1)+'</body></html>'
        open(f'{ROOT}/local/{n}','w').write(t)
    print('built',[os.path.basename(p) for p in pages])
if __name__=='__main__': build()
