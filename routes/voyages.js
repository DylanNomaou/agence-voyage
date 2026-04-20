const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { getVoyages, getVoyage, createVoyage, updateVoyage, deleteVoyage } = require('../controllers/voyageController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'voyage-' + Date.now() + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont acceptées'));
  }
});

// GET /api/voyages — liste avec filtres optionnels
router.get('/', getVoyages);

// GET /api/voyages/:id — détail d'un voyage
router.get('/:id', getVoyage);

// POST /api/voyages — créer (admin)
router.post('/', authMiddleware, adminMiddleware, upload.single('image'), createVoyage);

// PUT /api/voyages/:id — modifier (admin)
router.put('/:id', authMiddleware, adminMiddleware, updateVoyage);

// DELETE /api/voyages/:id — supprimer (admin)
router.delete('/:id', authMiddleware, adminMiddleware, deleteVoyage);

module.exports = router;
