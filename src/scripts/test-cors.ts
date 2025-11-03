#!/usr/bin/env tsx

/**
 * Script pour tester les CORS Better Auth
 */

async function testCORS() {
  const backendURL = 'http://localhost:3000'
  const frontendOrigins = [
    'http://localhost:8080',
    'http://localhost:5173',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:5173'
  ]
  
  console.log('🔍 Test des CORS Better Auth')
  console.log(`📍 Backend: ${backendURL}`)
  
  for (const origin of frontendOrigins) {
    console.log(`\n🌐 Test depuis l'origine: ${origin}`)
    
    try {
      // Test OPTIONS (preflight)
      console.log('  1. Test OPTIONS (preflight)...')
      const optionsResponse = await fetch(`${backendURL}/api/auth/session`, {
        method: 'OPTIONS',
        headers: {
          'Origin': origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type',
        },
      })
      
      console.log(`     Status: ${optionsResponse.status}`)
      console.log(`     CORS Headers:`)
      const corsHeaders = [
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Methods', 
        'Access-Control-Allow-Headers',
        'Access-Control-Allow-Credentials'
      ]
      
      corsHeaders.forEach(header => {
        const value = optionsResponse.headers.get(header)
        console.log(`       ${header}: ${value || 'NON DÉFINI'}`)
      })
      
      // Test POST réel
      console.log('  2. Test POST réel...')
      const postResponse = await fetch(`${backendURL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: {
          'Origin': origin,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'test'
        })
      })
      
      console.log(`     Status: ${postResponse.status}`)
      const allowOrigin = postResponse.headers.get('Access-Control-Allow-Origin')
      console.log(`     Access-Control-Allow-Origin: ${allowOrigin || 'NON DÉFINI'}`)
      
      if (postResponse.status !== 404 && postResponse.status < 500) {
        console.log(`     ✅ CORS OK pour ${origin}`)
      } else {
        console.log(`     ❌ Problème CORS pour ${origin}`)
      }
      
    } catch (error) {
      console.log(`     ❌ Erreur pour ${origin}:`, error)
    }
  }
  
  // Test de la configuration Better Auth
  console.log('\n🔧 Test de la configuration Better Auth...')
  try {
    const configResponse = await fetch(`${backendURL}/api/auth/session`)
    console.log(`   Status: ${configResponse.status}`)
    
    if (configResponse.ok) {
      console.log('   ✅ Better Auth est accessible')
    } else {
      console.log('   ❌ Better Auth n\'est pas accessible')
    }
  } catch (error) {
    console.log('   ❌ Erreur Better Auth:', error)
  }
}

testCORS()