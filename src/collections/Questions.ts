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
      label: 'Explication détaillée',
      type: 'richText',
      required: true,
      admin: {
        description: "Cette explication s'affichera à l'étudiant après qu'il ait répondu.",
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
  ],
}
