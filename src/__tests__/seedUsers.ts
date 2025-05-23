import request from 'supertest';

const API_URL = process.env.PAYLOAD_PUBLIC_URL || 'http://localhost:3000';

async function ensureUser(email: string, password: string, role: string = 'user') {
  // Vérifie si le user existe déjà (login)
  const loginRes = await request(API_URL)
    .post('/api/users/login')
    .send({ email, password });

  if (loginRes.status === 200) return; // User existe déjà

  // Sinon, crée le user
  const createRes = await request(API_URL)
    .post('/api/users')
    .send({ email, password, role });

  if (createRes.status !== 201) {
    throw new Error(`Impossible de créer l'utilisateur ${email}: ${createRes.text}`);
  }
}

export async function seedTestUsers() {
  await ensureUser('user@test.com', 'password', 'user');
  await ensureUser('admin@test.com', 'adminpassword', 'admin');
  await ensureUser('other@test.com', 'otherpassword', 'user');
}
