const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nom:        { type: String, required: true },
  email:      { type: String, required: true, unique: true },
  motDePasse: { type: String, required: true },
  role:       { type: String, enum: ['client', 'admin'], default: 'client' },
  avatar:     { type: String, default: 'gradient-1' },
  telephone:  { type: String, default: '' },
  photoUrl:   { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
