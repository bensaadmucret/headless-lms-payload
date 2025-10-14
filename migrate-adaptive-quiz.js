#!/usr/bin/env node

/**
 * Script exécutable pour la migration du quiz adaptatif
 * 
 * Usage: node migrate-adaptive-quiz.js
 */

import { execSync } from 'child_process'
import path from 'path'

console.log('🚀 Lancement de la migration pour le quiz adaptatif...')

try {
  // Compiler et exécuter le script TypeScript
  const scriptPath = path.join(process.cwd(), 'src/scripts/migrateAdaptiveQuiz.ts')
  
  console.log('📦 Compilation du script de migration...')
  execSync(`npx tsx ${scriptPath}`, { 
    stdio: 'inherit',
    cwd: process.cwd()
  })
  
  console.log('✅ Migration terminée avec succès!')
  
} catch (error) {
  console.error('❌ Erreur lors de la migration:', error.message)
  process.exit(1)
}