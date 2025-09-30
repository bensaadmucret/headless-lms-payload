# 🏗️ Architecture SaaS – Vue d'ensemble finale

## Hub Central (SvelteKit)
- **Domaine principal** : `votreplateforme.com`
- **Rôles** : Vitrine, onboarding, portail client, SuperAdmin, BFF
- **Communication** : SvelteKit ↔ Payload ↔ Stripe/Paddle

## Instances clients isolées (Next.js)
- **Sous-domaines** : `client1.votreplateforme.com`, `client2.votreplateforme.com`, ...
- **Rôle** : LMS dédié par organisation/tenant
- **Communication** : Next.js → Payload API REST (multi-tenant avec `tenant_id`)

## Backend unifié (Payload)
- **API REST/GraphQL** multi-tenant
- **Données** : PostgreSQL avec isolation par `tenant_id`
- **Sécurité** : Policies strictes par tenant

---

## 🔄 Flux utilisateur complet
1. **Découverte** : `votreplateforme.com` (SvelteKit)
2. **Souscription** : Onboarding + paiement (SvelteKit + Stripe)
3. **Provisioning** : Création tenant + déploiement Next.js
4. **Utilisation** : `clientX.votreplateforme.com` (Next.js LMS)
5. **Gestion** : Retour sur SvelteKit pour billing/settings

---

## ✅ Avantages de cette approche
- **Isolation parfaite** : Chaque client a son LMS dédié
- **Expérience unifiée** : Parcours commercial cohérent sur SvelteKit
- **Scalabilité** : Déploiement automatique d'instances Next.js
- **Monétisation** : Hub central pour upselling/cross-selling
- **Sécurité** : Séparation technique ET logique des données

## 💰 Modèle économique renforcé
Cette architecture justifie un pricing premium :
- **Sécurité entreprise** : Instance dédiée
- **Performance** : Pas de sharing des ressources
- **Personnalisation** : Branding et config par tenant
- **Compliance** : Isolation des données

---

## ⚠️ Points de vigilance
- **Provisioning automatisé** : scripts, CI/CD, gestion DNS, monitoring
- **Coût d’infrastructure** : chaque client = ressources dédiées
- **Support multi-instance** : supervision, monitoring, maintenance
- **Synchronisation des mises à jour** : rolling update, gestion des versions

---

## 🌐 Schéma visuel (Mermaid)

```mermaid
flowchart LR
    A[SvelteKit – Hub Central\n(votreplateforme.com)]
    A -- Onboarding, Billing, Admin --> B[Payload API\n(PostgreSQL, multi-tenant)]
    A -- Provisioning, Redirection --> C1[Next.js LMS\n(client1.votreplateforme.com)]
    A -- Provisioning, Redirection --> C2[Next.js LMS\n(client2.votreplateforme.com)]
    A -- Paiement --> D[Stripe/Paddle]
    C1 -- API REST/GraphQL (tenant_id) --> B
    C2 -- API REST/GraphQL (tenant_id) --> B
    B -- Webhooks, Billing Events --> A
    D -- Webhooks paiement --> A
```

> Ce fichier est une référence d’architecture globale. À adapter et enrichir selon l’évolution du projet.
