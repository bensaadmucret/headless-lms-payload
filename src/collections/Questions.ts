import { defaultEditorFeatures, lexicalEditor } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'

export const Questions: CollectionConfig = {
  slug: 'questions',
  admin: {
    useAsTitle: 'questionText',
    defaultColumns: ['questionText', 'questionType', 'course'],
    description: 'Notre banque centrale de questions pour tous les quiz et sessions d\'étude.',
  },
  fields: [
    {
      name: 'questionText',
      label: 'Texte de la question',
      type: 'richText',
      required: true,
      editor: lexicalEditor({ features: defaultEditorFeatures }),
    },
    {
      name: 'questionType',
      label: 'Type de question',
      type: 'select',
      required: true,
      defaultValue: 'multipleChoice',
      options: [
        {
          label: 'Choix Multiple (QCM)',
          value: 'multipleChoice',
        },
      ],
    },
    {
      name: 'options',
      label: 'Options de réponse',
      type: 'array',
      minRows: 2,
      maxRows: 6,
      required: true,
      admin: {
        condition: data => data.questionType === 'multipleChoice',
        description: 'Définissez les options pour le QCM et cochez la bonne réponse.',
      },
      fields: [
        {
          name: 'optionText',
          label: 'Texte de l\'option',
          type: 'text',
          required: true,
        },
        {
          name: 'isCorrect',
          label: 'Est la bonne réponse ?',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
    {
      name: 'explanation',
      label: 'Explication détaillée (Texte Simple)',
      type: 'textarea',
      required: true,
      admin: {
        description: "Cette explication s'affichera à l'étudiant après qu'il ait répondu. Champ temporairement en texte simple pour débogage.",
      },
    },
    {
      name: 'course',
      label: 'Cours associé',
      type: 'relationship',
      relationTo: 'courses',
      required: true,
      admin: {
        position: 'sidebar',
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
      name: 'difficultyLevel',
      label: 'Niveau de difficulté',
      type: 'select',
      required: true,
      defaultValue: 'pass',
      options: [
        { label: "PASS (Parcours d'Accès Spécifique Santé)", value: 'pass' },
        { label: "LAS (Licence avec option Accès Santé)", value: 'las' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Définit le niveau de cursus pour cette question.',
      },
    },
  ],
}
