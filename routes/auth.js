const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const User     = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

// ── Upload photo de profil (admin) ─────────────────────────────────────────────

const AVATARS_DIR = path.join(__dirname, '../public/uploads/avatars');

const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      fs.mkdirSync(AVATARS_DIR, { recursive: true });
      cb(null, AVATARS_DIR);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'avatar-' + req.user.id + '-' + Date.now() + ext);
  },
});

const uploadPhoto = multer({
  storage: photoStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont acceptées'));
  },
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function publicUser(user) {
  return {
    id:        user._id,
    nom:       user.nom,
    email:     user.email,
    role:      user.role,
    avatar:    user.avatar,
    telephone: user.telephone || '',
    photoUrl:  user.photoUrl  || '',
  };
}

// ── POST /api/auth/register ────────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  try {
    const { nom, email, motDePasse } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }

    const hash = await bcrypt.hash(motDePasse, 10);
    const user = await User.create({ nom, email, motDePasse: hash });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ── POST /api/auth/login ───────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  try {
    const { email, motDePasse } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Email ou mot de passe incorrect' });
    }

    const valid = await bcrypt.compare(motDePasse, user.motDePasse);
    if (!valid) {
      return res.status(400).json({ message: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ── PUT /api/auth/profile ──────────────────────────────────────────────────────

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { nom, email, motDePasseActuel, nouveauMotDePasse, avatar, telephone } = req.body;
    const user = await User.findById(req.user.id);

    if (nom)                   user.nom       = nom.trim();
    if (avatar)                user.avatar    = avatar;
    if (telephone !== undefined) user.telephone = telephone.trim();

    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      user.email = email.trim();
    }

    if (nouveauMotDePasse) {
      if (!motDePasseActuel) return res.status(400).json({ message: 'Mot de passe actuel requis' });
      const valid = await bcrypt.compare(motDePasseActuel, user.motDePasse);
      if (!valid) return res.status(400).json({ message: 'Mot de passe actuel incorrect' });
      if (nouveauMotDePasse.length < 8 || !/[A-Z]/.test(nouveauMotDePasse)) {
        return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir 8 caractères et une majuscule' });
      }
      user.motDePasse = await bcrypt.hash(nouveauMotDePasse, 10);
    }

    await user.save();
    res.json({ message: 'Profil mis à jour', user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ── POST /api/auth/profile/photo ──────────────────────────────────────────────

router.post('/profile/photo', authMiddleware, (req, res, next) => {
  uploadPhoto.single('photo')(req, res, err => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'Fichier trop volumineux (max 3 Mo)'
        : err.message === 'Seules les images sont acceptées'
          ? err.message
          : 'Erreur lors de l\'upload';
      return res.status(400).json({ message: msg });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Aucune image fournie' });

    const user = await User.findById(req.user.id);

    // Supprimer l'ancienne photo si elle existe
    if (user.photoUrl) {
      const oldPath = path.join(__dirname, '../public', user.photoUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    user.photoUrl = '/uploads/avatars/' + req.file.filename;
    await user.save();

    res.json({ message: 'Photo mise à jour', photoUrl: user.photoUrl });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

module.exports = router;
