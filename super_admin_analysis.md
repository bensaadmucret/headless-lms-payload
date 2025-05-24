# Analyse Super Admin - Besoins Métiers et Schémas

## 1. Besoins Métiers du Super Admin

### A. Vue d'ensemble (Dashboard principal)
- **Métriques globales temps réel**
  - Nombre total de tenants actifs/inactifs/suspendus
  - Nombre total d'utilisateurs (par rôle, par tenant)
  - Revenue mensuel récurrent (MRR) total et par tenant
  - Utilisation des ressources (stockage, bande passante, API calls)
  - Taux de croissance (nouveaux tenants, nouveaux utilisateurs)

- **Alertes et notifications**
  - Dépassements de quotas
  - Incidents techniques
  - Paiements en retard
  - Activité suspecte

### B. Gestion des Tenants/Organisations
- **CRUD complet des tenants**
  - Créer, modifier, supprimer, suspendre un tenant
  - Gérer les plans et tarifications
  - Configurer les quotas et limites
  - Personnalisation (branding, domaines)

- **Monitoring par tenant**
  - Utilisation des ressources
  - Activité des utilisateurs
  - Performance des cours/quiz
  - Statistiques de facturation

### C. Gestion des Utilisateurs Globale
- **Vue transversale**
  - Recherche d'utilisateurs across tous les tenants
  - Gestion des rôles système (superadmin, admin tenant)
  - Support utilisateur (impersonation, reset password)
  - Détection d'activités suspectes

### D. Monitoring Technique
- **Logs et audit**
  - Logs système centralisés
  - Audit trail des actions sensibles
  - Monitoring des performances
  - Gestion des erreurs

- **Analytics et reporting**
  - Rapports d'utilisation
  - Statistiques de performance
  - Export de données
  - Tableaux de bord personnalisés

### E. Administration Système
- **Configuration globale**
  - Paramètres système
  - Gestion des templates
  - Configuration des intégrations
  - Maintenance planifiée

## 2. Schémas de Collections Payload

### Collection Tenants
```typescript
export const Tenants: CollectionConfig = {
  slug: 'tenants',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'plan', 'status', 'createdAt']
  },
  access: {
    read: ({ req: { user } }) => user?.role === 'superadmin',
    create: ({ req: { user } }) => user?.role === 'superadmin',
    update: ({ req: { user } }) => user?.role === 'superadmin',
    delete: ({ req: { user } }) => user?.role === 'superadmin'
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL slug for the tenant'
      }
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Trial', value: 'trial' }
      ]
    },
    {
      name: 'plan',
      type: 'relationship',
      relationTo: 'subscription-plans',
      required: true
    },
    {
      name: 'contact',
      type: 'group',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true
        },
        {
          name: 'email',
          type: 'email',
          required: true
        },
        {
          name: 'phone',
          type: 'text'
        }
      ]
    },
    {
      name: 'billing',
      type: 'group',
      fields: [
        {
          name: 'address',
          type: 'textarea'
        },
        {
          name: 'vatNumber',
          type: 'text'
        },
        {
          name: 'billingEmail',
          type: 'email'
        }
      ]
    },
    {
      name: 'quotas',
      type: 'group',
      fields: [
        {
          name: 'maxUsers',
          type: 'number',
          defaultValue: 100
        },
        {
          name: 'maxStorage',
          type: 'number',
          admin: {
            description: 'Storage limit in GB'
          },
          defaultValue: 10
        },
        {
          name: 'maxCourses',
          type: 'number',
          defaultValue: 50
        },
        {
          name: 'apiCallsPerMonth',
          type: 'number',
          defaultValue: 10000
        }
      ]
    },
    {
      name: 'branding',
      type: 'group',
      fields: [
        {
          name: 'logo',
          type: 'upload',
          relationTo: 'media'
        },
        {
          name: 'primaryColor',
          type: 'text',
          admin: {
            description: 'Hex color code'
          }
        },
        {
          name: 'customDomain',
          type: 'text'
        }
      ]
    },
    {
      name: 'settings',
      type: 'group',
      fields: [
        {
          name: 'features',
          type: 'checkbox',
          options: [
            { label: 'Advanced Analytics', value: 'analytics' },
            { label: 'Custom Branding', value: 'branding' },
            { label: 'API Access', value: 'api' },
            { label: 'SSO Integration', value: 'sso' }
          ]
        },
        {
          name: 'timezone',
          type: 'text',
          defaultValue: 'UTC'
        },
        {
          name: 'language',
          type: 'text',
          defaultValue: 'en'
        }
      ]
    },
    {
      name: 'metrics',
      type: 'group',
      admin: {
        readOnly: true,
        description: 'Auto-calculated metrics'
      },
      fields: [
        {
          name: 'totalUsers',
          type: 'number',
          defaultValue: 0
        },
        {
          name: 'activeUsers',
          type: 'number',
          defaultValue: 0
        },
        {
          name: 'storageUsed',
          type: 'number',
          defaultValue: 0
        },
        {
          name: 'lastActivity',
          type: 'date'
        }
      ]
    }
  ],
  hooks: {
    afterChange: [
      // Hook pour mettre à jour les métriques
      // Hook pour audit log
    ]
  }
}
```

### Collection Subscription Plans
```typescript
export const SubscriptionPlans: CollectionConfig = {
  slug: 'subscription-plans',
  admin: {
    useAsTitle: 'name'
  },
  access: {
    read: ({ req: { user } }) => user?.role === 'superadmin',
    create: ({ req: { user } }) => user?.role === 'superadmin',
    update: ({ req: { user } }) => user?.role === 'superadmin',
    delete: ({ req: { user } }) => user?.role === 'superadmin'
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true
    },
    {
      name: 'price',
      type: 'number',
      required: true
    },
    {
      name: 'currency',
      type: 'text',
      defaultValue: 'EUR'
    },
    {
      name: 'billingPeriod',
      type: 'select',
      options: [
        { label: 'Monthly', value: 'monthly' },
        { label: 'Yearly', value: 'yearly' }
      ]
    },
    {
      name: 'features',
      type: 'array',
      fields: [
        {
          name: 'feature',
          type: 'text'
        }
      ]
    },
    {
      name: 'limits',
      type: 'group',
      fields: [
        {
          name: 'maxUsers',
          type: 'number'
        },
        {
          name: 'maxStorage',
          type: 'number'
        },
        {
          name: 'maxCourses',
          type: 'number'
        }
      ]
    }
  ]
}
```

### Collection System Metrics
```typescript
export const SystemMetrics: CollectionConfig = {
  slug: 'system-metrics',
  admin: {
    useAsTitle: 'timestamp'
  },
  access: {
    read: ({ req: { user } }) => user?.role === 'superadmin',
    create: ({ req: { user } }) => user?.role === 'superadmin'
  },
  fields: [
    {
      name: 'timestamp',
      type: 'date',
      required: true,
      defaultValue: () => new Date()
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants'
    },
    {
      name: 'metrics',
      type: 'group',
      fields: [
        {
          name: 'activeUsers',
          type: 'number'
        },
        {
          name: 'newUsers',
          type: 'number'
        },
        {
          name: 'storageUsed',
          type: 'number'
        },
        {
          name: 'apiCalls',
          type: 'number'
        },
        {
          name: 'revenue',
          type: 'number'
        }
      ]
    }
  ]
}
```

## 3. Endpoints API Nécessaires

### A. Endpoints Tenants
```
GET    /api/tenants                 # Liste paginée des tenants
POST   /api/tenants                 # Créer un tenant
GET    /api/tenants/:id             # Détails d'un tenant
PUT    /api/tenants/:id             # Modifier un tenant
DELETE /api/tenants/:id             # Supprimer un tenant
POST   /api/tenants/:id/suspend     # Suspendre un tenant
POST   /api/tenants/:id/activate    # Activer un tenant
```

### B. Endpoints Analytics
```
GET /api/analytics/overview          # Métriques globales
GET /api/analytics/tenants/:id       # Métriques par tenant
GET /api/analytics/revenue           # Données de revenus
GET /api/analytics/usage             # Utilisation des ressources
GET /api/analytics/growth            # Données de croissance
```

### C. Endpoints Administration
```
GET /api/admin/users                 # Recherche d'utilisateurs cross-tenant
GET /api/admin/logs                  # Logs système
GET /api/admin/alerts                # Alertes actives
POST /api/admin/maintenance          # Mode maintenance
```

## 4. Hooks et Automatisations

### A. Hooks de calcul automatique
- **afterChange sur Users** : Mettre à jour les compteurs de tenants
- **afterChange sur Media** : Calculer l'utilisation du stockage
- **afterChange sur Tenants** : Audit log des modifications

### B. Tâches planifiées (CRON)
- Calcul quotidien des métriques
- Nettoyage des logs anciens
- Vérification des quotas
- Génération des rapports

## 5. Sécurité et Validation

### A. Contrôles d'accès
- Tous les endpoints sensibles vérifiés avec le rôle `superadmin`
- Isolation des données par tenant pour les autres rôles
- Rate limiting sur les API publiques

### B. Validation des données
- Validation des quotas lors de la création/modification
- Vérification de l'unicité des slugs tenants
- Validation des formats (email, téléphone, couleurs)

Cette structure vous donne une base solide pour commencer. Voulez-vous que je détaille un aspect particulier ou que je crée les endpoints custom pour certaines fonctionnalités ?