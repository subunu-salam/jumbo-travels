/* Jumbo Travel — admin portal */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let DATA = null, VIEW = 'dashboard';

async function api(path, opts = {}) {
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
function shrink(file, max = 2000) { // resize big photos in the browser before upload
  return new Promise((res, rej) => {
    if (file.type === 'image/gif') { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); return; }
    const img = new Image(); img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', .86)); URL.revokeObjectURL(img.src);
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
  ['dashboard', 'Dashboard', '<path d="M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z" fill="currentColor"/>'],
  ['packages', 'Packages', '<path d="M20 6h-4V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zM10 4h4v2h-4z" fill="currentColor"/>'],
  ['deals', 'Flight & hotel deals', '<path d="M21.4 11.6l-9-9A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7c0 .6.2 1.1.6 1.4l9 9a2 2 0 0 0 2.8 0l7-7a2 2 0 0 0 0-2.8zM6.5 8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" fill="currentColor"/>'],
  ['slides', 'Homepage banners', '<path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5z" fill="currentColor"/>'],
  ['site', 'Website text & contact', '<path d="M3 17.2V21h3.8l11-11-3.8-3.8zM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.8 3.8z" fill="currentColor"/>'],
];
function nav() {
  $('#side-nav').innerHTML = NAV.map(([k, l, ic]) => `<button data-v="${k}" class="${VIEW === k ? 'on' : ''}"><svg viewBox="0 0 24 24">${ic}</svg>${l}</button>`).join('');
  $('#mobile-nav').innerHTML = NAV.map(([k, l]) => `<button data-v="${k}" class="${VIEW === k ? 'on' : ''}">${l}</button>`).join('') + '<button onclick="window.open(\'/\')">View site</button>';
  $$('[data-v]').forEach(b => b.onclick = () => go(b.dataset.v));
}
function go(v) { VIEW = v; history.replaceState(null, '', '#' + v); nav(); VIEWS[v](); scrollTo(0, 0); }
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
    $$('[data-edit]').forEach(b => b.onclick = () => edit(items.find(x => x.id === b.closest('.item').dataset.id)));
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

// ---------- views ----------
const VIEWS = {
  dashboard() {
    const P = DATA.packages, D = DATA.deals;
    $('#view').innerHTML = `<div class="top"><div><h1>Welcome back 👋</h1><p>Everything you change here goes live on the website straight away.</p></div><a class="btn btn-ghost" href="/" target="_blank">View website ↗</a></div>
    <div class="stats">
      <div class="card stat"><b>${P.filter(p => p.active).length}</b><span>Live packages</span></div>
      <div class="card stat"><b>${P.filter(p => p.featured && p.active).length}</b><span>Featured on homepage</span></div>
      <div class="card stat"><b>${D.filter(d => d.active && d.type === 'flight').length}</b><span>Flight deals</span></div>
      <div class="card stat"><b>${D.filter(d => d.active && d.type === 'hotel').length}</b><span>Hotel deals</span></div>
    </div>
    <div class="card"><h3 style="color:var(--navy);margin-bottom:12px">Quick actions</h3><div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn btn-primary" data-q="packages">+ Add a package</button><button class="btn btn-ghost" data-q="deals">Update deal prices</button><button class="btn btn-ghost" data-q="slides">Change homepage banners</button><button class="btn btn-ghost" data-q="site">Edit contact details</button></div></div>
    <div class="card" style="margin-top:16px"><h3 style="color:var(--navy);margin-bottom:12px">Recently updated</h3><div class="items">
      ${[...P, ...D].filter(x => x.updatedAt).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5).map(x => `<div style="display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid var(--line);padding:8px 0"><span>${esc(x.title)}</span><span class="hint">${new Date(x.updatedAt).toLocaleString()}</span></div>`).join('') || '<p class="hint">No changes yet.</p>'}
    </div></div>`;
    $$('[data-q]').forEach(b => b.onclick = () => { go(b.dataset.q); if (b.dataset.q === 'packages') $('#add').click(); });
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

start();
