import type { CollectionConfig } from 'payload'

export const KnowledgeBase: CollectionConfig = {
  slug: 'knowledge-base',
  labels: {
    singular: 'Document de Connaissance',
    plural: 'Base de Connaissances'
  },
  admin: {
    description: '📚 Importez vos contenus éducatifs (JSON/CSV) pour alimenter la base de connaissances.',
    defaultColumns: ['fileName', 'importType', 'status', 'createdAt'],
    useAsTitle: 'fileName',
    group: 'Contenu Pédagogique',
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
      name: 'originalFile',
      type: 'upload',
      relationTo: 'media',
      label: '📁 Fichier à importer',
      required: true,
      admin: {
        description: 'Uploadez votre fichier JSON ou CSV à importer. Formats acceptés: .json, .csv'
      }
    },
    {
      name: 'fileName',
      type: 'text',
      label: 'Nom du fichier',
      admin: {
        description: 'Nom du fichier (rempli automatiquement depuis le fichier uploadé)',
        readOnly: true
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
        readOnly: true,
        description: 'Le statut change automatiquement pendant le traitement. Pour relancer un import échoué, changez le statut en "En attente" et sauvegardez.'
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
              console.log('📄 Type de originalFile:', typeof data.originalFile, data.originalFile)
              
              // Si originalFile est un ID string
              if (typeof data.originalFile === 'string') {
                console.log('🔍 Récupération du media avec ID:', data.originalFile)
                const mediaDoc = await req.payload.findByID({
                  collection: 'media',
                  id: data.originalFile
                })
                console.log('📦 Media trouvé:', mediaDoc?.filename)
                if (mediaDoc?.filename) {
                  data.fileName = mediaDoc.filename
                }
              } 
              // Si c'est un objet avec un ID
              else if (typeof data.originalFile === 'object' && data.originalFile !== null) {
                const fileId = (data.originalFile as any).id
                if (fileId) {
                  console.log('🔍 Récupération du media avec ID depuis objet:', fileId)
                  const mediaDoc = await req.payload.findByID({
                    collection: 'media',
                    id: fileId
                  })
                  console.log('📦 Media trouvé:', mediaDoc?.filename)
                  if (mediaDoc?.filename) {
                    data.fileName = mediaDoc.filename
                  }
                } else if ((data.originalFile as any).filename) {
                  // Si c'est déjà un objet avec filename
                  data.fileName = (data.originalFile as any).filename
                  console.log('📦 Filename depuis objet:', data.fileName)
                }
              }
              
              if (!data.fileName) {
                console.warn('⚠️ Impossible de récupérer le nom du fichier depuis originalFile')
              }
            } catch (error) {
              console.error('❌ Erreur lors de la récupération du nom de fichier:', error)
            }
          } else {
            console.log('ℹ️ Pas de fichier uploadé (originalFile vide)')
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
      async ({ doc, req, operation, previousDoc }) => {
        // Déclencher le traitement automatique après création ou mise à jour
        const shouldProcess = (
          doc.originalFile && 
          doc.status === 'queued' && 
          (
            operation === 'create' || 
            (operation === 'update' && previousDoc?.originalFile !== doc.originalFile)
          )
        )
        
        if (shouldProcess) {
          console.log(`🚀 Ajout job d'import à la queue: ${doc.id} - ${doc.fileName}`)
          console.log(`   Type: ${doc.importType}, Statut: ${doc.status}`)
          
          try {
            // Importer la queue dynamiquement pour éviter les problèmes de circular dependency
            const { importQueue } = await import('../jobs/queue')
            
            // Extraire l'ID du fichier
            const fileId = typeof doc.originalFile === 'string' 
              ? doc.originalFile 
              : (doc.originalFile as any)?.id
            
            if (!fileId) {
              throw new Error('ID du fichier introuvable')
            }
            
            // Ajouter le job à la queue
            const job = await importQueue.add({
              importJobId: doc.id,
              fileId,
              importType: doc.importType as any,
              options: doc.importOptions || {},
              userId: req.user?.id || ''
            }, {
              jobId: `import-${doc.id}`, // ID unique pour éviter les doublons
              removeOnComplete: 100,
              removeOnFail: 50
            })
            
            console.log(`✅ Job ajouté à la queue: ${job.id}`)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error('❌ Erreur ajout job à la queue:', errorMessage)
            
            // Mettre à jour le statut en cas d'erreur
            await req.payload.update({
              collection: 'knowledge-base',
              id: doc.id,
              data: {
                status: 'failed',
                errors: [{
                  type: 'system',
                  severity: 'critical',
                  message: `Erreur lors de l'ajout à la queue: ${errorMessage}`,
                  suggestion: 'Vérifiez que Redis est démarré et que les workers tournent'
                }]
              }
            })
          }
        } else if (doc.originalFile && doc.status !== 'queued') {
          console.log(`ℹ️ Import job ${doc.id} non traité - Statut: ${doc.status}`)
        }
      }
    ]
  }
}