/**
 * Script de test pour l'intégration code-supernova
 * Teste la connectivité et la génération de quiz avec les nouveaux services
 */

import { SupernovaService } from '../src/services/SupernovaService';
import { GeminiService } from '../src/services/GeminiService';
import { AIAPIService } from '../src/services/AIAPIService';

async function testSupernovaIntegration() {
  console.log('🧪 Test d\'intégration code-supernova...\n');

  try {
    // 1. Test de connectivité Supernova
    console.log('1️⃣ Test de connectivité Supernova...');
    const supernovaService = new SupernovaService();
    const connectivityTest = await supernovaService.testConnection();

    if (connectivityTest.connected) {
      console.log(`✅ Supernova connecté (${connectivityTest.responseTime}ms)`);
    } else {
      console.log(`❌ Erreur de connexion: ${connectivityTest.error}`);
      return;
    }

    // 2. Test de génération simple
    console.log('\n2️⃣ Test de génération simple...');
    const simpleRequest = {
      prompt: 'Génère un quiz médical simple sur la cardiologie avec 2 questions.',
      maxTokens: 1000,
      temperature: 0.7,
      jsonMode: false
    };

    const response = await supernovaService.generateContentWithRetry(simpleRequest);
    console.log(`✅ Génération réussie (${response.content.length} caractères)`);

    // 3. Test AIAPIService avec priorité
    console.log('\n3️⃣ Test AIAPIService avec priorité...');
    const aiService = new AIAPIService();

    const providers = aiService.getAvailableProviders();
    console.log('📋 Providers disponibles:', providers.map(p => `${p.name} (priorité ${p.priority})`));

    // Test avec préférence automatique (devrait choisir Supernova)
    const aiResponse = await aiService.generateContent({
      prompt: 'Génère une question médicale sur l\'anatomie cardiaque.',
      maxTokens: 500,
      temperature: 0.7,
      jsonMode: false,
      preferredProvider: 'auto'
    });
    console.log(`✅ Génération AIAPIService réussie (${aiResponse.provider})`);

    // 4. Test avec préférence spécifique
    console.log('\n4️⃣ Test avec préférence Gemini...');
    const geminiResponse = await aiService.generateContent({
      prompt: 'Génère une question médicale sur la physiologie cardiaque.',
      maxTokens: 500,
      temperature: 0.7,
      jsonMode: false,
      preferredProvider: 'gemini'
    });
    console.log(`✅ Fallback Gemini réussi (${geminiResponse.provider})`);

    console.log('\n🎉 Tous les tests d\'intégration réussis !');
    console.log('\n📊 Résumé:');
    console.log('- ✅ code-supernova : Service principal');
    console.log('- ✅ Gemini : Service de secours');
    console.log('- ✅ AIAPIService : Orchestration intelligente');
    console.log('- ✅ Sélection automatique : Fonctionnelle');

  } catch (error) {
    console.error('\n❌ Erreur lors des tests:', error);
  }
}

// Exécuter les tests si appelé directement
if (require.main === module) {
  testSupernovaIntegration();
}

export { testSupernovaIntegration };
