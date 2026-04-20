const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const Voyage = require('../models/Voyage');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// GET /api/reservations — mes réservations (client) ou toutes (admin)
router.get('/', authMiddleware, async (req, res) => {
  try {
    let reservations;
    if (req.user.role === 'admin') {
      reservations = await Reservation.find().populate('client', 'nom email').populate('voyage', 'titre destination');
    } else {
      reservations = await Reservation.find({ client: req.user.id }).populate('voyage', 'titre destination prix dateDepart');
    }
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
