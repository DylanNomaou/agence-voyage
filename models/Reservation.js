const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  voyage: { type: mongoose.Schema.Types.ObjectId, ref: 'Voyage', required: true },
  nombrePersonnes: { type: Number, required: true, min: 1 },
  statut: { type: String, enum: ['en_attente', 'confirmee', 'annulee'], default: 'en_attente' },
  prixTotal: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Reservation', reservationSchema);
