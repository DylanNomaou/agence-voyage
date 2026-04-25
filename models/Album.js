const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  url:     { type: String, required: true },
  legende: { type: String, default: '' },
  ordre:   { type: Number, default: 0 },
});

const albumSchema = new mongoose.Schema({
  titre:       { type: String, required: true },
  description: { type: String, default: '' },
  photos:      [photoSchema],
}, { timestamps: true });

module.exports = mongoose.model('Album', albumSchema);
