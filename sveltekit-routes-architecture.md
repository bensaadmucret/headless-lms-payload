# Architecture des routes SvelteKit

Cette arborescence décrit l’organisation des routes pour le SaaS : vitrine publique, portail utilisateur, dashboard superadmin, endpoints BFF, etc.

```mermaid
flowchart TD
    layoutGlobal["+layout.svelte (global)"]
    layoutGlobal --> landing["+page.svelte (Landing page)"]
    layoutGlobal --> pricing["pricing/+page.svelte (Tarifs)"]
    layoutGlobal --> docs["docs/ (Documentation)"]
    layoutGlobal --> auth["auth/ (Login/Register)"]
    layoutGlobal --> dashboard["dashboard/"]
    dashboard --> dashboardLayout["+layout.svelte (user)"]
    dashboardLayout --> dashboardHome["+page.svelte (Vue d'ensemble user)"]
    dashboardLayout --> dashboardSub["subscription/ (Abonnement)"]
    dashboardLayout --> dashboardSettings["settings/ (Paramètres compte)"]
    layoutGlobal --> superadmin["superadmin/"]
    superadmin --> superadminServer["+layout.server.js (Protection RBAC)"]
    superadminServer --> superadminLayout["+layout.svelte (admin)"]
    superadminLayout --> superadminHome["+page.svelte (Vue globale)"]
    superadminLayout --> superadminTenants["tenants/ (Gestion clients)"]
    superadminLayout --> superadminAnalytics["analytics/ (Métriques)"]
    superadminLayout --> superadminBilling["billing/ (Facturation)"]
    superadminLayout --> superadminLogs["logs/ (Monitoring)"]
    layoutGlobal --> api["api/"]
    api --> apiAuth["auth/ (API Auth)"]
    api --> apiTenants["tenants/ (API Tenants)"]
    api --> apiAnalytics["analytics/ (API Analytics)"]
    api --> apiWebhooks["webhooks/ (Stripe/Paddle)"]
    api --> apiPayload["payload/ (Proxy Payload)"]
```

> Copie-colle ce bloc Mermaid dans Notion ou un éditeur compatible pour obtenir une vue arborescente visuelle.

## Bonnes pratiques

- **Séparation claire** entre espace public, utilisateur et superadmin.
- **Protection server-side** dans `superadmin/+layout.server.js` (RBAC).
- **Endpoints BFF** dans `/api/` pour centraliser l’orchestration avec Payload et Stripe.
- **Extensibilité** : chaque dossier peut être enrichi avec des sous-routes ou des composants spécifiques.

---

> Ce fichier sert de référence d’architecture et doit être mis à jour à chaque évolution majeure des routes ou des accès.
