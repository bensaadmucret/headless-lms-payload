// Simple script to delete recent adaptive quiz sessions via API
const API_URL = 'http://localhost:3000/api';
const USER_EMAIL = 'alice.martin@etudiant.com';
const USER_PASSWORD = 'votre_mot_de_passe'; // Remplacez par le vrai mot de passe

async function deleteRecentSessions() {
  console.log('🔐 Logging in...');
  
  // 1. Login
  const loginResponse = await fetch(`${API_URL}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: USER_EMAIL,
      password: USER_PASSWORD
    })
  });
  
  if (!loginResponse.ok) {
    console.error('❌ Login failed');
    return;
  }
  
  const { token } = await loginResponse.json();
  console.log('✅ Logged in successfully');
  
  // 2. Get recent sessions
  console.log('🔍 Fetching recent sessions...');
  const sessionsResponse = await fetch(`${API_URL}/adaptiveQuizSessions?limit=10&sort=-createdAt`, {
    headers: { 'Authorization': `JWT ${token}` }
  });
  
  const { docs: sessions } = await sessionsResponse.json();
  console.log(`Found ${sessions.length} sessions`);
  
  // 3. Delete each session
  for (const session of sessions) {
    console.log(`🗑️  Deleting session ${session.sessionId}...`);
    await fetch(`${API_URL}/adaptiveQuizSessions/${session.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `JWT ${token}` }
    });
  }
  
  console.log('✅ All recent sessions deleted!');
  console.log('🎉 Cooldown reset! You can now generate a new quiz immediately.');
}

deleteRecentSessions().catch(console.error);
