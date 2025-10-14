// Script simple pour tester la connexion à la base de données
import 'dotenv/config'

console.log('🔍 Test de connexion à la base de données...')
console.log('DATABASE_URI:', process.env.DATABASE_URI)
console.log('PAYLOAD_SECRET:', process.env.PAYLOAD_SECRET ? '✅ Défini' : '❌ Manquant')

// Test de connexion PostgreSQL simple
import pg from 'pg'
const { Client } = pg

async function testDatabaseConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URI
  })

  try {
    await client.connect()
    console.log('✅ Connexion à la base de données réussie')
    
    const result = await client.query('SELECT NOW()')
    console.log('✅ Test de requête réussi:', result.rows[0])
    
    await client.end()
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error.message)
  }
}

testDatabaseConnection()