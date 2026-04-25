const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
require('dotenv').config();

const app = express();

// Security headers (CSP disabled — static files use inline scripts + CDN)
app.use(helmet({ contentSecurityPolicy: false }));

// CORS
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));

// Body parsing with size limit
app.use(express.json({ limit: '50kb' }));

// NoSQL injection prevention (req.query is a getter in Express 5 — sanitize body/params only)
app.use((req, _res, next) => {
  if (req.body)   req.body   = mongoSanitize.sanitize(req.body);
  if (req.params) req.params = mongoSanitize.sanitize(req.params);
  next();
});

// Static files
app.use(express.static('public'));

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de tentatives, réessayez dans 15 minutes.' },
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de messages envoyés, réessayez dans 1 heure.' },
});

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/contact', contactLimiter, require('./routes/contact'));
app.use('/api/voyages', require('./routes/voyages'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/albums', require('./routes/albums'));
app.use('/api/settings', require('./routes/settings'));

// Proxy taux de change (évite le CORS de frankfurter.app)
app.get('/api/rates', async (req, res) => {
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,CAD,GBP,CHF,JPY,MAD,AUD');
    const d = await r.json();
    res.json(d);
  } catch {
    res.status(502).json({ message: 'Taux de change indisponibles' });
  }
});

// ── Gestionnaires d'erreur ─────────────────────────────────────────────────────

// 404 — route inconnue
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'Ressource introuvable.' });
  }
  res.status(404).sendFile('404.html', { root: 'public' });
});

// 500 — erreur interne
app.use((err, req, res, _next) => {
  console.error('Erreur serveur :', err);
  if (req.path.startsWith('/api/')) {
    const status = err.status || err.statusCode || 500;
    const msg    = status < 500 ? err.message : 'Erreur interne du serveur.';
    return res.status(status).json({ message: msg });
  }
  res.status(500).sendFile('500.html', { root: 'public' });
});

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connecté à MongoDB');
    app.listen(process.env.PORT, () => {
      console.log(`Serveur démarré sur le port ${process.env.PORT}`);
    });
  })
  .catch((err) => console.error('Erreur MongoDB :', err));
