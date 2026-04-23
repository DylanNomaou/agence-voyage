const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/voyages', require('./routes/voyages'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/contact', require('./routes/contact'));
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

// Route de test
app.get('/', (req, res) => {
  res.json({ message: 'API Agence Voyage fonctionne !' });
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
