/**
 * Script pour créer un utilisateur de test
 */

import payload from 'payload'
import 'dotenv/config'

async function createTestUser() {
  try {
    // Initialiser Payload
    await payload.init({
      secret: process.env.PAYLOAD_SECRET,
      local: true // Important pour les scripts
    })

    console.log('🚀 Payload initialisé avec succès')

    // Données de l'utilisateur de test
    const testUser = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'admin' // ou 'student', 'teacher' selon vos besoins
    }

    console.log('📝 Création de l\'utilisateur de test...')

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await payload.find({
      collection: 'users',
      where: {
        email: {
          equals: testUser.email
        }
      }
    })

    if (existingUser.docs.length > 0) {
      console.log('⚠️  L\'utilisateur test@example.com existe déjà')
      console.log('📧 Email:', existingUser.docs[0].email)
      console.log('👤 Nom:', `${existingUser.docs[0].firstName} ${existingUser.docs[0].lastName}`)
      console.log('🔒 Mot de passe: password123')
      console.log('🎭 Rôle:', existingUser.docs[0].role)
      return
    }

    // Créer l'utilisateur
    const user = await payload.create({
      collection: 'users',
      data: testUser
    })

    console.log('✅ Utilisateur de test créé avec succès!')
    console.log('📧 Email:', user.email)
    console.log('👤 Nom:', `${user.firstName} ${user.lastName}`)
    console.log('🔒 Mot de passe: password123')
    console.log('🎭 Rôle:', user.role)
    console.log('🆔 ID:', user.id)

  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'utilisateur:', error)
  } finally {
    process.exit(0)
  }
}

createTestUser()