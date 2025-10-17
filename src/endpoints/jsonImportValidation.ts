import type { PayloadHandler } from 'payload'
import { JSONValidationService } from '../services/JSONValidationService'
import { CSVImportService } from '../services/CSVImportService'

// Endpoint pour valider un fichier avant import
export const validateImportFile: PayloadHandler = async (req, res) => {
  try {
    // Pour l'instant, on simule la validation avec des données de test
    // Dans une vraie implémentation, on utiliserait formidable ou un autre parser
    
    const { importType = 'questions', options = '{}', fileContent, fileName = 'test.json' } = req.body
    let parsedOptions = {}
    
    try {
      parsedOptions = options ? JSON.parse(options) : {}
    } catch (e) {
      return res.status(400).json({ error: 'Options invalides' })
    }

    // Si pas de contenu fourni, utiliser un exemple
    const content = fileContent || JSON.stringify({
      version: "1.0",
      type: "questions",
      questions: [
        {
          questionText: "Question de test pour validation",
          options: [
            { text: "Option A", isCorrect: true },
            { text: "Option B", isCorrect: false },
            { text: "Option C", isCorrect: false },
            { text: "Option D", isCorrect: false }
          ],
          explanation: "Explication de test",
          category: "Test",
          difficulty: "medium",
          level: "PASS"
        }
      ]
    })

    let validationResult

    try {
      // Déterminer le service de validation selon le type de fichier
      if (fileName.toLowerCase().endsWith('.csv')) {
        const csvService = new CSVImportService()
        validationResult = await csvService.validateCSV(content, parsedOptions)
      } else if (fileName.toLowerCase().endsWith('.json')) {
        const jsonService = new JSONValidationService()
        validationResult = await jsonService.validateJSON(content, importType, parsedOptions)
      } else {
        return res.status(400).json({ error: 'Type de fichier non supporté' })
      }

      // Ajouter des métadonnées sur le fichier
      validationResult.fileInfo = {
        name: fileName,
        size: content.length,
        type: fileName.toLowerCase().endsWith('.csv') ? 'csv' : 'json',
        importType: importType
      }

      res.json(validationResult)

    } catch (validationError) {
      console.error('Erreur validation:', validationError)
      res.status(400).json({
        error: 'Erreur lors de la validation',
        details: validationError.message,
        isValid: false,
        errors: [{
          type: 'system',
          severity: 'critical',
          message: validationError.message,
          suggestion: 'Vérifiez le format de votre fichier'
        }]
      })
    }

  } catch (error) {
    console.error('Erreur endpoint validation:', error)
    res.status(500).json({ 
      error: 'Erreur serveur lors de la validation',
      details: error.message 
    })
  }
}

// Endpoint pour obtenir le statut d'un job d'import
export const getImportJobStatus: PayloadHandler = async (req, res) => {
  try {
    const { jobId } = req.params
    
    // Dans une vraie implémentation, on récupérerait le statut depuis la base de données
    // Pour l'instant, on simule un statut
    const mockStatus = {
      id: jobId,
      status: 'processing',
      progress: {
        total: 100,
        processed: 45,
        successful: 42,
        failed: 3
      },
      currentStep: 'Traitement des questions...',
      logs: [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Début du traitement des questions'
        },
        {
          timestamp: new Date().toISOString(),
          level: 'success',
          message: 'Question 42 traitée avec succès'
        },
        {
          timestamp: new Date().toISOString(),
          level: 'warning',
          message: 'Catégorie "cardio" mappée vers "Cardiologie"'
        }
      ],
      errors: [
        {
          message: 'Option manquante pour la question ligne 15',
          itemIndex: 14
        }
      ]
    }
    
    res.json(mockStatus)
    
  } catch (error) {
    console.error('Erreur statut job:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
}

// Endpoint pour obtenir l'historique des imports
export const getImportHistory: PayloadHandler = async (req, res) => {
  try {
    // Dans une vraie implémentation, on récupérerait l'historique depuis la base de données
    // Pour l'instant, on simule des données
    const mockHistory = {
      jobs: [
        {
          id: 'job-1',
          fileName: 'questions-cardiologie.json',
          importType: 'questions',
          status: 'completed',
          progress: {
            total: 50,
            processed: 50,
            successful: 48,
            failed: 2
          },
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
          completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(), // 5min later
          createdBy: {
            id: 'user-1',
            email: 'admin@medcoach.fr',
            name: 'Admin MedCoach'
          },
          summary: {
            questionsCreated: 48,
            categoriesCreated: 2,
            flashcardsCreated: 0,
            pathsCreated: 0
          }
        },
        {
          id: 'job-2',
          fileName: 'flashcards-anatomie.json',
          importType: 'flashcards',
          status: 'failed',
          progress: {
            total: 25,
            processed: 10,
            successful: 8,
            failed: 2
          },
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          createdBy: {
            id: 'user-1',
            email: 'admin@medcoach.fr',
            name: 'Admin MedCoach'
          },
          errors: [
            {
              type: 'validation',
              severity: 'critical',
              message: 'Format JSON invalide ligne 15'
            }
          ]
        }
      ]
    }
    
    res.json(mockHistory)
    
  } catch (error) {
    console.error('Erreur historique:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
}

// Endpoint pour exporter l'historique en CSV
export const exportImportHistory: PayloadHandler = async (req, res) => {
  try {
    // Générer un CSV simple de l'historique
    const csvContent = `Date,Fichier,Type,Statut,Total,Réussis,Échecs,Utilisateur
2025-01-17 10:30,questions-cardiologie.json,questions,completed,50,48,2,admin@medcoach.fr
2025-01-16 14:15,flashcards-anatomie.json,flashcards,failed,25,8,2,admin@medcoach.fr`

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="import-history-${new Date().toISOString().split('T')[0]}.csv"`)
    res.send(csvContent)
    
  } catch (error) {
    console.error('Erreur export historique:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
}