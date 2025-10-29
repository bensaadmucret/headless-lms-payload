import React from 'react';
import AnalyticsBusinessDashboard from './AnalyticsBusinessDashboard';
import UserAnalyticsDetail from './UserAnalyticsDetail';

// Configuration des vues analytics personnalisées pour Payload CMS
export const analyticsViews = [
  {
    // Vue principale : Dashboard Business
    path: '/analytics-business',
    label: 'Analytics Business',
    group: 'Analytics',
    Component: () => <AnalyticsBusinessDashboard />,
    permissions: ['superadmin', 'admin'], // Seuls les admins peuvent voir
  },
  {
    // Vue détaillée par utilisateur
    path: '/analytics-users/:userId',
    label: 'Analytics Utilisateur',
    group: 'Analytics',
    Component: ({ match }: any) => <UserAnalyticsDetail userId={match.params.userId} />,
    permissions: ['superadmin', 'admin'],
  },
  {
    // Vue résumé rapide (widget)
    path: '/analytics-summary',
    label: 'Résumé Analytics',
    group: 'Analytics',
    Component: () => (
      <div className="analytics-summary-widget">
        <AnalyticsBusinessDashboard className="compact" />
      </div>
    ),
    permissions: ['superadmin', 'admin', 'editor'], // Plus de monde peut voir le résumé
  },
];

// Helper pour enregistrer les vues dans Payload
export const registerAnalyticsViews = (config: any) => {
  return {
    ...config,
    admin: {
      ...config.admin,
      components: {
        ...config.admin.components,
        views: {
          ...config.admin.components.views,
          ...analyticsViews.reduce((acc, view) => {
            acc[view.path] = {
              Component: view.Component,
              label: view.label,
              group: view.group,
              permissions: view.permissions,
            };
            return acc;
          }, {} as any),
        },
      },
    },
  };
};

// Export des composants individuels
export { AnalyticsBusinessDashboard, UserAnalyticsDetail };
