const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const Album    = require('../models/Album');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const uploadDir = path.join(__dirname, '../public/uploads/albums');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'album-' + Date.now() + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont acceptées'));
  },
});

function safeUnlink(fileUrl) {
  const safePath = path.resolve(path.join(__dirname, '../public', fileUrl));
  const safeBase = path.resolve(uploadDir);
  if (!safePath.startsWith(safeBase + path.sep)) return;
  try { fs.unlinkSync(safePath); } catch (e) { if (e.code !== 'ENOENT') throw e; }
}

// GET /api/albums — public, paginated if ?page present
router.get('/', async (req, res) => {
  try {
    const { page, limit } = req.query;
    if (page !== undefined) {
      const p     = Math.max(1, parseInt(page) || 1);
      const lim   = Math.min(100, Math.max(1, parseInt(limit) || 10));
      const total = await Album.countDocuments();
      const data  = await Album.find().sort({ createdAt: -1 }).skip((p - 1) * lim).limit(lim);
      return res.json({ data, total, page: p, totalPages: Math.max(1, Math.ceil(total / lim)) });
    }
    const albums = await Album.find().sort({ createdAt: -1 });
    res.json(albums);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// POST /api/albums — create album (admin)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const titre = (req.body.titre || '').trim();
    const description = (req.body.description || '').trim();
    if (!titre) return res.status(400).json({ message: 'Le titre est requis' });
    const album = await Album.create({ titre, description });
    res.status(201).json(album);
  } catch (err) {
    res.status(400).json({ message: 'Données invalides', error: err.message });
  }
});

// POST /api/albums/:id/photos — add a photo (admin)
router.post('/:id/photos', authMiddleware, adminMiddleware, upload.single('photo'), async (req, res) => {
  try {
    const album = await Album.findById(req.params.id);
    if (!album) {
      if (req.file) try { fs.unlinkSync(req.file.path); } catch (_) {}
      return res.status(404).json({ message: 'Album non trouvé' });
    }
    if (!req.file) return res.status(400).json({ message: 'Aucune image fournie' });
    const url = '/uploads/albums/' + req.file.filename;
    album.photos.push({ url, legende: req.body.legende || '', ordre: album.photos.length });
    await album.save();
    res.status(201).json(album);
  } catch (err) {
    if (req.file) try { fs.unlinkSync(req.file.path); } catch (_) {}
    res.status(400).json({ message: 'Erreur upload', error: err.message });
  }
});

// DELETE /api/albums/:id/photos/:photoId — delete a photo (admin)
router.delete('/:id/photos/:photoId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const album = await Album.findById(req.params.id);
    if (!album) return res.status(404).json({ message: 'Album non trouvé' });
    const photo = album.photos.id(req.params.photoId);
    if (!photo) return res.status(404).json({ message: 'Photo non trouvée' });
    safeUnlink(photo.url);
    album.photos.pull(req.params.photoId);
    await album.save();
    res.json({ message: 'Photo supprimée' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// DELETE /api/albums/:id — delete album (admin)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const album = await Album.findById(req.params.id);
    if (!album) return res.status(404).json({ message: 'Album non trouvé' });
    album.photos.forEach(p => {
      safeUnlink(p.url);
    });
    await album.deleteOne();
    res.json({ message: 'Album supprimé' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

router.use((err, req, res, next) => {
  if (req.file) try { fs.unlinkSync(req.file.path); } catch (_) {}
  if (err.message === 'Seules les images sont acceptées') {
    return res.status(415).json({ message: err.message });
  }
  next(err);
});

module.exports = router;
