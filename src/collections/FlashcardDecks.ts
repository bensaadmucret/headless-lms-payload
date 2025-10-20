import type { CollectionConfig } from 'payload'

export const FlashcardDecks: CollectionConfig = {
  slug: 'flashcard-decks',
  admin: {
    useAsTitle: 'deckName',
    defaultColumns: ['deckName', 'category', 'level', 'cardCount'],
    description: 'Decks de flashcards pour organiser les cartes de révision',
    group: 'Contenu Pédagogique',
  },
  fields: [
    {
      name: 'deckName',
      label: 'Nom du deck',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      admin: {
        description: 'Description du contenu du deck',
      },
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
      name: 'level',
      label: 'Niveau d\'études',
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
      name: 'difficulty',
      label: 'Difficulté moyenne',
      type: 'select',
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
      name: 'cardCount',
      label: 'Nombre de cartes',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Calculé automatiquement',
      },
    },
    {
      name: 'author',
      label: 'Auteur',
      type: 'text',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'source',
      label: 'Source',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'Source du contenu (faculté, livre, etc.)',
      },
    },
  ],
}

export default FlashcardDecks
