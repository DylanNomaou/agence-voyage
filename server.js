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

// NoSQL injection prevention
app.use(mongoSanitize());

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

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connecté à MongoDB');
    app.listen(process.env.PORT, () => {
      console.log(`Serveur démarré sur le port ${process.env.PORT}`);
    });
  })
  .catch((err) => console.error('Erreur MongoDB :', err));
