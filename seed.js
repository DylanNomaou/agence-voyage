require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Voyage = require('./models/Voyage');
const User = require('./models/User');

const voyages = [
  {
    titre: 'Séjour à Bali - Paradis Tropical',
    description: 'Découvrez les rizières en terrasses, les temples ancestraux et les plages de sable blanc de Bali. Un voyage immersif au cœur de la culture balinaise avec hébergement en villa privée.',
    destination: 'Bali, Indonésie',
    prix: 1290,
    duree: 12,
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800',
    placesDisponibles: 8,
    dateDepart: new Date('2026-06-15'),
    categorie: 'plage',
    vedette: true,
  },
  {
    titre: 'Safari Kenya - Masai Mara',
    description: 'Vivez une expérience inoubliable au cœur de la savane africaine. Observez la grande migration des gnous et les Big Five dans leur habitat naturel.',
    destination: 'Nairobi, Kenya',
    prix: 2450,
    duree: 10,
    image: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800',
    placesDisponibles: 6,
    dateDepart: new Date('2026-07-20'),
    categorie: 'aventure',
    vedette: true,
  },
  {
    titre: 'Escapade à Santorini',
    description: 'Perdez-vous dans les ruelles blanches de Oia, admirez les couchers de soleil légendaires et dégustez la gastronomie grecque face à la mer Égée.',
    destination: 'Santorini, Grèce',
    prix: 980,
    duree: 7,
    image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800',
    placesDisponibles: 12,
    dateDepart: new Date('2026-05-10'),
    categorie: 'plage',
    vedette: true,
  },
  {
    titre: 'Trek Himalaya - Népal',
    description: 'Partez à la conquête des sommets himalayens sur le circuit Annapurna. Un trek exceptionnel à travers villages sherpa, forêts de rhododendrons et panoramas à couper le souffle.',
    destination: 'Katmandou, Népal',
    prix: 1850,
    duree: 14,
    image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800',
    placesDisponibles: 10,
    dateDepart: new Date('2026-09-01'),
    categorie: 'montagne',
    vedette: false,
  },
  {
    titre: 'Tokyo & Kyoto - Japon Authentique',
    description: 'Entre modernité tokyoïte et traditions millénaires de Kyoto, découvrez le Japon sous toutes ses facettes. Temples zen, quartiers branchés, gastronomie raffinée.',
    destination: 'Tokyo & Kyoto, Japon',
    prix: 2100,
    duree: 15,
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800',
    placesDisponibles: 9,
    dateDepart: new Date('2026-04-01'),
    categorie: 'culture',
    vedette: true,
  },
  {
    titre: 'Marrakech - Magie du Maroc',
    description: 'Plongez dans l\'atmosphère envoûtante des souks, des palais et des jardins de Marrakech. Nuits en riad traditionnel et excursion dans les dunes du Sahara.',
    destination: 'Marrakech, Maroc',
    prix: 650,
    duree: 6,
    image: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=800',
    placesDisponibles: 15,
    dateDepart: new Date('2026-05-25'),
    categorie: 'culture',
    vedette: false,
  },
  {
    titre: 'New York City - The Big Apple',
    description: 'Explorez la ville qui ne dort jamais : Central Park, Times Square, Brooklyn Bridge, musées world-class et gastronomie internationale. L\'expérience américaine par excellence.',
    destination: 'New York, États-Unis',
    prix: 1450,
    duree: 8,
    image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800',
    placesDisponibles: 20,
    dateDepart: new Date('2026-08-10'),
    categorie: 'ville',
    vedette: false,
  },
  {
    titre: 'Patagonie - Bout du Monde',
    description: 'Aventure ultime au bout du continent américain. Torres del Paine, glaciers bleutés, condors andins et paysages lunaires dans l\'une des régions les plus sauvages du monde.',
    destination: 'Patagonie, Argentine/Chili',
    prix: 3200,
    duree: 16,
    image: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800',
    placesDisponibles: 5,
    dateDepart: new Date('2026-11-15'),
    categorie: 'aventure',
    vedette: false,
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connecté à MongoDB');

  // Nettoyage
  await Voyage.deleteMany({});
  await User.deleteMany({});
  console.log('Base nettoyée');

  // Voyages
  await Voyage.insertMany(voyages);
  console.log(`${voyages.length} voyages insérés`);

  // Admin
  const hash = await bcrypt.hash('admin123', 10);
  await User.create({ nom: 'Admin', email: 'admin@agence.com', motDePasse: hash, role: 'admin' });
  console.log('Compte admin créé : admin@agence.com / admin123');

  // Client test
  const hashClient = await bcrypt.hash('client123', 10);
  await User.create({ nom: 'Jean Dupont', email: 'jean@example.com', motDePasse: hashClient, role: 'client' });
  console.log('Compte client créé : jean@example.com / client123');

  await mongoose.disconnect();
  console.log('\nSeed terminé !');
}

seed().catch(console.error);
