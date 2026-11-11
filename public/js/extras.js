/* Extras: sign-in modal, concierge chat, frequent-traveller popup, popular routes, subscriptions */
(function () {
  const q = (s, el = document) => el.querySelector(s);
  const qa = (s, el = document) => [...el.querySelectorAll(s)];
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const PORTAL = 'https://www.jumbotravels.com/en';
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  const ARROW = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 11h11.2l-4.6-4.6L13 5l7 7-7 7-1.4-1.4 4.6-4.6H5z" fill="currentColor"/></svg>';
  const X = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7l-1.4-1.4L9.2 12 2.9 5.7l1.4-1.4 6.3 6.3 6.3-6.3z" fill="currentColor"/></svg>';
  let SITE = {};

  // ---------- generic modal ----------
  function modal(cls, html, onOpen) {
    const m = document.createElement('div'); m.className = 'jt-modal ' + cls; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = `<div class="jt-sheet"><button class="jt-x" aria-label="Close">${X}</button>${html}</div>`;
    document.body.append(m); document.documentElement.classList.add('jt-lock');
    requestAnimationFrame(() => m.classList.add('show'));
    const close = () => { m.classList.remove('show'); document.documentElement.classList.remove('jt-lock'); setTimeout(() => m.remove(), 400); removeEventListener('keydown', esc); };
    const esc = e => { if (e.key === 'Escape') close(); };
    addEventListener('keydown', esc);
    m.addEventListener('click', e => { if (e.target === m || e.target.closest('.jt-x')) close(); });
    onOpen && onOpen(m, close);
    return close;
  }

  // ---------- sign in / register (accounts live on the secure booking portal) ----------
  function auth() {
    modal('auth', `
      <div class="auth-art" aria-hidden="true"><span class="auth-globe"></span><b>Your trips,<br><em>all in one place.</em></b><p>Bookings, e-tickets, invoices and exclusive member fares.</p></div>
      <div class="auth-body">
        <span class="eyebrow">Jumbo Travel account</span><h3>Welcome back</h3>
        <p class="muted">Sign in or create your account on our secure booking portal. You'll be redirected safely.</p>
        <div class="auth-opts">
          <a class="auth-opt" href="${PORTAL}?login=true" rel="noopener"><span class="ao-ic"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M10 17l1.4-1.4-2.6-2.6H20v-2H8.8l2.6-2.6L10 7l-5 5zM20 3h-8v2h8v14h-8v2h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" fill="currentColor"/></svg></span><span><b>Sign in</b><small>With your email or phone number</small></span>${ARROW}</a>
          <a class="auth-opt" href="${PORTAL}?register=true" rel="noopener"><span class="ao-ic alt"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2zm9 4c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4z" fill="currentColor"/></svg></span><span><b>Create new account</b><small>Faster checkout and member deals</small></span>${ARROW}</a>
          <a class="auth-opt ghost" href="/manage-booking"><span class="ao-ic ghost"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M19 3h-1V1h-2v2H8V1H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5V8h14z" fill="currentColor"/></svg></span><span><b>No account?</b><small>Find a booking with your reference number</small></span>${ARROW}</a>
        </div>
        <p class="secure-note"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 2l8 3v6c0 5-3.4 9.7-8 11-4.6-1.3-8-6-8-11V5zm-1.2 13.6l6-6-1.4-1.4-4.6 4.6-2.2-2.2-1.4 1.4z" fill="currentColor"/></svg>Protected with bank-grade encryption</p>
      </div>`);
  }

  // ---------- concierge chat launcher ----------
  function chat() {
    const s = SITE, wa = (s.whatsapp || '').replace(/\D/g, '');
    if (s.tawkId) { // live chat (Tawk.to) when configured in the admin
      window.Tawk_API = window.Tawk_API || {}; const t = document.createElement('script'); t.async = true; t.src = `https://embed.tawk.to/${encodeURI(s.tawkId)}`; t.charset = 'UTF-8'; t.setAttribute('crossorigin', '*'); document.body.append(t); return;
    }
    const w = document.createElement('div'); w.className = 'concierge';
    w.innerHTML = `
      <div class="cg-panel" role="dialog" aria-label="Contact Jumbo Travel">
        <div class="cg-head"><span class="cg-av"></span><div><b>Jumbo Travel</b><small><i></i>Travel experts · usually reply fast</small></div></div>
        <div class="cg-bubble">Hi there! Planning a trip? Our travel experts are happy to help with flights, hotels and holiday packages.</div>
        <div class="cg-acts">
          ${wa ? `<a class="cg-a wa" href="https://wa.me/${wa}?text=${encodeURIComponent('Hi Jumbo Travel, I need help planning a trip.')}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.3-.8-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .6l-.4.6-.3.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z" fill="currentColor"/></svg><span><b>WhatsApp</b><small>Chat with an expert</small></span></a>` : ''}
          <a class="cg-a call" href="tel:${E((s.phone || '').replace(/\s/g, ''))}"><svg viewBox="0 0 24 24" width="20" height="20"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" fill="currentColor"/></svg><span><b>Call us</b><small>${E(s.phone)}</small></span></a>
          <a class="cg-a mail" href="mailto:${E(s.email)}"><svg viewBox="0 0 24 24" width="20" height="20"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5z" fill="currentColor"/></svg><span><b>Email</b><small>${E(s.email)}</small></span></a>
          <a class="cg-a book" href="/manage-booking"><svg viewBox="0 0 24 24" width="20" height="20"><path d="M19 3h-1V1h-2v2H8V1H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5V8h14z" fill="currentColor"/></svg><span><b>Manage booking</b><small>View or change a trip</small></span></a>
        </div>
      </div>
      <button class="cg-btn" aria-label="Contact us" aria-expanded="false"><span class="cg-ring"></span><svg class="i-chat" viewBox="0 0 24 24" width="26" height="26"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2zm3 6v2h2v-2zm4 0v2h2v-2zm4 0v2h2v-2z" fill="currentColor"/></svg><svg class="i-x" viewBox="0 0 24 24" width="22" height="22"><path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7l-1.4-1.4L9.2 12 2.9 5.7l1.4-1.4 6.3 6.3 6.3-6.3z" fill="currentColor"/></svg></button>`;
    document.body.append(w);
    const b = q('.cg-btn', w);
    b.onclick = () => { const o = w.classList.toggle('open'); b.setAttribute('aria-expanded', o); };
    document.addEventListener('click', e => { if (!w.contains(e.target)) w.classList.remove('open'); });
  }

  // ---------- subscribe (newsletter + popup) ----------
  async function subscribe(email, phone, source) {
    const r = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, phone, source }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error && !/storage/i.test(j.error) ? j.error : 'Sorry, we could not sign you up right now. Please try again later.');
  }
  function thanks(el, msg) { el.innerHTML = `<div class="sub-ok"><span>✓</span><div><b>You're on the list</b><small>${E(msg)}</small></div></div>`; }

  function frequentPopup() {
    if (store.get('jt-ft') || location.pathname.startsWith('/manage-booking')) return;
    let shown = false;
    const show = () => {
      if (shown || document.querySelector('.jt-modal')) return; shown = true; store.set('jt-ft', Date.now());
      modal('ft', `
        <div class="ft-art" aria-hidden="true"><span class="ft-plane"><svg viewBox="0 0 24 24" width="30" height="30"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" fill="currentColor"/></svg></span></div>
        <div class="ft-body"><span class="eyebrow">Members get more</span>
          <h3>Are you a <em>frequent traveller?</em></h3>
          <p class="muted">Let us make your life easier. Get the best travel plans and member discounts straight to your inbox.</p>
          <form class="ft-form" novalidate>
            <label><span>Email address *</span><input name="email" type="email" required autocomplete="email" placeholder="you@example.com"></label>
            <label><span>Mobile number</span><div class="ph"><select name="cc" aria-label="Country code"><option>+965</option><option>+971</option><option>+966</option><option>+973</option><option>+974</option><option>+968</option><option>+91</option><option>+20</option><option>+63</option><option>+44</option></select><input name="phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="Mobile number"></div></label>
            <button class="btn btn-primary">Sign me up ${ARROW}</button><p class="err" aria-live="polite"></p>
            <p class="fine">No spam. Unsubscribe any time.</p>
          </form></div>`, (m, close) => {
          q('form', m).onsubmit = async e => {
            e.preventDefault(); const f = e.target, btn = q('button', f);
            btn.disabled = true; q('.err', f).textContent = '';
            try { await subscribe(f.email.value.trim(), f.phone.value.trim() ? `${f.cc.value} ${f.phone.value.trim()}` : '', 'popup'); thanks(q('.ft-body', m), 'Watch your inbox for member-only deals.'); setTimeout(close, 2600); }
            catch (er) { q('.err', f).textContent = er.message; btn.disabled = false; }
          };
        });
    };
    const t = setTimeout(show, 30000);
    const t0 = Date.now();
    const onScroll = () => { if (Date.now() - t0 > 15000 && scrollY / (document.body.scrollHeight - innerHeight) > .7) { removeEventListener('scroll', onScroll); clearTimeout(t); show(); } };
    addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('mouseout', e => { if (!e.relatedTarget && e.clientY < 4 && Date.now() - t0 > 8000) { clearTimeout(t); show(); } });
  }

  // ---------- popular routes (deep links into the booking engine) ----------
  const R_FROM = [['London', 'LHR'], ['Dubai', 'DXB'], ['New York', 'JFK'], ['Paris', 'CDG'], ['Amsterdam', 'AMS'], ['Mumbai', 'BOM'], ['Delhi', 'DEL']];
  const R_TO = [['Delhi', 'DEL'], ['Mumbai', 'BOM'], ['Manila', 'MNL'], ['Cairo', 'CAI'], ['Alexandria', 'HBE'], ['Dhaka', 'DAC'], ['Kathmandu', 'KTM'], ['Dubai', 'DXB']];
  const fmt = d => `${String(d.getDate()).padStart(2, '0')}${d.toLocaleString('en-GB', { month: 'short' })}${d.getFullYear()}`;
  function routeUrl(from, to) {
    const a = new Date(); a.setDate(a.getDate() + 7); const b = new Date(a); b.setDate(b.getDate() + 6);
    return `${PORTAL}/FlightResult/RoundTrip/${from}-${to}-${fmt(a)}_${to}-${from}-${fmt(b)}/A-1-C-0-I-0/Economy/false/all_flight/N-Y/false`;
  }
  function routes() {
    const el = q('#routes-grid'); if (!el) return;
    const item = (label, sub, from, to) => `<a class="route" href="${routeUrl(from, to)}" rel="noopener"><span class="r-codes"><b>${from}</b><i></i><b>${to}</b></span><span class="r-t"><b>${label}</b><small>${sub}</small></span><span class="r-go">${ARROW}</span></a>`;
    el.innerHTML = `
      <div class="r-col"><h3><span class="r-tag">From Kuwait</span></h3>${R_FROM.map(([c, k]) => item(`Kuwait to ${c}`, 'Round trip · Economy', 'KWI', k)).join('')}</div>
      <div class="r-col"><h3><span class="r-tag alt">To Kuwait</span></h3>${R_TO.map(([c, k]) => item(`${c} to Kuwait`, 'Round trip · Economy', k, 'KWI')).join('')}</div>`;
  }

  // ---------- manage booking page ----------
  function manage() {
    const root = q('#manage'); if (!root) return;
    q('#mb-call').href = `tel:${(SITE.phone || '').replace(/\s/g, '')}`; q('#mb-call b').textContent = SITE.phone;
    q('#mb-mail').href = `mailto:${SITE.email}`; q('#mb-mail b').textContent = SITE.email;
    const wa = (SITE.whatsapp || '').replace(/\D/g, ''); if (wa) { q('#mb-wa').href = `https://wa.me/${wa}`; q('#mb-wa').hidden = false; }
  }

  document.addEventListener('jt:content', ({ detail: c }) => {
    SITE = c.site || {};
    qa('[data-auth]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); auth(); }));
    routes(); manage(); chat(); frequentPopup();
    const sf = q('#subscribe');
    if (sf) sf.onsubmit = async e => { e.preventDefault(); const i = q('input', sf), b = q('button', sf); b.disabled = true;
      try { await subscribe(i.value.trim(), '', 'newsletter'); thanks(sf, 'Member deals are on their way.'); store.set('jt-ft', Date.now()); }
      catch (er) { b.disabled = false; i.setCustomValidity(er.message); i.reportValidity(); setTimeout(() => i.setCustomValidity(''), 3000); } };
  });
})();
