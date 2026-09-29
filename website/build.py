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
ROLE_ICONS={  # lucide-style outline icons, 24x24
 'briefcase':'<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
 'stamp':'<path d="M5 22h14"/><path d="M19.27 13.73A2.5 2.5 0 0 0 17.5 13h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-.66-.26-1.3-.73-1.77Z"/><path d="M14 13V8.5C14 7 15 7 15 5a3 3 0 0 0-3-3c-1.69 0-3 1-3 3s1 2 1 3.5V13"/>',
 'house':'<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
 'headset':'<path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"/><path d="M21 16v2a4 4 0 0 1-4 4h-5"/>',
 'building':'<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
 'users':'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
 'megaphone':'<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
 'scale':'<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
 'pen':'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
 'key':'<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
 'calculator':'<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M8 6h8"/><path d="M16 14v4"/><path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"/>',
 'languages':'<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
 'school':'<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
 'health':'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
 'truck':'<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
 'bank':'<path d="M3 22h18"/><path d="M6 18v-7M10 18v-7M14 18v-7M18 18v-7"/><path d="m12 2 8 5H4z"/>',
}
TEAM=[('Case Manager','briefcase'),('Immigration Specialist','stamp'),('Relocation Manager','house'),('Client Operations','headset'),('Business Setup','building'),('Partnerships','users'),('Social Media','megaphone')]
PARTNERS=[('Immigration Lawyer','scale'),('Notary Services','pen'),('Real Estate Advisor','key'),('Accounting Services','calculator'),('Translation Services','languages'),('School Placement','school'),('Healthcare Liaison','health'),('Moving &amp; Shipping','truck'),('Banking Support','bank')]
def members(roles,sub):
    """Role cards with an icon instead of a photo (no names or photos until the team is announced)."""
    return '\n'.join(f'      <div class="member"><div class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ROLE_ICONS[ic]}</svg></div><h3>{r}</h3><p>{sub}</p></div>' for r,ic in roles)
import sys; sys.path.insert(0, SRC+'/data')
import services as SV
import json
CATALOG=json.load(open(SRC+'/data/catalog.json'))
def money(n): return f'${n:,}'
def price_label(sku):
    it=CATALOG['items'][sku]; return money(it['price']) if it['price'] is not None else 'Price on request'
def svc_sku(tab_id, idx): return f'svc-{tab_id}-{idx+1}'
# The Services page text (services.py) must show the same prices the checkout charges.
for _t in SV.TABS:
    for _i,_p in enumerate(_t.get('packages',[])):
        _c=CATALOG['items'][svc_sku(_t['id'],_i)]['price']; _txt=_p['price']
        assert (_c is None and '[' in _txt) or (_c is not None and _txt.replace('$','').replace(',','')==str(_c)), f"price mismatch {_t['id']} {_i}: {_txt} vs catalog {_c}"
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
          <p class="amt">{price_label('overstay-review')}</p>
          <p>{o["desc"]}</p>
          <ul class="s-pay"><li>{{{{i:info}}}}Payment due in full at booking</li></ul>
          <div class="s-actions"><a class="btn-line" href="cart.html" data-add="overstay-review">Book a Case Review <svg class="arr"><use href="#i-arr"/></svg></a><a class="s-ask" href="get-started.html">Have questions? Talk to an expert.</a></div>
        </div>
        <ul class="one-list">{pts}</ul>
      </div>
      <p class="s-fine one-fine">*{o["fine"]}</p>
    </div>
  </div>''')
            continue
        cards=[]
        for p in t['packages']:
            sku=svc_sku(t['id'],len(cards)); item=CATALOG['items'][sku]; priced=item['price'] is not None
            dep_pct=int(round(item.get('deposit',1)*100))
            badge=f'<div class="s-badge">{p["badge"]}</div>' if p.get('badge') else ''
            fees=''.join(f'<span>{f}</span>' for f in p['fees'] if '[' not in f)
            dep=f'<div class="s-fees dep">{"".join(f"<span>{d}</span>" for d in p["dep"])}</div>' if p.get('dep') else ''
            cards.append(f'''      <div class="s-pkg{' has-badge' if badge else ''}">{badge}<div class="s-card">
        <div class="s-top">
          <h3>{p["name"]}</h3>
          <p class="s-desc">{p["desc"]}</p>
          <div class="s-price"><b>{price_label(sku)}</b>{'<small>/total</small>' if priced else ''}</div>
          <div class="s-fees">{fees}</div>{dep}
          <div class="s-div"></div>
          <label class="s-lab" for="dep-{t["id"]}-{len(cards)}">Dependents</label>
          <select id="dep-{t["id"]}-{len(cards)}" data-opt="dependents"><option value="0">None</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select>
          {f'<ul class="s-pay"><li>{{{{i:info}}}}Pay {dep_pct}% at booking</li><li>{{{{i:info}}}}Pay {100-dep_pct}% after your application is submitted</li></ul>' if dep_pct<100 else '<ul class="s-pay"><li>{{i:info}}Payment due in full at booking</li></ul>' if priced else ''}
          <div class="s-div"></div>
          <p class="s-fine">*Government fees are passed through at cost and paid to the relevant Vietnamese authority. You would pay these whoever handles your case. Other providers may add them on top of their quote; we show them upfront.</p>
          <p class="s-get"><b>You get:</b> {p["get"]}<br><br><b>Best for:</b> {p["best"]}</p>
        </div>
        <div class="s-actions"><a class="btn-line" href="cart.html" data-add="{sku}">{'Add to Cart' if priced else 'Request a Quote'} <svg class="arr"><use href="#i-arr"/></svg></a><a class="s-ask" href="get-started.html">Have questions? Talk to an expert.</a></div>
      </div></div>''')
        rows=''.join(f'<div class="t-row"><div class="t-f">{f}</div>'+''.join(f'<div class="t-c">{CHECK if x else "{{i:dash dsh}}"}</div>' for x in inc)+'</div>' for f,inc in SV.FEATURES)
        names=[p['name'].replace('<br>',' ') for p in t['packages']]
        prices=''.join(f'<div class="t-c"><b>{price_label(svc_sku(t["id"],k))}</b></div>' for k in range(len(t['packages'])))
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
# Videos are not published yet: tiles show a "Coming soon" label instead of fake stats, and don't link anywhere.
SOON='<span class="soon">Coming soon</span>'
YT='https://www.youtube.com/@John_Bourdon'
VIDEO_TITLES=['Moving to Vietnam in 2026: where to start','Vietnam e-visa explained','Temporary Residence Card, step by step',
 'Cost of living in Ho Chi Minh City','Best neighbourhoods for expats in Saigon','Moving to Da Nang: what to expect',
 'Opening a bank account as a foreigner','International schools in Vietnam','Healthcare and insurance for expats',
 'Renting an apartment in Hanoi','Opening a company in Vietnam','Bringing your pet to Vietnam']
def video_cards():
    return '\n'.join(f'      <a class="v-card" href="videos.html"><div class="v-thumb ph">{{{{i:play play}}}}</div><h3>{t}</h3><p>{SOON} New videos are on the way. Follow our YouTube channel to see them first.</p></a>' for t in VIDEO_TITLES[:5])
def feat_slides():
    return '\n'.join(f'      <a class="f-slide{" is-active" if i==0 else ""}" href="{YT}" target="_blank" rel="noopener"><div class="f-thumb ph">{{{{i:play play}}}}</div><h3>{t}</h3><p>{SOON}</p></a>' for i,t in enumerate(VIDEO_TITLES[:5]))
def video_grid():
    return '\n'.join(f'    <div class="v-item"><div class="v-th ph">{{{{i:play play}}}}</div><div class="v-stats">{SOON}</div><h3>{t}</h3></div>' for t in VIDEO_TITLES)
import blog
MACROS={'catalog_json':lambda: json.dumps(CATALOG,ensure_ascii=False).replace('</','<\\/'),'ref_symbols':lambda: '\n'.join(symbol(n,i) for n,i in [('chev','i-chev'),('arr','i-arr'),('prev','i-prev'),('next','i-next'),('go','i-go'),('gow','i-go-w')]),'review_cols':review_cols,'blog_posts':blog.listing,'blog_feat':blog.featured,'blog_tabs':blog.city_tabs,'blog_topics':blog.topic_options,'feat_slides':feat_slides,'video_grid':video_grid,'dive_rows':dive_rows,'video_cards':video_cards,'svc_tabs':svc_tabs,'svc_faqs':faqs,'rl_rows':rl_rows,'rl_faqs':rl_faqs,
 'team_members':lambda: members(TEAM,'XploreVietnam team'),
 'partner_members':lambda: members(PARTNERS,'Partner network')}
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
    text=re.sub(r'\{\{price:([\w-]+)\}\}',lambda m: price_label(m.group(1)),text)
    text=re.sub(r'\{\{addon:([\w-]+)\}\}',lambda m: money(CATALOG['addons'][m.group(1)]['price']),text)
    text=re.sub(r'\{\{i:([\w-]+)(?: ([\w -]+))?\}\}',lambda m: icon(m.group(1),m.group(2) or ''),text)
    return text
def build():
    os.makedirs(DIST,exist_ok=True)
    for f in ('site.css','site.js'): shutil.copy(f'{ROOT}/assets/{f}',f'{DIST}/{f}')
    shutil.copytree(f'{ROOT}/assets/img',f'{DIST}/img',dirs_exist_ok=True)
    pages=sorted(glob.glob(f'{SRC}/pages/*.html'))
    def write(name, title, page_css, main, description=DESCRIPTION):
        page_css=expand(page_css)
        head=(f'<title>{title}</title>\n<meta name="description" content="{description}">\n<link rel="icon" href="img/logo-icon.png">\n'
              f'<meta property="og:title" content="{title}">\n<meta property="og:description" content="{description}">\n'
              f'<meta property="og:image" content="https://xplorevietnam.org/img/hero-home.jpg">\n{FONTS}\n<link rel="stylesheet" href="site.css">\n{page_css}')
        body=expand(part('sprite')+part('header')+main+part('footer'))+'<script src="site.js"></script>\n'
        # mark current page in nav
        body=body.replace(f'href="{name}"',f'href="{name}" aria-current="page"',1) if name!='index.html' else body
        out=f'<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n{head}</head>\n<body>\n{body}</body>\n</html>\n'
        open(f'{DIST}/{name}','w').write(out)
    for p in pages:
        name=os.path.basename(p); src=open(p).read()
        title=re.search(r'<!-- title: (.*?) -->',src).group(1)
        style=re.search(r'<!-- style -->(.*?)<!-- /style -->',src,re.S)
        src=re.sub(r'<!-- title: .*? -->\n?','',src); src=re.sub(r'<!-- style -->.*?<!-- /style -->\n?','',src,flags=re.S)
        write(name, title, f'<style>{style.group(1)}</style>\n' if style else '', src)
    for bp in blog.posts():
        write(bp['href'], f"{bp['title']} | XploreVietnam", blog.POST_STYLE, blog.page(bp), bp['excerpt'])
    pages=pages+[bp['href'] for bp in blog.posts()]
    left=[]
    for f in sorted(glob.glob(f'{DIST}/*.html')):
        t=re.sub(r'<(script|style)[^>]*>.*?</\1>','',open(f).read(),flags=re.S)
        for m in re.findall(r'\[[^\]<>{}]{2,80}\]',re.sub(r'<[^>]+>',' ',t)): left.append(f'{os.path.basename(f)}: {m}')
        if 'href="#"' in t: left.append(f'{os.path.basename(f)}: dead link href="#"')
    if left: print('PRE-LAUNCH: still to finish\n  '+'\n  '.join(sorted(set(left))))
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
