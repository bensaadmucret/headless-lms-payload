import axios from 'axios';

const API_URL = process.env.PAYLOAD_PUBLIC_URL || 'http://localhost:3000';

// Données des étudiants à créer
const students = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
    email: 'thomas.leroy@etudiant.com',
    password: 'password123',
    firstName: 'Thomas',
    lastName: 'Leroy',
    role: 'student',
    studyYear: 'las',
    onboardingComplete: true,
    examDate: '2024-06-25',
    studyProfile: {
      targetScore: 80,
      studyHoursPerWeek: 30
    },
    hasTakenPlacementQuiz: false
  }
];

async function createStudent(studentData) {
  try {
    // Vérifier si l'étudiant existe déjà
    try {
      const loginResponse = await axios.post(`${API_URL}/api/users/login`, {
        email: studentData.email,
        password: studentData.password
      });
      
      if (loginResponse.status === 200) {
        console.log(`✓ L'étudiant ${studentData.firstName} ${studentData.lastName} existe déjà`);
        return;
      }
    } catch (error) {
      // L'utilisateur n'existe pas, on continue la création
    }

    // Créer l'étudiant
    const response = await axios.post(`${API_URL}/api/users`, studentData);
    
    if (response.status === 201) {
      console.log(`✓ Étudiant créé: ${studentData.firstName} ${studentData.lastName} (${studentData.studyYear.toUpperCase()})`);
    }
  } catch (error) {
    console.error(`✗ Erreur lors de la création de ${studentData.firstName} ${studentData.lastName}:`, 
                  error.response?.data || error.message);
  }
}

async function seedStudents() {
  console.log('🌱 Création des étudiants de test MedCoach...\n');
  
  for (const student of students) {
    await createStudent(student);
  }
  
  console.log('\n✅ Seed terminé! Les étudiants peuvent maintenant se connecter au Dashboard MedCoach.');
  console.log('\n📋 Comptes créés:');
  students.forEach(student => {
    console.log(`   • ${student.firstName} ${student.lastName} - ${student.email} - ${student.studyYear.toUpperCase()}`);
  });
  console.log('\n🔑 Mot de passe pour tous: password123');
}

// Lancer le script
seedStudents().catch(console.error);