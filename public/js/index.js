const API = 'http://localhost:5000/api';

const CAT_COLORS = {
  plage:    { bg: 'rgba(56,189,248,0.1)',  border: 'rgba(56,189,248,0.22)',  text: '#38bdf8' },
  montagne: { bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.22)', text: '#94a3b8' },
  ville:    { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.22)', text: '#64748b' },
  aventure: { bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.22)',  text: '#34d399' },
  culture:  { bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.22)',  text: '#fb923c' },
  autre:    { bg: 'rgba(26,42,58,0.5)',    border: 'rgba(42,74,106,0.5)',    text: '#94a3b8' },
};

// ── Reveal animation ──────────────────────────────────────────────────────────

const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('visible');
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ── Counter animation ─────────────────────────────────────────────────────────

function animateCounter(id, target, suffix = '', duration = 1800) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = performance.now();
  const update = (now) => {
    const p    = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(ease * target) + suffix;
    if (p < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

const heroObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) {
    setTimeout(() => {
      animateCounter('count-voyages', 8);
      animateCounter('count-pays', 5);
    }, 600);
    heroObserver.disconnect();
  }
}, { threshold: 0.3 });

heroObserver.observe(document.querySelector('.hero-stats'));

// ── Exchange rate ─────────────────────────────────────────────────────────────

let cadRate = null;

async function fetchCadRate() {
  try {
    const r = await fetch(API.replace('/api', '') + '/api/rates');
    const d = await r.json();
    cadRate = d.rates && d.rates.CAD ? d.rates.CAD : null;
  } catch {
    cadRate = null;
  }
}

function formatPriceCad(eurAmount) {
  if (cadRate) {
    const cad = eurAmount * cadRate;
    return cad.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
  }
  return eurAmount.toLocaleString('fr-FR') + ' EUR';
}

// ── Carousel Destinations ─────────────────────────────────────────────────────
const CAT_LABELS = {
  plage: 'Plage', montagne: 'Montagne', ville: 'Ville',
  aventure: 'Aventure', culture: 'Culture', autre: 'Autre',
};

let _destVoyages   = [];
let _destIndex     = 0;
let _destTimer     = null;
let _destAnimating = false;

async function initDestCarousel() {
  try {
    const r   = await fetch(API + '/voyages');
    const all = await r.json();
    if (!Array.isArray(all)) {
      document.getElementById('voyages-carousel').innerHTML =
        '<div class="empty-state-grid">Impossible de charger les voyages.</div>';
      return;
    }
    const vedettes = all.filter(v => v.vedette);
    const rest     = all.filter(v => !v.vedette);
    _destVoyages   = [...vedettes, ...rest].slice(0, 6);
    if (!_destVoyages.length) {
      document.getElementById('voyages-carousel').innerHTML =
        '<div class="empty-state-grid">Aucun voyage disponible pour le moment.</div>';
      return;
    }
    buildDestStack();
    updateDestInfo(0);
    buildDestDots();
    startDestTimer();
    initDestSwipe();
  } catch {
    document.getElementById('voyages-carousel').innerHTML =
      '<div class="empty-state-grid">Impossible de charger les voyages. Vérifiez que le serveur est actif.</div>';
  }
}

function buildDestStack() {
  const stack = document.getElementById('dest-stack');
  stack.innerHTML = '';
  _destVoyages.forEach((v, i) => {
    const div = document.createElement('div');
    div.className   = 'dest-card';
    div.dataset.idx = i;
    div.dataset.pos = i < 5 ? i : 4;
    div.innerHTML = `
      <img src="${v.image || ''}" alt="${v.titre}" onerror="this.style.background='#0a1e33'" />
      <div class="dest-card-overlay"></div>`;
    stack.appendChild(div);
  });
}

function buildDestDots() {
  document.getElementById('dest-dots').innerHTML = _destVoyages.map((_, i) =>
    `<div class="dest-dot${i === 0 ? ' active' : ''}" onclick="goDestSlide(${i})"></div>`
  ).join('');
}

function updateDestInfo(idx) {
  const v    = _destVoyages[idx];
  const info = document.getElementById('dest-info');
  info.classList.add('fading');
  setTimeout(() => {
    document.getElementById('dest-cat').textContent   = CAT_LABELS[v.categorie] || v.categorie;
    document.getElementById('dest-title').textContent = v.titre;
    const locEl = document.getElementById('dest-location');
    locEl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
    const locText = document.createTextNode(v.destination);
    locEl.appendChild(locText);
    document.getElementById('dest-desc').textContent  = v.description;
    const metaEl = document.getElementById('dest-meta');
    metaEl.innerHTML = '';
    [`${+v.duree} jours`, formatPriceCad(v.prix), `${+v.placesDisponibles} places`].forEach(txt => {
      const span = document.createElement('span');
      span.textContent = txt;
      metaEl.appendChild(span);
    });
    info.classList.remove('fading');
  }, 150);
  document.querySelectorAll('.dest-dot').forEach((d, i) =>
    d.classList.toggle('active', i === idx));
}

function animateDestTo(newIdx, direction) {
  if (_destAnimating || newIdx === _destIndex) return;
  _destAnimating = true;
  stopDestTimer();

  const cards    = [...document.querySelectorAll('.dest-card')];
  const exitClass = direction === 'next' ? 'dest-exit-left' : 'dest-exit-right';

  const active = cards.find(c => +c.dataset.idx === _destIndex);
  if (active) active.classList.add(exitClass);

  _destIndex = newIdx;
  updateDestInfo(newIdx);

  const count = _destVoyages.length;
  cards.forEach(card => {
    if (card.classList.contains(exitClass)) { card.dataset.pos = 4; return; }
    const pos = (card.dataset.idx - newIdx + count) % count;
    card.dataset.pos = pos < 5 ? pos : 4;
  });

  setTimeout(() => {
    if (active) active.classList.remove(exitClass);
    _destAnimating = false;
    startDestTimer();
  }, 480);
}

function destNext() {
  if (!_destVoyages.length) return;
  animateDestTo((_destIndex + 1) % _destVoyages.length, 'next');
}
function destPrev() {
  if (!_destVoyages.length) return;
  animateDestTo((_destIndex - 1 + _destVoyages.length) % _destVoyages.length, 'prev');
}
function goDestSlide(i) {
  if (i === _destIndex || !_destVoyages.length) return;
  const count = _destVoyages.length;
  const fwd = (i - _destIndex + count) % count;
  const bwd = (_destIndex - i + count) % count;
  animateDestTo(i, fwd <= bwd ? 'next' : 'prev');
}

function startDestTimer() { _destTimer = setTimeout(() => { destNext(); }, 5000); }
function stopDestTimer()  { clearTimeout(_destTimer); }

function initDestSwipe() {
  const el = document.getElementById('dest-stack');
  let startX = 0;
  el.addEventListener('touchstart', e => { startX = e.touches[0].clientX; stopDestTimer(); }, { passive: true });
  el.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) dx < 0 ? destNext() : destPrev();
    else startDestTimer();
  });
}

// ── Contact form validation ───────────────────────────────────────────────────

const FC_RULES = {
  'fc-nom':     v => v.length === 0 ? { s: 'error', m: 'Le nom est requis' }     : v.trim().length < 2  ? { s: 'error', m: 'Minimum 2 caracteres' }  : { s: 'ok', m: '' },
  'fc-email':   v => v.length === 0 ? { s: 'error', m: "L'email est requis" }    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? { s: 'error', m: 'Format invalide — ex: nom@domaine.com' } : { s: 'ok', m: '' },
  'fc-sujet':   v => v.length === 0 ? { s: 'error', m: 'Le sujet est requis' }   : v.trim().length < 3  ? { s: 'error', m: 'Minimum 3 caracteres' }  : { s: 'ok', m: '' },
  'fc-message': v => v.length === 0 ? { s: 'error', m: 'Le message est requis' } : v.trim().length < 10 ? { s: 'error', m: `Minimum 10 caracteres (${v.trim().length}/10)` } : { s: 'ok', m: '' },
};

function fcValidate(id, force = false) {
  const input = document.getElementById(id);
  const hint  = document.getElementById('fch-' + id);
  if (!input || !FC_RULES[id]) return true;

  const v    = input.value;
  const { s, m } = FC_RULES[id](v);
  const ok   = s === 'ok';
  const show = force || v.length > 0;

  input.style.borderColor = !show
    ? '#1a3a5c'
    : ok ? 'rgba(52,211,153,0.5)' : 'rgba(248,113,113,0.5)';

  if (hint) {
    const color = ok ? '#34d399' : '#f87171';
    const icon  = ok
      ? '<polyline points="20 6 9 17 4 12"/>'
      : '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
    hint.innerHTML = show && m
      ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5">${icon}</svg><span style="color:${color}">${m}</span>`
      : '';
  }
  return ok;
}

function fcValidateAll() {
  return ['fc-nom', 'fc-email', 'fc-sujet', 'fc-message']
    .map(id => fcValidate(id, true))
    .every(Boolean);
}

async function submitContact(ev) {
  ev.preventDefault();
  if (!fcValidateAll()) return;

  const btn = document.getElementById('contact-submit-btn');
  const res = document.getElementById('fc-response');

  btn.textContent = 'Envoi en cours...';
  btn.disabled    = true;

  try {
    const r = await fetch(API + '/contact', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        nom:     document.getElementById('fc-nom').value,
        email:   document.getElementById('fc-email').value,
        sujet:   document.getElementById('fc-sujet').value,
        message: document.getElementById('fc-message').value,
      }),
    });

    if (r.ok) {
      ev.target.reset();
      res.innerHTML = '<div class="alert-success">Message envoye avec succes. Nous vous repondrons sous 24h.</div>';
    } else {
      res.innerHTML = '<div class="alert-error">Une erreur est survenue. Veuillez reessayer.</div>';
    }
  } catch {
    res.innerHTML = '<div class="alert-error">Serveur inaccessible. Verifiez votre connexion.</div>';
  }

  btn.textContent = 'Envoyer le message';
  btn.disabled    = false;
}

// ── Sticky nav ────────────────────────────────────────────────────────────────

window.addEventListener('scroll', () => {
  const nav = document.querySelector('nav');
  if (window.scrollY > 20) {
    nav.style.background  = 'rgba(6,13,24,0.96)';
    nav.style.boxShadow   = '0 4px 30px rgba(0,0,0,0.4)';
  } else {
    nav.style.background  = 'rgba(6,13,24,0.8)';
    nav.style.boxShadow   = 'none';
  }
});

// ── Reserve guard ────────────────────────────────────────────────────────────

function goReserve(ev) {
  ev.preventDefault();
  const token = localStorage.getItem('token');
  window.location.href = token
    ? '/dashboard.html#reserver'
    : '/dashboard.html#login';
}

// ── Souvenirs Carousel ────────────────────────────────────────────────────────
let _sPhotos = [];
let _sIdx    = 0;
let _sTimer  = null;

async function loadSouvenirs() {
  try {
    const r      = await fetch(API + '/albums');
    if (!r.ok) return;
    const albums = await r.json();
    if (!Array.isArray(albums)) return;
    _sPhotos = albums.flatMap(a => Array.isArray(a.photos) ? a.photos : []);
    if (!_sPhotos.length) return;
    document.getElementById('souvenirs').style.display = '';
    buildSouvenirsSlides();
    buildSouvenirsDots();
    startSouvenirsTimer();
    initSouvenirsSwipe();
  } catch { /* silencieux — section reste masquée */ }
}

function buildSouvenirsSlides() {
  const track = document.getElementById('souvenirs-track');
  track.innerHTML = '';
  _sPhotos.forEach(p => {
    const slide = document.createElement('div');
    slide.className = 'souvenirs-slide';
    const img = document.createElement('img');
    img.src = p.url || '';
    img.alt = p.legende || '';
    img.onerror = () => { img.style.background = '#0a1e33'; };
    slide.appendChild(img);
    if (p.legende) {
      const cap = document.createElement('div');
      cap.className = 'souvenirs-caption';
      cap.textContent = p.legende;
      slide.appendChild(cap);
    }
    track.appendChild(slide);
  });
}

function buildSouvenirsDots() {
  const el = document.getElementById('souvenirs-dots');
  el.innerHTML = '';
  _sPhotos.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'souvenirs-dot' + (i === 0 ? ' active' : '');
    dot.onclick = () => goSouvenirSlide(i);
    el.appendChild(dot);
  });
}

function setSouvenirsPos(idx) {
  _sIdx = ((idx % _sPhotos.length) + _sPhotos.length) % _sPhotos.length;
  document.getElementById('souvenirs-track').style.transform = `translateX(-${_sIdx * 100}%)`;
  document.querySelectorAll('.souvenirs-dot').forEach((d, i) =>
    d.classList.toggle('active', i === _sIdx));
}

function souvenirsNext()    { if (!_sPhotos.length) return; setSouvenirsPos(_sIdx + 1); resetSouvenirsTimer(); }
function souvenirsPrev()    { if (!_sPhotos.length) return; setSouvenirsPos(_sIdx - 1); resetSouvenirsTimer(); }
function goSouvenirSlide(i) { setSouvenirsPos(i); resetSouvenirsTimer(); }

function startSouvenirsTimer() { _sTimer = setInterval(() => souvenirsNext(), 4000); }
function resetSouvenirsTimer() { clearInterval(_sTimer); startSouvenirsTimer(); }

function initSouvenirsSwipe() {
  const el = document.getElementById('souvenirs-track');
  let sx = 0;
  el.addEventListener('touchstart', e => { sx = e.touches[0].clientX; clearInterval(_sTimer); }, { passive: true });
  el.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) dx < 0 ? souvenirsNext() : souvenirsPrev();
    else startSouvenirsTimer();
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

fetchCadRate().then(() => { initDestCarousel(); loadSouvenirs(); });
