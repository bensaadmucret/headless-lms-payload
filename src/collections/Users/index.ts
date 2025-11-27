import type { CollectionConfig, FieldAccess, Validate, PayloadRequest } from 'payload'
import { generatePayloadCookie, headersWithCors } from 'payload'


import type { User as PayloadUser } from '../../payload-types'

import { authenticated } from '../../access/authenticated'
import { logAuditAfterChange, logAuditAfterDelete } from '../logAudit'
import { EmailNotificationService } from '../../services/EmailNotificationService'

const MAX_LOGIN_ATTEMPTS = 5
const LOCK_TIME_MINUTES = 10

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
  auth: {
    tokenExpiration: 7200,
    useAPIKey: true, // 2 heures en secondes
    maxLoginAttempts: MAX_LOGIN_ATTEMPTS,
    lockTime: LOCK_TIME_MINUTES * 60 * 1000,
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
      async ({ doc, previousDoc, req, operation }) => {
        try {
          if (operation !== 'update') return

          const newAttempts = (doc as any)?.loginAttempts ?? 0
          const prevAttempts = (previousDoc as any)?.loginAttempts ?? 0

          if (prevAttempts < MAX_LOGIN_ATTEMPTS && newAttempts >= MAX_LOGIN_ATTEMPTS) {
            await EmailNotificationService.sendAccountLockedEmail(
              req,
              doc as any,
              LOCK_TIME_MINUTES,
            )
          }
        } catch (e) {
          console.error("Erreur lors de l'envoi de l'email de verrouillage de compte :", e)
        }
      },
      // logAuditAfterChange,
    ],
    afterDelete: [logAuditAfterDelete],
  },
  endpoints: [
    {
      path: '/login-with-clear-errors',
      method: 'post',
      handler: async (req: PayloadRequest): Promise<Response> => {
        if (typeof req.json !== 'function') {
          return new Response(JSON.stringify({
            message: 'Bad Request'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        try {
          const body = await req.json();
          const { email, password } = body as { email?: string; password?: string };

          if (!email || !password) {
            return new Response(JSON.stringify({
              message: 'Email et mot de passe requis.'
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          // Attempt login using Payload's built-in method
          const result = await req.payload.login({
            collection: 'users',
            data: { email, password },
          });

          // Récupérer la configuration d'auth de la collection users
          const usersCollection = req.payload.config.collections.find((collection) => collection.slug === 'users');

          if (!usersCollection || !usersCollection.auth) {
            throw new Error('Users collection auth configuration not found');
          }

          // Générer le cookie d'authentification Payload (HTTP-only)
          const authCookie = generatePayloadCookie({
            collectionAuthConfig: usersCollection.auth,
            cookiePrefix: req.payload.config.cookiePrefix,
            token: result.token,
          });

          // Appliquer les headers CORS configurés par Payload et ajouter le Set-Cookie
          const headers = headersWithCors({
            headers: new Headers({
              'Set-Cookie': authCookie,
              'Content-Type': 'application/json',
            }),
            req,
          });

          // Success - return user data + laisser le cookie gérer la session côté navigateur
          return new Response(JSON.stringify({
            user: result.user,
            token: result.token,
            exp: result.exp,
          }), {
            status: 200,
            headers,
          });

        } catch (error: any) {
          // Handle specific error types
          if (error.name === 'LockedAuth') {
            return new Response(JSON.stringify({
              message: `Votre compte a été verrouillé suite à ${MAX_LOGIN_ATTEMPTS} tentatives de connexion échouées. Un email vous a été envoyé avec les instructions pour le débloquer. Veuillez réessayer dans ${LOCK_TIME_MINUTES} minutes.`,
              errorType: 'ACCOUNT_LOCKED',
              lockTimeMinutes: LOCK_TIME_MINUTES,
            }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          // Handle invalid credentials
          if (error.message?.includes('email or password') || error.message?.includes('credentials')) {
            return new Response(JSON.stringify({
              message: 'Email ou mot de passe incorrect.',
              errorType: 'INVALID_CREDENTIALS',
            }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          // Generic error
          console.error('Login error:', error);
          return new Response(JSON.stringify({
            message: 'Une erreur est survenue lors de la connexion.',
            errorType: 'UNKNOWN_ERROR',
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      },
    },
    {
      path: '/generate-password-reset-token',
      method: 'post',
      handler: async (req: PayloadRequest): Promise<Response> => {
        if (!req.user) {
          return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
        }

        if (typeof req.json !== 'function') {
          return new Response(JSON.stringify({ message: 'Bad Request' }), { status: 400 });
        }

        const body = await req.json();
        const { currentPassword } = body as { currentPassword?: string };

        if (!currentPassword) {
          return new Response(JSON.stringify({ message: 'Veuillez fournir le mot de passe actuel.' }), { status: 400 });
        }

        try {
          // 1. Vérifier le mot de passe actuel
          await req.payload.login({
            collection: 'users',
            data: { email: req.user.email, password: currentPassword },
            req,
          });

          // 2. Générer un token de réinitialisation sans envoyer d'email
          const token = await req.payload.forgotPassword({
            collection: 'users',
            data: { email: req.user.email },
            disableEmail: true,
            req,
          });

          if (!token) {
            return new Response(JSON.stringify({ message: 'Erreur lors de la génération du token.' }), { status: 500 });
          }

          return new Response(JSON.stringify({ token }), { status: 200 });
        } catch (error) {
          return new Response(JSON.stringify({ message: 'Le mot de passe actuel est incorrect.' }), { status: 401 });
        }
      },
    },
    {
      path: '/reset-password-with-token',
      method: 'post',
      handler: async (req: PayloadRequest): Promise<Response> => {
        if (!req.user) {
          return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
        }

        if (typeof req.json !== 'function') {
          return new Response(JSON.stringify({ message: 'Bad Request' }), { status: 400 });
        }

        const body = await req.json();
        const { token, password: newPassword } = body as { token?: string; password?: string };

        if (!token || !newPassword) {
          return new Response(JSON.stringify({ message: 'Token et nouveau mot de passe requis.' }), { status: 400 });
        }

        try {

          const result = await req.payload.resetPassword({
            collection: 'users',
            data: { token, password: newPassword },
            req,
            overrideAccess: false,
          });

          if (!result) {
            return new Response(JSON.stringify({ message: 'Erreur lors de la réinitialisation du mot de passe.' }), { status: 500 });
          }

          return new Response(JSON.stringify({ message: 'Mot de passe changé avec succès.' }), { status: 200 });
        } catch (error) {
          return new Response(JSON.stringify({ message: 'Le token est invalide ou a expiré.' }), { status: 400 });
        }
      },
    },
    {
      path: '/request-password-reset',
      method: 'post',
      handler: async (req: PayloadRequest): Promise<Response> => {
        if (typeof req.json !== 'function') {
          return new Response(JSON.stringify({ message: 'Bad Request' }), { status: 400 });
        }

        let email: string | undefined
        try {
          const body = await req.json()
          email = (body as { email?: string }).email?.trim().toLowerCase()
        } catch {
          return new Response(JSON.stringify({ message: 'Bad Request' }), { status: 400 });
        }

        if (!email) {
          return new Response(JSON.stringify({ message: 'Veuillez fournir une adresse e-mail.' }), { status: 400 });
        }

        const genericMessage = 'Si un compte existe pour cet e-mail, un lien de réinitialisation a été envoyé.'

        try {
          const token = await req.payload.forgotPassword({
            collection: 'users',
            data: { email },
            disableEmail: true,
            req,
          });

          if (!token) {
            return new Response(JSON.stringify({ message: genericMessage }), { status: 200 });
          }

          const result = await req.payload.find({
            collection: 'users',
            where: {
              email: { equals: email },
            },
            limit: 1,
            pagination: false,
          });

          const user = (result.docs?.[0] ?? null) as any

          if (user) {
            await EmailNotificationService.sendPasswordResetEmail(req, user, token);
          }

          return new Response(JSON.stringify({ message: genericMessage }), { status: 200 });
        } catch (error) {
          console.error('Erreur lors de la demande de réinitialisation de mot de passe :', error);
          return new Response(JSON.stringify({ message: genericMessage }), { status: 200 });
        }
      },
    },
  ],
  fields: [

    { name: 'firstName', label: 'Prénom', type: 'text', required: true },
    { name: 'lastName', label: 'Nom', type: 'text', required: true },
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
      name: 'role',
      label: 'Rôle',
      type: 'select',
      required: true,
      options: [
        { label: 'Super Admin', value: 'superadmin' },
        { label: 'Admin', value: 'admin' },
        { label: 'Étudiant', value: 'student' },
      ],
      admin: { position: 'sidebar' },
      access: {
        update: (({ req }) => req.user?.role === 'superadmin' || req.user?.role === 'admin') as FieldAccess,
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
        condition: (data: Partial<PayloadUser>) => data.role === 'student',
      },
    },
    {
      name: 'subscriptionEndDate',
      label: 'Date de fin d\'abonnement',
      type: 'date',
      admin: {
        position: 'sidebar',
        description: 'Date de fin de la période d\'abonnement actuelle',
        condition: (data: Partial<PayloadUser>) => data.role === 'student',
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
        condition: (data: Partial<PayloadUser>) => data.role === 'student',
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
  role: 'superadmin' | 'admin' | 'student';
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
