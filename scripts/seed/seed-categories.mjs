import 'dotenv/config';
import { getPayload } from 'payload';
import config from '../src/payload.config.ts';

/**
 * Script pour générer automatiquement les catégories médicales pour PASS/LAS
 * Usage: node seed-categories.mjs
 */

const categories = [
  // === UE1 - Chimie, Biochimie, Biologie moléculaire ===
  {
    title: 'Chimie générale et organique',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 10 }
  },
  {
    title: 'Biochimie structurale',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 10 }
  },
  {
    title: 'Biochimie métabolique',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 10 }
  },
  {
    title: 'Biologie moléculaire',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 10 }
  },

  // === UE2 - Biologie cellulaire ===
  {
    title: 'Structure et fonction cellulaire',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 10 }
  },
  {
    title: 'Cycle cellulaire et division',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 8 }
  },
  {
    title: 'Communication cellulaire',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 8 }
  },

  // === UE3 - Physique, Biophysique ===
  {
    title: 'Physique des fluides',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 8 }
  },
  {
    title: 'Électricité et magnétisme',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 8 }
  },
  {
    title: 'Biophysique des radiations',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 8 }
  },
  {
    title: 'Imagerie médicale',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 10 }
  },

  // === UE4 - Mathématiques, Biostatistiques ===
  {
    title: 'Probabilités et statistiques',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 10 }
  },
  {
    title: 'Tests statistiques',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 8 }
  },
  {
    title: 'Épidémiologie',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 8 }
  },

  // === UE5 - Anatomie ===
  {
    title: 'Anatomie générale',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 15 }
  },
  {
    title: 'Système nerveux',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 12 }
  },
  {
    title: 'Système cardiovasculaire',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 12 }
  },
  {
    title: 'Système respiratoire',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 10 }
  },
  {
    title: 'Système digestif',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 10 }
  },
  {
    title: 'Appareil locomoteur',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 10 }
  },

  // === UE6 - Pharmacologie ===
  {
    title: 'Pharmacocinétique',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 10 }
  },
  {
    title: 'Pharmacodynamie',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 10 }
  },
  {
    title: 'Classes thérapeutiques',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 12 }
  },

  // === UE7 - Sciences humaines et sociales ===
  {
    title: 'Santé publique',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 8 }
  },
  {
    title: 'Éthique médicale',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 8 }
  },
  {
    title: 'Droit de la santé',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 8 }
  },

  // === Catégories spécifiques ===
  {
    title: 'Positionnement Las',
    level: 'LAS',
    adaptiveSettings: { isActive: true, minimumQuestions: 20 }
  },
  {
    title: 'Positionnement Pass',
    level: 'PASS',
    adaptiveSettings: { isActive: true, minimumQuestions: 20 }
  },
  {
    title: 'Quiz de révision générale',
    level: 'both',
    adaptiveSettings: { isActive: true, minimumQuestions: 15 }
  },
];

async function seedCategories() {
  console.log('🌱 Démarrage du seed des catégories...\n');

  try {
    const payload = await getPayload({ config });

    // Vérifier si des catégories existent déjà
    const existingCategories = await payload.find({
      collection: 'categories',
      limit: 1,
    });

    if (existingCategories.totalDocs > 0) {
      console.log('⚠️  Des catégories existent déjà dans la base de données.');
      console.log(`   Nombre de catégories existantes: ${existingCategories.totalDocs}`);
      console.log('\n❓ Voulez-vous continuer et ajouter les nouvelles catégories ? (y/n)');
      
      // En production, vous pouvez commenter cette partie et forcer l'ajout
      // Pour l'instant, on continue automatiquement
      console.log('   → Ajout des catégories manquantes...\n');
    }

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const category of categories) {
      try {
        // Vérifier si la catégorie existe déjà
        const existing = await payload.find({
          collection: 'categories',
          where: {
            title: {
              equals: category.title,
            },
          },
          limit: 1,
        });

        if (existing.docs.length > 0) {
          console.log(`⏭️  Catégorie déjà existante: "${category.title}"`);
          skipped++;
          continue;
        }

        // Créer la catégorie
        await payload.create({
          collection: 'categories',
          data: category,
        });

        console.log(`✅ Catégorie créée: "${category.title}" (${category.level})`);
        created++;

      } catch (error) {
        console.error(`❌ Erreur lors de la création de "${category.title}":`, error.message);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Résumé du seed:');
    console.log(`   ✅ Créées: ${created}`);
    console.log(`   ⏭️  Ignorées (déjà existantes): ${skipped}`);
    console.log(`   ❌ Erreurs: ${errors}`);
    console.log(`   📝 Total traité: ${categories.length}`);
    console.log('='.repeat(60) + '\n');

    if (created > 0) {
      console.log('🎉 Seed terminé avec succès !');
    } else if (skipped === categories.length) {
      console.log('ℹ️  Toutes les catégories existent déjà.');
    } else {
      console.log('⚠️  Seed terminé avec des erreurs.');
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erreur fatale lors du seed:', error);
    process.exit(1);
  }
}

// Exécuter le seed
seedCategories();
