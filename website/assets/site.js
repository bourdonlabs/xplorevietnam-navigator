(function(){
  // Always open a page at the top (or at the #section a link points to).
  // The viewer hosting the site can carry the previous page's scroll position over, so reset it explicitly.
  if('scrollRestoration' in history) history.scrollRestoration='manual';
  var userMoved=false;
  ['wheel','touchstart','keydown'].forEach(function(ev){ window.addEventListener(ev,function(){ userMoved=true; },{passive:true,once:true}); });
  function toStart(){
    if(userMoved) return;
    var id=decodeURIComponent(location.hash.slice(1)), t=id && document.getElementById(id);
    if(id && !t) return; // tabs etc. handle their own #hash
    if(!t) t=document.body;
    var html=document.documentElement, prev=html.style.scrollBehavior, pad=html.style.scrollPaddingTop; html.style.scrollBehavior='auto'; if(!id) html.style.scrollPaddingTop='0px';
    try{ t.scrollIntoView({block:'start',behavior:'instant'}); }catch(e){ t.scrollIntoView(true); }
    if(!id) window.scrollTo(0,0);
    html.style.scrollBehavior=prev; html.style.scrollPaddingTop=pad;
  }
  toStart();
  window.addEventListener('load',toStart);
  window.addEventListener('pageshow',function(e){ if(e.persisted) toStart(); });
  // Two-tone headings are pure CSS (::first-line + text-wrap: balance), matching the reference render.

  // Carousels: any element with data-track="key"; arrow buttons carry data-car="key" data-dir="±1".
  var state = {};
  var tracks = {};
  document.querySelectorAll('[data-track]').forEach(function(tr){ tracks[tr.dataset.track] = tr; state[tr.dataset.track] = 0; });
  function metrics(k){
    var tr = tracks[k], view = tr.parentElement, kids = tr.children;
    var gap = parseFloat(getComputedStyle(tr).columnGap)||0;
    var step = kids.length ? kids[0].getBoundingClientRect().width + gap : 0;
    var cs = getComputedStyle(view);
    var viewW = view.clientWidth - (parseFloat(cs.paddingLeft)||0) - (parseFloat(cs.paddingRight)||0);
    var visible = step ? Math.max(1, Math.floor((viewW + gap + 1) / step)) : 1;
    return {step:step, max:Math.max(0, kids.length - visible)};
  }
  function render(k){
    var tr = tracks[k], m = metrics(k);
    state[k] = Math.min(Math.max(state[k],0), m.max);
    tr.style.transform = 'translateX(' + (-state[k]*m.step) + 'px)';
    if(tr.dataset.active !== undefined){
      for(var i=0;i<tr.children.length;i++) tr.children[i].classList.toggle('is-active', i===state[k]);
    }
    document.querySelectorAll('[data-car="'+k+'"]').forEach(function(btn){
      var d = +btn.dataset.dir;
      btn.disabled = d<0 ? state[k]===0 : state[k]>=m.max;
    });
  }
  document.querySelectorAll('[data-car]').forEach(function(btn){
    btn.addEventListener('click', function(){ var k=btn.dataset.car; if(!tracks[k]) return; state[k]+= +btn.dataset.dir; render(k); });
  });
  function renderAll(){ Object.keys(tracks).forEach(render); }
  renderAll();
  var rt; window.addEventListener('resize', function(){ clearTimeout(rt); rt=setTimeout(renderAll,150); });

  // Accordions: one item open at a time within a group.
  document.querySelectorAll('[data-accordion]').forEach(function(group){
    var items = group.querySelectorAll('details');
    items.forEach(function(d){
      d.addEventListener('toggle', function(){
        if(d.open) items.forEach(function(o){ if(o!==d) o.open = false; });
      });
    });
  });

  // Tabs: buttons with data-tab="group:id" show the panel with data-panel="group:id".
  document.querySelectorAll('[data-tab]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var parts = btn.dataset.tab.split(':'), g = parts[0];
      document.querySelectorAll('[data-tab^="'+g+':"]').forEach(function(b){ b.classList.toggle('is-active', b===btn); b.setAttribute('aria-selected', b===btn); });
      document.querySelectorAll('[data-panel^="'+g+':"]').forEach(function(p){ p.hidden = p.dataset.panel !== btn.dataset.tab; });
      renderAll();
    });
  });

  // Mobile menu
  var burger = document.getElementById('burger'), mnav = document.getElementById('mnav');
  if(burger) burger.addEventListener('click', function(){
    var open = mnav.hidden; mnav.hidden = !open; burger.setAttribute('aria-expanded', open);
  });

  // Forms are demos until they are connected to the email platform / CRM.
  document.querySelectorAll('form[data-demo]').forEach(function(f){
    f.addEventListener('submit', function(e){
      e.preventDefault();
      var note = f.querySelector('.note'), email = f.querySelector('input[type=email]');
      var ok = !email || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim());
      if(note) note.textContent = ok ? 'Demo form: not connected yet.' : 'Enter a valid email address, like name@example.com.';
    });
  });

  // Article headings: like the reference, a heading that fits on one line is split
  // after half its words, so it always shows in two tones (re-checked on resize).
  var artH2=[].slice.call(document.querySelectorAll('.art-body h2'));
  if(artH2.length){
    var splitH2=function(){ artH2.forEach(function(h){
      [].slice.call(h.querySelectorAll('br.dynamic-br')).forEach(function(br){ br.replaceWith(' '); });
      var text=h.textContent.replace(/\s+/g,' ').trim(), words=text.split(' ');
      h.textContent=text; if(words.length<=1) return;
      var c=h.cloneNode(false); c.removeAttribute('id'); c.textContent=text;
      c.style.cssText='position:absolute;visibility:hidden;white-space:nowrap;width:auto';
      h.parentNode.appendChild(c); var one=c.offsetHeight; c.remove();
      if(h.offsetHeight<=one){ var m=Math.floor(words.length/2); h.textContent=words.slice(0,m).join(' ');
        var br=document.createElement('br'); br.className='dynamic-br'; h.appendChild(br); h.appendChild(document.createTextNode(words.slice(m).join(' '))); }
    }); };
    splitH2(); if(document.fonts && document.fonts.ready) document.fonts.ready.then(splitH2);
    var h2t; window.addEventListener('resize', function(){ clearTimeout(h2t); h2t=setTimeout(splitH2,150); });
  }

  // Article bookmarks: highlight the section currently in view.
  var bmLinks=[].slice.call(document.querySelectorAll('.bm a'));
  if(bmLinks.length){
    var bmHeads=bmLinks.map(function(a){return document.querySelector(a.getAttribute('href'));});
    var bmOff=function(){ return window.innerWidth>=1024 ? 114 : 86; };
    var bmUpd=function(){ var i=0, off=bmOff()+10; bmHeads.forEach(function(h,k){ if(h && h.getBoundingClientRect().top < off) i=k; }); bmLinks.forEach(function(a,k){ a.classList.toggle('on', k===i); }); };
    window.addEventListener('scroll', bmUpd, {passive:true}); window.addEventListener('resize', bmUpd); bmUpd();
    // Like the reference: clicking a bookmark scrolls smoothly to the heading, leaving room for the fixed header.
    bmLinks.forEach(function(a,k){ a.addEventListener('click', function(e){ var h=bmHeads[k]; if(!h) return; e.preventDefault();
      window.scrollTo({top: h.getBoundingClientRect().top + window.pageYOffset - bmOff(), behavior:'smooth'}); history.replaceState(null,'',a.getAttribute('href')); }); });
  }
})();
