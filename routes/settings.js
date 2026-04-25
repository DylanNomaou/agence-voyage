8const express      = require('express');
const router       = express.Router();
const multer       = require('multer');
const path         = require('path');
const fs           = require('fs');
const SiteSetting  = require('../models/SiteSettings');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const VIDEOS_DIR = path.join(__dirname, '../public/uploads/videos');
fs.mkdirSync(VIDEOS_DIR, { recursive: true });

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, VIDEOS_DIR),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'hero-' + Date.now() + ext);
  },
});

const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Format non supporté. Utilisez MP4, WebM ou OGG.'));
  },
});

// GET /api/settings/hero-video — public
router.get('/hero-video', async (req, res) => {
  try {
    const setting = await SiteSetting.findOne({ key: 'hero_video' });
    res.json({ videoUrl: setting?.value || null });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/settings/hero-video — admin only
router.post('/hero-video', authMiddleware, adminMiddleware, (req, res) => {
  uploadVideo.single('video')(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });
    try {
      const prev = await SiteSetting.findOne({ key: 'hero_video' });
      if (prev?.value) {
        const prevPath = path.join(__dirname, '../public', prev.value);
        if (fs.existsSync(prevPath)) fs.unlinkSync(prevPath);
      }
      const videoUrl = '/uploads/videos/' + req.file.filename;
      await SiteSetting.findOneAndUpdate(
        { key: 'hero_video' },
        { value: videoUrl },
        { upsert: true, new: true }
      );
      res.json({ videoUrl });
    } catch {
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });
});

// DELETE /api/settings/hero-video — admin only
router.delete('/hero-video', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const setting = await SiteSetting.findOne({ key: 'hero_video' });
    if (setting?.value) {
      const filePath = path.join(__dirname, '../public', setting.value);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await SiteSetting.deleteOne({ key: 'hero_video' });
    }
    res.json({ message: 'Vidéo supprimée.' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
