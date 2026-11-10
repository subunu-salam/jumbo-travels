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
        <span class="arch-media"><img src="${E(d.img)}" alt="${E(d.city)}" loading="lazy"></span>
        <span class="in"><small>${E(d.country)}</small><h3>${E(d.city)}</h3>
          <span class="meta"><span>from <b>${money(d.from, cur)}</b></span><span class="tag">${d.n ? `${d.n} package${d.n > 1 ? 's' : ''}` : 'Flights'}</span></span>
          <span class="cta">Explore ${arrow}</span></span>
      </a>`).join('');
    q('#dest-list').innerHTML = dests.map(d => `<option value="${E(d.city)}">`).join('');
    const rail = q('#dest'), edge = () => { const s = rail.scrollLeft, m = rail.scrollWidth - rail.clientWidth - 2; rail.classList.toggle('at-start', s < 4); rail.classList.toggle('at-end', s > m); qa('[data-rail=dest]').forEach(b => b.disabled = b.dataset.dir < 0 ? s < 4 : s > m); };
    rail.addEventListener('scroll', () => requestAnimationFrame(edge), { passive: true }); edge();
    qa('[data-rail]').forEach(b => b.onclick = () => { const r = q('#' + b.dataset.rail); r.scrollBy({ left: r.clientWidth * .8 * b.dataset.dir, behavior: 'smooth' }); });

    // hero chips + search
    q('#hero-chips').innerHTML = '<small>Popular:</small>' + dests.slice(0, 4).map(d => `<a href="/packages?q=${encodeURIComponent(d.city)}">${E(d.city)}</a>`).join('');
    q('#hero-search').onsubmit = e => {
      e.preventDefault(); const f = e.target, t = f.type.value, v = f.q.value.trim();
      go(t === 'packages' ? `/packages${v ? '?q=' + encodeURIComponent(v) : ''}` : `${BOOK}?searchTab=${t}`);
    };


    // slide counter (syncs with slideshow dots)
    const n = qa('.hero-slides img').length; q('#h-n').textContent = String(n).padStart(2, '0');
    new MutationObserver(() => { const i = qa('.hero-dots button').findIndex(b => b.classList.contains('on')); if (i >= 0) q('#h-i').textContent = String(i + 1).padStart(2, '0'); }).observe(q('.hero-dots'), { attributes: true, subtree: true, attributeFilter: ['class'] });

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
      let raf = 0, r;
      el.addEventListener('mouseenter', () => { r = el.getBoundingClientRect(); el.classList.add('tilting'); });
      el.addEventListener('mousemove', e => {
        if (raf) return; raf = requestAnimationFrame(() => { raf = 0; if (!r) r = el.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          el.style.transform = `perspective(1000px) rotateX(${(.5 - y) * 6}deg) rotateY(${(x - .5) * 7}deg) translateY(-6px)`;
          el.style.setProperty('--gx', x * 100 + '%'); el.style.setProperty('--gy', y * 100 + '%'); });
      });
      el.addEventListener('mouseleave', () => { el.classList.remove('tilting'); el.style.transform = ''; r = null; });
    });
  }
  // package grid re-renders on search: re-apply tilt after renders
  document.addEventListener('input', () => setTimeout(tiltAll, 0));
  // fade images in once loaded (avoids harsh pop-in)
  const fadeImgs = () => qa('main img:not(.fade)').forEach(i => { if (i.closest('.hero-slides')) return; i.classList.add('fade'); if (i.complete) i.classList.add('ok'); else i.addEventListener('load', () => i.classList.add('ok'), { once: true }); });
  document.addEventListener('jt:content', () => setTimeout(fadeImgs, 0));

  function go(href) { location.href = href; }
})();
