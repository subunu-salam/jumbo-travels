/* Premium layer: cinematic hero, 3D tilt, parallax, counters, transitions */
(function () {
  const q = (s, el = document) => el.querySelector(s);
  const qa = (s, el = document) => [...el.querySelectorAll(s)];
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const BOOK = 'https://www.jumbotravels.com/en';
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const still = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const money = (n, c) => `${E(c)} ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
  const arrow = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 11h11.2l-4.6-4.6L13 5l7 7-7 7-1.4-1.4 4.6-4.6H5z" fill="currentColor"/></svg>';

  document.addEventListener('jt:content', ({ detail: c }) => {
    const cur = c.site.currency;
    if (document.body.dataset.page === 'home') home(c, cur);
    tiltAll();
  });

  function home(c, cur) {
    // destinations from packages + flight deals
    const dests = [];
    c.packages.forEach(p => { const city = (p.destination || '').split(',')[0].trim(); if (city && p.images[0] && !dests.some(d => d.city === city)) dests.push({ city, country: (p.destination.split(',')[1] || '').trim(), img: p.images[0], from: p.price, n: 1 }); else { const d = dests.find(d => d.city === city); if (d) { d.n++; d.from = Math.min(d.from, p.price); } } });
    c.deals.filter(d => d.type === 'flight' && d.image).forEach(d => { if (!dests.some(x => x.city.toLowerCase() === d.title.toLowerCase())) dests.push({ city: d.title, country: 'Flights from Kuwait', img: d.image, from: d.price, n: 0 }); });
    q('#dest').innerHTML = dests.map(d => `
      <a class="arch tilt" href="${d.n ? `/packages?q=${encodeURIComponent(d.city)}` : `${BOOK}?searchTab=flight`}">
        <img src="${E(d.img)}" alt="${E(d.city)}" loading="lazy"><span class="pill">${d.n ? `${d.n} package${d.n > 1 ? 's' : ''}` : 'Flights'}</span>
        <div class="in"><small>${E(d.country)}</small><h3>${E(d.city)}</h3><span style="font-size:.85rem;color:#dfe0f3">from ${money(d.from, cur)}</span></div>
      </a>`).join('');
    q('#dest-list').innerHTML = dests.map(d => `<option value="${E(d.city)}">`).join('');
    qa('[data-rail]').forEach(b => b.onclick = () => { const r = q('#' + b.dataset.rail); r.scrollBy({ left: r.clientWidth * .8 * b.dataset.dir, behavior: 'smooth' }); });

    // hero chips + search
    q('#hero-chips').innerHTML = '<small>Popular:</small>' + dests.slice(0, 4).map(d => `<a href="/packages?q=${encodeURIComponent(d.city)}">${E(d.city)}</a>`).join('');
    q('#hero-search').onsubmit = e => {
      e.preventDefault(); const f = e.target, t = f.type.value, v = f.q.value.trim();
      go(t === 'packages' ? `/packages${v ? '?q=' + encodeURIComponent(v) : ''}` : `${BOOK}?searchTab=${t}`);
    };

    // floating cards from real content
    const feat = c.packages.find(p => p.featured) || c.packages[0];
    const cheapest = c.deals.filter(d => d.type === 'flight').sort((a, b) => a.price - b.price)[0];
    if (feat) q('.fc-1').innerHTML = `<img src="${E(feat.images[0])}" alt=""><div class="fc-in"><small>${E(feat.badge || 'Featured package')}</small><h3>${E(feat.title)}</h3><p>${E(feat.duration)} · from ${money(feat.price, cur)}</p><a class="go" href="/packages/${E(feat.slug)}" style="pointer-events:auto">View package ${arrow}</a></div>`;
    if (cheapest) q('.fc-2').innerHTML = `<div class="fc-in"><small>Flash fare</small><div><p style="margin-bottom:6px">Kuwait → ${E(cheapest.title)}</p><div class="big"><span>${E(cur)}</span>${Number(cheapest.price).toFixed(3)}</div></div><a class="go" href="${BOOK}?searchTab=flight" style="pointer-events:auto">Book flight ${arrow}</a></div>`;
    q('.hero-float').style.pointerEvents = 'auto';

    // services
    const S = [['Flights', 'Hundreds of airlines, the best fares from Kuwait.', 'flight', '<path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" fill="currentColor"/>'],
      ['Hotels', 'Over a million stays worldwide at member prices.', 'hotel', '<path d="M3 21V5h2v9h7V7h6a3 3 0 0 1 3 3v11h-2v-3H5v3zm5-8a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" fill="currentColor"/>'],
      ['Holiday packages', 'Flights, hotels and experiences, curated for you.', '/packages', '<path d="M20 6h-4V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zM10 4h4v2h-4z" fill="currentColor"/>'],
      ['Flight + Hotel', 'Bundle your trip and save more.', 'FH', '<path d="M2 20h20v2H2zm1-9 1.5-.5 2 1.5 3-1-4.5-4 2-.6 6.5 3 4-1.4a1.6 1.6 0 0 1 1 3L7 15z" fill="currentColor"/>'],
      ['Activities & tours', 'Attractions and experiences at your destination.', 'activity', '<path d="M14 6l-3.8 5 2.9 3.8-1.6 1.2C9.8 13.6 7 10 7 10l-6 8h22z" fill="currentColor"/>'],
      ['Transfers', 'Airport and city rides, booked in advance.', 'transfer', '<path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11v8h-2v-2H7v2H5zm2.5 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm9 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" fill="currentColor"/>']];
    q('#services-grid').innerHTML = S.map(([t, d, k, ic]) => `<a class="svc" href="${k.startsWith('/') ? k : `${BOOK}?searchTab=${k}`}"><span class="ic"><svg viewBox="0 0 24 24" width="26" height="26">${ic}</svg></span><span><h3>${t}</h3><p>${d}</p><span class="more">Explore ${arrow}</span></span></a>`).join('');

    // stats
    q('#stat-dest').dataset.count = dests.length; q('#stat-pkg').dataset.count = c.packages.length;
    const so = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; so.unobserve(e.target); qa('[data-count]', e.target).forEach(countUp); }), { threshold: .4 });
    so.observe(q('.stats-row'));

    // re-observe new reveal blocks
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .1 });
    qa('.stagger:not(.in),.reveal:not(.in)').forEach(el => io.observe(el));

    // hero parallax (mouse + scroll)
    if (fine && !still) {
      const hero = q('.hero-x');
      hero.addEventListener('mousemove', e => {
        const r = hero.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        qa('[data-depth]', hero).forEach(el => { const d = +el.dataset.depth; el.style.transform = `translate3d(${-x * d}px,${-y * d}px,0) rotateY(${x * d * .4}deg) rotateX(${-y * d * .4}deg)`; });
      });
      hero.addEventListener('mouseleave', () => qa('[data-depth]', hero).forEach(el => el.style.transform = ''));
    }
    if (!still) addEventListener('scroll', () => { const y = scrollY; if (y < innerHeight) { const s = q('.hero-slides'); if (s) s.style.transform = `translate3d(0,${y * .3}px,0)`; const c = q('.hero-copy'); if (c) { c.style.transform = `translate3d(0,${y * .12}px,0)`; c.style.opacity = 1 - y / (innerHeight * .9); } } }, { passive: true });
  }

  function countUp(el) {
    const end = +el.dataset.count, suf = el.dataset.suffix || '', t0 = performance.now(), dur = 1400;
    const step = t => { const k = Math.min(1, (t - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - k, 3))); el.textContent = v + suf; if (k < 1) requestAnimationFrame(step); };
    still ? (el.textContent = end + suf) : requestAnimationFrame(step);
  }

  // 3D tilt with glare
  function tiltAll() {
    if (!fine || still) return;
    qa('.tilt').forEach(el => {
      if (el._t) return; el._t = 1;
      const g = document.createElement('span'); g.className = 'glare'; el.append(g);
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.transform = `perspective(900px) rotateX(${(.5 - y) * 10}deg) rotateY(${(x - .5) * 12}deg) translateY(-6px)`;
        el.style.setProperty('--gx', x * 100 + '%'); el.style.setProperty('--gy', y * 100 + '%');
      });
      el.addEventListener('mouseleave', () => el.style.transform = '');
    });
  }
  new MutationObserver(() => tiltAll()).observe(document.body, { childList: true, subtree: true });

  // smooth page transitions for internal links
  function go(href) { if (still) return location.href = href; document.body.classList.add('leaving'); setTimeout(() => location.href = href, 300); }
  document.addEventListener('click', e => {
    const a = e.target.closest('a'); if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || a.target === '_blank') return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || u.hash && u.pathname === location.pathname || a.hasAttribute('download')) return;
    e.preventDefault(); go(u.href);
  });
  addEventListener('pageshow', e => { if (e.persisted) document.body.classList.remove('leaving'); });
})();
