import type { CollectionConfig, CollectionAfterChangeHook } from 'payload'
import { importQueue } from '../jobs/queue'

/**
 * Hook pour déclencher le traitement asynchrone après création d'un import job
 */
const triggerImportProcessing: CollectionAfterChangeHook = async ({ doc, req, operation }) => {
  // Déclencher le traitement asynchrone via Bull queue uniquement lors de la création
  if (operation === 'create' && doc.status === 'pending') {
    try {
      const job = await importQueue.add(
        'process-import',
        {
          jobId: doc.id,
          userId: req.user?.id,
          importType: doc.importType,
          fileName: doc.fileName,
        },
        {
          jobId: `import-${doc.id}`,
          priority: doc.importType === 'quizzes' ? 10 : 5,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }
      )

      req.payload.logger.info(
        `🚀 Import job ${doc.id} queued with Bull job ${job.id}`
      )
    } catch (error) {
      req.payload.logger.error(
        `❌ Failed to queue import job ${doc.id}:`,
        error
      )
    }
  }
  return doc
}

/**
 * Collection pour gérer les imports de fichiers JSON/CSV de quiz
 * Utilise le système de queue Bull existant pour le traitement asynchrone
 */
const ImportJobs: CollectionConfig = {
  slug: 'import-jobs',
  
  admin: {
    useAsTitle: 'fileName',
    defaultColumns: ['fileName', 'importType', 'status', 'progress', 'createdAt'],
    description: 'Gestion des imports massifs de quiz, questions et flashcards depuis fichiers JSON/CSV',
    group: 'Système',
  },

  access: {
    // Seuls les admins peuvent créer des imports
    create: ({ req }) => {
      return req.user?.role === 'admin'
    },
    // Tous les utilisateurs authentifiés peuvent voir leurs imports
    read: ({ req }) => {
      if (req.user?.role === 'admin') {
        return true
      }
      // Les utilisateurs ne voient que leurs propres imports
      return {
        uploadedBy: {
          equals: req.user?.id,
        },
      }
    },
    // Personne ne peut modifier un import (immutable)
    update: () => false,
    // Seuls les admins peuvent supprimer
    delete: ({ req }) => req.user?.role === 'admin',
  },

  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // Auto-remplir uploadedBy lors de la création
        if (operation === 'create' && req.user) {
          data.uploadedBy = req.user.id;
        }

        // Auto-remplir fileName depuis le fichier uploadé si vide
        if (operation === 'create' && data.uploadedFile && !data.fileName) {
          try {
            const file = await req.payload.findByID({
              collection: 'media',
              id: data.uploadedFile,
            });
            if (file && file.filename) {
              data.fileName = file.filename;
            }
          } catch (error) {
            req.payload.logger.warn('Could not auto-fill fileName:', error);
          }
        }

        return data;
      },
    ],
    afterChange: [triggerImportProcessing],
  },

  fields: [
    {
      name: 'uploadedFile',
      label: 'Fichier importé',
      type: 'upload',
      relationTo: 'media',
      required: true,
      filterOptions: {
        mimeType: {
          contains: 'application/json',
        },
      },
      admin: {
        description: 'Fichier JSON ou CSV contenant les données à importer',
      },
    },
    {
      name: 'fileName',
      label: 'Nom du fichier',
      type: 'text',
      required: false,
      admin: {
        description: 'Nom original du fichier uploadé (auto-rempli si vide)',
      },
    },
    {
      name: 'importType',
      label: 'Type d\'import',
      type: 'select',
      required: true,
      options: [
        {
          label: 'Questions isolées',
          value: 'questions',
        },
        {
          label: 'Quiz complet',
          value: 'quizzes',
        },
        {
          label: 'Flashcards',
          value: 'flashcards',
        },
        {
          label: 'Parcours d\'apprentissage',
          value: 'learning-path',
        },
      ],
      admin: {
        description: 'Type de contenu à importer',
      },
    },
    {
      name: 'status',
      label: 'Statut',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: '⏳ En attente', value: 'pending' },
        { label: '🔍 Validation', value: 'validating' },
        { label: '✅ Validé', value: 'validated' },
        { label: '⚙️ Traitement', value: 'processing' },
        { label: '✔️ Terminé', value: 'completed' },
        { label: '❌ Échec', value: 'failed' },
        { label: '⚠️ Validation échouée', value: 'validation_failed' },
      ],
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'progress',
      label: 'Progression (%)',
      type: 'number',
      min: 0,
      max: 100,
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Progression du traitement (0-100%)',
      },
    },
    {
      name: 'uploadedBy',
      label: 'Importé par',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'createQuizContainer',
      label: 'Créer un quiz conteneur',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Pour les questions isolées : créer automatiquement un quiz qui les regroupe',
        condition: (data) => data.importType === 'questions',
      },
    },
    {
      name: 'quizMetadata',
      label: 'Métadonnées du quiz',
      type: 'group',
      admin: {
        condition: (data) => data.createQuizContainer === true,
      },
      fields: [
        {
          name: 'title',
          label: 'Titre du quiz',
          type: 'text',
          required: false,
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          required: false,
        },
        {
          name: 'category',
          label: 'Catégorie',
          type: 'relationship',
          relationTo: 'categories',
          required: false,
        },
      ],
    },
    {
      name: 'validationResults',
      label: 'Résultats de validation',
      type: 'json',
      admin: {
        readOnly: true,
        description: 'Erreurs et avertissements détectés lors de la validation',
      },
    },
    {
      name: 'processingResults',
      label: 'Résultats du traitement',
      type: 'json',
      admin: {
        readOnly: true,
        description: 'Détails des entités créées (questions, quiz, etc.)',
      },
    },
    {
      name: 'errors',
      label: 'Erreurs',
      type: 'array',
      admin: {
        readOnly: true,
      },
      fields: [
        {
          name: 'type',
          label: 'Type',
          type: 'select',
          options: [
            { label: 'Validation', value: 'validation' },
            { label: 'Base de données', value: 'database' },
            { label: 'Mapping', value: 'mapping' },
            { label: 'Référence', value: 'reference' },
            { label: 'Système', value: 'system' },
          ],
        },
        {
          name: 'severity',
          label: 'Sévérité',
          type: 'select',
          options: [
            { label: 'Critique', value: 'critical' },
            { label: 'Majeure', value: 'major' },
            { label: 'Mineure', value: 'minor' },
            { label: 'Avertissement', value: 'warning' },
          ],
        },
        {
          name: 'message',
          label: 'Message',
          type: 'textarea',
        },
        {
          name: 'itemIndex',
          label: 'Index de l\'élément',
          type: 'number',
        },
      ],
    },
    {
      name: 'completedAt',
      label: 'Terminé le',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
  ],
}

export default ImportJobs
