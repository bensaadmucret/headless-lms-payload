#!/usr/bin/env node

/**
 * Script exécutable pour créer les index de base de données
 * 
 * Usage: 
 *   node create-database-indexes.js        # Créer les index
 *   node create-database-indexes.js drop   # Supprimer les index
 */

import { execSync } from 'child_process'
import path from 'path'

const action = process.argv[2] || 'create'

if (action === 'drop') {
  console.log('🗑️ Suppression des index de base de données...')
} else {
  console.log('🚀 Création des index de base de données pour les performances...')
}

try {
  // Compiler et exécuter le script TypeScript
  const scriptPath = path.join(process.cwd(), 'src/scripts/createDatabaseIndexes.ts')
  
  console.log('📦 Compilation du script d\'index...')
  execSync(`npx tsx ${scriptPath} ${action}`, { 
    stdio: 'inherit',
    cwd: process.cwd()
  })
  
  if (action === 'drop') {
    console.log('✅ Suppression des index terminée!')
  } else {
    console.log('✅ Création des index terminée!')
  }
  
} catch (error) {
  console.error('❌ Erreur lors de l\'opération sur les index:', error.message)
  process.exit(1)
}