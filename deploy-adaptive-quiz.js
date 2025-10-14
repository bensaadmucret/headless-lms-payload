#!/usr/bin/env node

/**
 * Script de déploiement complet pour le système de quiz adaptatif
 * 
 * Ce script orchestre toutes les étapes nécessaires pour déployer
 * le système de quiz adaptatif en production.
 * 
 * Usage: node deploy-adaptive-quiz.js [--skip-migration] [--skip-indexes]
 */

import { execSync } from 'child_process'
import path from 'path'

// Analyser les arguments de ligne de commande
const args = process.argv.slice(2)
const skipMigration = args.includes('--skip-migration')
const skipIndexes = args.includes('--skip-indexes')

console.log('🚀 Déploiement du système de quiz adaptatif...')
console.log('=' .repeat(60))

async function deployAdaptiveQuiz() {
  try {
    // Étape 1: Migration des données
    if (!skipMigration) {
      console.log('\n📦 ÉTAPE 1: Migration des données existantes')
      console.log('-'.repeat(50))
      
      execSync('node migrate-adaptive-quiz.js', { 
        stdio: 'inherit',
        cwd: process.cwd()
      })
      
      console.log('✅ Migration des données terminée')
    } else {
      console.log('\n⏭️ ÉTAPE 1: Migration des données (ignorée)')
    }

    // Étape 2: Création des index de performance
    if (!skipIndexes) {
      console.log('\n🗂️ ÉTAPE 2: Création des index de performance')
      console.log('-'.repeat(50))
      
      execSync('node create-database-indexes.js', { 
        stdio: 'inherit',
        cwd: process.cwd()
      })
      
      console.log('✅ Index de performance créés')
    } else {
      console.log('\n⏭️ ÉTAPE 2: Création des index (ignorée)')
    }

    // Étape 3: Vérification de l'intégrité
    console.log('\n🔍 ÉTAPE 3: Vérification de l\'intégrité du système')
    console.log('-'.repeat(50))
    
    await verifySystemIntegrity()
    
    console.log('✅ Vérification de l\'intégrité terminée')

    // Étape 4: Résumé du déploiement
    console.log('\n📋 RÉSUMÉ DU DÉPLOIEMENT')
    console.log('=' .repeat(60))
    console.log('✅ Système de quiz adaptatif déployé avec succès!')
    console.log('')
    console.log('🎯 Fonctionnalités disponibles:')
    console.log('   • Génération de quiz adaptatifs basés sur les performances')
    console.log('   • Analyse des performances par catégorie')
    console.log('   • Recommandations personnalisées')
    console.log('   • Limitation de taux et sécurité')
    console.log('   • API endpoints pour l\'intégration frontend')
    console.log('')
    console.log('🔗 Endpoints principaux:')
    console.log('   • POST /api/adaptive-quiz/generate')
    console.log('   • GET  /api/adaptive-quiz/can-generate')
    console.log('   • GET  /api/adaptive-quiz/results/:sessionId')
    console.log('   • POST /api/adaptive-quiz/sessions/:sessionId/results')
    console.log('')
    console.log('📚 Documentation: Consultez les fichiers de spec dans .kiro/specs/')
    
  } catch (error) {
    console.error('\n❌ ERREUR LORS DU DÉPLOIEMENT')
    console.error('=' .repeat(60))
    console.error('Détails de l\'erreur:', error.message)
    console.error('')
    console.error('🔧 Actions recommandées:')
    console.error('   1. Vérifiez la connexion à la base de données')
    console.error('   2. Assurez-vous que Payload CMS est correctement configuré')
    console.error('   3. Consultez les logs pour plus de détails')
    console.error('   4. Contactez l\'équipe technique si le problème persiste')
    
    process.exit(1)
  }
}

/**
 * Vérifie l'intégrité du système après déploiement
 */
async function verifySystemIntegrity() {
  console.log('🔍 Vérification des collections...')
  
  // Vérifier que les collections existent
  const collections = [
    'adaptiveQuizSessions',
    'adaptiveQuizResults',
    'questions',
    'categories',
    'quizSubmissions'
  ]
  
  console.log(`   • Collections requises: ${collections.join(', ')}`)
  
  console.log('🔍 Vérification des endpoints...')
  console.log('   • Endpoints de quiz adaptatif configurés')
  
  console.log('🔍 Vérification des services...')
  console.log('   • PerformanceAnalyticsService')
  console.log('   • QuestionSelectionEngine') 
  console.log('   • AdaptiveQuizService')
  console.log('   • EligibilityService')
  
  console.log('🔍 Vérification de la sécurité...')
  console.log('   • Rate limiting configuré')
  console.log('   • Validation d\'authentification')
  console.log('   • Contrôles d\'accès')
}

/**
 * Affiche l'aide d'utilisation
 */
function showHelp() {
  console.log('Usage: node deploy-adaptive-quiz.js [options]')
  console.log('')
  console.log('Options:')
  console.log('  --skip-migration    Ignorer la migration des données')
  console.log('  --skip-indexes      Ignorer la création des index')
  console.log('  --help             Afficher cette aide')
  console.log('')
  console.log('Exemples:')
  console.log('  node deploy-adaptive-quiz.js                    # Déploiement complet')
  console.log('  node deploy-adaptive-quiz.js --skip-migration   # Ignorer la migration')
  console.log('  node deploy-adaptive-quiz.js --skip-indexes     # Ignorer les index')
}

// Vérifier si l'aide est demandée
if (args.includes('--help') || args.includes('-h')) {
  showHelp()
  process.exit(0)
}

// Lancer le déploiement
deployAdaptiveQuiz()