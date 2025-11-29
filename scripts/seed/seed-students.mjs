import axios from 'axios';

const API_URL = process.env.PAYLOAD_PUBLIC_URL || 'http://localhost:3000';

// Données des étudiants à créer
// Les champs additionnels (studyYear, studyProfile, etc.) sont envoyés directement à la collection Payload "users"
const students = [
  {
    email: 'alice.martin@etudiant.com',
    password: 'password123',
    name: 'Alice Martin',
    role: 'student',
    // Champs additionnels pour mise à jour Payload
    extraFields: {
      studyYear: 'pass',
      onboardingComplete: true,
      examDate: '2026-06-15',
      studyProfile: {
        targetScore: 85,
        studyHoursPerWeek: 35
      },
      hasTakenPlacementQuiz: true
    }
  },
  {
    email: 'pierre.dubois@etudiant.com',
    password: 'password123',
    name: 'Pierre Dubois',
    role: 'student',
    extraFields: {
      studyYear: 'las',
      onboardingComplete: false,
      examDate: '2026-06-20',
      studyProfile: {
        targetScore: 75,
        studyHoursPerWeek: 25
      },
      hasTakenPlacementQuiz: false
    }
  },
  {
    email: 'marie.bernard@etudiant.com',
    password: 'password123',
    name: 'Marie Bernard',
    role: 'student',
    extraFields: {
      studyYear: 'pass',
      onboardingComplete: true,
      examDate: '2026-06-10',
      studyProfile: {
        targetScore: 90,
        studyHoursPerWeek: 40
      },
      hasTakenPlacementQuiz: true
    }
  },
  {
    email: 'thomas.leroy@etudiant.com',
    password: 'password123',
    name: 'Thomas Leroy',
    role: 'student',
    extraFields: {
      studyYear: 'las',
      onboardingComplete: true,
      examDate: '2026-06-25',
      studyProfile: {
        targetScore: 80,
        studyHoursPerWeek: 30
      },
      hasTakenPlacementQuiz: false
    }
  }
];

async function createStudent(studentData) {
  const { email, password, name, role, extraFields } = studentData;
  
  try {
    // Étape 1: Vérifier si l'étudiant existe déjà dans Payload (collection "users")
    const existingResponse = await axios.get(
      `${API_URL}/api/users`,
      {
        params: {
          'where[email][equals]': email,
          limit: 1,
        },
        validateStatus: (status) => status < 500,
      },
    );

    const existingDocs = existingResponse.data?.docs || [];
    if (existingDocs.length > 0) {
      console.log(`✓ L'étudiant ${name} existe déjà (ID: ${existingDocs[0].id})`);
      return { success: true, existing: true };
    }

    // Étape 2: Créer directement l'utilisateur via l'API Payload
    const [firstName, ...restName] = name.split(' ');
    const lastName = restName.join(' ') || firstName;

    const createResponse = await axios.post(
      `${API_URL}/api/users`,
      {
        email,
        password,
        firstName,
        lastName,
        role: role || 'student',
        ...extraFields,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: (status) => status < 500,
      },
    );

    if (createResponse.status === 201 || createResponse.status === 200) {
      const userId = createResponse.data?.doc?.id || createResponse.data?.id;
      console.log(`✓ Étudiant créé: ${name} (ID: ${userId || 'inconnu'})`);
      return { success: true, userId };
    }

    console.error(`✗ Erreur lors de la création de ${name}:`, createResponse.data);
    return { success: false, error: createResponse.data };
  } catch (error) {
    console.error(`✗ Erreur lors de la création de ${name}:`, 
                  error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

async function seedStudents() {
  console.log('🌱 Création des étudiants de test MedCoach via l\'API HTTP Payload...\n');
  console.log(`📡 API URL: ${API_URL}\n`);
  
  const results = [];
  for (const student of students) {
    const result = await createStudent(student);
    results.push({ ...student, ...result });
    // Petit délai entre les créations pour éviter le rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const created = results.filter(r => r.success && !r.existing).length;
  const existing = results.filter(r => r.existing).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Résumé:');
  console.log(`   ✓ Créés: ${created}`);
  console.log(`   ○ Existants: ${existing}`);
  console.log(`   ✗ Échecs: ${failed}`);
  
  console.log('\n📋 Comptes disponibles:');
  students.forEach(student => {
    const studyYear = student.extraFields?.studyYear?.toUpperCase() || 'N/A';
    console.log(`   • ${student.name} - ${student.email} - ${studyYear}`);
  });
  console.log('\n🔑 Mot de passe pour tous: password123');
  console.log('\n✅ Seed terminé! Les étudiants peuvent se connecter au Dashboard MedCoach.');
}

// Lancer le script
seedStudents().catch(console.error);