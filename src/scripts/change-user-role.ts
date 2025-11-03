#!/usr/bin/env tsx

/**
 * Script pour changer le rôle d'un utilisateur
 * Usage: npm run change-role <email> <nouveau-role>
 * Exemple: npm run change-role user@example.com admin
 */

import { getPayload } from 'payload'
import config from '../payload.config'

async function changeUserRole() {
  const email = process.argv[2]
  const newRole = process.argv[3]
  
  if (!email || !newRole) {
    console.error('❌ Usage: npm run change-role <email> <nouveau-role>')
    console.error('   Rôles disponibles: admin, student')
    console.error('   Exemple: npm run change-role user@example.com admin')
    process.exit(1)
  }

  if (!['admin', 'student'].includes(newRole)) {
    console.error('❌ Rôle invalide. Rôles disponibles: admin, student')
    process.exit(1)
  }

  console.log(`🔄 Changement de rôle: ${email} → ${newRole}`)
  
  try {
    const payload = await getPayload({ config })
    
    // Rechercher l'utilisateur par email
    const users = await payload.find({
      collection: 'users',
      where: {
        email: { equals: email }
      },
      limit: 1
    })
    
    if (users.docs.length === 0) {
      console.error(`❌ Utilisateur non trouvé: ${email}`)
      process.exit(1)
    }
    
    const user = users.docs[0]
    console.log(`📋 Utilisateur trouvé: ${user.email} (rôle actuel: ${user.role})`)
    
    if (user.role === newRole) {
      console.log(`✅ L'utilisateur ${email} a déjà le rôle ${newRole}`)
      process.exit(0)
    }
    
    // Changer le rôle
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { role: newRole }
    })
    
    const roleIcon = newRole === 'admin' ? '👑' : '👤'
    console.log(`✅ Rôle changé avec succès! ${roleIcon} ${email} est maintenant ${newRole}`)
    
  } catch (error) {
    console.error('❌ Erreur lors du changement de rôle:', error)
    process.exit(1)
  }
  
  process.exit(0)
}

// Exécuter le script
changeUserRole()