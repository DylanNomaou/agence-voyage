const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// POST /api/contact — envoyer un message (public)
router.post('/', async (req, res) => {
  try {
    const { nom, email, sujet, message } = req.body;
    const msg = await Message.create({ nom, email, sujet, message });
    res.status(201).json({ message: 'Message envoyé avec succès', id: msg._id });
  } catch (err) {
    res.status(400).json({ message: 'Données invalides', error: err.message });
  }
});

// GET /api/contact — lire les messages (admin)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// PUT /api/contact/:id/lu — marquer comme lu (admin)
router.put('/:id/lu', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const msg = await Message.findByIdAndUpdate(req.params.id, { lu: true }, { new: true });
    if (!msg) return res.status(404).json({ message: 'Message non trouvé' });
    res.json(msg);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// DELETE /api/contact/:id — supprimer un message (admin)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const msg = await Message.findByIdAndDelete(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message non trouvé' });
    res.json({ message: 'Message supprimé' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

module.exports = router;
