#!/usr/bin/env tsx

/**
 * Script interactif pour gérer les rôles des utilisateurs
 * Usage: npm run manage-roles
 */

import { getPayload } from 'payload'
import config from '../payload.config'
import * as readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

async function manageUserRoles() {
  console.log('🎭 Gestionnaire de rôles utilisateurs\n')
  
  try {
    const payload = await getPayload({ config })
    
    while (true) {
      console.log('\n📋 Options disponibles:')
      console.log('1. Lister tous les utilisateurs')
      console.log('2. Modifier le rôle d\'un utilisateur')
      console.log('3. Rechercher un utilisateur')
      console.log('4. Quitter')
      
      const choice = await question('\nChoisissez une option (1-4): ')
      
      switch (choice) {
        case '1':
          await listAllUsers(payload)
          break
        case '2':
          await changeUserRole(payload)
          break
        case '3':
          await searchUser(payload)
          break
        case '4':
          console.log('👋 Au revoir!')
          rl.close()
          process.exit(0)
        default:
          console.log('❌ Option invalide, veuillez choisir entre 1 et 4')
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error)
    rl.close()
    process.exit(1)
  }
}

async function listAllUsers(payload: any) {
  console.log('\n📋 Liste des utilisateurs...')
  
  const users = await payload.find({
    collection: 'users',
    limit: 50,
    sort: 'createdAt'
  })
  
  console.log(`\n📊 ${users.docs.length} utilisateur(s) trouvé(s):\n`)
  
  users.docs.forEach((user: any, index: number) => {
    const roleIcon = user.role === 'admin' ? '👑' : '👤'
    const name = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : 'Nom non défini'
    
    console.log(`${index + 1}. ${roleIcon} ${user.email}`)
    console.log(`   Nom: ${name}`)
    console.log(`   Rôle: ${user.role}`)
    console.log(`   ID: ${user.id}`)
    console.log('')
  })
}

async function changeUserRole(payload: any) {
  console.log('\n🔄 Modification du rôle utilisateur')
  
  const email = await question('Email de l\'utilisateur: ')
  
  if (!email) {
    console.log('❌ Email requis')
    return
  }
  
  // Rechercher l'utilisateur
  const users = await payload.find({
    collection: 'users',
    where: {
      email: { equals: email }
    },
    limit: 1
  })
  
  if (users.docs.length === 0) {
    console.log(`❌ Utilisateur non trouvé: ${email}`)
    return
  }
  
  const user = users.docs[0]
  console.log(`\n📋 Utilisateur trouvé:`)
  console.log(`   Email: ${user.email}`)
  console.log(`   Nom: ${user.firstName || ''} ${user.lastName || ''}`)
  console.log(`   Rôle actuel: ${user.role}`)
  
  console.log('\n🎭 Rôles disponibles:')
  console.log('1. admin (👑 Administrateur)')
  console.log('2. student (👤 Étudiant)')
  
  const roleChoice = await question('\nChoisissez le nouveau rôle (1-2): ')
  
  let newRole: string
  switch (roleChoice) {
    case '1':
      newRole = 'admin'
      break
    case '2':
      newRole = 'student'
      break
    default:
      console.log('❌ Choix invalide')
      return
  }
  
  if (user.role === newRole) {
    console.log(`✅ L'utilisateur a déjà le rôle ${newRole}`)
    return
  }
  
  const confirm = await question(`\n⚠️  Confirmer le changement de rôle de "${user.role}" vers "${newRole}" pour ${email}? (oui/non): `)
  
  if (confirm.toLowerCase() !== 'oui' && confirm.toLowerCase() !== 'o') {
    console.log('❌ Opération annulée')
    return
  }
  
  // Effectuer le changement
  await payload.update({
    collection: 'users',
    id: user.id,
    data: { role: newRole }
  })
  
  const roleIcon = newRole === 'admin' ? '👑' : '👤'
  console.log(`✅ Rôle mis à jour avec succès! ${roleIcon} ${email} est maintenant ${newRole}`)
}

async function searchUser(payload: any) {
  console.log('\n🔍 Recherche d\'utilisateur')
  
  const searchTerm = await question('Rechercher par email (ou partie d\'email): ')
  
  if (!searchTerm) {
    console.log('❌ Terme de recherche requis')
    return
  }
  
  const users = await payload.find({
    collection: 'users',
    where: {
      email: { contains: searchTerm }
    },
    limit: 20
  })
  
  if (users.docs.length === 0) {
    console.log(`❌ Aucun utilisateur trouvé contenant: ${searchTerm}`)
    return
  }
  
  console.log(`\n📊 ${users.docs.length} utilisateur(s) trouvé(s):\n`)
  
  users.docs.forEach((user: any, index: number) => {
    const roleIcon = user.role === 'admin' ? '👑' : '👤'
    const name = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : 'Nom non défini'
    
    console.log(`${index + 1}. ${roleIcon} ${user.email}`)
    console.log(`   Nom: ${name}`)
    console.log(`   Rôle: ${user.role}`)
    console.log('')
  })
}

// Exécuter le script
manageUserRoles()