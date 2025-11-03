#!/usr/bin/env tsx

/**
 * Script pour déboguer les données utilisateur et Better Auth
 */

import { getPayload } from 'payload'
import config from '../payload.config'

async function debugUser() {
  const email = process.argv[2]
  
  if (!email) {
    console.error('❌ Usage: npm run debug-user <email>')
    process.exit(1)
  }

  console.log(`🔍 Debug utilisateur: ${email}`)
  
  try {
    const payload = await getPayload({ config })
    
    // 1. Rechercher l'utilisateur dans Payload
    console.log('\n1. Recherche dans Payload Users...')
    const payloadUsers = await payload.find({
      collection: 'users',
      where: {
        email: {
          equals: email
        }
      },
      limit: 1
    })
    
    if (payloadUsers.docs.length > 0) {
      const user = payloadUsers.docs[0]
      console.log('✅ Utilisateur trouvé dans Payload:')
      console.log(`   ID: ${user.id}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   FirstName: ${user.firstName}`)
      console.log(`   LastName: ${user.lastName}`)
      console.log(`   HasTakenPlacementQuiz: ${user.hasTakenPlacementQuiz}`)
      console.log(`   OnboardingComplete: ${user.onboardingComplete}`)
      console.log(`   StudyYear: ${user.studyYear}`)
      console.log(`   CreatedAt: ${user.createdAt}`)
    } else {
      console.log('❌ Utilisateur non trouvé dans Payload Users')
    }
    
    // 2. Rechercher dans Better Auth (userAccounts)
    console.log('\n2. Recherche dans Better Auth (userAccounts)...')
    try {
      const betterAuthUsers = await payload.find({
        collection: 'userAccounts',
        where: {
          email: {
            equals: email
          }
        },
        limit: 1
      })
      
      if (betterAuthUsers.docs.length > 0) {
        const user = betterAuthUsers.docs[0]
        console.log('✅ Utilisateur trouvé dans Better Auth:')
        console.log(`   ID: ${user.id}`)
        console.log(`   Email: ${user.email}`)
        console.log(`   Role: ${user.role}`)
        console.log(`   EmailVerified: ${user.emailVerified}`)
        console.log(`   CreatedAt: ${user.createdAt}`)
        console.log(`   Metadata:`, JSON.stringify(user.metadata, null, 2))
      } else {
        console.log('❌ Utilisateur non trouvé dans Better Auth')
      }
    } catch (error) {
      console.log('❌ Erreur lors de la recherche Better Auth:', error)
    }
    
    // 3. Rechercher les sessions actives
    console.log('\n3. Recherche des sessions actives...')
    try {
      const sessions = await payload.find({
        collection: 'userSessions',
        where: {
          userId: {
            equals: email // ou l'ID si on l'a trouvé
          }
        },
        limit: 5,
        sort: '-createdAt'
      })
      
      console.log(`📊 ${sessions.docs.length} session(s) trouvée(s):`)
      sessions.docs.forEach((session, index) => {
        console.log(`   Session ${index + 1}:`)
        console.log(`     ID: ${session.id}`)
        console.log(`     UserId: ${session.userId}`)
        console.log(`     ExpiresAt: ${session.expiresAt}`)
        console.log(`     CreatedAt: ${session.createdAt}`)
      })
    } catch (error) {
      console.log('❌ Erreur lors de la recherche des sessions:', error)
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du debug:', error)
    process.exit(1)
  }
  
  process.exit(0)
}

debugUser()