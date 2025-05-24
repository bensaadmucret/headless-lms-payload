import request from 'supertest';

// Utilise l'URL de ton API Payload (ex: http://localhost:3000 ou process.env.PAYLOAD_PUBLIC_URL)
const API_URL = process.env.PAYLOAD_PUBLIC_URL || 'http://localhost:3000';

/**
 * Récupère un JWT Payload pour un utilisateur donné (login/password).
 * @param email Email de l'utilisateur
 * @param password Mot de passe de l'utilisateur
 * @returns JWT string
 */
export async function getPayloadToken(email: string, password: string): Promise<string> {
  const res = await request(API_URL)
    .post('/api/users/login')
    .send({ email, password });

  if (res.status !== 200 || !res.body?.token) {
    throw new Error(`Échec de l'authentification Payload pour ${email} : ${res.text}`);
  }
  return res.body.token;
}
