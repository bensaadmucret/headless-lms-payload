#!/usr/bin/env tsx

/**
 * Script de diagnostic pour tester l'authentification Better Auth
 */

async function testAuth() {
  const baseURL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'
  const frontendURL = process.env.FRONTEND_URL ?? 'http://localhost:8080'
  
  console.log('🔍 Test de l\'authentification Better Auth')
  console.log(`📍 Backend URL: ${baseURL}`)
  console.log(`📍 Frontend URL: ${frontendURL}`)
  
  try {
    // Test 1: Vérifier que l'endpoint Better Auth répond
    console.log('\n1. Test de l\'endpoint Better Auth...')
    const healthResponse = await fetch(`${baseURL}/api/auth/session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    console.log(`   Status: ${healthResponse.status}`)
    console.log(`   Headers:`, Object.fromEntries(healthResponse.headers.entries()))
    
    if (healthResponse.ok) {
      const data = await healthResponse.text()
      console.log(`   Response: ${data.substring(0, 200)}...`)
    }
    
    // Test 2: Tester l'endpoint de connexion
    console.log('\n2. Test de l\'endpoint de connexion...')
    const signInResponse = await fetch(`${baseURL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword'
      })
    })
    
    console.log(`   Status: ${signInResponse.status}`)
    console.log(`   Headers:`, Object.fromEntries(signInResponse.headers.entries()))
    
    if (signInResponse.status !== 404) {
      const signInData = await signInResponse.text()
      console.log(`   Response: ${signInData.substring(0, 200)}...`)
    }
    
    // Test 3: Lister toutes les routes disponibles
    console.log('\n3. Test des routes disponibles...')
    const routes = [
      '/api/auth/session',
      '/api/auth/sign-in/email',
      '/api/auth/sign-up/email',
      '/api/auth/sign-out',
    ]
    
    for (const route of routes) {
      try {
        const response = await fetch(`${baseURL}${route}`, {
          method: 'OPTIONS',
        })
        console.log(`   ${route}: ${response.status}`)
      } catch (error) {
        console.log(`   ${route}: ERROR - ${error}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error)
  }
}

testAuth()