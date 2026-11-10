/* Jumbo Travel — admin portal */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let DATA = null, VIEW = 'dashboard';

async function api(path, opts = {}) {
  const w = opts.method && opts.method !== 'GET', sy = document.getElementById('sync');
  if (w && sy) { sy.classList.add('busy'); sy.lastChild.textContent = 'Saving…'; }
  try { return await api0(path, opts); } finally { if (w && sy) { sy.classList.remove('busy'); sy.lastChild.textContent = 'All changes live'; } }
}
async function api0(path, opts = {}) {
  const r = await fetch('/api/admin/' + path, { method: opts.method || 'GET', headers: { 'Content-Type': 'application/json' }, body: opts.body ? JSON.stringify(opts.body) : undefined, credentials: 'same-origin' });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && path !== 'login') { showLogin(); throw new Error('Session expired, please sign in again'); }
  if (!r.ok) throw new Error(j.error || 'Something went wrong');
  return j;
}
function toast(msg, err) { const t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (err ? ' err' : ''); clearTimeout(t._h); t._h = setTimeout(() => t.className = 'toast', 2600); }
const money = n => `${DATA.site.currency} ${Number(n || 0).toFixed(3)}`;

// ---------- images ----------
function pickFiles(multiple = true) {
  return new Promise(res => { const f = $('#file'); f.multiple = multiple; f.value = ''; f.onchange = () => res([...f.files]); f.click(); });
}
function shrink(file, max = 1800) { // resize big photos in the browser before upload
  return new Promise((res, rej) => {
    if (file.type === 'image/gif') { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); return; }
    const img = new Image(); img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      let out = c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', .82);
      if (out.length > 3.5e6) out = c.toDataURL('image/jpeg', .8); // keep under the server upload limit
      res(out); URL.revokeObjectURL(img.src);
    }; img.onerror = () => rej(new Error('Could not read that image')); img.src = URL.createObjectURL(file);
  });
}
async function upload(files) {
  const urls = [];
  for (const f of files) {
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(f.type)) { toast(`${f.name}: please use PNG, JPG, WEBP or GIF`, 1); continue; }
    toast(`Uploading ${f.name}…`);
    const { url } = await api('upload', { method: 'POST', body: { name: f.name, data: await shrink(f) } });
    urls.push(url);
  }
  if (urls.length) toast(`${urls.length} image${urls.length > 1 ? 's' : ''} uploaded`);
  return urls;
}
function dropZone(el, onFiles) {
  el.ondragover = e => { e.preventDefault(); el.classList.add('over'); };
  el.ondragleave = () => el.classList.remove('over');
  el.ondrop = e => { e.preventDefault(); el.classList.remove('over'); onFiles([...e.dataTransfer.files]); };
}

// ---------- shell ----------
const NAV = [
  ['dashboard', 'Overview', 'Insights & health', '<path d="M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z" fill="currentColor"/>'],
  ['packages', 'Packages', 'Holidays & pricing', '<path d="M20 6h-4V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zM10 4h4v2h-4z" fill="currentColor"/>'],
  ['deals', 'Deals', 'Flight & hotel offers', '<path d="M21.4 11.6l-9-9A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7c0 .6.2 1.1.6 1.4l9 9a2 2 0 0 0 2.8 0l7-7a2 2 0 0 0 0-2.8zM6.5 8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" fill="currentColor"/>'],
  ['slides', 'Banners', 'Homepage hero photos', '<path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5z" fill="currentColor"/>'],
  ['site', 'Website', 'Text, contact & social', '<path d="M3 17.2V21h3.8l11-11-3.8-3.8zM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.8 3.8z" fill="currentColor"/>'],
];
const COUNT = { packages: () => DATA.packages.length, deals: () => DATA.deals.length, slides: () => DATA.slides.length };
function nav() {
  const box = $('#side-nav');
  box.innerHTML = '<span class="indicator" id="indicator"></span>' + NAV.map(([k, l, sub, ic]) => `<button data-v="${k}" class="${VIEW === k ? 'on' : ''}" title="${l}"><span class="nav-ic"><svg viewBox="0 0 24 24">${ic}</svg></span><span class="nav-t"><b>${l}</b><small>${sub}</small></span>${COUNT[k] ? `<span class="nav-c">${COUNT[k]()}</span>` : '<span></span>'}</button>`).join('');
  $$('[data-v]', box).forEach(b => b.onclick = () => { go(b.dataset.v); $('#app').classList.remove('open'); });
  moveIndicator();
  $('#crumb').textContent = NAV.find(n => n[0] === VIEW)?.[1] || '';
}
function moveIndicator() {
  const on = $('#side-nav button.on'), ind = $('#indicator'); if (!on || !ind) return;
  ind.style.transform = `translateY(${on.offsetTop}px)`; ind.style.height = on.offsetHeight + 'px'; ind.style.opacity = 1;
}
let lastIndicatorTop = 0;
function go(v) {
  const prev = $('#side-nav button.on'); lastIndicatorTop = prev ? prev.offsetTop : 0;
  VIEW = v; history.replaceState(null, '', '#' + v);
  const ind = $('#indicator'); nav();
  const ind2 = $('#indicator'); if (ind2) { ind2.style.transition = 'none'; ind2.style.transform = `translateY(${lastIndicatorTop}px)`; ind2.offsetWidth; ind2.style.transition = ''; moveIndicator(); }
  VIEWS[v](); scrollTo({ top: 0, behavior: 'smooth' });
}
function openItem(coll, id) { go(coll); if (id) setTimeout(() => $(`.item[data-id="${id}"] [data-edit]`)?.click(), 60); }
async function refresh() { DATA = await api('content'); }

function showLogin() { $('#app').classList.add('hidden'); $('#login').classList.remove('hidden'); $('#u').focus(); }
$('#login-form').onsubmit = async e => {
  e.preventDefault(); $('#login-err').textContent = '';
  const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: $('#u').value, password: $('#p').value }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { $('#login-err').textContent = j.error || 'Sign in failed'; return; }
  $('#p').value = ''; start();
};
$('#logout').onclick = async () => { await fetch('/api/admin/logout', { method: 'POST' }); showLogin(); };

async function start() {
  try { await refresh(); } catch { return showLogin(); }
  $('#login').classList.add('hidden'); $('#app').classList.remove('hidden');
  try { if (localStorage.getItem('jt-mini') === '1') $('#app').classList.add('mini'); } catch {}
  go(NAV.some(n => n[0] === location.hash.slice(1)) ? location.hash.slice(1) : 'dashboard');
}

// ---------- drawer ----------
function drawer(title, html, onSave, onDelete) {
  const d = document.createElement('div'); d.className = 'drawer';
  d.innerHTML = `<div class="panel"><header><h2>${esc(title)}</h2><button class="x" aria-label="Close">×</button></header>
    <form class="body" novalidate>${html}</form>
    <footer><div>${onDelete ? '<button type="button" class="btn btn-danger" data-del>Delete</button>' : ''}</div>
    <div style="display:flex;gap:8px"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="button" class="btn btn-primary" data-save>Save changes</button></div></footer></div>`;
  document.body.append(d); document.body.style.overflow = 'hidden';
  const close = () => { d.remove(); document.body.style.overflow = ''; };
  d.onclick = e => { if (e.target === d) close(); };
  $$('.x,[data-close]', d).forEach(b => b.onclick = close);
  $('[data-save]', d).onclick = async () => {
    const btn = $('[data-save]', d); btn.disabled = true;
    try { await onSave($('form', d)); close(); } catch (e) { toast(e.message, 1); } finally { btn.disabled = false; }
  };
  if (onDelete) $('[data-del]', d).onclick = async () => { if (confirm('Delete this permanently? It will disappear from the website.')) { await onDelete(); close(); } };
  return d;
}
const val = (f, n) => f.elements[n]?.type === 'checkbox' ? f.elements[n].checked : f.elements[n]?.value;

function imageManager(el, images, multiple = true) {
  const draw = () => {
    el.innerHTML = images.map((src, i) => `<div class="img"><img src="${esc(src)}" alt="">${multiple && i === 0 ? '<span class="cover">Cover</span>' : ''}
      <div class="tools">${multiple ? `<button type="button" data-l="${i}" title="Move left">‹</button>` : '<span></span>'}<button type="button" class="del" data-d="${i}" title="Remove">✕</button>${multiple ? `<button type="button" data-r="${i}" title="Move right">›</button>` : '<span></span>'}</div></div>`).join('')
      + ((multiple || !images.length) ? `<div class="drop" tabindex="0"><div><b>+</b>${multiple ? 'Add photos' : 'Upload image'}<br><span class="hint">or drag &amp; drop</span></div></div>` : '');
    $$('[data-d]', el).forEach(b => b.onclick = () => { images.splice(+b.dataset.d, 1); draw(); });
    $$('[data-l]', el).forEach(b => b.onclick = () => { const i = +b.dataset.l; if (i > 0) { [images[i - 1], images[i]] = [images[i], images[i - 1]]; draw(); } });
    $$('[data-r]', el).forEach(b => b.onclick = () => { const i = +b.dataset.r; if (i < images.length - 1) { [images[i + 1], images[i]] = [images[i], images[i + 1]]; draw(); } });
    const drop = $('.drop', el);
    if (drop) {
      const add = async files => { try { const urls = await upload(multiple ? files : files.slice(0, 1)); if (!multiple) images.length = 0; images.push(...urls); draw(); } catch (e) { toast(e.message, 1); } };
      drop.onclick = async () => add(await pickFiles(multiple));
      dropZone(drop, add);
    }
  };
  draw(); return images;
}

// ---------- list helper ----------
function listView({ coll, title, sub, addLabel, filterFn, row, edit, blank }) {
  const items = DATA[coll];
  $('#view').innerHTML = `<div class="top"><div><h1>${title}</h1><p>${sub}</p></div><button class="btn btn-primary" id="add">+ ${addLabel}</button></div>
    <div class="toolbar"><input type="search" id="q" placeholder="Search…"></div><div class="items" id="list"></div>`;
  const draw = () => {
    const q = $('#q').value.toLowerCase();
    const list = items.filter(x => !q || JSON.stringify(x).toLowerCase().includes(q)).filter(filterFn || (() => true));
    $('#list').innerHTML = list.map(x => `<div class="item" data-id="${x.id}">
      <div class="move">${q ? '' : '<button data-up title="Move up">▲</button><button data-down title="Move down">▼</button>'}</div>${row(x)}
      <div class="actions"><button class="btn btn-ghost btn-sm" data-edit>Edit</button></div></div>`).join('') || `<div class="card empty">Nothing here yet. Click “${addLabel}” to create one.</div>`;
    $$('[data-edit]').forEach(b => b.onclick = e => { e.stopPropagation(); edit(items.find(x => x.id === b.closest('.item').dataset.id)); });
    $$('.item').forEach(r => r.onclick = e => { if (!e.target.closest('button')) $('[data-edit]', r).click(); });
    $$('[data-up],[data-down]').forEach(b => b.onclick = async () => {
      const i = items.findIndex(x => x.id === b.closest('.item').dataset.id), j = i + (b.hasAttribute('data-up') ? -1 : 1);
      if (j < 0 || j >= items.length) return;
      [items[i], items[j]] = [items[j], items[i]]; draw();
      await api(`${coll}/reorder`, { method: 'POST', body: { ids: items.map(x => x.id) } }); toast('Order saved');
    });
  };
  $('#q').oninput = draw; $('#add').onclick = () => edit({ ...blank }); draw();
}
async function saveItem(coll, item, body) {
  if (item.id) await api(`${coll}/${item.id}`, { method: 'PUT', body }); else await api(coll, { method: 'POST', body });
  await refresh(); toast('Saved — live on the website'); VIEWS[VIEW]();
}
async function deleteItem(coll, item) { await api(`${coll}/${item.id}`, { method: 'DELETE' }); await refresh(); toast('Deleted'); VIEWS[VIEW](); }

const ICON = {
  box: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M20 6h-4V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zM10 4h4v2h-4z" fill="currentColor"/></svg>',
  tag: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M21.4 11.6l-9-9A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7c0 .6.2 1.1.6 1.4l9 9a2 2 0 0 0 2.8 0l7-7a2 2 0 0 0 0-2.8zM6.5 8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" fill="currentColor"/></svg>',
  plane: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" fill="currentColor"/></svg>',
  bed: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M3 21V5h2v9h7V7h6a3 3 0 0 1 3 3v11h-2v-3H5v3zm5-8a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" fill="currentColor"/></svg>',
};
function ago(iso) { const s = (Date.now() - new Date(iso)) / 1000; return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)} min ago` : s < 86400 ? `${Math.floor(s / 3600)} h ago` : `${Math.floor(s / 86400)} d ago`; }
let AI_ON = null;

// ---------- views ----------
const VIEWS = {
  dashboard() {
    const P = DATA.packages, D = DATA.deals, S = DATA.slides, cur = DATA.site.currency;
    const live = P.filter(p => p.active), fl = D.filter(d => d.type === 'flight' && d.active), ht = D.filter(d => d.type === 'hotel' && d.active);
    const avg = live.length ? live.reduce((a, p) => a + p.price, 0) / live.length : 0;
    const min = arr => arr.length ? Math.min(...arr.map(x => x.price)) : 0;
    const spark = vals => { if (vals.length < 2) vals = [0, ...vals, 0]; const mx = Math.max(...vals, 1), w = 200, h = 44, pts = vals.map((v, i) => [i * w / (vals.length - 1), h - 4 - (v / mx) * (h - 10)]); const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' '); return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="sg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ee1579" stop-opacity=".25"/><stop offset="1" stop-color="#ee1579" stop-opacity="0"/></linearGradient></defs><path d="${d} L${w} ${h} L0 ${h}Z" fill="url(#sg)"/><path d="${d}" fill="none" stroke="#ee1579" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`; };

    // content health checks
    const checks = [
      [live.every(p => p.images.length >= 2), `Every package has 2+ photos`, P.filter(p => p.images.length < 2)],
      [live.every(p => p.description && p.description.length > 80), `Every package has a full description`, P.filter(p => !p.description || p.description.length <= 80)],
      [live.every(p => p.inclusions.length >= 3), `Packages list what's included`, P.filter(p => p.inclusions.length < 3)],
      [live.some(p => p.featured) && live.filter(p => p.featured).length <= 6, `1–6 packages featured on homepage`, []],
      [S.filter(s => s.active).length >= 3, `At least 3 homepage banners`, []],
      [!!DATA.site.whatsapp, `WhatsApp number added`, []],
      [D.every(d => d.image), `All deals have photos`, D.filter(d => !d.image)],
    ];
    const score = Math.round(checks.filter(c => c[0]).length / checks.length * 100);

    // assistant tips (rule-based insights)
    const tips = [];
    checks.forEach(([ok, label, items]) => { if (!ok) tips.push({ t: items.length ? `${items.length} item${items.length > 1 ? 's need' : ' needs'} attention: ${label.toLowerCase()} — e.g. “${esc(items[0].title)}”.` : `Not done yet: ${label.toLowerCase()}.`, act: items[0] ? (P.includes(items[0]) ? ['packages', items[0].id] : ['deals', items[0].id]) : [label.includes('WhatsApp') ? 'site' : label.includes('banner') ? 'slides' : 'packages'] }); });
    const stale = D.filter(d => !d.updatedAt || Date.now() - new Date(d.updatedAt) > 14 * 864e5);
    if (stale.length) tips.push({ t: `${stale.length} deal prices haven't been checked in 2+ weeks. Fresh prices build trust.`, act: ['deals'], cls: 'info' });
    const noOffer = live.filter(p => !p.oldPrice);
    if (noOffer.length && live.length) tips.push({ t: `Tip: adding an “old price” to ${noOffer.length} package${noOffer.length > 1 ? 's' : ''} shows a saving on the card, which tends to lift clicks.`, act: ['packages', noOffer[0].id], cls: 'info' });
    if (!tips.length) tips.push({ t: 'Everything looks great. Your website content is complete and up to date.', cls: 'ok' });

    const hour = new Date().getHours();
    $('#view').innerHTML = `
    <div class="dash">
      <div class="welcome card"><span class="globe"><img src="/img/logo-globe.png" alt=""></span><div><h2>${hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}, <em>welcome back</em></h2><p>Your website is live. Content health is at ${score}% — ${tips.filter(t => !t.cls).length ? `${tips.filter(t => !t.cls).length} quick fix${tips.filter(t => !t.cls).length > 1 ? 'es' : ''} will take it higher.` : 'everything is in great shape.'}</p></div>
        <div class="w-actions"><a class="btn btn-ghost" href="/" target="_blank">View website</a><button class="btn btn-primary" data-q="packages" data-add>New package</button></div></div>
      <div class="card kpi c3 click" data-q="packages"><span class="go">Open packages →</span><span class="ic">${ICON.box}</span><span class="lbl">Live packages</span><b>${live.length}</b><span class="sub">${P.filter(p => p.featured && p.active).length} featured · ${P.length - live.length} hidden</span>${spark(live.map(p => p.price))}</div>
      <div class="card kpi c3 pk click" data-q="packages"><span class="go">Review prices →</span><span class="ic">${ICON.tag}</span><span class="lbl">Avg. package price</span><b>${avg.toFixed(0)} <small style="font-size:.9rem;color:var(--muted)">${esc(cur)}</small></b><span class="sub">from ${min(live).toFixed(3)} ${esc(cur)}</span>${spark(live.map(p => p.price).sort((a, b) => a - b))}</div>
      <div class="card kpi c3 cy click" data-q="deals"><span class="go">Update fares →</span><span class="ic">${ICON.plane}</span><span class="lbl">Flight deals</span><b>${fl.length}</b><span class="sub">cheapest ${min(fl).toFixed(3)} ${esc(cur)}</span>${spark(fl.map(d => d.price))}</div>
      <div class="card kpi c3 nv click" data-q="deals"><span class="go">Update hotels →</span><span class="ic">${ICON.bed}</span><span class="lbl">Hotel deals</span><b>${ht.length}</b><span class="sub">from ${min(ht).toFixed(3)} ${esc(cur)} / night</span>${spark(ht.map(d => d.price))}</div>

      <div class="card assist c7"><div class="ai-head"><div class="ai-orb"></div><div><h3>Jumbo Assist</h3><span class="sub">Smart suggestions to keep your website at its best</span></div></div><div id="tips"></div></div>
      <div class="card health c5"><div class="ch"><div><h3>Content health</h3><span class="sub">How complete your website content is</span></div></div>
        <b><span id="score">0</span>%</b><div class="grad-bar"><i style="--w:${score}%"></i></div><div class="scale"><span>Needs work</span><span>Excellent</span></div>
        <ul>${checks.map(([ok, l, items]) => `<li class="${ok ? '' : 'no'}" data-open="${items[0] ? (P.includes(items[0]) ? 'packages:' + items[0].id : 'deals:' + items[0].id) : (l.includes('WhatsApp') ? 'site:' : l.includes('banner') ? 'slides:' : 'packages:')}"><i>${ok ? '✓' : '!'}</i>${l}</li>`).join('')}</ul></div>

      <div class="card c7"><div class="ch"><div><h3>Package prices</h3><span class="sub">Starting price per person (${esc(cur)})</span></div><button class="btn btn-ghost btn-sm" data-q="packages">Manage</button></div>
        <div class="bars">${live.slice().sort((a, b) => b.price - a.price).map(p => `<div class="bar" data-open="packages:${p.id}"><span title="${esc(p.title)}">${esc(p.title)}</span><div class="track"><i style="--w:${(p.price / Math.max(...live.map(x => x.price), 1) * 100).toFixed(1)}%"></i></div><em>${p.price.toFixed(3)}</em></div>`).join('') || '<p class="sub">No packages yet.</p>'}</div></div>
      <div class="card c5"><div class="ch"><div><h3>Flight deals</h3><span class="sub">Fare from Kuwait (${esc(cur)})</span></div><button class="btn btn-ghost btn-sm" data-q="deals">Update</button></div>
        <div class="cols">${fl.map(d => `<div class="col ${d.price === min(fl) ? 'hi' : ''}" data-open="deals:${d.id}" title="${esc(d.title)}: ${d.price.toFixed(3)}"><i style="--h:${(d.price / Math.max(...fl.map(x => x.price), 1) * 100).toFixed(0)}%"></i><small>${esc(d.title)}</small></div>`).join('')}</div></div>

      <div class="card c7"><div class="ch"><div><h3>Live website</h3><span class="live">Online</span></div><a class="btn btn-ghost btn-sm" href="/" target="_blank">Open</a></div><div class="preview" id="preview"><iframe src="/" title="Website preview" loading="lazy" tabindex="-1"></iframe></div></div>
      <div class="card c5"><div class="ch"><h3>Recent changes</h3></div><div class="feed">
        ${[...P, ...D].filter(x => x.updatedAt).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6).map(x => `<div data-open="${P.includes(x) ? 'packages' : 'deals'}:${x.id}"><span>${esc(x.title)}</span><span class="sub">${ago(x.updatedAt)}</span></div>`).join('') || '<p class="sub">No edits yet — your changes will show up here.</p>'}
      </div></div>
    </div>`;
    // animate
    requestAnimationFrame(() => setTimeout(() => {
      $$('.grad-bar i,.bar .track i').forEach(i => i.style.width = i.style.getPropertyValue('--w'));
      $$('.cols .col i').forEach(i => i.style.height = i.style.getPropertyValue('--h'));
    }, 80));
    let n = 0; const sc = $('#score'); const t = setInterval(() => { n = Math.min(score, n + 2); sc.textContent = n; if (n >= score) clearInterval(t); }, 18);
    const fit = () => { const p = $('#preview'); if (p) p.firstElementChild.style.transform = `scale(${p.clientWidth / 1440})`; }; fit(); addEventListener('resize', fit);
    // typewriter tips
    const box = $('#tips'); let i = 0;
    const next = () => { if (i >= tips.length || !document.body.contains(box)) return; const tp = tips[i++];
      const el = document.createElement('div'); el.className = 'tip ' + (tp.cls || ''); el.innerHTML = `<span class="dot"></span><p class="typing"></p>${tp.act ? '<svg class="arrow-r" viewBox="0 0 24 24" width="18" height="18"><path d="M5 11h11.2l-4.6-4.6L13 5l7 7-7 7-1.4-1.4 4.6-4.6H5z" fill="currentColor"/></svg>' : ''}`; box.append(el);
      if (tp.act) el.onclick = () => openItem(tp.act[0], tp.act[1]);
      const p = $('p', el), txt = tp.t.replace(/<[^>]+>/g, ''); let k = 0; const w = setInterval(() => { k += 3; p.textContent = txt.slice(0, k); if (k >= txt.length) { clearInterval(w); p.classList.remove('typing'); p.innerHTML = tp.t; setTimeout(next, 150); } }, 14); };
    setTimeout(next, 400);
    $$('[data-q]').forEach(b => b.onclick = e => { e.stopPropagation(); go(b.dataset.q); if (b.hasAttribute('data-add')) $('#add').click(); });
    $$('[data-open]').forEach(el => el.onclick = () => { const [c, id] = el.dataset.open.split(':'); openItem(c, id); });
    $('#preview').onclick = () => open('/', '_blank');
  },

  packages() {
    listView({
      coll: 'packages', title: 'Holiday packages', sub: 'Add, edit or remove the packages shown on the website.', addLabel: 'Add package',
      blank: { title: '', destination: '', duration: '', price: '', oldPrice: '', badge: '', summary: '', description: '', inclusions: [], images: [], featured: false, active: true },
      row: p => `<img class="thumb" src="${esc(p.images[0] || '/img/favicon.svg')}" alt=""><div><h3>${esc(p.title)}${p.active ? '' : '<span class="pill off">Hidden</span>'}${p.featured ? '<span class="pill feat">Featured</span>' : ''}</h3><p>${esc(p.destination)} · ${esc(p.duration)}</p></div><span class="price">${money(p.price)}</span>`,
      edit: p => {
        const imgs = [...(p.images || [])];
        const d = drawer(p.id ? 'Edit package' : 'New package', `
          <div><label>Photos <span class="hint">— first photo is the cover. Hover a photo to reorder or remove it.</span></label><div class="imgs" id="imgs"></div></div>
          <div class="ai-box"><div class="row"><button type="button" class="btn ai-btn btn-sm" id="ai-go"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6zM19 14l.9 2.6L22 17l-2.1.7L19 20l-.9-2.3L16 17l2.1-.4z" fill="currentColor"/></svg><span>Write with AI</span></button><span class="hint" id="ai-msg">Fill in the name and destination, then let AI draft the summary, description and inclusions. You can edit everything before saving.</span></div>
            <div class="row"><input type="text" id="ai-notes" placeholder="Optional notes for AI, e.g. “honeymoon, 5★ resort, private transfers”" style="flex:1;min-width:200px"><select id="ai-tone" style="width:auto"><option value="premium">Premium</option><option value="family-friendly">Family</option><option value="romantic">Romantic</option><option value="adventurous">Adventure</option></select></div></div>
          <div class="fields">
            <div class="full"><label>Package name *</label><input type="text" name="title" value="${esc(p.title)}" required maxlength="120" placeholder="e.g. Dubai City Escape"></div>
            <div><label>Destination</label><input type="text" name="destination" value="${esc(p.destination)}" placeholder="e.g. Dubai, UAE"></div>
            <div><label>Duration</label><input type="text" name="duration" value="${esc(p.duration)}" placeholder="e.g. 4 Days / 3 Nights"></div>
            <div><label>Price (${esc(DATA.site.currency)}) *</label><input type="number" name="price" value="${esc(p.price)}" min="0" step="0.001" required></div>
            <div><label>Old price <span class="hint">— optional, shown crossed out</span></label><input type="number" name="oldPrice" value="${esc(p.oldPrice || '')}" min="0" step="0.001"></div>
            <div class="full"><label>Badge <span class="hint">— optional, e.g. “Best seller”</span></label><input type="text" name="badge" value="${esc(p.badge)}" maxlength="40"></div>
            <div class="full"><label>Short summary <span class="hint">— shown on the package card</span></label><input type="text" name="summary" value="${esc(p.summary)}" maxlength="240"></div>
            <div class="full"><label>Full description</label><textarea name="description" maxlength="5000">${esc(p.description)}</textarea></div>
            <div class="full"><label>What's included <span class="hint">— one item per line</span></label><textarea name="inclusions" style="min-height:120px">${esc((p.inclusions || []).join('\n'))}</textarea></div>
            <label class="toggle"><input type="checkbox" name="active" ${p.active !== false ? 'checked' : ''}>Show on website</label>
            <label class="toggle"><input type="checkbox" name="featured" ${p.featured ? 'checked' : ''}>Feature on homepage</label>
          </div>`,
          async f => {
            if (!val(f, 'title').trim()) throw new Error('Please enter a package name');
            if (val(f, 'price') === '') throw new Error('Please enter a price');
            await saveItem('packages', p, { title: val(f, 'title'), destination: val(f, 'destination'), duration: val(f, 'duration'), price: val(f, 'price'), oldPrice: val(f, 'oldPrice'), badge: val(f, 'badge'), summary: val(f, 'summary'), description: val(f, 'description'), inclusions: val(f, 'inclusions'), images: imgs, active: val(f, 'active'), featured: val(f, 'featured') });
          }, p.id && (() => deleteItem('packages', p)));
        imageManager($('#imgs', d), imgs);
        $('#ai-go', d).onclick = async () => {
          const f = $('form', d), btn = $('#ai-go', d), msg = $('#ai-msg', d);
          btn.disabled = true; btn.lastChild.textContent = 'Writing…'; msg.textContent = 'Drafting copy for your package…';
          try {
            const r = await api('ai/write', { method: 'POST', body: { title: val(f, 'title'), destination: val(f, 'destination'), duration: val(f, 'duration'), price: val(f, 'price'), inclusions: val(f, 'inclusions'), notes: $('#ai-notes', d).value, tone: $('#ai-tone', d).value } });
            const put = (n, v) => { if (!v) return; const el = f.elements[n]; el.value = v; el.classList.remove('glow'); void el.offsetWidth; el.classList.add('glow'); };
            put('summary', r.summary); put('description', r.description); put('inclusions', (r.inclusions || []).join('\n')); if (!val(f, 'badge')) put('badge', r.badge);
            msg.textContent = 'Done — review the highlighted fields, then save.';
          } catch (e) { msg.textContent = e.message; }
          finally { btn.disabled = false; btn.lastChild.textContent = 'Write with AI'; }
        };
      },
    });
  },

  deals() {
    let type = 'all';
    listView({
      coll: 'deals', title: 'Flight & hotel deals', sub: 'The “Trending deals” cards on the homepage. Update prices any time.', addLabel: 'Add deal',
      blank: { type: 'flight', title: '', location: 'From Kuwait', price: '', note: '', image: '', active: true },
      filterFn: x => type === 'all' || x.type === type,
      row: x => `<img class="thumb" src="${esc(x.image || '/img/favicon.svg')}" alt=""><div><h3>${esc(x.title)}<span class="pill ${x.type}">${x.type === 'flight' ? 'Flight' : 'Hotel'}</span>${x.active ? '' : '<span class="pill off">Hidden</span>'}</h3><p>${esc(x.location)}${x.note ? ' · ' + esc(x.note) : ''}</p></div><span class="price">${money(x.price)}</span>`,
      edit: x => {
        const img = x.image ? [x.image] : [];
        const d = drawer(x.id ? 'Edit deal' : 'New deal', `
          <div class="single"><div class="imgs" id="img" style="grid-template-columns:1fr"></div><p class="hint">Use a landscape or portrait photo of the destination or hotel. Large photos are resized automatically.</p></div>
          <div class="fields">
            <div><label>Type</label><select name="type"><option value="flight" ${x.type === 'flight' ? 'selected' : ''}>Flight deal</option><option value="hotel" ${x.type === 'hotel' ? 'selected' : ''}>Hotel deal</option></select></div>
            <div><label>${'Destination / hotel name'} *</label><input type="text" name="title" value="${esc(x.title)}" required></div>
            <div><label>Location line</label><input type="text" name="location" value="${esc(x.location)}" placeholder="From Kuwait / Dubai, UAE"></div>
            <div><label>Price (${esc(DATA.site.currency)}) *</label><input type="number" name="price" value="${esc(x.price)}" min="0" step="0.001"></div>
            <div class="full"><label>Small note <span class="hint">— e.g. “Non refundable”, “per night”</span></label><input type="text" name="note" value="${esc(x.note)}" maxlength="60"></div>
            <label class="toggle"><input type="checkbox" name="active" ${x.active !== false ? 'checked' : ''}>Show on website</label>
          </div>`,
          async f => {
            if (!val(f, 'title').trim()) throw new Error('Please enter a name');
            await saveItem('deals', x, { type: val(f, 'type'), title: val(f, 'title'), location: val(f, 'location'), price: val(f, 'price'), note: val(f, 'note'), image: img[0] || '', active: val(f, 'active') });
          }, x.id && (() => deleteItem('deals', x)));
        imageManager($('#img', d), img, false);
      },
    });
    $('.toolbar').insertAdjacentHTML('beforeend', `<select id="type" style="max-width:180px"><option value="all">All deals</option><option value="flight">Flights</option><option value="hotel">Hotels</option></select>`);
    $('#type').onchange = e => { type = e.target.value; $('#q').dispatchEvent(new Event('input')); };
  },

  slides() {
    listView({
      coll: 'slides', title: 'Homepage banners', sub: 'Background photos for the big homepage banner. They rotate every few seconds.', addLabel: 'Add banner',
      blank: { image: '', title: '', subtitle: '', active: true },
      row: s => `<img class="thumb" src="${esc(s.image)}" alt=""><div><h3>Banner photo${s.active ? '' : '<span class="pill off">Hidden</span>'}</h3><p>${esc(s.image.split('/').pop())}</p></div><span></span>`,
      edit: s => {
        const img = s.image ? [s.image] : [];
        const d = drawer(s.id ? 'Edit banner' : 'New banner', `
          <div><label>Banner photo <span class="hint">— wide landscape photo, at least 1600px wide works best</span></label><div class="imgs" id="img" style="grid-template-columns:1fr"></div></div>
          <label class="toggle"><input type="checkbox" name="active" ${s.active !== false ? 'checked' : ''}>Show on website</label>`,
          async f => {
            if (!img[0]) throw new Error('Please upload a photo');
            await saveItem('slides', s, { image: img[0], title: '', subtitle: '', active: val(f, 'active') });
          }, s.id && (() => deleteItem('slides', s)));
        imageManager($('#img', d), img, false);
      },
    });
  },

  site() {
    const s = DATA.site;
    $('#view').innerHTML = `<div class="top"><div><h1>Website text &amp; contact</h1><p>Homepage headline and the contact details shown across the site.</p></div></div>
    <form class="card" id="site-form" style="display:grid;gap:22px">
      <div><h3 style="color:var(--navy);margin-bottom:12px">Homepage headline</h3><div class="fields">
        <div><label>Headline</label><input type="text" name="heroTitle" value="${esc(s.heroTitle)}" maxlength="120"></div>
        <div><label>Highlighted line</label><input type="text" name="heroHighlight" value="${esc(s.heroHighlight)}" maxlength="80"></div>
        <div class="full"><label>Intro text</label><textarea name="heroSubtitle" maxlength="240" style="min-height:80px">${esc(s.heroSubtitle)}</textarea></div>
        <div class="full"><label>About text <span class="hint">— “Why book with us” section and footer</span></label><textarea name="aboutText" maxlength="600" style="min-height:80px">${esc(s.aboutText)}</textarea></div>
      </div></div>
      <div><h3 style="color:var(--navy);margin-bottom:12px">Contact details</h3><div class="fields">
        <div><label>Phone</label><input type="text" name="phone" value="${esc(s.phone)}"></div>
        <div><label>Email</label><input type="email" name="email" value="${esc(s.email)}"></div>
        <div><label>WhatsApp number <span class="hint">— adds “Enquire on WhatsApp” to packages</span></label><input type="text" name="whatsapp" value="${esc(s.whatsapp)}" placeholder="+965…"></div>
        <div><label>Address</label><input type="text" name="address" value="${esc(s.address)}"></div>
        <div><label>Currency code</label><input type="text" name="currency" value="${esc(s.currency)}" maxlength="5"></div>
      </div></div>
      <div><h3 style="color:var(--navy);margin-bottom:12px">Social links <span class="hint">— leave blank to hide</span></h3><div class="fields">
        <div><label>Facebook</label><input type="url" name="facebook" value="${esc(s.social?.facebook)}"></div>
        <div><label>Instagram</label><input type="url" name="instagram" value="${esc(s.social?.instagram)}"></div>
        <div><label>X (Twitter)</label><input type="url" name="x" value="${esc(s.social?.x)}"></div>
      </div></div>
      <div><button class="btn btn-primary">Save changes</button></div>
    </form>`;
    $('#site-form').onsubmit = async e => {
      e.preventDefault(); const f = e.target, b = $('button', f); b.disabled = true;
      try {
        const body = Object.fromEntries(['heroTitle', 'heroHighlight', 'heroSubtitle', 'aboutText', 'phone', 'email', 'whatsapp', 'address', 'currency'].map(k => [k, val(f, k)]));
        body.social = { facebook: val(f, 'facebook'), instagram: val(f, 'instagram'), x: val(f, 'x') };
        DATA.site = await api('site', { method: 'PUT', body }); toast('Saved — live on the website');
      } catch (er) { toast(er.message, 1); } finally { b.disabled = false; }
    };
  },
};

// ---------- shell interactions ----------
$('#collapse').onclick = () => { const m = $('#app').classList.toggle('mini'); try { localStorage.setItem('jt-mini', m ? '1' : '0'); } catch {} setTimeout(moveIndicator, 520); };
$('#burger').onclick = () => $('#app').classList.add('open');
$('#scrim').onclick = () => $('#app').classList.remove('open');
addEventListener('resize', () => requestAnimationFrame(moveIndicator));

// ---------- command palette ----------
const PAL = $('#palette'); let palSel = 0, palItems = [];
function palOpen() { if (!DATA) return; PAL.classList.remove('hidden'); $('#pal-q').value = ''; palDraw(); setTimeout(() => $('#pal-q').focus(), 20); }
function palClose() { PAL.classList.add('hidden'); }
function palDraw() {
  const t = $('#pal-q').value.toLowerCase().trim();
  const pages = NAV.map(([k, l, sub, ic]) => ({ g: 'Go to', t: l, s: sub, ic, run: () => go(k) }));
  const acts = [{ g: 'Actions', t: 'New package', s: 'Create a holiday package', ic: '<path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" fill="currentColor"/>', run: () => { go('packages'); $('#add').click(); } },
    { g: 'Actions', t: 'New deal', s: 'Add a flight or hotel deal', ic: '<path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" fill="currentColor"/>', run: () => { go('deals'); $('#add').click(); } },
    { g: 'Actions', t: 'Open website', s: 'View the live site', ic: '<path d="M14 3h7v7h-2V6.4l-9.3 9.3-1.4-1.4L17.6 5H14z" fill="currentColor"/>', run: () => open('/', '_blank') }];
  const pk = DATA.packages.map(p => ({ g: 'Packages', t: p.title, s: `${p.destination} · ${money(p.price)}`, img: p.images[0], run: () => openItem('packages', p.id) }));
  const dl = DATA.deals.map(d => ({ g: 'Deals', t: d.title, s: `${d.type === 'flight' ? 'Flight' : 'Hotel'} · ${money(d.price)}`, img: d.image, run: () => openItem('deals', d.id) }));
  palItems = [...pages, ...acts, ...pk, ...dl].filter(x => !t || (x.t + ' ' + x.s).toLowerCase().includes(t)).slice(0, 40);
  palSel = Math.min(palSel, Math.max(0, palItems.length - 1));
  let g = ''; $('#pal-list').innerHTML = palItems.map((x, i) => { const h = x.g !== g ? `<div class="pal-grp">${x.g}</div>` : ''; g = x.g;
    return h + `<div class="pal-it ${i === palSel ? 'sel' : ''}" data-i="${i}">${x.img ? `<img src="${esc(x.img)}" alt="">` : `<span class="pi"><svg viewBox="0 0 24 24" width="18" height="18">${x.ic}</svg></span>`}<span><b>${esc(x.t)}</b><small>${esc(x.s)}</small></span></div>`; }).join('') || '<div class="pal-empty">No results</div>';
  $$('.pal-it').forEach(el => { el.onclick = () => { palClose(); palItems[+el.dataset.i].run(); }; el.onmousemove = () => { if (palSel !== +el.dataset.i) { palSel = +el.dataset.i; $$('.pal-it').forEach(x => x.classList.toggle('sel', +x.dataset.i === palSel)); } }; });
}
$('#pal-q').oninput = () => { palSel = 0; palDraw(); };
$('#pal-q').onkeydown = e => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); palSel = (palSel + (e.key === 'ArrowDown' ? 1 : -1) + palItems.length) % palItems.length; palDraw(); $('.pal-it.sel')?.scrollIntoView({ block: 'nearest' }); }
  if (e.key === 'Enter' && palItems[palSel]) { palClose(); palItems[palSel].run(); }
};
PAL.onclick = e => { if (e.target === PAL) palClose(); };
['#open-palette', '#open-palette-2'].forEach(id => $(id).onclick = palOpen);
addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); PAL.classList.contains('hidden') ? palOpen() : palClose(); }
  if (e.key === 'Escape' && !PAL.classList.contains('hidden')) palClose();
});

start();
