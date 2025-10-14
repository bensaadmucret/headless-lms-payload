import type { CollectionConfig } from 'payload'
import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import { authenticated } from '@/access/authenticated'
import { processDocumentAfterChange, validateDocumentBeforeChange } from '../hooks/processDocumentAfterChange'
// Temporairement désactivé le composant qui cause des erreurs
// import ExtractNowButton from '@/components/admin/ExtractNowButton'

export const KnowledgeBase: CollectionConfig = {
  slug: 'knowledge-base',
  labels: {
    singular: 'Document de Connaissance',
    plural: 'Base de Connaissances',
  },
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'documentType', 'medicalDomain', 'processingCompleted', 'processingStatus', 'validationStatus', 'createdAt'],
    group: 'Contenu Pédagogique',
  },
  fields: [
    // === MÉTADONNÉES DU DOCUMENT ===
    {
      name: 'title',
      type: 'text',
      label: 'Titre du Document',
      required: true,
      admin: {
        placeholder: 'Ex: Anatomie du Coeur - Chapitre 5',
      },
    },
    {
      name: 'originalFileName',
      type: 'text',
      label: 'Nom du Fichier Original',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'documentType',
      type: 'select',
      label: 'Type de Document',
      required: true,
      options: [
        { label: 'PDF', value: 'pdf' },
        { label: 'EPUB', value: 'epub' },
        { label: 'MOBI', value: 'mobi' },
        { label: 'DOCX', value: 'docx' },
        { label: 'TXT', value: 'txt' },
      ],
      defaultValue: 'pdf',
    },
    
    // === FICHIER SOURCE ===
    {
      name: 'sourceFile',
      type: 'upload',
      label: 'Fichier Source',
      relationTo: 'media',
      required: true,
      admin: {
        description: 'Le fichier original (PDF, eBook, etc.)',
      },
    },
    // Temporairement désactivé - cause des erreurs d'import
    /*
    {
      name: 'extractNow',
      type: 'ui',
      label: false,
      admin: {
        components: {
          Field: ExtractNowButton,
        },
        description: 'Exécuter une extraction immédiate sans worker',
      },
    },
    */
    
    // === CONTENU EXTRAIT ET STRUCTURÉ ===
    {
      name: 'extractedContent',
      type: 'textarea', // Temporairement en textarea pour debug
      maxLength: 200000, // 🎯 Comme Media
      label: 'Contenu Extrait',
      admin: {
        description: 'Contenu textuel extrait automatiquement du document',
        readOnly: true,
        rows: 10,
        // Pas de condition - toujours visible
      },
    },
    {
      name: 'chapters',
      type: 'array',
      label: 'Chapitres',
      admin: {
        description: 'Structure en chapitres du document',
      },
      fields: [
        {
          name: 'chapterTitle',
          type: 'text',
          label: 'Titre du Chapitre',
          required: true,
        },
        {
          name: 'chapterNumber',
          type: 'number',
          label: 'Numéro de Chapitre',
        },
        {
          name: 'content',
          type: 'richText',
          label: 'Contenu du Chapitre',
          editor: lexicalEditor({
            features: ({ rootFeatures }) => [
              ...rootFeatures,
              FixedToolbarFeature(),
              InlineToolbarFeature(),
            ],
          }),
        },
        {
          name: 'pageNumbers',
          type: 'text',
          label: 'Pages de Référence',
          admin: {
            placeholder: 'Ex: p. 45-67',
          },
        },
      ],
    },
    
    // === CLASSIFICATION MÉDICALE ===
    {
      name: 'medicalDomain',
      type: 'select',
      label: 'Domaine Médical',
      required: true,
      options: [
        { label: 'Anatomie', value: 'anatomie' },
        { label: 'Physiologie', value: 'physiologie' },
        { label: 'Cardiologie', value: 'cardiologie' },
        { label: 'Neurologie', value: 'neurologie' },
        { label: 'Pneumologie', value: 'pneumologie' },
        { label: 'Gastroentérologie', value: 'gastroenterologie' },
        { label: 'Endocrinologie', value: 'endocrinologie' },
        { label: 'Hématologie', value: 'hematologie' },
        { label: 'Immunologie', value: 'immunologie' },
        { label: 'Pharmacologie', value: 'pharmacologie' },
        { label: 'Pathologie', value: 'pathologie' },
        { label: 'Radiologie', value: 'radiologie' },
        { label: 'Chirurgie', value: 'chirurgie' },
        { label: 'Médecine Générale', value: 'medecine_generale' },
        { label: 'Pédiatrie', value: 'pediatrie' },
        { label: 'Gynécologie', value: 'gynecologie' },
        { label: 'Psychiatrie', value: 'psychiatrie' },
        { label: 'Dermatologie', value: 'dermatologie' },
        { label: 'Ophtalmologie', value: 'ophtalmologie' },
        { label: 'ORL', value: 'orl' },
        { label: 'Autre', value: 'autre' },
      ],
    },
    {
      name: 'speciality',
      type: 'text',
      label: 'Spécialité Précise',
      admin: {
        placeholder: 'Ex: Cardiologie interventionnelle',
      },
    },
    {
      name: 'difficulty',
      type: 'select',
      label: 'Niveau de Difficulté',
      required: true,
      options: [
        { label: 'Débutant (L1-L2)', value: 'beginner' },
        { label: 'Intermédiaire (L3-M1)', value: 'intermediate' },
        { label: 'Avancé (M2-Interne)', value: 'advanced' },
        { label: 'Expert (PH-Spécialiste)', value: 'expert' },
      ],
      defaultValue: 'intermediate',
    },
    
    // === MÉTADONNÉES ACADÉMIQUES ===
    {
      name: 'authors',
      type: 'array',
      label: 'Auteurs',
      fields: [
        {
          name: 'authorName',
          type: 'text',
          label: 'Nom de l\'Auteur',
          required: true,
        },
      ],
    },
    {
      name: 'publisher',
      type: 'text',
      label: 'Éditeur',
      admin: {
        placeholder: 'Ex: Masson, Elsevier, etc.',
      },
    },
    {
      name: 'publicationYear',
      type: 'number',
      label: 'Année de Publication',
      min: 1900,
      max: new Date().getFullYear() + 5,
    },
    {
      name: 'isbn',
      type: 'text',
      label: 'ISBN',
      admin: {
        placeholder: 'Ex: 978-2-294-12345-6',
      },
    },
    {
      name: 'edition',
      type: 'text',
      label: 'Édition',
      admin: {
        placeholder: 'Ex: 3ème édition',
      },
    },
    
    // === VALIDATION ET QUALITÉ ===
    {
      name: 'validationStatus',
      type: 'select',
      label: 'Statut de Validation',
      required: true,
      options: [
        { label: '⏳ En Attente', value: 'pending' },
        { label: '✅ Approuvé', value: 'approved' },
        { label: '❌ Rejeté', value: 'rejected' },
        { label: '🔍 Nécessite Révision', value: 'needs_review' },
      ],
      defaultValue: 'pending',
    },
    {
      name: 'validatedBy',
      type: 'relationship',
      label: 'Validé par',
      relationTo: 'users',
      admin: {
        description: 'Expert médical qui a validé ce contenu',
      },
    },
    {
      name: 'validationDate',
      type: 'date',
      label: 'Date de Validation',
    },
    {
      name: 'validationNotes',
      type: 'textarea',
      label: 'Notes de Validation',
      admin: {
        placeholder: 'Commentaires de l\'expert validateur...',
      },
    },
    {
      name: 'qualityScore',
      type: 'number',
      label: 'Score de Qualité',
      min: 1,
      max: 5,
      admin: {
        description: 'Score de 1 à 5 étoiles',
        step: 0.1,
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      label: 'Document Actif',
      defaultValue: false,
      admin: {
        description: 'Disponible pour la génération de questions par l\'IA',
      },
    },
    
    // === RECHERCHE ET INDEXATION ===
    {
      name: 'keywords',
      type: 'array',
      label: 'Mots-clés',
      admin: {
        description: 'Mots-clés extraits automatiquement par l\'IA',
      },
      fields: [
        {
          name: 'keyword',
          type: 'text',
          label: 'Mot-clé',
          required: true,
        },
      ],
    },
    {
      name: 'searchableContent',
      type: 'textarea',
      label: 'Contenu Indexé pour Recherche',
      admin: {
        description: 'Version optimisée pour la recherche full-text',
        readOnly: true,
      },
    },
    {
      name: 'aiSummary',
      type: 'richText',
      label: 'Résumé IA',
      admin: {
        description: 'Résumé automatique généré par l\'IA',
        readOnly: true,
      },
    },
    
    // === TRAÇABILITÉ ===
    {
      name: 'uploadedBy',
      type: 'relationship',
      label: 'Téléversé par',
      relationTo: 'users',
      required: false,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'lastProcessed',
      type: 'date',
      label: 'Dernière Extraction',
      admin: {
        description: 'Date du dernier traitement automatique',
        readOnly: true,
      },
    },
    {
      name: 'processingStatus',
      type: 'select',
      label: 'Statut de Traitement',
      options: [
        { label: '⏳ En File d\'Attente', value: 'queued' },
        { label: '🔍 Extraction en Cours', value: 'extracting' },
        { label: '🧠 Enrichissement IA', value: 'enriching' },
        { label: '💾 Finalisation', value: 'updating' },
        { label: '✅ Terminé', value: 'completed' },
        { label: '❌ Échec', value: 'failed' },
        { label: '🔄 Nouvelle Tentative', value: 'retrying' },
      ],
      defaultValue: 'queued',
      required: true,
    },
    {
      name: 'processingCompleted',
      type: 'checkbox',
      label: 'Traitement Terminé avec Succès',
      defaultValue: false,
      admin: {
        description: 'Indique si le PDF a été complètement traité (extraction + NLP + IA + validation)',
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'processingCompletedAt',
      type: 'date',
      label: 'Date de Finalisation',
      admin: {
        description: 'Date et heure de la finalisation complète du traitement',
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'processingLogs',
      type: 'textarea',
      label: 'Logs de Traitement',
      admin: {
        description: 'Logs techniques du traitement automatique',
        readOnly: true,
      },
    },
    
    // === STATISTIQUES D'UTILISATION ===
    {
      name: 'usageStats',
      type: 'group',
      label: 'Statistiques d\'Utilisation',
      admin: {
        description: 'Métriques d\'utilisation de ce document',
      },
      fields: [
        {
          name: 'questionsGenerated',
          type: 'number',
          label: 'Questions Générées',
          defaultValue: 0,
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'timesReferenced',
          type: 'number',
          label: 'Fois Référencé',
          defaultValue: 0,
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'lastUsed',
          type: 'date',
          label: 'Dernière Utilisation',
          admin: {
            readOnly: true,
          },
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      // Hook de validation et préparation des données
      validateDocumentBeforeChange,
      ({ req, data }) => {
        // Auto-définir uploadedBy lors de la création
        if (req.user && !data.uploadedBy) {
          data.uploadedBy = req.user.id
        }
        
        // Mettre à jour lastProcessed si le contenu change
        if (data.extractedContent) {
          data.lastProcessed = new Date()
        }
        
        return data
      },
    ],
    afterChange: [
      // Hook principal pour le traitement asynchrone
      processDocumentAfterChange,
      ({ req, doc }) => {
        // Log de l'activité
        req.payload.logger.info(`Document de connaissance modifié: ${doc.title} (ID: ${doc.id})`)
      },
    ],
  },
  timestamps: true,
}