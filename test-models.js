/**
 * Script de test pour déterminer le bon modèle Supernova
 * Teste différents noms de modèles pour trouver celui qui fonctionne
 */

import { SupernovaService } from '../src/services/SupernovaService';

const MODELS_TO_TEST = [
  'supernova-default',
  'code-supernova-default',
  'supernova-pro',
  'supernova-turbo',
  'supernova-gpt',
  'default', // Sans spécifier de modèle
  'gpt-3.5-turbo', // Modèle standard
  'gpt-4', // Modèle avancé
];

async function testSupernovaModels() {
  console.log('🔍 Test des modèles Supernova disponibles...\n');

  // Créer une instance temporaire pour les tests
  const testService = new SupernovaService();

  for (const modelName of MODELS_TO_TEST) {
    try {
      console.log(`🧪 Test du modèle: ${modelName}`);

      // Mettre à jour temporairement le modèle
      testService.updateConfig({ model: modelName });

      // Test de connectivité simple
      const connectivityTest = await testService.testConnection();

      if (connectivityTest.connected) {
        console.log(`✅ ${modelName} - Connecté (${connectivityTest.responseTime}ms)`);

        // Test de génération simple
        try {
          const response = await testService.generateContent({
            prompt: 'Génère une question médicale simple sur le cœur.',
            maxTokens: 100,
            temperature: 0.1
          });

          console.log(`✅ ${modelName} - Génération réussie (${response.content.length} caractères)`);
          console.log(`   Réponse: ${response.content.substring(0, 50)}...`);
          console.log(`   Modèle utilisé: ${response.model}`);
          console.log('');
        } catch (genError) {
          console.log(`⚠️ ${modelName} - Connecté mais génération échouée: ${genError.message}`);
        }
      } else {
        console.log(`❌ ${modelName} - Échec de connexion: ${connectivityTest.error}`);
      }

      // Petite pause entre les tests
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.log(`❌ ${modelName} - Erreur: ${error.message}`);
    }
  }

  console.log('🎯 Résumé des tests:');
  console.log('Le modèle qui fonctionne sera utilisé par défaut dans votre configuration.');
}

export { testSupernovaModels };

// Exécuter si appelé directement
if (require.main === module) {
  testSupernovaModels();
}
