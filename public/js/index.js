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

// ── Voyage cards ──────────────────────────────────────────────────────────────

function renderVoyageCard(v, index) {
  const cc   = CAT_COLORS[v.categorie] || CAT_COLORS.ville;
  const date = new Date(v.dateDepart).toLocaleDateString('fr-FR');
  const desc = v.description.substring(0, 110) + '...';

  return `
    <div class="v-card reveal" style="transition-delay:${index * 0.08}s">
      <div class="v-img-wrap">
        <img class="v-img" src="${v.image || ''}" alt="${v.titre}" onerror="this.style.display='none'" />
        <div class="v-img-overlay"></div>
        <div class="v-img-badges">
          ${v.vedette ? '<span class="badge-vedette">Vedette</span>' : ''}
        </div>
      </div>
      <div class="v-body">
        <div class="v-cat" style="--cat-bg:${cc.bg};--cat-bd:${cc.border};--cat-tx:${cc.text}">${v.categorie}</div>
        <div class="v-title">${v.titre}</div>
        <div class="v-dest">${v.destination}</div>
        <div class="v-desc">${desc}</div>
        <div class="v-meta">
          <span>${date}</span>
          <span>${v.duree} jours</span>
          <span>${v.placesDisponibles} places</span>
        </div>
        <div class="v-footer">
          <div class="v-price">${formatPriceCad(v.prix)}</div>
          <a href="/dashboard.html#reserver" class="btn-reserve" onclick="goReserve(event)">Reserver</a>
        </div>
      </div>
    </div>`;
}

async function loadFeaturedVoyages() {
  const grid = document.getElementById('voyages-grid');
  try {
    const r   = await fetch(API + '/voyages');
    const all = await r.json();

    const vedettes = all.filter(v =>  v.vedette);
    const rest     = all.filter(v => !v.vedette);
    const voyages  = [...vedettes, ...rest].slice(0, 6);

    if (!voyages.length) {
      grid.innerHTML = '<div class="empty-state-grid">Aucun voyage disponible pour le moment.</div>';
      return;
    }

    grid.innerHTML = voyages.map((v, i) => renderVoyageCard(v, i)).join('');
    document.querySelectorAll('.v-card.reveal').forEach(el => observer.observe(el));
  } catch {
    grid.innerHTML = '<div class="empty-state-grid">Impossible de charger les voyages. Verifiez que le serveur est actif.</div>';
  }
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

// ── Init ──────────────────────────────────────────────────────────────────────

fetchCadRate().then(() => loadFeaturedVoyages());
