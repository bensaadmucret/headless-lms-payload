import type { CollectionConfig } from 'payload'

export const Flashcards: CollectionConfig = {
  slug: 'flashcards',
  admin: {
    useAsTitle: 'front',
    defaultColumns: ['front', 'category', 'difficulty', 'level'],
    description: 'Cartes de révision pour l\'apprentissage actif et la mémorisation',
    group: 'Contenu Pédagogique',
  },
  fields: [
    {
      name: 'aiFlashcardGeneration',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field: '@/components/admin/GenerateAIFlashcardButton'
        }
      }
    },
    {
      name: 'front',
      label: 'Recto (Question)',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Question ou concept clé à mémoriser',
      },
    },
    {
      name: 'back',
      label: 'Verso (Réponse)',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Explication détaillée ou réponse complète',
      },
    },
    {
      name: 'hints',
      label: 'Indices',
      type: 'array',
      admin: {
        description: 'Indices optionnels pour faciliter la mémorisation',
      },
      fields: [
        {
          name: 'hint',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'category',
      label: 'Catégorie',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: false,
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'difficulty',
      label: 'Niveau de difficulté',
      type: 'select',
      required: true,
      defaultValue: 'medium',
      options: [
        { label: 'Facile', value: 'easy' },
        { label: 'Moyen', value: 'medium' },
        { label: 'Difficile', value: 'hard' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'level',
      label: 'Niveau d\'études ciblé',
      type: 'select',
      required: true,
      defaultValue: 'both',
      options: [
        { label: 'PASS uniquement', value: 'PASS' },
        { label: 'LAS uniquement', value: 'LAS' },
        { label: 'PASS et LAS', value: 'both' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'tags',
      label: 'Tags',
      type: 'array',
      admin: {
        position: 'sidebar',
        description: 'Tags pour filtrage et recherche',
      },
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'deck',
      label: 'Deck',
      type: 'relationship',
      relationTo: 'flashcard-decks',
      hasMany: false,
      admin: {
        position: 'sidebar',
        description: 'Deck auquel appartient cette flashcard',
      },
    },
    {
      name: 'imageUrl',
      label: 'Image (URL)',
      type: 'text',
      admin: {
        description: 'URL d\'une image illustrative (optionnel)',
      },
    },
    {
      name: 'generatedByAI',
      label: 'Généré par IA',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'validationStatus',
      label: 'Statut de validation',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'En attente', value: 'pending' },
        { label: 'À revoir', value: 'needs_review' },
        { label: 'Validé', value: 'validated' },
        { label: 'Rejeté', value: 'rejected' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Statut de validation pour les contenus générés',
      },
    },
  ],
}

export default Flashcards
