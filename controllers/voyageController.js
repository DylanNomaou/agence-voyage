const Voyage = require('../models/Voyage');

// GET /api/voyages — liste avec filtres optionnels
const getVoyages = async (req, res) => {
  try {
    const { categorie, prixMax, destination, vedette, page, limit } = req.query;
    const filtre = {};

    if (categorie)  filtre.categorie   = categorie;
    if (prixMax)    filtre.prix        = { $lte: Number(prixMax) };
    if (destination) filtre.destination = new RegExp(destination, 'i');
    if (vedette === 'true') filtre.vedette = true;

    const sortMap = {
      prix_asc:  { prix: 1 },  prix_desc: { prix: -1 },
      duree_asc: { duree: 1 }, duree_desc: { duree: -1 },
    };
    const sortOption = sortMap[req.query.sort] || { createdAt: -1 };

    if (page !== undefined) {
      const p     = Math.max(1, parseInt(page) || 1);
      const lim   = Math.min(100, Math.max(1, parseInt(limit) || 10));
      const total = await Voyage.countDocuments(filtre);
      const data  = await Voyage.find(filtre).sort(sortOption).skip((p - 1) * lim).limit(lim);
      return res.json({ data, total, page: p, totalPages: Math.max(1, Math.ceil(total / lim)) });
    }

    const voyages = await Voyage.find(filtre).sort(sortOption);
    res.json(voyages);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// GET /api/voyages/:id — détail d'un voyage
const getVoyage = async (req, res) => {
  try {
    const voyage = await Voyage.findById(req.params.id);
    if (!voyage) return res.status(404).json({ message: 'Voyage non trouvé' });
    res.json(voyage);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// POST /api/voyages — créer (admin)
const createVoyage = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.image = '/uploads/' + req.file.filename;
    const voyage = await Voyage.create(data);
    res.status(201).json(voyage);
  } catch (err) {
    res.status(400).json({ message: 'Données invalides', error: err.message });
  }
};

// PUT /api/voyages/:id — modifier (admin)
const updateVoyage = async (req, res) => {
  try {
    const voyage = await Voyage.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!voyage) return res.status(404).json({ message: 'Voyage non trouvé' });
    res.json(voyage);
  } catch (err) {
    res.status(400).json({ message: 'Données invalides', error: err.message });
  }
};

// DELETE /api/voyages/:id — supprimer (admin)
const deleteVoyage = async (req, res) => {
  try {
    const voyage = await Voyage.findByIdAndDelete(req.params.id);
    if (!voyage) return res.status(404).json({ message: 'Voyage non trouvé' });
    res.json({ message: 'Voyage supprimé' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

module.exports = { getVoyages, getVoyage, createVoyage, updateVoyage, deleteVoyage };
