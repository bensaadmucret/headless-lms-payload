import axios from 'axios';

const API_URL = process.env.BETTER_AUTH_URL || process.env.PAYLOAD_PUBLIC_URL || 'http://localhost:3000';

// Données des étudiants à créer
// Note: BetterAuth utilise 'name' au lieu de 'firstName'/'lastName'
// Les champs additionnels (studyYear, studyProfile, etc.) seront mis à jour après création
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

/**
 * Crée un étudiant via BetterAuth sign-up endpoint
 * puis met à jour les champs additionnels via Payload API
 */
async function createStudent(studentData) {
  const { email, password, name, role, extraFields } = studentData;
  
  try {
    // Étape 1: Vérifier si l'étudiant existe déjà via BetterAuth sign-in
    try {
      const loginResponse = await axios.post(
        `${API_URL}/api/auth/sign-in/email`,
        { email, password },
        { 
          headers: { 'Content-Type': 'application/json' },
          validateStatus: (status) => status < 500 // Ne pas throw pour 4xx
        }
      );
      
      if (loginResponse.status === 200) {
        console.log(`✓ L'étudiant ${name} existe déjà`);
        return { success: true, existing: true };
      }
    } catch (error) {
      // L'utilisateur n'existe pas, on continue la création
    }

    // Étape 2: Créer l'utilisateur via BetterAuth sign-up
    // Note: payload-auth assigne le defaultRole ('user') par défaut
    // Le champ 'role' doit être passé pour override
    const signUpResponse = await axios.post(
      `${API_URL}/api/auth/sign-up/email`,
      { 
        email, 
        password, 
        name,
        // payload-auth plugin permet de passer le role dans le body
        role: role || 'student'
      },
      { 
        headers: { 'Content-Type': 'application/json' },
        validateStatus: (status) => status < 500
      }
    );
    
    if (signUpResponse.status === 200 || signUpResponse.status === 201) {
      const userId = signUpResponse.data?.user?.id;
      console.log(`✓ Étudiant créé via BetterAuth: ${name} (ID: ${userId})`);
      
      // Étape 3: Mettre à jour le rôle et les champs additionnels via Payload Local API
      // On utilise une requête directe à la base de données via l'API Payload
      if (userId) {
        try {
          // Mettre à jour le rôle à 'student' via l'API Payload
          const updateResponse = await axios.patch(
            `${API_URL}/api/users/${userId}`,
            { 
              role: role || 'student',
              ...extraFields 
            },
            { 
              headers: { 'Content-Type': 'application/json' },
              validateStatus: (status) => status < 500
            }
          );
          
          if (updateResponse.status === 200) {
            console.log(`   ✓ Rôle mis à jour: ${role || 'student'}`);
          } else {
            console.log(`   ⚠ Impossible de mettre à jour le rôle (${updateResponse.status}): accès admin requis`);
          }
        } catch (updateError) {
          console.log(`   ⚠ Impossible de mettre à jour: ${updateError.message}`);
        }
      }
      
      return { success: true, userId };
    } else {
      console.error(`✗ Erreur lors de la création de ${name}:`, signUpResponse.data);
      return { success: false, error: signUpResponse.data };
    }
  } catch (error) {
    console.error(`✗ Erreur lors de la création de ${name}:`, 
                  error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

async function seedStudents() {
  console.log('🌱 Création des étudiants de test MedCoach via BetterAuth...\n');
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