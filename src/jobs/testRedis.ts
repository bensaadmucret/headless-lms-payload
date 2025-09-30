/**
 * Script de test de connectivité Redis
 */

import { redis } from './queue'

async function testRedisConnection() {
  console.log('🔍 Testing Redis connection...')
  
  try {
    // Test de ping
    const pong = await redis.ping()
    console.log('✅ Redis ping successful:', pong)
    
    // Test d'écriture
    await redis.set('test:connection', 'Hello Redis!', 'EX', 60) // Expire en 60s
    console.log('✅ Redis write successful')
    
    // Test de lecture
    const value = await redis.get('test:connection')
    console.log('✅ Redis read successful:', value)
    
    // Test de suppression
    await redis.del('test:connection')
    console.log('✅ Redis delete successful')
    
    // Informations sur le serveur
    const info = await redis.info('server')
    const version = info.match(/redis_version:([^\r\n]+)/)?.[1]
    console.log('ℹ️  Redis version:', version)
    
    console.log('🎉 All Redis tests passed!')
    
  } catch (error) {
    console.error('❌ Redis connection failed:', error)
    console.error('')
    console.error('💡 Solutions possibles :')
    console.error('   1. Démarrer les services Docker: npm run docker:up')
    console.error('   2. Vérifier que Redis est en cours: docker ps')
    console.error('   3. Voir les logs Redis: docker-compose logs redis')
    console.error('   4. Vérifier la config dans .env.local')
    process.exit(1)
    
  } finally {
    await redis.disconnect()
  }
}

// Lancer le test
testRedisConnection()
  .then(() => {
    console.log('✅ Test completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Test failed:', error)
    process.exit(1)
  })