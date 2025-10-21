import { CollectionConfig } from 'payload';

const SLUG = 'subscription-plans' as const;

import { logAuditAfterChange, logAuditAfterDelete } from './logAudit';

export const SubscriptionPlans: CollectionConfig = {
  slug: SLUG,
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'description', 'price', 'isActive', 'displayOrder']
  },
  access: {
    read: () => true, // Public - Tout le monde peut lire les plans
    create: ({ req: { user } }) => user?.role === 'superadmin',
    update: ({ req: { user } }) => user?.role === 'superadmin',
    delete: ({ req: { user } }) => user?.role === 'superadmin',
  },
  hooks: {
    afterChange: [logAuditAfterChange],
    afterDelete: [logAuditAfterDelete],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Nom du plan (ex: MedCoach IA, Premium)'
      }
    },
    {
      name: 'description',
      type: 'text',
      required: true,
      admin: {
        description: 'Description courte du plan (ex: Coach IA personnel complet)'
      }
    },
    {
      name: 'price',
      type: 'group',
      label: 'Tarification',
      fields: [
        {
          name: 'monthly',
          type: 'number',
          required: true,
          label: 'Prix mensuel',
          admin: {
            description: 'Prix en euros par mois'
          }
        },
        {
          name: 'yearly',
          type: 'number',
          required: true,
          label: 'Prix annuel',
          admin: {
            description: 'Prix en euros par an'
          }
        }
      ]
    },
    {
      name: 'currency',
      type: 'text',
      defaultValue: 'EUR',
      admin: {
        description: 'Devise (EUR, USD, etc.)'
      }
    },
    {
      name: 'features',
      type: 'array',
      label: 'Fonctionnalités incluses',
      required: true,
      fields: [
        {
          name: 'feature',
          type: 'text',
          required: true,
        }
      ],
      admin: {
        description: 'Liste des fonctionnalités incluses dans ce plan'
      }
    },
    {
      name: 'limitations',
      type: 'array',
      label: 'Limitations',
      fields: [
        {
          name: 'limitation',
          type: 'text',
        }
      ],
      admin: {
        description: 'Liste des limitations de ce plan (optionnel)'
      }
    },
    {
      name: 'highlighted',
      type: 'checkbox',
      label: 'Plan recommandé',
      defaultValue: false,
      admin: {
        description: 'Afficher le badge "Recommandé" sur ce plan',
        position: 'sidebar'
      }
    },
    {
      name: 'ctaLabel',
      type: 'text',
      required: true,
      label: 'Texte du bouton',
      defaultValue: 'Commencer',
      admin: {
        description: "Texte affiché sur le bouton d'action (ex: Essai gratuit 30 jours)"
      }
    },
    {
      name: 'ctaHref',
      type: 'text',
      required: true,
      label: 'Lien du bouton',
      defaultValue: '/onboarding',
      admin: {
        description: 'URL de destination du bouton (ex: /onboarding)'
      }
    },
    {
      name: 'limits',
      type: 'group',
      label: 'Limites techniques',
      fields: [
        {
          name: 'maxUsers',
          type: 'number',
          label: "Nombre max d'utilisateurs",
        },
        {
          name: 'maxStorage',
          type: 'number',
          label: 'Stockage max (GB)',
        },
        {
          name: 'maxCourses',
          type: 'number',
          label: 'Nombre max de cours',
        }
      ],
      admin: {
        description: 'Limites techniques du plan (pour usage interne)'
      }
    },
    {
      name: 'isActive',
      type: 'checkbox',
      label: 'Actif',
      defaultValue: true,
      required: true,
      admin: {
        description: 'Afficher ce plan sur le site',
        position: 'sidebar'
      }
    },
    {
      name: 'displayOrder',
      type: 'number',
      label: "Ordre d'affichage",
      defaultValue: 0,
      admin: {
        description: "Ordre d'affichage sur la page (0 = premier)",
        position: 'sidebar'
      }
    }
  ]
};

export default SubscriptionPlans;
