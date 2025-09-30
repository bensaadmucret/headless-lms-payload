import request from 'supertest';

const API_URL = process.env.PAYLOAD_PUBLIC_URL || 'http://localhost:3000';

interface UserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  studyYear?: 'pass' | 'las';
  onboardingComplete?: boolean;
  examDate?: string;
  studyProfile?: {
    targetScore: number;
    studyHoursPerWeek: number;
  };
  hasTakenPlacementQuiz?: boolean;
}

async function ensureUser(userData: UserData) {
  // Vérifie si le user existe déjà (login)
  const loginRes = await request(API_URL)
    .post('/api/users/login')
    .send({ email: userData.email, password: userData.password });

  if (loginRes.status === 200) return; // User existe déjà

  // Sinon, crée le user
  const createRes = await request(API_URL)
    .post('/api/users')
    .send(userData);

  if (createRes.status !== 201) {
    throw new Error(`Impossible de créer l'utilisateur ${userData.email}: ${createRes.text}`);
  }
}

export async function seedTestUsers() {
  // Étudiant PASS avec onboarding complet
  await ensureUser({
    email: 'alice.martin@etudiant.com',
    password: 'password123',
    firstName: 'Alice',
    lastName: 'Martin',
    role: 'student',
    studyYear: 'pass',
    onboardingComplete: true,
    examDate: '2024-06-15',
    studyProfile: {
      targetScore: 85,
      studyHoursPerWeek: 35
    },
    hasTakenPlacementQuiz: true
  });

  // Étudiant LAS débutant (pas encore d'onboarding)
  await ensureUser({
    email: 'pierre.dubois@etudiant.com',
    password: 'password123',
    firstName: 'Pierre',
    lastName: 'Dubois',
    role: 'student',
    studyYear: 'las',
    onboardingComplete: false,
    examDate: '2024-06-20',
    studyProfile: {
      targetScore: 75,
      studyHoursPerWeek: 25
    },
    hasTakenPlacementQuiz: false
  });

  // Étudiante PASS avancée
  await ensureUser({
    email: 'marie.bernard@etudiant.com',
    password: 'password123',
    firstName: 'Marie',
    lastName: 'Bernard',
    role: 'student',
    studyYear: 'pass',
    onboardingComplete: true,
    examDate: '2024-06-10',
    studyProfile: {
      targetScore: 90,
      studyHoursPerWeek: 40
    },
    hasTakenPlacementQuiz: true
  });

  // Admin pour tests
  await ensureUser({
    email: 'admin@medcoach.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'MedCoach',
    role: 'admin'
  });
}
