const mongoose = require('mongoose');

const voyageSchema = new mongoose.Schema({
  titre: { type: String, required: true },
  description: { type: String, required: true },
  destination: { type: String, required: true },
  prix: { type: Number, required: true },
  duree: { type: Number, required: true }, // en jours
  image: { type: String },
  placesDisponibles: { type: Number, required: true },
  dateDepart: { type: Date, required: true },
  categorie: { type: String, enum: ['plage', 'montagne', 'ville', 'aventure', 'culture', 'autre'], default: 'ville' },
  vedette: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Voyage', voyageSchema);
