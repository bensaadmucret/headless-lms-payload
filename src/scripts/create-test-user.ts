#!/usr/bin/env tsx

/**
 * Script pour créer un utilisateur de test
 */

import { getPayload } from 'payload'
import config from '../payload.config'

async function createTestUser() {
  const email = process.argv[2] || 'test@example.com'
  const password = process.argv[3] || 'testpassword123'
  const role = process.argv[4] || 'student'
  
  console.log(`🚀 Création d'un utilisateur de test`)
  console.log(`   Email: ${email}`)
  console.log(`   Rôle: ${role}`)
  
  try {
    const payload = await getPayload({ config })
    
    // Vérifier si l'utilisateur existe déjà
    const existingUsers = await payload.find({
      collection: 'users',
      where: {
        email: {
          equals: email
        }
      },
      limit: 1
    })
    
    if (existingUsers.docs.length > 0) {
      console.log(`⚠️  L'utilisateur ${email} existe déjà`)
      const user = existingUsers.docs[0]
      console.log(`   ID: ${user.id}`)
      console.log(`   Rôle actuel: ${user.role}`)
      console.log(`   HasTakenPlacementQuiz: ${user.hasTakenPlacementQuiz}`)
      console.log(`   OnboardingComplete: ${user.onboardingComplete}`)
      process.exit(0)
    }
    
    // Créer l'utilisateur
    const newUser = await payload.create({
      collection: 'users',
      data: {
        email,
        password,
        role: role as 'admin' | 'student',
        firstName: 'Test',
        lastName: 'User',
        hasTakenPlacementQuiz: false,
        onboardingComplete: false,
        studyYear: role === 'student' ? 'pass' : undefined,
      }
    })
    
    console.log(`✅ Utilisateur créé avec succès!`)
    console.log(`   ID: ${newUser.id}`)
    console.log(`   Email: ${newUser.email}`)
    console.log(`   Rôle: ${newUser.role}`)
    console.log(`   HasTakenPlacementQuiz: ${newUser.hasTakenPlacementQuiz}`)
    console.log(`   OnboardingComplete: ${newUser.onboardingComplete}`)
    
    console.log(`\n🔑 Identifiants de connexion:`)
    console.log(`   Email: ${email}`)
    console.log(`   Mot de passe: ${password}`)
    
  } catch (error) {
    console.error('❌ Erreur lors de la création:', error)
    process.exit(1)
  }
  
  process.exit(0)
}

createTestUser()