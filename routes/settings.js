const express      = require('express');
const router       = express.Router();
const multer       = require('multer');
const path         = require('path');
const fs           = require('fs');
const os           = require('os');
const SiteSetting  = require('../models/SiteSettings');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { uploadFile, destroy, publicIdFromUrl } = require('../lib/cloudinary');

const uploadVideo = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, os.tmpdir()),
    filename:    (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, 'hero-video-' + Date.now() + ext);
    },
  }),
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
        const publicId = publicIdFromUrl(prev.value);
        if (publicId) await destroy(publicId, { resource_type: 'video' }).catch(() => {});
      }

      const result = await uploadFile(req.file.path, {
        folder:        'agence-voyage/videos',
        resource_type: 'video',
      });

      try { fs.unlinkSync(req.file.path); } catch (_) {}

      await SiteSetting.findOneAndUpdate(
        { key: 'hero_video' },
        { value: result.secure_url },
        { upsert: true, new: true }
      );
      res.json({ videoUrl: result.secure_url });
    } catch (uploadErr) {
      try { if (req.file) fs.unlinkSync(req.file.path); } catch (_) {}
      res.status(500).json({ message: 'Erreur upload : ' + uploadErr.message });
    }
  });
});

// DELETE /api/settings/hero-video — admin only
router.delete('/hero-video', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const setting = await SiteSetting.findOne({ key: 'hero_video' });
    if (setting?.value) {
      const publicId = publicIdFromUrl(setting.value);
      if (publicId) await destroy(publicId, { resource_type: 'video' }).catch(() => {});
      await SiteSetting.deleteOne({ key: 'hero_video' });
    }
    res.json({ message: 'Vidéo supprimée.' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
