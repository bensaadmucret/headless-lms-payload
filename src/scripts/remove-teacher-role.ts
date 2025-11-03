#!/usr/bin/env tsx

/**
 * Script pour supprimer le rôle 'teacher' de la base de données
 * et migrer les utilisateurs existants vers le rôle 'admin'
 */

import { getPayload } from 'payload'
import config from '../payload.config'

async function removeTeacherRole() {
  console.log('🚀 Démarrage de la suppression du rôle teacher...')
  
  try {
    const payload = await getPayload({ config })
    
    // 1. Trouver tous les utilisateurs avec le rôle 'teacher'
    console.log('📋 Recherche des utilisateurs avec le rôle teacher...')
    const teacherUsers = await payload.find({
      collection: 'users',
      where: {
        role: {
          equals: 'teacher'
        }
      },
      limit: 1000
    })
    
    console.log(`📊 ${teacherUsers.docs.length} utilisateur(s) trouvé(s) avec le rôle teacher`)
    
    // 2. Migrer les utilisateurs teacher vers admin
    if (teacherUsers.docs.length > 0) {
      console.log('🔄 Migration des utilisateurs teacher vers admin...')
      
      for (const user of teacherUsers.docs) {
        await payload.update({
          collection: 'users',
          id: user.id,
          data: {
            role: 'admin'
          }
        })
        console.log(`✅ Utilisateur ${user.email} migré vers admin`)
      }
    }

    // 3. Trouver et migrer les utilisateurs superadmin vers admin
    console.log('📋 Recherche des utilisateurs avec le rôle superadmin...')
    const superadminUsers = await payload.find({
      collection: 'users',
      where: {
        role: {
          equals: 'superadmin'
        }
      },
      limit: 1000
    })
    
    console.log(`📊 ${superadminUsers.docs.length} utilisateur(s) trouvé(s) avec le rôle superadmin`)
    
    if (superadminUsers.docs.length > 0) {
      console.log('🔄 Migration des utilisateurs superadmin vers admin...')
      
      for (const user of superadminUsers.docs) {
        await payload.update({
          collection: 'users',
          id: user.id,
          data: {
            role: 'admin'
          }
        })
        console.log(`✅ Utilisateur ${user.email} migré vers admin`)
      }
    }
    
    // 3. Nettoyer les autres collections qui pourraient référencer le rôle teacher
    console.log('🧹 Nettoyage des autres références...')
    
    // Vérifier s'il y a des badges (la migration SQL a déjà nettoyé les références)
    const allBadges = await payload.find({
      collection: 'badges',
      limit: 1000
    })
    
    console.log(`📊 ${allBadges.docs.length} badge(s) trouvé(s) (déjà nettoyés par la migration SQL)`)
    
    console.log('✨ Migration terminée avec succès!')
    console.log('📝 Résumé:')
    console.log(`   - ${teacherUsers.docs.length} utilisateur(s) migré(s) vers admin`)
    console.log(`   - ${allBadges.docs.length} badge(s) vérifiés`)
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error)
    process.exit(1)
  }
  
  process.exit(0)
}

// Exécuter le script
removeTeacherRole()