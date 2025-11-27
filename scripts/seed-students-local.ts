/**
 * Seed students using Payload Local API
 * This script runs with direct database access, bypassing HTTP authentication
 * 
 * Usage: npx tsx scripts/seed-students-local.ts
 */

import { getPayload } from 'payload'
import config from '../src/payload.config'

type SeedStudent = {
  email: string
  password: string
  name: string
  role: 'student' | 'admin' | 'superadmin'
  studyYear: 'pass' | 'las'
  onboardingComplete: boolean
  examDate: string
  studyProfile: {
    targetScore: number
    studyHoursPerWeek: number
  }
  hasTakenPlacementQuiz: boolean
}

const students: SeedStudent[] = [
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
    const { email, password, name, role, studyYear, ...extraFields } = student

    // Normaliser le rôle côté script pour respecter le type de Payload
    const normalizedRole: 'student' | 'admin' | 'superadmin' =
      role === 'admin' || role === 'superadmin' ? role : 'student'

    try {
      // Vérifier si l'utilisateur existe déjà
      const existing = await payload.find({
        collection: 'users',
        where: { email: { equals: email } },
        limit: 1,
      })

      const existingUser = existing.docs && existing.docs.length > 0 ? existing.docs[0] : null

      if (existingUser) {
        console.log(`✓ ${name} existe déjà (ID: ${existingUser.id})`)
        
        // Mettre à jour le rôle si nécessaire
        if ((existingUser as any).role !== normalizedRole) {
          await payload.update({
            collection: 'users',
            id: existingUser.id,
            data: { role: normalizedRole, studyYear, ...extraFields },
          })
          console.log(`   ✓ Rôle mis à jour: ${normalizedRole}`)
        }
        continue
      }

      const [firstName, ...restName] = name.split(' ')
      const lastName = restName.join(' ') || firstName

      const createdUser = await payload.create({
        collection: 'users',
        data: {
          email,
          password,
          firstName,
          lastName,
          role: normalizedRole,
          studyYear,
          ...extraFields,
        },
      } as any)

      console.log(`✓ ${name} créé (ID: ${createdUser.id})`)
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
