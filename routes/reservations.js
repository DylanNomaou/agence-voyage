const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const Voyage = require('../models/Voyage');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// GET /api/reservations — mes réservations (client) ou toutes (admin)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page, limit } = req.query;
    let query;
    if (req.user.role === 'admin') {
      query = Reservation.find()
        .populate('client', 'nom email telephone')
        .populate('voyage', 'titre destination');
    } else {
      query = Reservation.find({ client: req.user.id })
        .populate('voyage', 'titre destination prix dateDepart');
    }
    query = query.sort({ createdAt: -1 });

    if (page !== undefined) {
      const p     = Math.max(1, parseInt(page) || 1);
      const lim   = Math.min(100, Math.max(1, parseInt(limit) || 10));
      const countFilter = req.user.role === 'admin' ? {} : { client: req.user.id };
      const total = await Reservation.countDocuments(countFilter);
      const data  = await query.skip((p - 1) * lim).limit(lim);
      return res.json({ data, total, page: p, totalPages: Math.max(1, Math.ceil(total / lim)) });
    }
    const reservations = await query;
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// POST /api/reservations — créer une réservation (client connecté)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { voyageId, nombrePersonnes } = req.body;

    const voyage = await Voyage.findById(voyageId);
    if (!voyage) return res.status(404).json({ message: 'Voyage non trouvé' });
    if (voyage.placesDisponibles < nombrePersonnes) {
      return res.status(400).json({ message: 'Pas assez de places disponibles' });
    }

    const prixTotal = voyage.prix * nombrePersonnes;
    const reservation = await Reservation.create({
      client: req.user.id,
      voyage: voyageId,
      nombrePersonnes,
      prixTotal,
    });

    voyage.placesDisponibles -= nombrePersonnes;
    await voyage.save();

    res.status(201).json(reservation);
  } catch (err) {
    res.status(400).json({ message: 'Données invalides', error: err.message });
  }
});

// PUT /api/reservations/:id/statut — changer le statut (admin)
router.put('/:id/statut', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { statut } = req.body;
    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { statut },
      { new: true, runValidators: true }
    );
    if (!reservation) return res.status(404).json({ message: 'Réservation non trouvée' });
    res.json(reservation);
  } catch (err) {
    res.status(400).json({ message: 'Données invalides', error: err.message });
  }
});

// DELETE /api/reservations/:id — annuler une réservation (client propriétaire ou admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Réservation non trouvée' });

    if (req.user.role !== 'admin' && reservation.client.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    // Remettre les places disponibles
    await Voyage.findByIdAndUpdate(reservation.voyage, {
      $inc: { placesDisponibles: reservation.nombrePersonnes }
    });

    await reservation.deleteOne();
    res.json({ message: 'Réservation annulée' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

module.exports = router;
