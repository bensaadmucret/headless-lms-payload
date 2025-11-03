import type { CollectionConfig, Validate } from 'payload'


import type { User as PayloadUser } from '../../payload-types'

import { authenticated } from '../../access/authenticated'
import { logAuditAfterChange, logAuditAfterDelete } from '../logAudit'

// Validation for general fields, required for students on update
const requiredForStudent: Validate = (value, { data, operation }) => {
  if (operation === 'update' && data.role === 'student' && (value === null || value === undefined || value === '')) {
    return 'Ce champ est obligatoire pour les étudiants.'
  }
  return true
}

// Validation for checkboxes, must be checked for students on update
const validateCheckboxForStudent: Validate = (value, { data, operation }) => {
  if (operation === 'update' && data.role === 'student' && value !== true) {
    return 'Vous devez cocher cette case pour continuer.'
  }
  return true
}

// Validation for date fields, required for students on update
const dateRequiredForStudent: Validate = (value, { data, operation }) => {
  if (operation === 'update' && data.role === 'student' && !value) {
    return 'Ce champ est obligatoire pour les étudiants.'
  }
  return true
}

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    read: () => true,
    admin: authenticated,
    create: () => true,
    delete: authenticated,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['firstName', 'lastName', 'email', 'role'],
    useAsTitle: 'email',
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        // Normaliser studyYear en minuscules pour accepter PASS/LAS ou pass/las
        if (data?.studyYear && typeof data.studyYear === 'string') {
          data.studyYear = data.studyYear.toLowerCase();
        }
        return data;
      },
    ],
    afterChange: [
      // logAuditAfterChange,
    ],
    afterDelete: [logAuditAfterDelete],
  },
  endpoints: [],
  fields: [
    {
      name: 'firstName',
      label: 'Prénom',
      type: 'text',
      admin: {
        position: 'sidebar',
      },
      custom: {
        betterAuthFieldKey: 'firstName',
      },
    },
    {
      name: 'lastName',
      label: 'Nom',
      type: 'text',
      admin: {
        position: 'sidebar',
      },
      custom: {
        betterAuthFieldKey: 'lastName',
      },
    },
    {
      name: 'studyYear',
      label: "Année d'études",
      type: 'select',
      validate: requiredForStudent,
      options: [
        { label: "PASS (Parcours d'Accès Spécifique Santé)", value: 'pass' },
        { label: "LAS (Licence avec option Accès Santé)", value: 'las' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Le cursus actuel de l’étudiant.',
                    condition: (data: Partial<PayloadUser>) => data.role === 'student',
      },
      custom: {
        betterAuthFieldKey: 'studyYear',
      },
    },
    {
      name: 'onboardingComplete',
      label: 'Onboarding Terminé',
      type: 'checkbox',
      defaultValue: false,
            validate: validateCheckboxForStudent,
      admin: {
        position: 'sidebar',
        description: 'Indique si l’étudiant a terminé le parcours d’intégration.',
                    condition: (data: Partial<PayloadUser>) => data.role === 'student',
      },
      custom: {
        betterAuthFieldKey: 'onboardingComplete',
      },
    },
    {
      name: 'examDate',
      label: "Date de l'examen",
      type: 'date',
      validate: dateRequiredForStudent,
      admin: {
        position: 'sidebar',
        description: "Permet au coach de calibrer le plan d'étude.",
                    condition: (data: Partial<PayloadUser>) => data.role === 'student',
      },
      custom: {
        betterAuthFieldKey: 'examDate',
      },
    },
    {
      name: 'studyProfile',
      label: "Profil d'étude",
      type: 'group',
      admin: {
                    condition: (data: Partial<PayloadUser>) => data.role === 'student',
        description: "Objectifs et préférences de l'étudiant pour personnaliser son coaching.",
      },
      fields: [
        { name: 'targetScore', label: 'Objectif de score', type: 'number', min: 0, max: 100 },
        { name: 'studyHoursPerWeek', label: "Heures d'étude par semaine", type: 'number', min: 1, max: 80 },
      ],
    },
    {
      name: 'competencyProfile',
      label: 'Profil de compétences',
      type: 'json',
      admin: {
        description: 'Stocke les scores de compétence par matière. Mis à jour par le coach IA.',
        readOnly: true,
                    condition: (data: Partial<PayloadUser>) => data.role === 'student',
      },
    },
    {
      name: 'hasTakenPlacementQuiz',
      label: 'Quiz de positionnement effectué',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Indique si l’étudiant a passé le quiz de positionnement',
                    condition: (data: Partial<PayloadUser>) => data.role === 'student',
      },
    },
    {
      name: 'subscriptionStatus',
      label: 'Statut d\'abonnement',
      type: 'select',
      options: [
        { label: 'Aucun', value: 'none' },
        { label: 'Essai gratuit', value: 'trialing' },
        { label: 'Actif', value: 'active' },
        { label: 'Paiement en retard', value: 'past_due' },
        { label: 'Annulé', value: 'canceled' },
      ],
      defaultValue: 'none',
      admin: {
        position: 'sidebar',
        description: 'Statut actuel de l\'abonnement Premium',
      },
    },
    {
      name: 'subscriptionEndDate',
      label: 'Date de fin d\'abonnement',
      type: 'date',
      admin: {
        position: 'sidebar',
        description: 'Date de fin de la période d\'abonnement actuelle',
      },
    },
    {
      name: 'stripeCustomerId',
      label: 'Stripe Customer ID',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'ID du client Stripe',
        readOnly: true,
      },
    },
  ],
  timestamps: true,
};

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'admin' | 'student';
  studyYear?: 'pass' | 'las';
  onboardingComplete?: boolean;
  examDate?: Date;
  studyProfile?: {
    targetScore: number;
    studyHoursPerWeek: number;
  };
  competencyProfile?: object;
  hasTakenPlacementQuiz?: boolean;
  subscriptionStatus?: 'none' | 'trialing' | 'active' | 'past_due' | 'canceled';
  subscriptionEndDate?: Date;
  stripeCustomerId?: string;
}
