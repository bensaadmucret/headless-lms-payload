#!/usr/bin/env tsx

/**
 * Script pour déboguer les problèmes CORS avec Better Auth
 */

async function debugCORS() {
  const backendURL = 'http://localhost:3000'
  const frontendOrigin = 'http://localhost:8080'
  
  console.log('🔍 Debug CORS Better Auth')
  console.log(`📍 Backend: ${backendURL}`)
  console.log(`📍 Frontend Origin: ${frontendOrigin}`)
  
  try {
    // Test 1: OPTIONS request (preflight)
    console.log('\n1. Test OPTIONS (preflight)...')
    const optionsResponse = await fetch(`${backendURL}/api/auth/sign-in/email`, {
      method: 'OPTIONS',
      headers: {
        'Origin': frontendOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    })
    
    console.log(`   Status: ${optionsResponse.status}`)
    console.log(`   Headers:`)
    optionsResponse.headers.forEach((value, key) => {
      console.log(`     ${key}: ${value}`)
    })
    
    // Test 2: GET session (plus simple)
    console.log('\n2. Test GET session...')
    const sessionResponse = await fetch(`${backendURL}/api/auth/session`, {
      method: 'GET',
      headers: {
        'Origin': frontendOrigin,
        'Content-Type': 'application/json',
      },
    })
    
    console.log(`   Status: ${sessionResponse.status}`)
    console.log(`   Headers:`)
    sessionResponse.headers.forEach((value, key) => {
      console.log(`     ${key}: ${value}`)
    })
    
    // Test 3: POST sign-in (le problématique)
    console.log('\n3. Test POST sign-in...')
    const signInResponse = await fetch(`${backendURL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'Origin': frontendOrigin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword'
      })
    })
    
    console.log(`   Status: ${signInResponse.status}`)
    console.log(`   Headers:`)
    signInResponse.headers.forEach((value, key) => {
      console.log(`     ${key}: ${value}`)
    })
    
    if (signInResponse.ok || signInResponse.status === 400) {
      const responseText = await signInResponse.text()
      console.log(`   Response: ${responseText.substring(0, 200)}...`)
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test CORS:', error)
  }
}

debugCORS()