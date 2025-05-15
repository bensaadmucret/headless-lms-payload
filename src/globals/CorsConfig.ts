import { GlobalConfig, PayloadRequest, TextFieldSingleValidation } from 'payload'
import { validateUrl } from '../utilities/validateUrl'
import type { User } from '@/payload-types'

const validateHeader: TextFieldSingleValidation = (value) => {
  if (Array.isArray(value)) {
    for (const header of value) {
      const headerPattern = /^[A-Za-z0-9-]+$/
      if (!headerPattern.test(header)) {
        return 'Format d\'en-tête invalide. Utilisez uniquement des lettres, chiffres et tirets.'
      }
    }
    return true
  } else if (typeof value === 'string') {
    const headerPattern = /^[A-Za-z0-9-]+$/
    if (!headerPattern.test(value)) {
      return 'Format d\'en-tête invalide. Utilisez uniquement des lettres, chiffres et tirets.'
    }
    return true
  } else {
    return 'Valeur d\'en-tête invalide.'
  }
}

export const CorsConfig: GlobalConfig = {
  slug: 'cors-config',
  access: {
    read: ({ req: { user } }: { req: { user: User | null } }) => Boolean(user?.role === 'superadmin' || user?.role === 'admin'),
    update: ({ req: { user } }: { req: { user: User | null } }) => Boolean(user?.role === 'superadmin' || user?.role === 'admin'),
  },
  admin: {
    group: 'Système',
    description: 'Configuration des accès CORS (Cross-Origin Resource Sharing)',
  },
  fields: [
    {
      name: 'allowedOrigins',
      type: 'array',
      label: 'Origines autorisées',
      admin: {
        description: 'Liste des URLs qui peuvent accéder à l\'API',
      },
      fields: [
        {
          name: 'url',
          type: 'text',
          required: true,
          validate: validateUrl,
          admin: {
            description: 'URL complète (ex: https://monsite.com)',
          },
        },
        {
          name: 'description',
          type: 'text',
          admin: {
            description: 'Description pour identifier l\'usage',
          },
        },
        {
          name: 'isActive',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Activer/désactiver cette origine',
          },
        },
      ],
    },
    {
      name: 'customHeaders',
      type: 'array',
      label: 'En-têtes personnalisés',
      admin: {
        description: 'En-têtes HTTP supplémentaires à autoriser',
      },
      fields: [
        {
          name: 'header',
          type: 'text',
          required: true,
          validate: validateHeader,
          admin: {
            description: 'Nom de l\'en-tête (ex: x-custom-header)',
          },
        },
        {
          name: 'description',
          type: 'text',
          admin: {
            description: 'Description de l\'usage de cet en-tête',
          },
        },
      ],
    },
    {
      name: 'environment',
      type: 'select',
      required: true,
      defaultValue: 'development',
      options: [
        { label: 'Développement', value: 'development' },
        { label: 'Production', value: 'production' },
      ],
      admin: {
        description: 'Environnement actif',
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req }: { data: any; req: PayloadRequest }) => {
        // Log des modifications
        const audit = {
          user: req.user?.email || 'system',
          action: 'update',
          timestamp: new Date(),
          changes: data,
        }
        console.log('CORS Config Update:', audit)
        return data
      },
    ],
  },
}
