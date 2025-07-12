import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'

import { logAuditAfterChange, logAuditAfterDelete } from '../logAudit';

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    // Permettre la lecture publique (nécessaire pour /me)
    // La sécurité est assurée par l'endpoint personnalisé
    read: () => true,
    
    // Protéger les opérations sensibles
    admin: authenticated,
    create: authenticated,
    delete: authenticated,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['firstName', 'lastName', 'email', 'role'],
    useAsTitle: 'email',
  },
  auth: true,
  hooks: {
    afterChange: [logAuditAfterChange],
    afterDelete: [logAuditAfterDelete],
  },
  fields: [
    {
      name: 'firstName',
      label: 'Prénom',
      type: 'text',
      required: true,
    },
    {
      name: 'lastName',
      label: 'Nom',
      type: 'text',
      required: true,
    },
    {
      name: 'examDate',
      label: "Date de l'examen",
      type: 'date',
      admin: {
        position: 'sidebar',
        description: "Permet au coach de calibrer le plan d'étude.",
        condition: data => data.role === 'student',
      },
    },
    {
      name: 'studyProfile',
      label: 'Profil d\'étude',
      type: 'group',
      admin: {
        condition: data => data.role === 'student',
        description: 'Objectifs et préférences de l\'étudiant pour personnaliser son coaching.',
      },
      fields: [
        {
          name: 'targetScore',
          label: 'Objectif de score',
          type: 'number',
          min: 0,
          max: 100,
        },
        {
          name: 'studyHoursPerWeek',
          label: "Heures d'étude par semaine",
          type: 'number',
          min: 1,
          max: 80,
        },
      ],
    },
    {
      name: 'competencyProfile',
      label: 'Profil de compétences',
      type: 'json',
      admin: {
        description: 'Stocke les scores de compétence par matière. Mis à jour par le coach IA.',
        readOnly: true,
        condition: data => data.role === 'student',
      },
    },
    {
      name: 'hasTakenPlacementQuiz',
      label: 'Quiz de positionnement effectué',
      type: 'checkbox',
      defaultValue: false,
      required: true,
      admin: {
        position: 'sidebar',
        description: 'Indique si l’étudiant a passé le quiz de positionnement',
        condition: data => data.role === 'student',
      },
    },
    {
      name: 'role',
      label: 'Rôle',
      type: 'select',
      required: true,

      options: [
        { label: 'Super Admin', value: 'superadmin' },
        { label: 'Admin', value: 'admin' },
        { label: 'Enseignant', value: 'teacher' },
        { label: 'Étudiant', value: 'student' },
      ],
      admin: {
        position: 'sidebar',
      },
      access: {
        update: ({ req }) => req.user?.role === 'superadmin' || req.user?.role === 'admin',
      },
    },
  ],
  timestamps: true,
}
