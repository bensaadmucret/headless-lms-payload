# Schéma d'architecture hybride SaaS (Payload + Next.js + SvelteKit)

```mermaid
flowchart TD
    subgraph Frontend
        nextjs[Next.js Frontend<br/>(par tenant)]
    end
    subgraph SuperAdmin
        superadmin[SuperAdmin Dashboard<br/>(SvelteKit)]
    end
    subgraph BFF
        bff[SvelteKit BFF<br/>(Analytics, Admin, Agrégation)]
    end
    subgraph API
        payload[Payload CMS<br/>(API REST/GraphQL, multi-tenant)]
    end
    subgraph DB
        db[(PostgreSQL<br/>champ tenant_id)]
    end

    nextjs -- "CRUD, auth, navigation" --> payload
    nextjs -- "Analytics, admin, cross-tenant" --> bff
    superadmin -- "Pilotage, monitoring, analytics" --> bff
    bff -- "API interne sécurisée" --> payload
    payload -- "Données" --> db
```

---

## Explications

- **Next.js Frontend** :
  - Accès direct à Payload pour les opérations courantes (CRUD, login, navigation).
  - Pour l’analytics, les dashboards, ou les opérations admin, il appelle les endpoints SvelteKit (BFF).

- **SvelteKit BFF** :
  - Centralise les endpoints `/api/analytics/*`, `/api/admin/*` pour l’agrégation, la supervision, les opérations cross-tenant.
  - Fait les appels nécessaires à Payload, agrège, filtre, sécurise, puis renvoie au front ou au dashboard.

- **Payload** :
  - Gère toute la logique multi-tenant (champ `tenant_id`, policies d’accès).
  - Expose l’API REST/GraphQL à la fois au front Next.js et à SvelteKit.

- **SuperAdmin Dashboard** :
  - Utilise SvelteKit pour piloter, monitorer et analyser tous les tenants.

---

**Points clés** :
- Les endpoints critiques (analytics, admin) sont centralisés et protégés via SvelteKit.
- Les policies Payload doivent être strictes sur le `tenant_id`.
- Les opérations simples passent en direct, les opérations lourdes/complexes passent par le BFF.
