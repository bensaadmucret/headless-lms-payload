#!/usr/bin/env tsx

/**
 * Script pour promouvoir un utilisateur au rôle admin
 * Usage: npm run promote-user <email>
 */

import { getPayload } from 'payload'
import config from '../payload.config'

async function promoteUser() {
  const email = process.argv[2]
  
  if (!email) {
    console.error('❌ Usage: npm run promote-user <email>')
    process.exit(1)
  }

  console.log(`🚀 Promotion de l'utilisateur: ${email}`)
  
  try {
    const payload = await getPayload({ config })
    
    // Rechercher l'utilisateur par email
    const users = await payload.find({
      collection: 'users',
      where: {
        email: {
          equals: email
        }
      },
      limit: 1
    })
    
    if (users.docs.length === 0) {
      console.error(`❌ Utilisateur non trouvé: ${email}`)
      process.exit(1)
    }
    
    const user = users.docs[0]
    console.log(`📋 Utilisateur trouvé: ${user.email} (rôle actuel: ${user.role})`)
    
    if (user.role === 'admin') {
      console.log(`✅ L'utilisateur ${email} est déjà admin`)
      process.exit(0)
    }
    
    // Promouvoir l'utilisateur
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        role: 'admin'
      }
    })
    
    console.log(`✅ Utilisateur ${email} promu au rôle admin avec succès!`)
    
  } catch (error) {
    console.error('❌ Erreur lors de la promotion:', error)
    process.exit(1)
  }
  
  process.exit(0)
}

// Exécuter le script
promoteUser()