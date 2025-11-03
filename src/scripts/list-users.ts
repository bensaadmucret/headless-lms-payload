#!/usr/bin/env tsx

/**
 * Script pour lister tous les utilisateurs avec leurs rôles
 * Usage: npm run list-users
 */

import { getPayload } from 'payload'
import config from '../payload.config'

async function listUsers() {
  console.log('📋 Liste des utilisateurs...')
  
  try {
    const payload = await getPayload({ config })
    
    const users = await payload.find({
      collection: 'users',
      limit: 100,
      sort: 'createdAt'
    })
    
    console.log(`\n📊 ${users.docs.length} utilisateur(s) trouvé(s):\n`)
    
    users.docs.forEach((user, index) => {
      const roleIcon = user.role === 'admin' ? '👑' : '👤'
      const name = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : 'Nom non défini'
      
      console.log(`${index + 1}. ${roleIcon} ${user.email}`)
      console.log(`   Nom: ${name}`)
      console.log(`   Rôle: ${user.role}`)
      console.log(`   Créé: ${new Date(user.createdAt).toLocaleDateString('fr-FR')}`)
      console.log('')
    })
    
    const adminCount = users.docs.filter(u => u.role === 'admin').length
    const studentCount = users.docs.filter(u => u.role === 'student').length
    
    console.log('📈 Résumé:')
    console.log(`   👑 Admins: ${adminCount}`)
    console.log(`   👤 Étudiants: ${studentCount}`)
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des utilisateurs:', error)
    process.exit(1)
  }
  
  process.exit(0)
}

// Exécuter le script
listUsers()