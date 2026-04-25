const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { getVoyages, getVoyage, createVoyage, updateVoyage, deleteVoyage } = require('../controllers/voyageController');
const { uploadBuffer } = require('../lib/cloudinary');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont acceptées'));
  },
});

async function handleImageUpload(req, res, next) {
  if (!req.file) return next();
  try {
    const result = await uploadBuffer(req.file.buffer, {
      folder: 'agence-voyage/voyages',
      resource_type: 'image',
    });
    req.cloudinaryUrl = result.secure_url;
    next();
  } catch (err) {
    res.status(500).json({ message: 'Erreur upload image', error: err.message });
  }
}

router.get('/',    getVoyages);
router.get('/:id', getVoyage);
router.post('/',   authMiddleware, adminMiddleware, upload.single('image'), handleImageUpload, createVoyage);
router.put('/:id', authMiddleware, adminMiddleware, updateVoyage);
router.delete('/:id', authMiddleware, adminMiddleware, deleteVoyage);

module.exports = router;
