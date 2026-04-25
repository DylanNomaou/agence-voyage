const API = 'http://localhost:5000/api';

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let token       = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

// ── Devises ────────────────────────────────────────────────────────────────────
let currentCurrency = 'CAD';
let exchangeRates   = { EUR: 1 };

const CURRENCY_SYMBOLS = {
  EUR: '€', USD: '$', CAD: 'CA$', GBP: '£',
  CHF: 'CHF', JPY: '¥', MAD: 'MAD', AUD: 'A$',
};

async function fetchRates() {
  try {
    document.getElementById('rate-loading').style.display = 'inline';
    const r = await fetch(API.replace('/api', '') + '/api/rates');
    const d = await r.json();
    exchangeRates = { EUR: 1, ...d.rates };
  } catch {
    exchangeRates = { EUR:1, USD:1.08, CAD:1.47, GBP:0.85, CHF:0.97, JPY:161, MAD:10.7, AUD:1.66 };
  } finally {
    document.getElementById('rate-loading').style.display = 'none';
  }
}

function convertPrice(eurAmount) {
  return Math.round(eurAmount * (exchangeRates[currentCurrency] || 1));
}

function formatPrice(eurAmount) {
  const sym = CURRENCY_SYMBOLS[currentCurrency] || currentCurrency;
  return convertPrice(eurAmount).toLocaleString('fr-FR') + ' ' + sym;
}

function changeCurrency(val) {
  currentCurrency = val;
  loadVoyages();
  updatePrixPreview();
}

// ── Helpers HTTP ───────────────────────────────────────────────────────────────
function authHeader() {
  return { Authorization: 'Bearer ' + token };
}

function jsonHeader() {
  return { 'Content-Type': 'application/json' };
}

// ── Modal confirmation ─────────────────────────────────────────────────────────
let _confirmResolve = null;

function showConfirm({ title, msg, type = 'warning', okLabel = 'Confirmer' }) {
  return new Promise(resolve => {
    _confirmResolve = resolve;
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-msg').textContent   = msg;
    const iconEl = document.getElementById('confirm-icon');
    const okBtn  = document.getElementById('confirm-ok-btn');
    if (type === 'danger') {
      iconEl.style.background = 'rgba(248,113,113,0.12)';
      iconEl.style.border     = '1px solid rgba(248,113,113,0.25)';
      iconEl.innerHTML        = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>';
      okBtn.style.background  = '#f87171';
      okBtn.style.color       = '#060d18';
    } else {
      iconEl.style.background = 'rgba(251,191,36,0.1)';
      iconEl.style.border     = '1px solid rgba(251,191,36,0.25)';
      iconEl.innerHTML        = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
      okBtn.style.background  = '#fbbf24';
      okBtn.style.color       = '#060d18';
    }
    okBtn.textContent = okLabel;
    document.getElementById('confirm-modal').style.display = 'flex';
  });
}

function closeConfirm(result) {
  document.getElementById('confirm-modal').style.display = 'none';
  if (_confirmResolve) { _confirmResolve(result); _confirmResolve = null; }
}

// ── Catégories ─────────────────────────────────────────────────────────────────
const CAT = {
  plage:    { bg: '#0e4a5a', border: '#0e7a9a', text: '#67e8f9' },
  montagne: { bg: '#3b1f6e', border: '#6d3db8', text: '#d8b4fe' },
  ville:    { bg: '#2a3142', border: '#4a5578', text: '#cbd5e1' },
  aventure: { bg: '#0d3d2a', border: '#15694a', text: '#6ee7b7' },
  culture:  { bg: '#4a2010', border: '#923d1c', text: '#fdba74' },
  autre:    { bg: '#1a2a3a', border: '#2a4a6a', text: '#94a3b8' },
};

const STATUT_LABELS = { en_attente: 'En attente', confirmee: 'Confirmée', annulee: 'Annulée' };

// ── Init ───────────────────────────────────────────────────────────────────────
window.onload = async () => {
  checkApiStatus();
  updateAuthUI();
  loadHeroVideo();
  await fetchRates();

  const hash = window.location.hash.replace('#', '');
  if (hash && document.getElementById('tab-' + hash)) {
    showTab(hash, null);
  }
};

async function checkApiStatus() {
  const dot  = document.getElementById('status-dot');
  const text = document.getElementById('api-status-text');
  try {
    await fetch('http://localhost:5000/');
    dot.classList.remove('offline');
    text.textContent = 'Serveur actif';
  } catch {
    dot.classList.add('offline');
    text.textContent = 'Hors ligne';
  }
}

// ── Vidéo hero ────────────────────────────────────────────────────────────────
async function loadHeroVideo() {
  try {
    const r = await fetch(API + '/settings/hero-video');
    const d = await r.json();
    const vid = document.getElementById('hero-video');
    const bg  = document.getElementById('hero-video-bg');
    if (d.videoUrl && vid) {
      vid.src = d.videoUrl;
      vid.load();
      if (bg) bg.classList.add('has-video');
    } else {
      if (bg) bg.classList.remove('has-video');
    }
  } catch {}
}

function onHeroVideoFileChange(input) {
  const file = input.files[0];
  const namEl = document.getElementById('video-file-name');
  const ph    = document.getElementById('video-picker-placeholder');
  const btn   = document.getElementById('btn-upload-hero-video');
  if (file) {
    ph.style.display   = 'none';
    namEl.style.display = 'block';
    namEl.textContent   = file.name + ' (' + (file.size / 1024 / 1024).toFixed(1) + ' Mo)';
    btn.disabled = false;
  } else {
    ph.style.display   = 'flex';
    namEl.style.display = 'none';
    btn.disabled = true;
  }
}

async function uploadHeroVideo() {
  const fileInput = document.getElementById('hero-video-file');
  const file = fileInput.files[0];
  if (!file) return;

  const el       = document.getElementById('hero-video-upload-response');
  const btn      = document.getElementById('btn-upload-hero-video');
  const progress = document.getElementById('hero-video-progress');
  const bar      = document.getElementById('hero-progress-bar');
  const label    = document.getElementById('hero-progress-label');

  btn.disabled = true;
  el.innerHTML = '<div class="form-hint" style="margin-top:0">Envoi en cours…</div>';
  progress.style.display = 'flex';
  bar.style.width = '0%';
  label.textContent = '0%';

  const fd = new FormData();
  fd.append('video', file);

  return new Promise(resolve => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', API + '/settings/hero-video');
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        bar.style.width    = pct + '%';
        label.textContent  = pct + '%';
      }
    };

    xhr.onload = () => {
      progress.style.display = 'none';
      btn.disabled = false;
      try {
        const d = JSON.parse(xhr.responseText);
        if (xhr.status === 200) {
          el.innerHTML = '<div class="alert-cyan" style="margin-top:0">Vidéo mise en ligne avec succès.</div>';
          fileInput.value = '';
          onHeroVideoFileChange(fileInput);
          loadHeroVideo();
          loadSettingsTab();
        } else {
          el.innerHTML = '<div class="alert-error">' + (d.message || 'Erreur upload.') + '</div>';
        }
      } catch {
        el.innerHTML = '<div class="alert-error">Erreur inattendue (statut ' + xhr.status + ').</div>';
      }
      resolve();
    };

    xhr.onerror = () => {
      progress.style.display = 'none';
      btn.disabled = false;
      el.innerHTML = '<div class="alert-error">Erreur réseau.</div>';
      resolve();
    };

    xhr.send(fd);
  });
}

async function removeHeroVideo() {
  const ok = await showConfirm({
    title:   'Supprimer la vidéo',
    msg:     "La vidéo d'accueil sera définitivement supprimée.",
    type:    'danger',
    okLabel: 'Supprimer',
  });
  if (!ok) return;
  try {
    const r = await fetch(API + '/settings/hero-video', { method: 'DELETE', headers: authHeader() });
    if (r.ok) {
      const vid = document.getElementById('hero-video');
      const bg  = document.getElementById('hero-video-bg');
      if (vid) { vid.src = ''; vid.load(); }
      if (bg)  bg.classList.remove('has-video');
      loadSettingsTab();
    }
  } catch (err) {
    alert('Erreur réseau : ' + err.message);
  }
}

async function loadSettingsTab() {
  const container = document.getElementById('current-hero-video');
  if (!container) return;
  try {
    const r = await fetch(API + '/settings/hero-video');
    const d = await r.json();
    if (d.videoUrl) {
      container.innerHTML = `
        <div class="settings-video-wrap">
          <p class="form-label" style="margin-bottom:8px">Vidéo actuelle</p>
          <video src="${esc(d.videoUrl)}" controls muted class="settings-video-preview"></video>
          <button onclick="removeHeroVideo()" class="btn-danger" style="margin-top:10px;display:inline-flex;align-items:center;gap:6px;font-size:0.82rem">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            Supprimer la vidéo
          </button>
        </div>`;
    } else {
      container.innerHTML = '<p class="form-hint">Aucune vidéo configurée pour le moment.</p>';
    }
  } catch {
    container.innerHTML = '';
  }
}

// ── Auth UI ────────────────────────────────────────────────────────────────────
function updateAuthUI() {
  const isLoggedIn = !!currentUser;
  const isAdmin    = currentUser?.role === 'admin';

  document.getElementById('header-login-btn').style.display = isLoggedIn ? 'none'       : 'inline-flex';
  document.getElementById('header-user').style.display      = isLoggedIn ? 'flex'       : 'none';
  document.getElementById('sidebar-logged-out').style.display = isLoggedIn ? 'none'     : 'block';
  document.getElementById('sidebar-logged-in').style.display  = isLoggedIn ? 'block'    : 'none';
  document.getElementById('nav-auth-section').style.display   = isLoggedIn ? 'none'     : 'block';
  document.getElementById('nav-admin-voyages').style.display  = isAdmin    ? 'block'    : 'none';
  document.getElementById('nav-client-section').style.display = isLoggedIn ? 'block'    : 'none';
  document.getElementById('nav-admin-messages').style.display = isAdmin    ? 'block'    : 'none';
  const navAlbums = document.getElementById('nav-admin-albums');
  if (navAlbums) navAlbums.style.display = isAdmin ? 'block' : 'none';
  const navAdminRes = document.getElementById('nav-admin-reservations');
  if (navAdminRes) navAdminRes.style.display = isAdmin ? 'block' : 'none';
  const navSettings = document.getElementById('nav-admin-settings');
  if (navSettings) navSettings.style.display = isAdmin ? 'block' : 'none';

  if (isLoggedIn) {
    const initial = currentUser.nom.charAt(0).toUpperCase();
    applyAvatarToEl(document.getElementById('header-avatar'),  currentUser, initial);
    applyAvatarToEl(document.getElementById('sidebar-avatar'), currentUser, initial);
    document.getElementById('header-username').textContent    = currentUser.nom;
    document.getElementById('header-role').textContent        = isAdmin ? 'Administrateur' : 'Client';
    document.getElementById('sidebar-username').textContent   = currentUser.nom;
    document.getElementById('sidebar-role-label').textContent = isAdmin ? 'Administrateur' : 'Client';
  }

  const activeTab = document.querySelector('.tab-content.active');
  if (activeTab) {
    const id        = activeTab.id;
    const gated     = ['tab-reservations', 'tab-reserver', 'tab-contact', 'tab-messages', 'tab-voyage-create', 'tab-souvenirs'];
    const adminOnly = ['tab-voyage-create', 'tab-messages', 'tab-admin-reservations', 'tab-albums'];
    if (!isLoggedIn && gated.includes(id)) {
      showTab('voyages', document.querySelector('.nav-btn'));
    } else if (isLoggedIn && !isAdmin && adminOnly.includes(id)) {
      showTab('voyages', document.querySelector('.nav-btn'));
    }
  }
}

function showTab(name, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('nav-active'));
  document.getElementById('tab-' + name).classList.add('active');
  if (btn) btn.classList.add('nav-active');
  if (name === 'reserver')     loadVoyagesForSelect();
  if (name === 'reservations') loadReservations();
  if (name === 'messages')     loadMessages();
  if (name === 'profile')      loadProfileTab();
  if (name === 'voyages') loadVoyages();
  if (name === 'albums' && typeof loadAlbums === 'function') loadAlbums();
  if (name === 'souvenirs') loadSouvenirsDash();
  if (name === 'settings') loadSettingsTab();
  if (name === 'admin-reservations') loadAdminReservations();
}

function logout() {
  token       = null;
  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
  updateAuthUI();
}


// ── Validation ─────────────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RULES = {
  'reg-nom':   v => !v.length ? { s: 'error', m: 'Le nom est requis' }
                  : v.trim().length < 2 ? { s: 'error', m: 'Au moins 2 caractères (' + v.trim().length + '/2)' }
                  : { s: 'ok', m: 'Nom valide' },

  'reg-email': v => !v.length ? { s: 'error', m: "L'email est requis" }
                  : !EMAIL_RE.test(v) ? { s: 'error', m: 'Format invalide — ex: nom@domaine.com' }
                  : { s: 'ok', m: 'Email valide' },

  'reg-pwd': v => {
    if (!v.length)       return { s: 'error', m: 'Le mot de passe est requis' };
    if (v.length < 8)    return { s: 'error', m: 'Trop court — ' + v.length + '/8 minimum' };
    if (!/[A-Z]/.test(v)) return { s: 'error', m: 'Au moins une majuscule requise' };
    return { s: 'ok', m: 'Mot de passe valide' };
  },

  'reg-pwd-confirm': v => {
    const pwd = document.getElementById('reg-pwd')?.value || '';
    if (!v.length) return { s: 'error', m: 'Veuillez confirmer le mot de passe' };
    if (v !== pwd) return { s: 'error', m: 'Les mots de passe ne correspondent pas' };
    return { s: 'ok', m: 'Les mots de passe correspondent' };
  },

  'login-email': v => !v.length ? { s: 'error', m: "L'email est requis" }
                    : !EMAIL_RE.test(v) ? { s: 'error', m: 'Format invalide' }
                    : { s: 'ok', m: '' },

  'login-pwd': v => !v.length ? { s: 'error', m: 'Le mot de passe est requis' }
                  : v.length < 6 ? { s: 'error', m: 'Au moins 6 caractères' }
                  : { s: 'ok', m: '' },

  'v-titre':  v => !v.length ? { s: 'error', m: 'Le titre est requis' }
                  : v.trim().length < 3 ? { s: 'error', m: 'Minimum 3 caractères (' + v.trim().length + '/3)' }
                  : { s: 'ok', m: '' },

  'v-dest':   v => !v.length ? { s: 'error', m: 'La destination est requise' }
                  : v.trim().length < 2 ? { s: 'error', m: 'Minimum 2 caractères' }
                  : { s: 'ok', m: '' },

  'v-desc':   v => !v.length ? { s: 'error', m: 'La description est requise' }
                  : v.trim().length < 20 ? { s: 'error', m: 'Minimum 20 caractères (' + v.trim().length + '/20)' }
                  : { s: 'ok', m: '' },

  'v-prix':   v => !v.length ? { s: 'error', m: 'Le prix est requis' }
                  : isNaN(v) || Number(v) < 1 ? { s: 'error', m: 'Montant invalide (minimum 1)' }
                  : { s: 'ok', m: '' },

  'v-duree':  v => !v.length ? { s: 'error', m: 'La durée est requise' }
                  : isNaN(v) || Number(v) < 1 || !Number.isInteger(Number(v)) ? { s: 'error', m: 'Nombre de jours invalide' }
                  : { s: 'ok', m: '' },

  'v-places': v => !v.length ? { s: 'error', m: 'Nombre de places requis' }
                  : isNaN(v) || Number(v) < 1 ? { s: 'error', m: 'Minimum 1 place disponible' }
                  : { s: 'ok', m: '' },

  'v-date':   v => !v ? { s: 'error', m: 'La date de départ est requise' }
                  : new Date(v) < new Date() ? { s: 'error', m: 'La date doit être dans le futur' }
                  : { s: 'ok', m: '' },

  'res-nb':   v => !v.length ? { s: 'error', m: 'Nombre de personnes requis' }
                  : isNaN(v) || Number(v) < 1 ? { s: 'error', m: 'Minimum 1 personne' }
                  : { s: 'ok', m: '' },

  'c-nom':    v => !v.length ? { s: 'error', m: 'Le nom est requis' }
                  : v.trim().length < 2 ? { s: 'error', m: 'Minimum 2 caractères' }
                  : { s: 'ok', m: '' },

  'c-email':  v => !v.length ? { s: 'error', m: "L'email est requis" }
                  : !EMAIL_RE.test(v) ? { s: 'error', m: 'Format invalide — ex: nom@domaine.com' }
                  : { s: 'ok', m: '' },

  'c-sujet':  v => !v.length ? { s: 'error', m: 'Le sujet est requis' }
                  : v.trim().length < 3 ? { s: 'error', m: 'Minimum 3 caractères' }
                  : { s: 'ok', m: '' },

  'c-message': v => !v.length ? { s: 'error', m: 'Le message est requis' }
                   : v.trim().length < 10 ? { s: 'error', m: 'Minimum 10 caractères (' + v.trim().length + '/10)' }
                   : { s: 'ok', m: '' },

  'profile-nom':   v => !v.length ? { s: 'error', m: 'Le nom est requis' }
                       : v.trim().length < 2 ? { s: 'error', m: 'Minimum 2 caractères' }
                       : { s: 'ok', m: '' },

  'profile-email': v => !v.length ? { s: 'error', m: "L'email est requis" }
                       : !EMAIL_RE.test(v) ? { s: 'error', m: 'Format invalide' }
                       : { s: 'ok', m: '' },

  'profile-pwd-new': v => {
    if (!v.length)       return { s: 'ok', m: '' };
    if (v.length < 8)    return { s: 'error', m: 'Trop court — ' + v.length + '/8 minimum' };
    if (!/[A-Z]/.test(v)) return { s: 'error', m: 'Au moins une majuscule requise' };
    return { s: 'ok', m: 'Nouveau mot de passe valide' };
  },

  'profile-pwd-confirm': v => {
    const p = document.getElementById('profile-pwd-new')?.value || '';
    if (!v.length && !p.length) return { s: 'ok', m: '' };
    if (!v.length) return { s: 'error', m: 'Confirmez le nouveau mot de passe' };
    if (v !== p)   return { s: 'error', m: 'Les mots de passe ne correspondent pas' };
    return { s: 'ok', m: 'Les mots de passe correspondent' };
  },
};

function svgCheck() {
  return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0"><polyline points="20 6 9 17 4 12"/></svg>';
}
function svgX() {
  return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
}

function validateField(id, force = false) {
  const input = document.getElementById(id);
  const hint  = document.getElementById('hint-' + id);
  if (!input || !RULES[id]) return true;
  const val      = input.value;
  const { s, m } = RULES[id](val);
  const show     = force || val.length > 0;
  input.classList.remove('valid', 'invalid');
  if (show) input.classList.add(s === 'ok' ? 'valid' : 'invalid');
  if (hint) {
    hint.className = 'field-hint' + (show ? ' ' + s : '');
    hint.innerHTML = show && m ? (s === 'ok' ? svgCheck() : svgX()) + m : '';
  }
  if (id === 'reg-pwd') updatePwdStrength(val);
  return s === 'ok';
}

function validateForm(fields) {
  return fields.map(id => validateField(id, true)).every(Boolean);
}

function updatePwdStrength(val) {
  const wrap  = document.getElementById('pwd-strength');
  const label = document.getElementById('pwd-strength-label');
  if (!wrap) return;
  if (!val.length) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';
  let score = 0;
  if (val.length >= 8)           score++;
  if (val.length >= 12)          score++;
  if (/[A-Z]/.test(val))        score++;
  if (/[0-9]/.test(val))        score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const level  = score <= 1 ? 0 : score <= 3 ? 1 : 2;
  const filled = [1, 2, 4][level];
  const cls    = ['active-weak', 'active-medium', 'active-strong'][level];
  [1, 2, 3, 4].forEach(i => {
    document.getElementById('sb-' + i).className = 'strength-bar' + (i <= filled ? ' ' + cls : '');
  });
  label.textContent = 'Force : ' + ['Faible', 'Moyen', 'Fort'][level];
  label.style.color = ['#f87171', '#fbbf24', '#34d399'][level];
}

// ── Inscription ────────────────────────────────────────────────────────────────
async function submitRegister(ev) {
  ev.preventDefault();
  if (!validateForm(['reg-nom', 'reg-email', 'reg-pwd', 'reg-pwd-confirm'])) return;
  const el  = document.getElementById('register-response');
  const btn = document.getElementById('btn-register');
  btn.textContent = 'Creation en cours...';
  btn.disabled    = true;
  try {
    const r = await fetch(API + '/auth/register', {
      method:  'POST',
      headers: jsonHeader(),
      body:    JSON.stringify({
        nom:        document.getElementById('reg-nom').value.trim(),
        email:      document.getElementById('reg-email').value.trim(),
        motDePasse: document.getElementById('reg-pwd').value,
      }),
    });
    const d = await r.json();
    if (r.ok) {
      token       = d.token;
      currentUser = d.user;
      localStorage.setItem('token',       token);
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      updateAuthUI();
      el.innerHTML = '<div class="alert-success">Compte cree avec succes. Bienvenue, ' + d.user.nom + ' !</div>';
      document.getElementById('form-register').reset();
      ['reg-nom', 'reg-email', 'reg-pwd', 'reg-pwd-confirm'].forEach(id => {
        document.getElementById(id)?.classList.remove('valid', 'invalid');
        const h = document.getElementById('hint-' + id);
        if (h) h.innerHTML = '';
      });
      document.getElementById('pwd-strength').style.display = 'none';
      setTimeout(() => showTab('accueil', document.getElementById('nav-btn-accueil')), 1000);
    } else {
      el.innerHTML = '<div class="alert-error">' + (d.message || 'Erreur lors de la création du compte') + '</div>';
    }
  } catch (err) {
    el.innerHTML = '<div class="alert-error">Erreur reseau : ' + err.message + '</div>';
  }
  btn.textContent = 'Créer mon compte';
  btn.disabled    = false;
}

// ── Connexion ──────────────────────────────────────────────────────────────────
async function submitLogin(ev) {
  ev.preventDefault();
  if (!validateForm(['login-email', 'login-pwd'])) return;
  const el  = document.getElementById('login-response');
  const btn = document.getElementById('btn-login');
  btn.textContent = 'Connexion...';
  btn.disabled    = true;
  try {
    const r = await fetch(API + '/auth/login', {
      method:  'POST',
      headers: jsonHeader(),
      body:    JSON.stringify({
        email:      document.getElementById('login-email').value.trim(),
        motDePasse: document.getElementById('login-pwd').value,
      }),
    });
    const d = await r.json();
    if (r.ok) {
      token       = d.token;
      currentUser = d.user;
      localStorage.setItem('token',       token);
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      updateAuthUI();
      setTimeout(() => {
        if (d.user.role === 'admin') {
          showTab('reservations', null);
        } else {
          showTab('voyages', document.querySelector('.nav-btn'));
        }
      }, 600);
    } else {
      el.innerHTML = '<div class="alert-error">' + (d.message || 'Email ou mot de passe incorrect') + '</div>';
      const form = document.getElementById('form-login');
      form.style.animation = 'shake 0.4s ease';
      setTimeout(() => form.style.animation = '', 400);
    }
  } catch (err) {
    el.innerHTML = '<div class="alert-error">Erreur reseau : ' + err.message + '</div>';
  }
  btn.textContent = 'Se connecter';
  btn.disabled    = false;
}

// ── Pagination ─────────────────────────────────────────────────────────────────
function renderPagination(containerId, current, total, onPageChange) {
  const el = document.getElementById(containerId);
  if (!el || total <= 1) { if (el) el.innerHTML = ''; return; }

  const pages = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push('…');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('…');
    pages.push(total);
  }

  const btn = (label, page, disabled, active) =>
    `<button class="pg-btn${active ? ' pg-active' : ''}${disabled ? ' pg-disabled' : ''}"
      ${disabled ? 'disabled' : `onclick="(${onPageChange.name})(${page})"`}>${label}</button>`;

  el.innerHTML =
    '<div class="pagination">' +
    btn('←', current - 1, current === 1, false) +
    pages.map(p => p === '…'
      ? '<span class="pg-ellipsis">…</span>'
      : btn(p, p, false, p === current)
    ).join('') +
    btn('→', current + 1, current === total, false) +
    '</div>';
}

// ── Voyages ────────────────────────────────────────────────────────────────────
let _voyagesPage   = 1;
let _filterTimeout = null;

function debouncedLoadVoyages() {
  clearTimeout(_filterTimeout);
  _filterTimeout = setTimeout(() => loadVoyages(1), 260);
}

function resetFilters() {
  document.getElementById('filter-categorie').value = '';
  document.getElementById('filter-prix-min').value  = '';
  document.getElementById('filter-prix').value       = '';
  document.getElementById('filter-dest').value       = '';
  document.getElementById('filter-vedette').checked  = false;
  loadVoyages(1);
}

async function loadVoyages(page = 1) {
  _voyagesPage = page;
  const params   = new URLSearchParams();
  const cat      = document.getElementById('filter-categorie')?.value;
  const prixMin  = document.getElementById('filter-prix-min')?.value;
  const prix     = document.getElementById('filter-prix')?.value;
  const dest     = document.getElementById('filter-dest')?.value;
  const ved      = document.getElementById('filter-vedette')?.checked;
  const rate     = exchangeRates[currentCurrency] || 1;
  if (cat)     params.set('categorie', cat);
  if (prixMin) params.set('prixMin',   Math.round(Number(prixMin) / rate));
  if (prix)    params.set('prixMax',   Math.round(Number(prix)    / rate));
  if (dest)    params.set('q',         dest);
  if (ved)  params.set('vedette',     'true');
  params.set('page', page);
  params.set('limit', 10);

  const c = document.getElementById('voyages-container');
  c.innerHTML = '<div class="empty-state">Chargement...</div>';
  try {
    const r   = await fetch(API + '/voyages?' + params);
    const res = await r.json();
    if (!r.ok) {
      c.innerHTML = '<div class="alert-error">' + (res.message || 'Erreur') + '</div>';
      return;
    }
    const vs  = res.data;
    if (!vs || !vs.length) {
      c.innerHTML = '<div class="empty-state">Aucun voyage trouvé.</div>';
      renderPagination('voyages-pagination', res.page, res.totalPages, loadVoyages);
      return;
    }
    c.innerHTML =
      '<p class="results-count">' + res.total + ' voyage(s) trouvé(s)</p>' +
      '<div class="voyages-grid">' +
      vs.map(renderVoyageCard).join('') +
      '</div>';
    renderPagination('voyages-pagination', res.page, res.totalPages, loadVoyages);
  } catch (err) {
    c.innerHTML = '<div class="alert-error">Erreur : ' + err.message + '</div>';
  }
}

function renderVoyageCard(v) {
  const cc = CAT[v.categorie] || CAT.ville;
  return `
    <div class="voyage-card" data-id="${v._id}">
      <div class="voyage-img-wrap voyage-img-clickable" onclick='viewVoyage(${JSON.stringify(JSON.stringify(v))})'>
        <img src="${v.image || ''}" alt="${v.titre}" onerror="this.style.display='none'" />
        <div class="v-img-badges">
          ${v.vedette ? '<span class="badge-vedette">Vedette</span>' : ''}
          <span class="badge-cat" style="--cat-bg:${cc.bg};--cat-bd:${cc.border};--cat-tx:${cc.text}">${v.categorie}</span>
        </div>
      </div>
      <div class="vc-body">
        <div class="vc-title">${v.titre}</div>
        <div class="vc-dest">${v.destination}</div>
        <div class="vc-desc">${v.description.substring(0, 95)}...</div>
        <div class="vc-meta">
          <span>${new Date(v.dateDepart).toLocaleDateString('fr-FR')}</span>
          <span>${v.placesDisponibles} places</span>
          <span>${v.duree} j.</span>
        </div>
        <div class="vc-footer">
          <span class="vc-price">${formatPrice(v.prix)}</span>
          <div class="vc-actions">
            <button class="btn-ghost btn-sm" onclick='viewVoyage(${JSON.stringify(JSON.stringify(v))})'>Détails</button>
            <button class="btn-violet btn-sm" onclick="reserveVoyage('${v._id}')">Réserver</button>
          </div>
        </div>
      </div>
    </div>`;
}

function viewVoyage(vJson) {
  const v       = JSON.parse(vJson);
  const cc      = CAT[v.categorie] || CAT.ville;
  const isAdmin = currentUser?.role === 'admin';

  const reserveBtn = !isAdmin ? `
    <button class="btn-violet btn-reserve-full"
            onclick="reserveVoyage('${v._id}');showTab('reserver',null)">
      Réserver ce voyage
    </button>` : '';

  const deleteBtn = isAdmin ? `
    <button class="btn-danger"
            onclick="deleteVoyage('${v._id}','${v.titre.replace(/'/g, "\\'")}')">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
        <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
      </svg>
      Supprimer le voyage
    </button>` : '';

  document.getElementById('voyage-detail-content').innerHTML = `
    <div class="detail-wrap">
      <div class="detail-img-wrap">
        <img src="${v.image || ''}" alt="${v.titre}" class="detail-img-cover" onerror="this.style.display='none'" />
        <div class="detail-img-overlay"></div>
        <div class="detail-img-bottom">
          <div class="detail-badges">
            ${v.vedette ? '<span class="badge-vedette">Vedette</span>' : ''}
            <span class="badge-cat" style="--cat-bg:${cc.bg};--cat-bd:${cc.border};--cat-tx:${cc.text}">${v.categorie}</span>
          </div>
          <h1 class="detail-title">${v.titre}</h1>
          <p class="detail-dest">${v.destination}</p>
        </div>
      </div>
      <div class="detail-stats">
        <div class="detail-stat">
          <div class="stat-val">${formatPrice(v.prix)}</div>
          <div class="stat-lbl">Prix / pers.</div>
        </div>
        <div class="detail-stat">
          <div class="stat-val-light">${v.duree}</div>
          <div class="stat-lbl">Jours</div>
        </div>
        <div class="detail-stat">
          <div class="stat-val-light">${v.placesDisponibles}</div>
          <div class="stat-lbl">Places restantes</div>
        </div>
        <div class="detail-stat">
          <div class="stat-val-light">${new Date(v.dateDepart).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div>
          <div class="stat-lbl">Départ</div>
        </div>
      </div>
      <div class="card-panel" style="margin-bottom:16px">
        <p class="card-label">Description du voyage</p>
        <p class="card-text">${v.description}</p>
      </div>
      <div class="detail-actions">
        ${reserveBtn}
        ${deleteBtn}
        <button class="btn-ghost btn-action" onclick="showTab('voyages',document.querySelector('.nav-btn'))">Retour</button>
      </div>
    </div>`;

  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('nav-active'));
  document.getElementById('tab-voyage-detail').classList.add('active');
}

function reserveVoyage(id) {
  showTab('reserver', null);
  loadVoyagesForSelect(id);
}

async function deleteVoyage(id, titre) {
  const ok = await showConfirm({
    title:   'Supprimer le voyage',
    msg:     'Êtes-vous sûr de vouloir supprimer "' + titre + '" ? Cette action est irréversible.',
    type:    'danger',
    okLabel: 'Supprimer',
  });
  if (!ok) return;
  try {
    const r = await fetch(API + '/voyages/' + id, { method: 'DELETE', headers: authHeader() });
    if (r.ok) {
      showTab('voyages', document.querySelector('.nav-btn'));
    } else {
      const d = await r.json();
      alert(d.message || 'Erreur lors de la suppression.');
    }
  } catch (err) {
    alert('Erreur réseau : ' + err.message);
  }
}

async function createVoyage(ev) {
  ev.preventDefault();
  const al = document.getElementById('create-voyage-alert');
  const el = document.getElementById('create-voyage-response');
  if (!token || currentUser?.role !== 'admin') { al.classList.remove('hidden'); return; }
  al.classList.add('hidden');
  if (!validateForm(['v-titre', 'v-dest', 'v-desc', 'v-prix', 'v-duree', 'v-places', 'v-date'])) return;

  const fd = new FormData();
  fd.append('titre',             document.getElementById('v-titre').value.trim());
  fd.append('description',       document.getElementById('v-desc').value.trim());
  fd.append('destination',       document.getElementById('v-dest').value.trim());
  fd.append('prix',              document.getElementById('v-prix').value);
  fd.append('duree',             document.getElementById('v-duree').value);
  fd.append('placesDisponibles', document.getElementById('v-places').value);
  fd.append('dateDepart',        document.getElementById('v-date').value);
  fd.append('categorie',         document.getElementById('v-categorie').value);
  fd.append('vedette',           document.getElementById('v-vedette').checked);
  const fileInput = document.getElementById('v-image-file');
  const urlInput  = document.getElementById('v-image').value.trim();
  if (fileInput.files[0]) fd.append('image', fileInput.files[0]);
  else if (urlInput)      fd.append('image', urlInput);

  try {
    const r = await fetch(API + '/voyages', { method: 'POST', headers: authHeader(), body: fd });
    const d = await r.json();
    if (r.ok) {
      el.innerHTML = `
        <div class="alert-success-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span class="alert-success-text">Voyage "${d.titre}" cree avec succes. Redirection...</span>
        </div>`;
      setTimeout(() => {
        ev.target.reset();
        el.innerHTML = '';
        document.getElementById('image-preview').style.display            = 'none';
        document.getElementById('image-picker-placeholder').style.display = '';
        showTab('voyages', document.querySelector('[onclick*="showTab(\'voyages\'"]') || null);
        setTimeout(() => {
          const card = document.querySelector('#voyages-container [data-id="' + d._id + '"]');
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.style.outline   = '2px solid rgba(56,189,248,0.5)';
            card.style.boxShadow = '0 0 24px rgba(56,189,248,0.25)';
            setTimeout(() => { card.style.outline = ''; card.style.boxShadow = ''; }, 2500);
          }
        }, 300);
      }, 1000);
    } else {
      el.innerHTML = '<div class="alert-error" style="margin-top:14px">' + (d.message || 'Erreur lors de la création.') + '</div>';
    }
  } catch (err) {
    el.innerHTML = '<div class="alert-error" style="margin-top:14px">' + err.message + '</div>';
  }
}

function previewImage(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const preview     = document.getElementById('image-preview');
    const placeholder = document.getElementById('image-picker-placeholder');
    preview.src             = e.target.result;
    preview.style.display   = 'block';
    placeholder.style.display = 'none';
    document.getElementById('v-image').value = '';
  };
  reader.readAsDataURL(file);
}

function clearFileIfUrl() {
  document.getElementById('v-image-file').value = '';
  document.getElementById('image-preview').style.display            = 'none';
  document.getElementById('image-picker-placeholder').style.display = 'block';
}

// ── Réservations ───────────────────────────────────────────────────────────────
let _resPage = 1;

async function loadVoyagesForSelect(sid) {
  const r   = await fetch(API + '/voyages');
  const vs  = await r.json();
  const sel = document.getElementById('res-voyage-id');
  sel.innerHTML = vs.map(v =>
    `<option value="${esc(v._id)}" data-prix="${v.prix}" data-image="${esc(v.image || '')}">${esc(v.titre)} — ${formatPrice(v.prix)}</option>`
  ).join('');
  if (sid) sel.value = sid;
  updatePrixPreview();
}

function updatePrixPreview() {
  const sel = document.getElementById('res-voyage-id');
  const nb  = document.getElementById('res-nb')?.value;
  const opt = sel?.options[sel?.selectedIndex];
  if (opt?.dataset.prix && nb) {
    document.getElementById('res-prix-preview').textContent = 'Total : ' + formatPrice(opt.dataset.prix * nb);
  }
  const bg  = document.getElementById('res-voyage-bg');
  if (bg) {
    const img = opt?.dataset.image;
    if (img) {
      bg.style.backgroundImage = `url(${img})`;
      bg.classList.add('has-image');
    } else {
      bg.classList.remove('has-image');
    }
  }
}

async function makeReservation(ev) {
  ev.preventDefault();
  const el = document.getElementById('reserver-response');
  if (!token) {
    el.innerHTML = '<div class="alert-error" style="margin-top:12px">Connectez-vous pour effectuer une réservation.</div>';
    return;
  }
  if (!validateForm(['res-nb'])) return;
  try {
    const r = await fetch(API + '/reservations', {
      method:  'POST',
      headers: { ...jsonHeader(), ...authHeader() },
      body:    JSON.stringify({
        voyageId:        document.getElementById('res-voyage-id').value,
        nombrePersonnes: Number(document.getElementById('res-nb').value),
      }),
    });
    const d = await r.json();
    if (r.ok) {
      const sel   = document.getElementById('res-voyage-id');
      const titre = sel.options[sel.selectedIndex]?.text || '';
      const nb    = document.getElementById('res-nb').value;
      el.innerHTML = `
        <div class="res-success-box">
          <div class="res-success-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span class="res-success-title">Réservation confirmée</span>
          </div>
          <p class="res-success-text">
            Votre réservation pour <strong style="color:#e2e8f0">${titre.split(' —')[0]}</strong>
            (${nb} personne${nb > 1 ? 's' : ''}) a bien été enregistrée avec le statut
            <span style="color:#fbbf24;font-weight:600">en attente</span>.
          </p>
        </div>`;
      setTimeout(() => showTab('reservations', document.querySelector('[onclick*="showTab(\'reservations\'"]')), 1200);
    } else {
      el.innerHTML = '<div class="alert-error" style="margin-top:12px">' + (d.message || 'Une erreur est survenue.') + '</div>';
    }
  } catch (err) {
    el.innerHTML = '<div class="alert-error" style="margin-top:12px">' + err.message + '</div>';
  }
}

async function loadReservations(page = 1) {
  _resPage = page;
  const c = document.getElementById('reservations-container');
  if (!token) {
    c.innerHTML = '<div class="empty-state">Connectez-vous pour voir les réservations.</div>';
    return;
  }
  try {
    const r = await fetch(`${API}/reservations?page=${page}&limit=10`, { headers: authHeader() });
    const res = await r.json();
    if (!r.ok) {
      if (r.status === 401) {
        logout();
        showTab('login', null);
        c.innerHTML = '<div class="alert-error" style="margin:16px">Session expiree, veuillez vous reconnecter.</div>';
      } else {
        c.innerHTML = '<div class="alert-error" style="margin:16px">' + res.message + '</div>';
      }
      return;
    }
    const d = res.data;
    if (!d || !d.length) {
      c.innerHTML = '<div class="empty-state">Aucune réservation.</div>';
      renderPagination('reservations-pagination', res.page, res.totalPages, loadReservations);
      return;
    }
    const isAdmin = currentUser?.role === 'admin';
    c.innerHTML =
      '<table><thead><tr><th>Voyage</th>' +
      (isAdmin ? '<th>Client</th>' : '') +
      '<th>Personnes</th><th>Total</th><th>Statut</th><th>Date</th><th></th></tr></thead><tbody>' +
      d.map(row => renderReservationRow(row, isAdmin)).join('') +
      '</tbody></table>';
    renderPagination('reservations-pagination', res.page, res.totalPages, loadReservations);
  } catch (err) {
    c.innerHTML = '<div class="alert-error" style="margin:16px">' + err.message + '</div>';
  }
}

function renderReservationRow(res, isAdmin) {
  const cancelBtn = res.statut === 'en_attente'
    ? `<button class="btn-cancel-res" onclick="cancelReservation('${res._id}')">Annuler</button>`
    : '';
  const clientCell = isAdmin ? `
    <td class="td-primary">${res.client?.nom || ''}
      <span class="td-secondary">${res.client?.email || ''}</span>
    </td>` : '';
  return `
    <tr>
      <td class="td-primary">${res.voyage?.titre || res.voyage}</td>
      ${clientCell}
      <td>${res.nombrePersonnes}</td>
      <td style="color:#38bdf8;font-weight:600">${formatPrice(res.prixTotal)}</td>
      <td><span class="status-chip status-${res.statut}">${STATUT_LABELS[res.statut] || res.statut}</span></td>
      <td class="td-date">${new Date(res.createdAt).toLocaleDateString('fr-FR')}</td>
      <td>${cancelBtn}</td>
    </tr>`;
}

async function cancelReservation(id) {
  const ok = await showConfirm({
    title:   'Annuler la réservation',
    msg:     'Êtes-vous sûr de vouloir annuler cette réservation ? Les places seront restituées.',
    type:    'warning',
    okLabel: 'Oui, annuler',
  });
  if (!ok) return;
  try {
    const r = await fetch(API + '/reservations/' + id, { method: 'DELETE', headers: authHeader() });
    if (r.ok) {
      loadReservations(_resPage);
    } else {
      const d = await r.json();
      alert(d.message || "Erreur lors de l'annulation.");
    }
  } catch (err) {
    alert('Erreur réseau : ' + err.message);
  }
}

// ── Contact ────────────────────────────────────────────────────────────────────
async function sendContact(ev) {
  ev.preventDefault();
  const el = document.getElementById('contact-response');
  if (!validateForm(['c-nom', 'c-email', 'c-sujet', 'c-message'])) return;
  try {
    const r = await fetch(API + '/contact', {
      method:  'POST',
      headers: jsonHeader(),
      body:    JSON.stringify({
        nom:     document.getElementById('c-nom').value,
        email:   document.getElementById('c-email').value,
        sujet:   document.getElementById('c-sujet').value,
        message: document.getElementById('c-message').value,
      }),
    });
    const d = await r.json();
    if (r.ok) {
      ev.target.reset();
      el.innerHTML = '<div class="alert-success" style="margin-top:14px">Message envoye avec succes.</div>';
    } else {
      el.innerHTML = '<div class="response-box error" style="margin-top:12px">' + JSON.stringify(d, null, 2) + '</div>';
    }
  } catch (err) {
    el.innerHTML = '<div class="alert-error" style="margin-top:12px">' + err.message + '</div>';
  }
}

// ── Messages (admin) ───────────────────────────────────────────────────────────
let _messagesCache = [];
let _msgPage = 1;

async function loadMessages(page = 1) {
  _msgPage = page;
  const c = document.getElementById('messages-container');
  if (!token || currentUser?.role !== 'admin') {
    c.innerHTML = "<div class=\"empty-state\">Connectez-vous en tant qu'administrateur.</div>";
    return;
  }
  try {
    const r = await fetch(`${API}/contact?page=${page}&limit=10`, { headers: authHeader() });
    if (r.status === 401) {
      logout();
      showTab('login', null);
      c.innerHTML = '<div class="alert-error" style="margin:16px">Session expiree, veuillez vous reconnecter.</div>';
      return;
    }
    const res = await r.json();
    if (!r.ok) {
      c.innerHTML = '<div class="alert-error" style="margin:16px">' + (res.message || 'Erreur') + '</div>';
      return;
    }
    const d = res.data;
    if (!d || !d.length) {
      c.innerHTML = '<div class="empty-state">Aucun message.</div>';
      renderPagination('messages-pagination', res.page, res.totalPages, loadMessages);
      return;
    }
    _messagesCache = d;
    c.innerHTML =
      '<table><thead><tr><th>Nom</th><th>Email</th><th>Sujet</th><th>Apercu</th><th>Statut</th><th>Date</th><th></th></tr></thead><tbody>' +
      d.map(renderMessageRow).join('') +
      '</tbody></table>';
    renderPagination('messages-pagination', res.page, res.totalPages, loadMessages);
  } catch (err) {
    c.innerHTML = '<div class="alert-error" style="margin:16px">' + err.message + '</div>';
  }
}

function renderMessageRow(m) {
  const markLuBtn = m.lu ? '' : `<button class="btn-ghost btn-xs" onclick="markLu('${m._id}')">Marquer lu</button>`;
  return `
    <tr class="msg-row" onclick="openMsgDetail('${m._id}')">
      <td class="${m.lu ? '' : 'msg-unread'}">${m.nom}</td>
      <td class="td-email">${m.email}</td>
      <td>${m.sujet}</td>
      <td class="td-preview">${m.message}</td>
      <td><span class="${m.lu ? 'badge-lu' : 'badge-nonlu'}">${m.lu ? 'Lu' : 'Non lu'}</span></td>
      <td class="td-date">${new Date(m.createdAt).toLocaleDateString('fr-FR')}</td>
      <td onclick="event.stopPropagation()">
        <div class="td-actions">
          ${markLuBtn}
          <button class="btn-delete-sm" onclick="deleteMsg('${m._id}')">Supprimer</button>
        </div>
      </td>
    </tr>`;
}

function openMsgDetail(id) {
  const m = _messagesCache.find(x => x._id === id);
  if (!m) return;
  const date      = new Date(m.createdAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
  const markLuBtn = m.lu ? '' : `<button class="btn-ghost" onclick="markLu('${m._id}');closeMsgModal()">Marquer lu</button>`;

  document.getElementById('msg-modal-content').innerHTML = `
    <div class="msg-header">
      <div class="msg-avatar">${m.nom.charAt(0).toUpperCase()}</div>
      <div>
        <p class="msg-sender-name">${m.nom}</p>
        <p class="msg-sender-email">${m.email}</p>
      </div>
      <span class="${m.lu ? 'badge-lu' : 'badge-nonlu'}" style="margin-left:auto">${m.lu ? 'Lu' : 'Non lu'}</span>
    </div>
    <div class="msg-section-divider">
      <p class="msg-label">Sujet</p>
      <p class="msg-subject">${m.sujet}</p>
    </div>
    <div class="msg-body-wrap">
      <p class="msg-label">Message</p>
      <div class="msg-body">${m.message}</div>
    </div>
    <div class="msg-footer">
      <p class="msg-date">${date}</p>
      <div class="msg-footer-actions">
        ${markLuBtn}
        <button class="btn-danger-sm" onclick="deleteMsg('${m._id}');closeMsgModal()">Supprimer</button>
      </div>
    </div>`;

  document.getElementById('msg-modal-overlay').classList.add('open');
  if (!m.lu) {
    fetch(API + '/contact/' + m._id + '/lu', { method: 'PUT', headers: authHeader() })
      .then(() => {
        const idx = _messagesCache.findIndex(x => x._id === id);
        if (idx > -1) _messagesCache[idx].lu = true;
      });
  }
}

function closeMsgModal() {
  document.getElementById('msg-modal-overlay').classList.remove('open');
  loadMessages(_msgPage);
}

async function markLu(id) {
  await fetch(API + '/contact/' + id + '/lu', { method: 'PUT', headers: authHeader() });
  loadMessages(_msgPage);
}

async function deleteMsg(id) {
  const ok = await showConfirm({
    title:   'Supprimer le message',
    msg:     'Êtes-vous sûr de vouloir supprimer ce message ? Cette action est irréversible.',
    type:    'danger',
    okLabel: 'Supprimer',
  });
  if (!ok) return;
  await fetch(API + '/contact/' + id, { method: 'DELETE', headers: authHeader() });
  loadMessages(_msgPage);
}

// ── Profil ─────────────────────────────────────────────────────────────────────
const GRADIENTS = {
  'gradient-1': 'linear-gradient(135deg,#38bdf8,#0284c7)',
  'gradient-2': 'linear-gradient(135deg,#f87171,#ec4899)',
  'gradient-3': 'linear-gradient(135deg,#34d399,#059669)',
  'gradient-4': 'linear-gradient(135deg,#fbbf24,#f97316)',
  'gradient-5': 'linear-gradient(135deg,#a78bfa,#6366f1)',
  'gradient-6': 'linear-gradient(135deg,#67e8f9,#34d399)',
};
let selectedAvatar = 'gradient-1';

function getAvatarStyle(key) {
  return GRADIENTS[key] || GRADIENTS['gradient-1'];
}

// Applique la photo ou le gradient sur un élément avatar
function applyAvatarToEl(el, user, initial) {
  if (user.photoUrl) {
    el.style.background         = 'none';
    el.style.backgroundImage    = `url(${user.photoUrl})`;
    el.style.backgroundSize     = 'cover';
    el.style.backgroundPosition = 'center';
    el.textContent              = '';
  } else {
    el.style.backgroundImage    = '';
    el.style.backgroundSize     = '';
    el.style.backgroundPosition = '';
    el.style.background         = getAvatarStyle(user.avatar || 'gradient-1');
    el.textContent              = initial || (user.nom || '?').charAt(0).toUpperCase();
  }
}

function selectAvatar(key, el) {
  selectedAvatar = key;
  document.querySelectorAll('.avatar-opt').forEach(o => o.style.outline = 'none');
  el.style.outline       = '2px solid #38bdf8';
  el.style.outlineOffset = '2px';
  const initial = (document.getElementById('profile-nom')?.value || currentUser?.nom || '?').charAt(0).toUpperCase();
  const preview = document.getElementById('profile-avatar-preview');
  preview.style.backgroundImage = '';
  preview.style.background      = getAvatarStyle(key);
  preview.textContent           = initial;
}

function loadProfileTab() {
  if (!currentUser) return;
  const isAdmin = currentUser.role === 'admin';

  selectedAvatar = currentUser.avatar || 'gradient-1';
  document.getElementById('profile-nom').value          = currentUser.nom       || '';
  document.getElementById('profile-email').value        = currentUser.email     || '';
  document.getElementById('profile-telephone').value    = currentUser.telephone || '';
  document.getElementById('profile-pwd-current').value  = '';
  document.getElementById('profile-pwd-new').value      = '';
  document.getElementById('profile-pwd-confirm').value  = '';
  document.getElementById('profile-response').innerHTML = '';

  // Avatar preview
  const prev    = document.getElementById('profile-avatar-preview');
  const initial = (currentUser.nom || '?').charAt(0).toUpperCase();
  prev.style.backgroundImage = '';
  prev.style.background      = getAvatarStyle(selectedAvatar);
  prev.textContent           = initial;
  document.querySelectorAll('.avatar-opt').forEach(o => {
    o.style.outline       = o.dataset.gradient === selectedAvatar ? '2px solid #38bdf8' : 'none';
    o.style.outlineOffset = '2px';
  });

  const photoSection = document.getElementById('profile-photo-section');
  photoSection.style.display = 'block';
  const img         = document.getElementById('profile-photo-img');
  const placeholder = document.getElementById('profile-photo-placeholder');
  document.getElementById('photo-response').innerHTML = '';
  if (currentUser.photoUrl) {
    img.src           = currentUser.photoUrl;
    img.style.display = 'block';
    placeholder.style.display = 'none';
  } else {
    img.src           = '';
    img.style.display = 'none';
    placeholder.style.display = 'flex';
  }
}

function previewProfilePhoto(input) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img         = document.getElementById('profile-photo-img');
    const placeholder = document.getElementById('profile-photo-placeholder');
    img.src           = e.target.result;
    img.style.display = 'block';
    placeholder.style.display = 'none';
  };
  reader.readAsDataURL(input.files[0]);
}

async function uploadProfilePhoto() {
  const input = document.getElementById('profile-photo-input');
  const el    = document.getElementById('photo-response');
  if (!input.files || !input.files[0]) {
    el.innerHTML = '<div class="alert-error" style="margin-top:8px">Veuillez choisir une image.</div>';
    return;
  }
  const btn = document.getElementById('btn-upload-photo');
  btn.textContent = 'Envoi...';
  btn.disabled    = true;
  const formData  = new FormData();
  formData.append('photo', input.files[0]);
  try {
    const r = await fetch(API + '/auth/profile/photo', {
      method:  'POST',
      headers: authHeader(),
      body:    formData,
    });
    const d = await r.json();
    if (r.ok) {
      currentUser.photoUrl = d.photoUrl;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      updateAuthUI();
      el.innerHTML = `
        <div class="alert-success-box" style="margin-top:8px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span class="alert-success-text">Photo mise à jour</span>
        </div>`;
    } else {
      el.innerHTML = '<div class="alert-error" style="margin-top:8px">' + (d.message || 'Erreur upload.') + '</div>';
    }
  } catch (err) {
    el.innerHTML = '<div class="alert-error" style="margin-top:8px">Erreur reseau : ' + err.message + '</div>';
  }
  btn.textContent = 'Enregistrer la photo';
  btn.disabled    = false;
}

async function saveProfile(ev) {
  ev.preventDefault();
  const el         = document.getElementById('profile-response');
  const nom        = document.getElementById('profile-nom').value.trim();
  const email      = document.getElementById('profile-email').value.trim();
  const telephone  = document.getElementById('profile-telephone').value.trim();
  const pwdCurrent = document.getElementById('profile-pwd-current').value;
  const pwdNew     = document.getElementById('profile-pwd-new').value;
  const pwdConfirm = document.getElementById('profile-pwd-confirm').value;
  const fields     = ['profile-nom', 'profile-email'];
  if (pwdNew || pwdConfirm) fields.push('profile-pwd-new', 'profile-pwd-confirm');
  if (!validateForm(fields)) return;
  const body = { nom, email, avatar: selectedAvatar, telephone };
  if (pwdNew) { body.motDePasseActuel = pwdCurrent; body.nouveauMotDePasse = pwdNew; }
  try {
    const r = await fetch(API + '/auth/profile', {
      method:  'PUT',
      headers: { ...jsonHeader(), ...authHeader() },
      body:    JSON.stringify(body),
    });
    const d = await r.json();
    if (r.ok) {
      currentUser = { ...currentUser, ...d.user };
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      updateAuthUI();
      el.innerHTML = `
        <div class="alert-success-box" style="margin-top:12px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span class="alert-success-text">Profil mis a jour avec succes</span>
        </div>`;
    } else {
      el.innerHTML = '<div class="alert-error" style="margin-top:12px">' + (d.message || 'Erreur lors de la mise à jour.') + '</div>';
    }
  } catch (err) {
    el.innerHTML = '<div class="alert-error" style="margin-top:12px">Erreur reseau : ' + err.message + '</div>';
  }
}

// ── Admin Réservations ─────────────────────────────────────────────────────────
async function loadAdminReservations(page = 1) {
  const c = document.getElementById('admin-reservations-container');
  if (!token || currentUser?.role !== 'admin') {
    c.innerHTML = '<div class="empty-state">Accès administrateur requis.</div>';
    return;
  }
  c.innerHTML = '<div class="empty-state">Chargement...</div>';
  try {
    const r = await fetch(`${API}/reservations?page=${page}&limit=10`, { headers: authHeader() });
    if (r.status === 401) { logout(); showTab('login', null); return; }
    const res = await r.json();
    if (!res.data || !res.data.length) {
      c.innerHTML = '<div class="empty-state">Aucune réservation.</div>';
      renderPagination('admin-res-pagination', res.page, res.totalPages, loadAdminReservations);
      return;
    }
    c.innerHTML = `
      <table class="admin-res-table">
        <thead><tr>
          <th>Client</th><th>Email</th><th>Tél.</th>
          <th>Voyage</th><th>Destination</th>
          <th>Pers.</th><th>Total</th><th>Statut</th><th>Date</th><th></th>
        </tr></thead>
        <tbody>${res.data.map(renderAdminResRow).join('')}</tbody>
      </table>`;
    renderPagination('admin-res-pagination', res.page, res.totalPages, loadAdminReservations);
  } catch (err) {
    c.innerHTML = '<div class="alert-error" style="margin:16px">' + err.message + '</div>';
  }
}

function renderAdminResRow(r) {
  const statusOpts = ['en_attente', 'confirmee', 'annulee'].map(s =>
    `<option value="${s}" ${r.statut === s ? 'selected' : ''}>${STATUT_LABELS[s]}</option>`
  ).join('');
  const clientData = JSON.stringify({ nom: r.client?.nom || '', email: r.client?.email || '', tel: r.client?.telephone || '', voyage: r.voyage?.titre || '' });
  return `
    <tr>
      <td><span class="res-client-name">${esc(r.client?.nom) || '—'}</span></td>
      <td><span class="res-client-email">${esc(r.client?.email) || '—'}</span></td>
      <td><span class="res-client-tel">${esc(r.client?.telephone) || '—'}</span></td>
      <td class="td-primary">${esc(r.voyage?.titre) || '—'}</td>
      <td style="color:#64748b">${esc(r.voyage?.destination) || '—'}</td>
      <td>${r.nombrePersonnes}</td>
      <td style="color:#38bdf8;font-weight:600">${formatPrice(r.prixTotal)}</td>
      <td>
        <select class="statut-select" onchange="changeResStatut('${r._id}', this.value, this)">
          ${statusOpts}
        </select>
      </td>
      <td class="td-date">${new Date(r.createdAt).toLocaleDateString('fr-FR')}</td>
      <td>
        <button class="btn-contact-client" data-client="${esc(clientData)}">
          Contacter
        </button>
      </td>
    </tr>`;
}

document.addEventListener('click', e => {
  const btn = e.target.closest('.btn-contact-client');
  if (btn && btn.dataset.client) { openContactModal(btn.dataset.client); return; }

  const photoDelete = e.target.closest('.album-photo-delete');
  if (photoDelete) {
    const wrap = photoDelete.closest('.album-photo-wrap');
    if (wrap) deleteAlbumPhoto(wrap.dataset.albumId, wrap.dataset.photoId);
    return;
  }

  const albumDelete = e.target.closest('.btn-delete-album');
  if (albumDelete) {
    deleteAlbum(albumDelete.dataset.albumId, albumDelete.dataset.albumTitre);
    return;
  }
});

async function changeResStatut(id, statut, selectEl) {
  try {
    const r = await fetch(`${API}/reservations/${id}/statut`, {
      method: 'PUT',
      headers: { ...jsonHeader(), ...authHeader() },
      body: JSON.stringify({ statut }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      if (selectEl) selectEl.value = selectEl.querySelector('[selected]')?.value || statut;
      alert(d.message || 'Erreur lors du changement de statut.');
    }
  } catch (err) {
    alert('Erreur réseau : ' + err.message);
  }
}

function openContactModal(dataJson) {
  const d = JSON.parse(dataJson);
  document.getElementById('contact-modal-name').textContent = 'Contacter ' + (d.nom || 'le client');
  document.getElementById('contact-modal-body').innerHTML = `
    <div style="margin-bottom:6px"><strong style="color:#e2e8f0">Email :</strong> ${esc(d.email) || '—'}</div>
    <div style="margin-bottom:6px"><strong style="color:#e2e8f0">Téléphone :</strong> ${esc(d.tel) || '—'}</div>
    <div><strong style="color:#e2e8f0">Voyage :</strong> ${esc(d.voyage) || '—'}</div>`;
  const subject = encodeURIComponent('Votre réservation — ' + (d.voyage || ''));
  document.getElementById('contact-modal-mailto').href = `mailto:${d.email || ''}?subject=${subject}`;
  document.getElementById('contact-client-modal').style.display = 'flex';
}

function closeContactModal() {
  document.getElementById('contact-client-modal').style.display = 'none';
}

// ── Albums (admin) ─────────────────────────────────────────────────────────────
function showCreateAlbumForm()  { document.getElementById('album-create-form').style.display = 'block'; }
function hideCreateAlbumForm()  { document.getElementById('album-create-form').style.display = 'none'; }

async function createAlbum() {
  const titre = document.getElementById('album-titre').value.trim();
  const desc  = document.getElementById('album-desc').value.trim();
  const el    = document.getElementById('album-create-response');
  if (!titre) { el.innerHTML = '<div class="alert-error" style="margin-top:8px">Le titre est requis.</div>'; return; }
  try {
    const r = await fetch(API + '/albums', {
      method: 'POST',
      headers: { ...jsonHeader(), ...authHeader() },
      body: JSON.stringify({ titre, description: desc }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      el.innerHTML = '<div class="alert-error" style="margin-top:8px">' + esc(d.message || 'Erreur') + '</div>';
      return;
    }
    // success branch: no need to parse body (server returns the album, we don't use it)
    hideCreateAlbumForm();
    document.getElementById('album-titre').value = '';
    document.getElementById('album-desc').value  = '';
    el.innerHTML = '';
    loadAlbums();
  } catch (err) {
    el.innerHTML = '<div class="alert-error" style="margin-top:8px">' + esc(err.message) + '</div>';
  }
}

let _albumsPage = 1;

async function loadAlbums(page = 1) {
  _albumsPage = page;
  const c = document.getElementById('albums-container');
  if (!token || currentUser?.role !== 'admin') {
    c.innerHTML = '<div class="empty-state">Accès administrateur requis.</div>';
    return;
  }
  c.innerHTML = '<div class="empty-state">Chargement...</div>';
  try {
    const r = await fetch(`${API}/albums?page=${page}&limit=10`, { headers: authHeader() });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      c.innerHTML = '<div class="alert-error" style="margin:16px">' + esc(d.message || 'Erreur') + '</div>';
      return;
    }
    const res = await r.json();
    if (!res.data || !res.data.length) {
      c.innerHTML = '<div class="empty-state">Aucun album. Créez-en un ci-dessus.</div>';
      renderPagination('albums-pagination', res.page, res.totalPages, loadAlbums);
      return;
    }
    c.innerHTML = '<div class="albums-list">' + res.data.map(renderAlbumCard).join('') + '</div>';
    renderPagination('albums-pagination', res.page, res.totalPages, loadAlbums);
  } catch (err) {
    c.innerHTML = '<div class="alert-error" style="margin:16px">' + esc(err.message) + '</div>';
  }
}

function renderAlbumCard(album) {
  const photos = (album.photos ?? []).map(p => `
    <div class="album-photo-wrap" data-album-id="${esc(album._id)}" data-photo-id="${esc(p._id)}">
      <img src="${esc(p.url)}" alt="${esc(p.legende)}" onerror="this.style.display='none'" />
      <button class="album-photo-delete" title="Supprimer">✕</button>
    </div>`).join('');

  return `
    <div class="album-card" id="album-${esc(album._id)}">
      <div class="album-card-header">
        <div>
          <div class="album-title">${esc(album.titre)}</div>
          ${album.description ? '<div class="album-desc">' + esc(album.description) + '</div>' : ''}
        </div>
        <button class="btn-delete-album" data-album-id="${esc(album._id)}" data-album-titre="${esc(album.titre)}">Supprimer</button>
      </div>
      <div class="album-photos-grid">${photos}</div>
      <div>
        <label class="album-upload-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Ajouter une photo
          <input type="file" accept="image/*" style="display:none" data-album-id="${esc(album._id)}" class="album-photo-input" />
        </label>
      </div>
    </div>`;
}

async function uploadAlbumPhoto(albumId, file) {
  const fd = new FormData();
  fd.append('photo', file);
  try {
    const r = await fetch(`${API}/albums/${albumId}/photos`, {
      method: 'POST',
      headers: authHeader(),
      body: fd,
    });
    if (r.ok) loadAlbums(_albumsPage);
    else { const d = await r.json().catch(() => ({})); alert(esc(d.message) || 'Erreur upload'); }
  } catch (err) {
    alert('Erreur réseau : ' + err.message);
  }
}

async function deleteAlbumPhoto(albumId, photoId) {
  const ok = await showConfirm({
    title: 'Supprimer la photo',
    msg: 'Supprimer cette photo ? Action irréversible.',
    type: 'danger', okLabel: 'Supprimer',
  });
  if (!ok) return;
  try {
    const r = await fetch(`${API}/albums/${albumId}/photos/${photoId}`, {
      method: 'DELETE', headers: authHeader(),
    });
    if (r.ok) loadAlbums(_albumsPage);
    else { const d = await r.json().catch(() => ({})); alert(esc(d.message) || 'Erreur suppression'); }
  } catch (err) {
    alert('Erreur réseau : ' + err.message);
  }
}

async function deleteAlbum(id, titre) {
  const ok = await showConfirm({
    title: 'Supprimer l\'album',
    msg: `Supprimer "${titre}" et toutes ses photos ? Action irréversible.`,
    type: 'danger', okLabel: 'Supprimer',
  });
  if (!ok) return;
  try {
    const r = await fetch(`${API}/albums/${id}`, { method: 'DELETE', headers: authHeader() });
    if (r.ok) loadAlbums(_albumsPage);
    else { const d = await r.json().catch(() => ({})); alert(esc(d.message) || 'Erreur'); }
  } catch (err) {
    alert('Erreur réseau : ' + err.message);
  }
}

document.addEventListener('change', e => {
  const input = e.target.closest('.album-photo-input');
  if (input && input.files[0]) {
    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
      alert('Le fichier ne doit pas dépasser 5 Mo.');
      input.value = '';
      return;
    }
    uploadAlbumPhoto(input.dataset.albumId, file);
    input.value = '';
  }
});

// ── Souvenirs gallery (clients) ────────────────────────────────────────────────
let _sdPhotos = [];
let _sdIdx    = 0;
let _sdTimer  = null;

async function loadSouvenirsDash() {
  const wrap  = document.getElementById('sdash-gallery-wrap');
  const empty = document.getElementById('sdash-empty');
  if (!wrap || !empty) return;
  try {
    const r = await fetch(API + '/albums');
    if (!r.ok) { wrap.style.display = 'none'; empty.style.display = 'block'; return; }
    const albums = await r.json();
    if (!Array.isArray(albums)) { wrap.style.display = 'none'; empty.style.display = 'block'; return; }
    _sdPhotos = albums.flatMap(a => Array.isArray(a.photos) ? a.photos : []);
    if (!_sdPhotos.length) { wrap.style.display = 'none'; empty.style.display = 'block'; return; }
    wrap.style.display = '';
    empty.style.display = 'none';
    _sdIdx = 0;
    buildSouvenirsDashSlides();
    buildSouvenirsDashDots();
    setSouvenirsDashPos(0, false);
    clearInterval(_sdTimer);
    _sdTimer = setInterval(() => souvenirsDashNext(), 5000);
  } catch { wrap.style.display = 'none'; empty.style.display = 'block'; }
}

function buildSouvenirsDashSlides() {
  const track = document.getElementById('sdash-track');
  if (!track) return;
  track.innerHTML = '';
  _sdPhotos.forEach(p => {
    const slide = document.createElement('div');
    slide.className = 'sdash-slide';
    const img = document.createElement('img');
    img.src = p.url || '';
    img.alt = p.legende || '';
    img.onerror = () => { img.style.background = '#0a1e33'; img.removeAttribute('src'); };
    slide.appendChild(img);
    track.appendChild(slide);
  });
}

function buildSouvenirsDashDots() {
  const el = document.getElementById('sdash-dots');
  if (!el) return;
  el.innerHTML = '';
  _sdPhotos.forEach((_, i) => {
    const d = document.createElement('button');
    d.className = 'sdash-dot' + (i === 0 ? ' active' : '');
    d.setAttribute('aria-label', 'Photo ' + (i + 1));
    d.onclick = () => setSouvenirsDashPos(i, true);
    el.appendChild(d);
  });
}

function setSouvenirsDashPos(idx, resetTimer = true) {
  _sdIdx = ((idx % _sdPhotos.length) + _sdPhotos.length) % _sdPhotos.length;
  const track = document.getElementById('sdash-track');
  if (track) track.style.transform = `translateX(-${_sdIdx * 100}%)`;
  const caption = document.getElementById('sdash-caption');
  if (caption) caption.textContent = _sdPhotos[_sdIdx]?.legende || '';
  document.querySelectorAll('.sdash-dot').forEach((d, i) =>
    d.classList.toggle('active', i === _sdIdx));
  const counter = document.getElementById('sdash-counter');
  if (counter) counter.textContent = (_sdIdx + 1) + ' / ' + _sdPhotos.length;
  if (resetTimer) { clearInterval(_sdTimer); _sdTimer = setInterval(() => souvenirsDashNext(), 5000); }
}

function souvenirsDashNext() { if (_sdPhotos.length) setSouvenirsDashPos(_sdIdx + 1); }
function souvenirsDashPrev() { if (_sdPhotos.length) setSouvenirsDashPos(_sdIdx - 1); }

// ── Mobile sidebar ─────────────────────────────────────────────────────────────
function toggleSidebar() {
  const sidebar  = document.getElementById('main-sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  const btn      = document.getElementById('sidebar-toggle');
  if (!sidebar) return;
  const open = sidebar.classList.toggle('sidebar-open');
  overlay?.classList.toggle('active', open);
  btn?.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
}

function closeSidebar() {
  const sidebar = document.getElementById('main-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const btn     = document.getElementById('sidebar-toggle');
  sidebar?.classList.remove('sidebar-open');
  overlay?.classList.remove('active');
  btn?.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Datepicker + raccourcis clavier ────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeMsgModal(); closeContactModal(); closeSidebar(); }
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof flatpickr !== 'undefined') {
    flatpickr('#v-date', {
      locale:        'fr',
      dateFormat:    'Y-m-d',
      minDate:       'today',
      disableMobile: false,
      onChange:      () => validateField('v-date'),
    });
  }

  // Close sidebar on nav button click (mobile)
  document.getElementById('main-sidebar')?.addEventListener('click', e => {
    if (e.target.closest('.nav-btn') && window.innerWidth < 768) closeSidebar();
  });
});
