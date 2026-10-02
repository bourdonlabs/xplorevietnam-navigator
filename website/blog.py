"""Blog: articles live in src/blog/<slug>.html with a metadata header; build.py renders the listing and one page per post."""
import os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = ROOT + '/src'

ORDER = ['extend-visa-in-vietnam', 'temporary-residence-card-guide', 'cost-of-living-da-nang',
         'international-schools-ho-chi-minh-city', 'open-bank-account-vietnam-foreigner', 'renting-apartment-hanoi',
         'healthcare-insurance-vietnam', 'set-up-company-vietnam', 'moving-to-vietnam-with-pets']
# (card image, wide cover image)
IMAGES = {
    'extend-visa-in-vietnam': ('img/blog-extend-visa.jpg', 'img/cta.jpg'),
    'temporary-residence-card-guide': ('img/blog-trc-guide.jpg', 'img/hero-home.jpg'),
    'cost-of-living-da-nang': ('img/dest/danang.jpg', 'img/dn-guide-1.jpg'),
    'international-schools-ho-chi-minh-city': ('img/blog-intl-schools.jpg', 'img/blog-intl-schools.jpg'),
    'open-bank-account-vietnam-foreigner': ('img/blog-bank-account.jpg', 'img/blog-bank-account.jpg'),
    'renting-apartment-hanoi': ('img/dest/hanoi.jpg', 'img/dest/hanoi.jpg'),
    'healthcare-insurance-vietnam': ('img/blog-healthcare.jpg', 'img/blog-healthcare.jpg'),
    'set-up-company-vietnam': ('img/aud/entrepreneurs.jpg', 'img/aud/entrepreneurs.jpg'),
    'moving-to-vietnam-with-pets': ('img/aud/retirees.jpg', 'img/aud/retirees.jpg'),
}
DATE = '30 September 2026'
AUTHOR = 'XploreVietnam Team'
ARROW = '<svg viewBox="0 0 20 14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 7h17M12 1.5L18 7l-6 5.5"/></svg>'
CITIES = ['All', 'Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Hoi An']
TOPICS = ['Visas', 'Living', 'Housing', 'Healthcare', 'Schools', 'Business', 'Pets']

_cache = None


def posts():
    global _cache
    if _cache is not None:
        return _cache
    out = []
    for slug in ORDER:
        raw = open(f'{SRC}/blog/{slug}.html').read()
        meta = dict(re.findall(r'<!-- (\w+): (.*?) -->', raw))
        body = re.sub(r'<!-- \w+: .*? -->\n?', '', raw).replace('href="../', 'href="')
        words = len(re.sub(r'<[^>]+>', ' ', body).split())
        thumb, cover = IMAGES[slug]
        out.append(dict(slug=slug, title=meta['title'], excerpt=meta['excerpt'], topic=meta['topic'], city=meta['city'],
                        body=body, mins=max(2, round(words / 230)), thumb=thumb, cover=cover, href=f'blog-{slug}.html'))
    _cache = out
    return out


def card(p):
    return (f'    <a class="post" href="{p["href"]}" data-topic="{p["topic"]}" data-city="{p["city"]}">'
            f'<div class="p-img" style="background:#DDE3EA url({p["thumb"]}) center/cover no-repeat"></div>'
            f'<div class="meta"><span>{DATE}</span><span>{p["mins"]}-Minute Read</span></div>'
            f'<h3>{p["title"]}</h3><p>{p["excerpt"]}</p>'
            f'<div class="by"><span><i></i>{AUTHOR}</span>{ARROW}</div></a>')


def listing():
    return '\n'.join(card(p) for p in posts())


def featured():
    return '\n'.join(
        f'      <a class="bf-slide" href="{p["href"]}" style="background:#1B1A2F url({p["cover"]}) center/cover no-repeat">'
        f'<div class="bf-l"><span class="bf-pill">Featured Article</span><h3>{p["title"]}</h3></div>'
        f'<div class="bf-r"><div class="bf-who"><span></span>{AUTHOR}</div>'
        f'<div class="bf-meta"><span>{DATE}</span><span>·</span><span>{p["mins"]}-Minute Read</span></div></div></a>'
        for p in posts()[:3])


def city_tabs():
    btns = []
    for c in CITIES:
        n = sum(1 for p in posts() if c == 'All' or p['city'] in (c, 'All'))
        label = 'All Cities' if c == 'All' else c
        cls = ' class="is-active"' if c == 'All' else ''
        btns.append(f'<button type="button" data-city="{c}"{cls}>{label}<sup>{n}</sup></button>')
    return ''.join(btns)


def topic_options():
    return '<option value="">All topics</option>' + ''.join(f'<option>{t}</option>' for t in TOPICS)


POST_STYLE = '''<style>
.bp-hero{padding:130px var(--pad-x) 0}
.bp-back{display:inline-flex;align-items:center;gap:8px;font:600 16px/22px var(--body);color:var(--navy)}
.bp-back svg{width:18px;height:12px;transform:scaleX(-1)}
.bp-tags{margin-top:32px;display:flex;gap:10px;flex-wrap:wrap}
.bp-tags span{padding:6px 14px;border-radius:999px;background:#FEDFE1;color:var(--accent);font:600 14px/18px var(--body)}
.bp-hero h1{margin-top:20px;max-width:900px;font:600 56px/64px var(--head);color:var(--navy);text-wrap:balance}
.bp-meta{margin-top:20px;display:flex;gap:16px;flex-wrap:wrap;font:400 17px/24px var(--body);color:#777}
.bp-cover{margin:48px var(--pad-x) 0;aspect-ratio:1389/520;border-radius:20px;background-size:cover;background-position:center}
.bp-wrap{padding:64px var(--pad-x) 40px;display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:64px}
.bp-body{max-width:720px}
.bp-body{font:400 19px/31px var(--body);color:#2E2E38}
.bp-body .lede{font-size:22px;line-height:34px;color:var(--navy)}
.bp-body p{margin:0 0 22px}
.bp-body h2{margin:44px 0 16px;font:600 32px/40px var(--head);color:var(--navy)}
.bp-body h3{margin:32px 0 12px;font:600 23px/30px var(--head);color:var(--navy)}
.bp-body ul,.bp-body ol{margin:0 0 24px;padding-left:24px}
.bp-body li{margin:0 0 10px}
.bp-body a{color:var(--royal);text-decoration:underline;text-underline-offset:3px}
.bp-body strong{color:var(--navy)}
.bp-body table{width:100%;margin:8px 0 28px;border-collapse:collapse;font-size:17px;line-height:24px}
.bp-body th,.bp-body td{padding:12px 14px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
.bp-body th{background:var(--light-grey);color:var(--navy);font-weight:700}
.bp-side{position:sticky;top:120px;align-self:start;padding:32px;border-radius:20px;background:var(--navy);color:#fff}
.bp-side h3{font:600 26px/32px var(--head)}
.bp-side p{margin-top:12px;font:400 17px/26px var(--body);color:rgba(255,255,255,.8)}
.bp-side .btn-orange{margin-top:24px;display:flex;width:100%;justify-content:center;white-space:nowrap;font-size:17px}
.bp-side small{display:block;margin-top:16px;font:400 14px/20px var(--body);color:rgba(255,255,255,.6)}
.bp-more{padding:60px var(--pad-x) 120px}
.bp-more h2{font:600 var(--h2)/var(--h2-lh) var(--head);color:var(--navy)}
.bp-more .grid{margin-top:40px;display:grid;grid-template-columns:repeat(3,1fr);gap:26px}
.post{display:flex;flex-direction:column}
.post .p-img{aspect-ratio:329/230;border-radius:15px}
.post .meta{padding:26px 0 20px;display:flex;justify-content:space-between;font:400 16px/18px var(--body);color:#AAA}
.post h3{font:400 24px/32px var(--head);color:var(--ink)}
.post p{margin-top:14px;font:400 17px/25px var(--body);color:#3C3C46}
.post .by{margin-top:auto;padding-top:28px;display:flex;align-items:center;justify-content:space-between}
.post .by span{display:flex;align-items:center;gap:12px;font:700 16px/18px var(--body);color:var(--navy)}
.post .by i{width:34px;height:34px;border-radius:50%;background:url(img/logo-icon.png) center/70% no-repeat #fff;border:1px solid var(--line)}
.post .by svg{width:20px;height:14px;color:var(--navy)}
@media (max-width:1024px){.bp-hero{padding-top:110px}.bp-hero h1{font-size:44px;line-height:52px}.bp-wrap{grid-template-columns:1fr;gap:40px}.bp-side{position:static}.bp-more .grid{grid-template-columns:repeat(2,1fr)}}
@media (max-width:767px){.bp-hero h1{font-size:32px;line-height:40px}.bp-cover{margin-top:32px;aspect-ratio:4/3}.bp-body{font-size:17px;line-height:28px}.bp-body .lede{font-size:19px;line-height:30px}.bp-body h2{font-size:26px;line-height:32px}.bp-more .grid{grid-template-columns:1fr}.bp-body table{display:block;overflow-x:auto}}
</style>
'''


def page(p):
    """Main content for one article (header/footer are added by build.py)."""
    others = [q for q in posts() if q['slug'] != p['slug']]
    # related: same topic first, then the rest, 3 total
    others.sort(key=lambda q: (q['topic'] != p['topic'], ORDER.index(q['slug'])))
    tags = ''.join(f'<span>{t}</span>' for t in [p['topic'], p['city'] if p['city'] != 'All' else None] if t)
    return f'''<main id="top">
  <article>
    <header class="bp-hero">
      <a class="bp-back" href="blog.html">{ARROW} All articles</a>
      <div class="bp-tags">{tags}</div>
      <h1>{p['title']}</h1>
      <div class="bp-meta"><span>{AUTHOR}</span><span>·</span><span>{DATE}</span><span>·</span><span>{p['mins']}-minute read</span></div>
    </header>
    <div class="bp-cover" role="img" aria-label="" style="background-image:url({p['cover']})"></div>
    <div class="bp-wrap">
      <div class="bp-body">
{p['body']}
      </div>
      <aside class="bp-side">
        <h3>Plan your move for free</h3>
        <p>Navigator gives you your visa checklist, a cost of living calculator and a pre-arrival checklist in one place.</p>
        <a class="btn-orange md" href="https://navigator.xplorevietnam.org/auth?tab=signup">Join Navigator (Free) <svg class="arr"><use href="#i-arr"/></svg></a>
        <small>Prefer to talk it through? <a href="get-started.html" style="color:#fff;text-decoration:underline">Book a consultation</a>.</small>
      </aside>
    </div>
  </article>
  <section class="bp-more">
    <h2>Keep reading</h2>
    <div class="grid">
{chr(10).join(card(q) for q in others[:3])}
    </div>
  </section>
</main>
'''
