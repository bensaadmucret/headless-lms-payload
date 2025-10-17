import type { CollectionConfig } from 'payload'

export const ImportJobs: CollectionConfig = {
  slug: 'import-jobs',
  labels: {
    singular: 'Import JSON/CSV',
    plural: 'Import JSON/CSV'
  },
  admin: {
    description: '📥 Importez vos contenus éducatifs en masse (JSON/CSV). Cliquez sur "Create New" pour commencer un nouvel import.',
    defaultColumns: ['title', 'fileName', 'importType', 'status', 'createdAt'],
    useAsTitle: 'title',
    group: 'Outils',
    // Interface 100% native Payload - pas de composants custom
    listSearchableFields: ['fileName', 'importType'],
    pagination: {
      defaultLimit: 25
    },
    // S'assurer que le bouton Create est visible
    enableRichTextRelationship: false
  },
  // Champs natifs Payload pour tracker les imports
  fields: [
    {
      name: 'title',
      type: 'text',
      label: '📝 Titre de l\'import',
      required: false, // Optionnel pour éviter les erreurs DB
      admin: {
        description: 'Donnez un nom à votre import pour le retrouver facilement (ex: "Questions Cardiologie Janvier 2025")'
      }
    },
    {
      name: 'originalFile',
      type: 'upload',
      relationTo: 'media',
      label: '📁 Fichier à importer',
      required: false, // Optionnel pour permettre la création manuelle
      admin: {
        description: 'Sélectionnez votre fichier JSON ou CSV à importer. Vous pouvez modifier ou supprimer le fichier même après création.',
        // Permettre la modification même après création
        readOnly: false
      }
    },
    {
      name: 'fileName',
      type: 'text',
      label: 'Nom du fichier',
      admin: {
        description: 'Nom du fichier (rempli automatiquement depuis le fichier uploadé)',
        condition: (data) => !!data.fileName // Afficher seulement si rempli
      }
    },
    {
      name: 'importType',
      type: 'select',
      label: 'Type d\'import',
      options: [
        { label: '❓ Questions QCM', value: 'questions' },
        { label: '🃏 Flashcards', value: 'flashcards' },
        { label: '🛤️ Parcours d\'apprentissage', value: 'learning-paths' },
        { label: '📊 Fichier CSV', value: 'csv' }
      ],
      required: true,
      admin: {
        description: 'Type de contenu à importer (détecté automatiquement ou sélectionné manuellement)'
      }
    },
    {
      name: 'status',
      type: 'select',
      label: 'Statut',
      options: [
        { label: '⏳ En attente', value: 'queued' },
        { label: '🔄 Traitement', value: 'processing' },
        { label: '✅ Validation', value: 'validating' },
        { label: '👁️ Aperçu', value: 'preview' },
        { label: '✅ Terminé', value: 'completed' },
        { label: '❌ Échec', value: 'failed' }
      ],
      defaultValue: 'queued',
      admin: {
        readOnly: true
      }
    },
    {
      name: 'progress',
      type: 'group',
      label: 'Progression',
      admin: {
        condition: (data) => data.status && data.status !== 'queued'
      },
      fields: [
        {
          name: 'total',
          type: 'number',
          label: 'Total d\'éléments',
          defaultValue: 0,
          admin: { readOnly: true }
        },
        {
          name: 'processed',
          type: 'number',
          label: 'Traités',
          defaultValue: 0,
          admin: { readOnly: true }
        },
        {
          name: 'successful',
          type: 'number',
          label: 'Réussis',
          defaultValue: 0,
          admin: { readOnly: true }
        },
        {
          name: 'failed',
          type: 'number',
          label: 'Échecs',
          defaultValue: 0,
          admin: { readOnly: true }
        }
      ]
    },
    {
      name: 'validationResult',
      type: 'json',
      label: 'Résultat de validation',
      admin: {
        readOnly: true,
        condition: (data) => !!data.validationResult
      }
    },
    {
      name: 'errors',
      type: 'array',
      label: 'Erreurs',
      admin: {
        readOnly: true,
        condition: (data) => data.errors && data.errors.length > 0
      },
      fields: [
        {
          name: 'type',
          type: 'select',
          options: ['validation', 'database', 'mapping', 'reference', 'system']
        },
        {
          name: 'severity',
          type: 'select',
          options: ['critical', 'major', 'minor', 'warning']
        },
        {
          name: 'message',
          type: 'textarea'
        },
        {
          name: 'suggestion',
          type: 'textarea'
        }
      ]
    },
    {
      name: 'importOptions',
      type: 'group',
      label: '⚙️ Options d\'import',
      admin: {
        description: 'Configurez les paramètres d\'import selon vos besoins'
      },
      fields: [
        {
          name: 'dryRun',
          type: 'checkbox',
          label: '🧪 Mode test (aperçu sans import)',
          defaultValue: false,
          admin: {
            description: 'Valider le fichier sans effectuer l\'import réel'
          }
        },
        {
          name: 'batchSize',
          type: 'number',
          label: 'Taille des lots',
          defaultValue: 100,
          min: 1,
          max: 1000,
          admin: {
            description: 'Nombre d\'éléments traités par lot (1-1000)'
          }
        },
        {
          name: 'overwriteExisting',
          type: 'checkbox',
          label: '🔄 Écraser les éléments existants',
          defaultValue: false,
          admin: {
            description: 'Remplacer les éléments existants en cas de conflit'
          }
        },
        {
          name: 'generateDistractors',
          type: 'checkbox',
          label: '🤖 Générer des distracteurs automatiquement',
          defaultValue: true,
          admin: {
            condition: (data) => data.importType === 'flashcards',
            description: 'Créer automatiquement des options incorrectes pour les flashcards'
          }
        },
        {
          name: 'requireHumanValidation',
          type: 'checkbox',
          label: '👤 Validation humaine obligatoire',
          defaultValue: true,
          admin: {
            description: 'Nécessite une validation manuelle avant l\'import final'
          }
        }
      ]
    },
    {
      name: 'importedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Importé par',
      admin: {
        readOnly: true
      }
    },
    {
      name: 'completedAt',
      type: 'date',
      label: 'Terminé le',
      admin: {
        readOnly: true,
        condition: (data) => data.status === 'completed' || data.status === 'failed'
      }
    }
  ],
  // Permissions Payload natives
  access: {
    create: ({ req: { user } }) => {
      // Permettre à tous les utilisateurs connectés de créer des imports
      return !!user
    },
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user?.role === 'admin' || user?.role === 'superadmin') return true
      // Les utilisateurs normaux voient seulement leurs propres imports
      return {
        importedBy: {
          equals: user?.id
        }
      }
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user?.role === 'admin' || user?.role === 'superadmin') return true
      // Les utilisateurs peuvent modifier leurs propres imports
      return {
        importedBy: {
          equals: user?.id
        }
      }
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (user?.role === 'admin' || user?.role === 'superadmin') return true
      // Les utilisateurs peuvent supprimer leurs propres imports
      return {
        importedBy: {
          equals: user?.id
        }
      }
    }
  },
  // Hooks Payload natifs
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        if ((operation === 'create' || operation === 'update') && req.user) {
          // Définir l'utilisateur seulement à la création
          if (operation === 'create') {
            data.importedBy = req.user.id
          }
          
          // Extraire le nom du fichier depuis l'upload (toujours mettre à jour)
          if (data.originalFile) {
            try {
              // Si originalFile est un ID, récupérer le document media
              if (typeof data.originalFile === 'string') {
                const mediaDoc = await req.payload.findByID({
                  collection: 'media',
                  id: data.originalFile
                })
                if (mediaDoc?.filename) {
                  data.fileName = mediaDoc.filename
                }
              } else if (data.originalFile?.filename) {
                // Si c'est déjà un objet avec filename
                data.fileName = data.originalFile.filename
              }
            } catch (error) {
              console.error('Erreur lors de la récupération du nom de fichier:', error)
            }
          }
          
          // Générer un titre par défaut si pas fourni
          if (data.fileName && !data.title) {
            const baseName = data.fileName.replace(/\.[^/.]+$/, '') // Enlever l'extension
            const date = new Date().toLocaleDateString('fr-FR')
            data.title = `Import ${baseName} - ${date}`
          }
          
          // Auto-détecter le type d'import depuis le nom de fichier
          if (data.fileName && !data.importType) {
            const fileName = data.fileName.toLowerCase()
            if (fileName.endsWith('.csv')) {
              data.importType = 'csv'
            } else if (fileName.includes('flashcard')) {
              data.importType = 'flashcards'
            } else if (fileName.includes('path') || fileName.includes('parcours')) {
              data.importType = 'learning-paths'
            } else {
              data.importType = 'questions'
            }
          }
          
          // Initialiser le statut
          if (!data.status) {
            data.status = 'queued'
          }
        }
        return data
      }
    ],
    afterChange: [
      async ({ doc, req, operation }) => {
        // Déclencher le traitement automatique après création
        if (operation === 'create' && doc.originalFile && doc.status === 'queued') {
          console.log(`Import job créé: ${doc.id} - ${doc.fileName}`)
          
          // Déclencher le traitement asynchrone
          try {
            // Appeler l'endpoint de traitement
            const response = await fetch(`${process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'}/api/json-import/process/${doc.id}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              }
            })
            
            if (!response.ok) {
              console.error('Erreur déclenchement traitement:', await response.text())
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error('Erreur déclenchement traitement:', errorMessage)
          }
        }
      }
    ]
  }
}