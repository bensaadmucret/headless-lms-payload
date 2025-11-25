/**
 * Seed students using Payload Local API
 * This script runs with direct database access, bypassing HTTP authentication
 * 
 * Usage: npx tsx scripts/seed-students-local.ts
 */

import { getPayload } from 'payload'
import config from '../src/payload.config'

const students = [
  {
    email: 'alice.martin@etudiant.com',
    password: 'password123',
    name: 'Alice Martin',
    role: 'student',
    studyYear: 'pass',
    onboardingComplete: true,
    examDate: '2026-06-15',
    studyProfile: {
      targetScore: 85,
      studyHoursPerWeek: 35
    },
    hasTakenPlacementQuiz: true
  },
  {
    email: 'pierre.dubois@etudiant.com',
    password: 'password123',
    name: 'Pierre Dubois',
    role: 'student',
    studyYear: 'las',
    onboardingComplete: false,
    examDate: '2026-06-20',
    studyProfile: {
      targetScore: 75,
      studyHoursPerWeek: 25
    },
    hasTakenPlacementQuiz: false
  },
  {
    email: 'marie.bernard@etudiant.com',
    password: 'password123',
    name: 'Marie Bernard',
    role: 'student',
    studyYear: 'pass',
    onboardingComplete: true,
    examDate: '2026-06-10',
    studyProfile: {
      targetScore: 90,
      studyHoursPerWeek: 40
    },
    hasTakenPlacementQuiz: true
  },
  {
    email: 'thomas.leroy@etudiant.com',
    password: 'password123',
    name: 'Thomas Leroy',
    role: 'student',
    studyYear: 'las',
    onboardingComplete: true,
    examDate: '2026-06-25',
    studyProfile: {
      targetScore: 80,
      studyHoursPerWeek: 30
    },
    hasTakenPlacementQuiz: false
  }
]

async function seedStudents() {
  console.log('🌱 Création des étudiants via Payload Local API...\n')

  const payload = await getPayload({ config })

  for (const student of students) {
    const { email, password, name, role, ...extraFields } = student

    try {
      // Vérifier si l'utilisateur existe déjà
      const existing = await payload.find({
        collection: 'users',
        where: { email: { equals: email } },
        limit: 1
      })

      if (existing.docs.length > 0) {
        console.log(`✓ ${name} existe déjà (ID: ${existing.docs[0].id})`)
        
        // Mettre à jour le rôle si nécessaire
        if (existing.docs[0].role !== role) {
          await payload.update({
            collection: 'users',
            id: existing.docs[0].id,
            data: { role, ...extraFields }
          })
          console.log(`   ✓ Rôle mis à jour: ${role}`)
        }
        continue
      }

      // Créer l'utilisateur via BetterAuth
      const betterAuth = (payload as any).betterAuth
      if (!betterAuth) {
        throw new Error('BetterAuth not initialized')
      }

      // Utiliser l'API interne de BetterAuth pour créer l'utilisateur
      const result = await betterAuth.api.signUpEmail({
        body: { email, password, name }
      })

      if (result?.user?.id) {
        console.log(`✓ ${name} créé (ID: ${result.user.id})`)

        // Mettre à jour le rôle et les champs additionnels
        await payload.update({
          collection: 'users',
          id: result.user.id,
          data: { role, ...extraFields }
        })
        console.log(`   ✓ Rôle: ${role}, StudyYear: ${extraFields.studyYear}`)
      }
    } catch (error: any) {
      console.error(`✗ Erreur pour ${name}:`, error.message)
    }
  }

  console.log('\n✅ Seed terminé!')
  console.log('\n📋 Comptes:')
  students.forEach(s => {
    console.log(`   • ${s.name} - ${s.email} - ${s.role} - ${s.studyYear.toUpperCase()}`)
  })
  console.log('\n🔑 Mot de passe: password123')

  process.exit(0)
}

seedStudents().catch(err => {
  console.error('Erreur fatale:', err)
  process.exit(1)
})
