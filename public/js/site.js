/* Jumbo Travel — public site (vanilla JS, content comes from /api/content) */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n, cur = 'KWD') => `<span>${esc(cur)}</span>${Number(n).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;

const BOOKING = 'https://www.jumbotravels.com/en';
const icons = {
  flight: '<path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" fill="currentColor"/>',
  hotel: '<path d="M3 21V5h2v9h7V7h6a3 3 0 0 1 3 3v11h-2v-3H5v3zm5-8a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" fill="currentColor"/>',
  fh: '<path d="M2 20h20v2H2zm1-9 1.5-.5 2 1.5 3-1-4.5-4 2-.6 6.5 3 4-1.4a1.6 1.6 0 0 1 1 3L7 15z" fill="currentColor"/>',
  activity: '<path d="M14 6l-3.8 5 2.9 3.8-1.6 1.2C9.8 13.6 7 10 7 10l-6 8h22z" fill="currentColor"/>',
  transfer: '<path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11v8h-2v-2H7v2H5zm2.5 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm9 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM7 10h10l-1-3H8z" fill="currentColor"/>',
  disney: '<path d="M12 2l1.5 4H17l-2.8 2.2 1 4L12 10l-3.2 2.2 1-4L7 6h3.5zM5 14h14v8h-4v-4h-6v4H5z" fill="currentColor"/>',
  price: '<path d="M21.4 11.6l-9-9A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7c0 .6.2 1.1.6 1.4l9 9a2 2 0 0 0 2.8 0l7-7a2 2 0 0 0 0-2.8zM6.5 8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" fill="currentColor"/>',
  shield: '<path d="M12 2l8 3v6c0 5-3.4 9.7-8 11-4.6-1.3-8-6-8-11V5zm-1.2 13.6l6-6-1.4-1.4-4.6 4.6-2.2-2.2-1.4 1.4z" fill="currentColor"/>',
  search: '<path d="M10 2a8 8 0 0 1 6.3 12.9l5.4 5.4-1.4 1.4-5.4-5.4A8 8 0 1 1 10 2zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z" fill="currentColor"/>',
  support: '<path d="M12 2a9 9 0 0 1 9 9v6a3 3 0 0 1-3 3h-3v-7h4v-2a7 7 0 0 0-14 0v2h4v7H6a3 3 0 0 1-3-3v-6a9 9 0 0 1 9-9z" fill="currentColor"/>',
  pin: '<path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7zm0 4.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" fill="currentColor"/>',
  arrow: '<path d="M5 11h11.2l-4.6-4.6L13 5l7 7-7 7-1.4-1.4 4.6-4.6H5z" fill="currentColor"/>',
};
const svg = (name, size = 20) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${icons[name]}</svg>`;

const LOGO = `
<span class="jl" role="img" aria-label="Jumbo Travel">
  <span class="jl-word jl-en"></span>
  <span class="jl-stage" aria-hidden="true">
    <span class="jl-3d">
      <span class="jl-ring jl-ring-back"></span>
      <span class="jl-sphere"><span class="jl-swirl"></span><span class="jl-swirl jl-swirl-2"></span><span class="jl-shine"></span></span>
      <span class="jl-ring jl-ring-front"><i class="jl-comet"></i></span>
    </span>
    <span class="jl-shadow"></span>
  </span>
  <span class="jl-word jl-ar"></span>
</span>`;

const page = document.body.dataset.page;
let CONTENT = null;

function header(site) {
  const link = (href, label) => `<a href="${href}" class="${location.pathname === href ? 'active' : ''}">${label}</a>`;
  return `
  <div class="topbar"><div class="container">
    <span>Trusted travel partner for 50+ years</span>
    <div class="links"><a href="tel:${esc(site.phone)}">${esc(site.phone)}</a><a href="mailto:${esc(site.email)}">${esc(site.email)}</a><a href="${BOOKING}?searchTab=flight">My Booking</a></div>
  </div></div>
  <header class="header"><div class="container">
    <a class="logo" href="/">${LOGO}</a>
    <nav class="nav" id="nav">
      ${link('/', 'Home')}${link('/packages', 'Holiday Packages')}<a href="/#deals">Deals</a><a href="/#why">About</a><a href="#contact">Contact</a>
      <a class="btn btn-primary" href="${BOOKING}?searchTab=flight">Book a flight</a>
    </nav>
    <button class="menu-btn" aria-label="Menu" aria-controls="nav"><span></span><span></span><span></span></button>
  </div></header>`;
}
function footer(site) {
  const soc = Object.entries(site.social || {}).filter(([, v]) => v);
  return `
  <footer class="footer" id="contact"><div class="container">
    <div class="cols">
      <div><a class="logo" href="/">${LOGO}</a><p style="margin-top:16px;max-width:34ch">${esc(site.aboutText)}</p></div>
      <div><h4>Explore</h4><ul><li><a href="/packages">Holiday packages</a></li><li><a href="/#deals">Flight deals</a></li><li><a href="/#deals">Hotel deals</a></li><li><a href="${BOOKING}?searchTab=activity">Activities</a></li></ul></div>
      <div><h4>Book</h4><ul><li><a href="${BOOKING}?searchTab=flight">Flights</a></li><li><a href="${BOOKING}?searchTab=hotel">Hotels</a></li><li><a href="${BOOKING}?searchTab=FH">Flight + Hotel</a></li><li><a href="${BOOKING}?searchTab=transfer">Transfers</a></li></ul></div>
      <div><h4>Get in touch</h4><ul>
        <li><a href="tel:${esc(site.phone)}">${esc(site.phone)}</a></li><li><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></li>
        ${site.address ? `<li>${esc(site.address)}</li>` : ''}
        ${soc.map(([k, v]) => `<li><a href="${esc(v)}" target="_blank" rel="noopener">${k[0].toUpperCase() + k.slice(1)}</a></li>`).join('')}
      </ul></div>
    </div>
    <div class="bottom"><span>© ${new Date().getFullYear()} Jumbo Travel. All rights reserved.</span><a href="https://www.jumbotravels.com/privacy-policy">Privacy policy</a></div>
  </div></footer>`;
}

const pkgCard = (p, cur) => `
  <a class="pkg" href="/packages/${esc(p.slug)}">
    <div class="media">${p.images[0] ? `<img src="${esc(p.images[0])}" alt="${esc(p.title)}" loading="lazy">` : ''}
      ${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ''}${p.duration ? `<span class="dur">${esc(p.duration)}</span>` : ''}</div>
    <div class="body">
      <span class="dest">${svg('pin', 14)}${esc(p.destination)}</span>
      <h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p>
      <div class="foot"><div class="price"><small>Starting from</small><b>${fmt(p.price, cur)}</b>${p.oldPrice > p.price ? `<s>${p.oldPrice.toFixed(3)}</s>` : ''}</div><span class="arrow">${svg('arrow', 18)}</span></div>
    </div>
  </a>`;

const dealCard = (d, cur) => `
  <a class="deal" href="${BOOKING}?searchTab=${d.type === 'hotel' ? 'hotel' : 'flight'}">
    ${d.image ? `<img src="${esc(d.image)}" alt="${esc(d.title)}" loading="lazy">` : ''}
    <div class="in"><small>${d.type === 'flight' ? 'Flights to' : esc(d.location)}</small><h3>${esc(d.title)}</h3>
      <div class="row">${d.note ? `<span class="note">${esc(d.note)}</span>` : '<span></span>'}<span class="amt">${fmt(d.price, cur)}</span></div></div>
  </a>`;

// ---------- pages ----------
function renderHome(c) {
  const cur = c.site.currency;
  $('#hero-title').innerHTML = `${esc(c.site.heroTitle)}<em>${esc(c.site.heroHighlight)}</em>`;
  $('#hero-sub').textContent = c.site.heroSubtitle;

  // hero slideshow
  const slides = c.slides.filter(s => s.image);
  $('.hero-slides').innerHTML = slides.map((s, i) => `<img src="${esc(s.image)}" alt="" class="${i ? '' : 'on'}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}>`).join('');
  $('.hero-dots').innerHTML = slides.length > 1 ? slides.map((_, i) => `<button class="${i ? '' : 'on'}" aria-label="Slide ${i + 1}"></button>`).join('') : '';
  let cur_i = 0, timer;
  const go = i => { const imgs = $$('.hero-slides img'), dots = $$('.hero-dots button'); imgs[cur_i]?.classList.remove('on'); dots[cur_i]?.classList.remove('on'); cur_i = (i + imgs.length) % imgs.length; imgs[cur_i]?.classList.add('on'); dots[cur_i]?.classList.add('on'); };
  const auto = () => { clearInterval(timer); timer = setInterval(() => go(cur_i + 1), 6000); };
  $$('.hero-dots button').forEach((b, i) => b.onclick = () => { go(i); auto(); });
  if (slides.length > 1) auto();

  // search tabs → existing booking engine
  const tabs = [['flight', 'Flights', 'flight', 'Search hundreds of airlines for the best fares from Kuwait.'], ['hotel', 'Hotels', 'hotel', 'Over a million hotels worldwide at member prices.'], ['FH', 'Flight + Hotel', 'fh', 'Bundle your flight and stay and save more.'], ['activity', 'Activities', 'activity', 'Tours, attractions and experiences at your destination.'], ['transfer', 'Transfers', 'transfer', 'Airport and city transfers, booked in advance.'], ['dineyland', 'Disneyland Paris', 'disney', 'Park tickets and Disney hotel packages.']];
  $('.tabs').innerHTML = tabs.map(([k, l, ic], i) => `<button class="tab ${i ? '' : 'on'}" data-k="${k}">${svg(ic)}${l}</button>`).join('');
  const setTab = k => { const t = tabs.find(x => x[0] === k); $('#search-title').textContent = `Book ${t[1].toLowerCase()}`; $('#search-text').textContent = t[3]; $('#search-go').href = `${BOOKING}?searchTab=${k}`; $$('.tab').forEach(b => b.classList.toggle('on', b.dataset.k === k)); };
  $$('.tab').forEach(b => b.onclick = () => setTab(b.dataset.k)); setTab('flight');

  // packages
  const feat = c.packages.filter(p => p.featured);
  $('#pkg-grid').innerHTML = (feat.length ? feat : c.packages).slice(0, 6).map(p => pkgCard(p, cur)).join('') || '<p class="empty">New packages coming soon.</p>';

  // deals
  const showDeals = type => { $('#deal-rail').innerHTML = c.deals.filter(d => d.type === type).map(d => dealCard(d, cur)).join('') || '<p class="empty" style="color:#b9bbdc">No deals right now — check back soon.</p>'; $$('.switch button').forEach(b => b.classList.toggle('on', b.dataset.t === type)); };
  $$('.switch button').forEach(b => b.onclick = () => showDeals(b.dataset.t)); showDeals('flight');

  $('#subscribe').onsubmit = e => { e.preventDefault(); e.target.innerHTML = '<span style="padding:12px 18px;color:#12154b;font-weight:700">Thanks, you\'re on the list!</span>'; };
  $('#why-text').textContent = c.site.aboutText;
  const imgs = c.packages.flatMap(p => p.images).filter(Boolean);
  $('.collage').insertAdjacentHTML('afterbegin', `<img src="${esc(imgs[1] || '/img/hero/slide2.jpg')}" alt="" loading="lazy"><img src="${esc(imgs[3] || '/img/hero/slide3.jpg')}" alt="" loading="lazy">`);
}

function renderPackages(c) {
  const grid = $('#pkg-grid'), q = $('#q');
  const draw = () => {
    const t = q.value.toLowerCase().trim();
    const list = c.packages.filter(p => !t || [p.title, p.destination, p.summary].join(' ').toLowerCase().includes(t));
    grid.innerHTML = list.map(p => pkgCard(p, c.site.currency)).join('') || '<p class="empty">No packages match your search.</p>';
    grid.classList.add('in');
  };
  q.oninput = draw; draw();
}

async function renderPackage(c) {
  const slug = location.pathname.split('/').filter(Boolean)[1];
  const p = c.packages.find(x => x.slug === slug);
  const root = $('#detail');
  if (!p) { root.innerHTML = '<div class="empty"><h2>Package not found</h2><p>It may have been removed or renamed.</p><p style="margin-top:20px"><a class="btn btn-primary" href="/packages">See all packages</a></p></div>'; return; }
  document.title = `${p.title} — Jumbo Travel`;
  const cur = c.site.currency, s = c.site;
  const wa = s.whatsapp ? `https://wa.me/${s.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in the "${p.title}" package.`)}` : '';
  root.innerHTML = `
    <div class="crumbs"><a href="/">Home</a> / <a href="/packages">Holiday packages</a> / ${esc(p.title)}</div>
    <div class="detail">
      <div class="reveal in">
        <div class="gallery"><div class="main">${p.images[0] ? `<img src="${esc(p.images[0])}" alt="${esc(p.title)}">` : ''}</div>
          ${p.images.length > 1 ? `<div class="thumbs">${p.images.map((im, i) => `<button class="${i ? '' : 'on'}" data-src="${esc(im)}"><img src="${esc(im)}" alt=""></button>`).join('')}</div>` : ''}</div>
        <span class="eyebrow" style="margin-top:32px">${esc(p.destination)}</span>
        <h1>${esc(p.title)}</h1>
        <div class="meta">${p.duration ? `<span class="chip">${esc(p.duration)}</span>` : ''}${p.badge ? `<span class="chip">${esc(p.badge)}</span>` : ''}</div>
        <p class="prose">${esc(p.description || p.summary)}</p>
        ${p.inclusions.length ? `<h3 style="margin-top:34px">What's included</h3><ul class="incl">${p.inclusions.map(i => `<li><i>✓</i>${esc(i)}</li>`).join('')}</ul>` : ''}
      </div>
      <aside class="book-card">
        <div class="price"><small>Starting from, per person</small><b>${fmt(p.price, cur)}</b>${p.oldPrice > p.price ? `<s>${p.oldPrice.toFixed(3)}</s>` : ''}</div>
        <a class="btn btn-primary" href="${wa || `tel:${esc(s.phone)}`}" ${wa ? 'target="_blank" rel="noopener"' : ''}>${wa ? 'Enquire on WhatsApp' : 'Call to book'}</a>
        <a class="btn btn-ghost" href="mailto:${esc(s.email)}?subject=${encodeURIComponent('Package enquiry: ' + p.title)}">Email us</a>
        <hr><div class="contact"><span>Prefer to talk? Our travel experts are available 24/7.</span><b style="color:var(--navy)">${esc(s.phone)}</b></div>
      </aside>
    </div>`;
  $$('.thumbs button').forEach(b => b.onclick = () => { $('.gallery .main').innerHTML = `<img src="${b.dataset.src}" alt="">`; $$('.thumbs button').forEach(x => x.classList.toggle('on', x === b)); });
}

// ---------- boot ----------
(async function boot() {
  try { CONTENT = await (await fetch('/api/content')).json(); }
  catch { CONTENT = { site: { phone: '+965 22284697', email: 'hello@jumbotravels.com', currency: 'KWD', aboutText: '' }, slides: [], packages: [], deals: [] }; }
  $('#site-header').innerHTML = header(CONTENT.site);
  $('#site-footer').innerHTML = footer(CONTENT.site);

  const h = $('.header'); const onScroll = () => h.classList.toggle('scrolled', scrollY > 10); addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const mb = $('.menu-btn'); mb.onclick = () => { mb.classList.toggle('open'); $('#nav').classList.toggle('open'); };
  $$('#nav a').forEach(a => a.addEventListener('click', () => { mb.classList.remove('open'); $('#nav').classList.remove('open'); }));

  if (page === 'home') renderHome(CONTENT);
  if (page === 'packages') renderPackages(CONTENT);
  if (page === 'package') await renderPackage(CONTENT);

  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  $$('.reveal,.stagger').forEach(el => io.observe(el));
})();
