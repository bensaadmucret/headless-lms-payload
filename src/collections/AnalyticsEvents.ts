import { CollectionConfig } from "payload/types";

export const AnalyticsEvents: CollectionConfig = {
  slug: "analytics-events",
  labels: {
    singular: "Événement Analytics",
    plural: "Événements Analytics",
  },
  admin: {
    useAsTitle: "eventName",
    defaultColumns: ["eventName", "user", "timestamp", "source"],
    group: "Analytics",
    description:
      "Événements de tracking utilisateur pour l'analyse du tunnel d'acquisition",
  },
  access: {
    read: ({ req: { user } }) => {
      // Seuls les admins peuvent voir tous les événements
      if (user?.role === "admin") {
        return true;
      }
      // Les utilisateurs peuvent voir leurs propres événements
      return {
        user: {
          equals: user?.id,
        },
      };
    },
    create: () => true, // Autoriser la création d'événements pour le tracking
    update: ({ req: { user } }) => {
      // Seuls les admins peuvent mettre à jour
      return user?.role === "admin";
    },
    delete: ({ req: { user } }) => {
      // Seuls les admins peuvent supprimer
      return user?.role === "admin";
    },
  },
  fields: [
    {
      name: "eventName",
      type: "text",
      required: true,
      label: "Nom de l'événement",
      admin: {
        description:
          "Ex: homepage_view, subscription_started, payment_completed",
      },
    },
    {
      name: "user",
      type: "relationship",
      relationTo: "users",
      label: "Utilisateur",
      admin: {
        description:
          "Utilisateur associé à l'événement (laisser vide pour les visiteurs anonymes)",
      },
    },
    {
      name: "sessionId",
      type: "text",
      label: "ID de Session",
      admin: {
        description: "Identifiant de session pour regrouper les événements",
      },
    },
    {
      name: "properties",
      type: "json",
      label: "Propriétés",
      admin: {
        description: "Données supplémentaires de l'événement (JSON)",
      },
    },
    {
      name: "source",
      type: "select",
      options: [
        { label: "Site Web", value: "website" },
        { label: "Application Mobile", value: "mobile" },
        { label: "API", value: "api" },
        { label: "Admin", value: "admin" },
        { label: "Autre", value: "other" },
      ],
      defaultValue: "website",
      label: "Source",
    },
    {
      name: "timestamp",
      type: "date",
      required: true,
      label: "Horodatage",
      defaultValue: () => new Date().toISOString(),
      admin: {
        date: {
          pickerAppearance: "dayAndTime",
          displayFormat: "d MMM yyy HH:mm",
        },
      },
    },
    {
      name: "url",
      type: "text",
      label: "URL",
      admin: {
        description: "URL de la page où l'événement s'est produit",
      },
    },
    {
      name: "userAgent",
      type: "text",
      label: "User Agent",
      admin: {
        description: "Informations sur le navigateur/appareil",
      },
    },
    {
      name: "ipAddress",
      type: "text",
      label: "Adresse IP",
      access: {
        read: ({ req: { user } }) => {
          // L'IP est sensible, seuls les admins peuvent la voir
          return user?.role === "admin";
        },
      },
    },
    {
      name: "referrer",
      type: "text",
      label: "Referrer",
      admin: {
        description: "Page référente",
      },
    },
    {
      name: "campaign",
      type: "group",
      label: "Campagne Marketing",
      fields: [
        {
          name: "utm_source",
          type: "text",
          label: "Source UTM",
        },
        {
          name: "utm_medium",
          type: "text",
          label: "Medium UTM",
        },
        {
          name: "utm_campaign",
          type: "text",
          label: "Campagne UTM",
        },
        {
          name: "utm_content",
          type: "text",
          label: "Contenu UTM",
        },
        {
          name: "utm_term",
          type: "text",
          label: "Terme UTM",
        },
      ],
    },
    {
      name: "device",
      type: "group",
      label: "Informations Appareil",
      fields: [
        {
          name: "type",
          type: "select",
          options: [
            { label: "Desktop", value: "desktop" },
            { label: "Mobile", value: "mobile" },
            { label: "Tablet", value: "tablet" },
            { label: "Autre", value: "other" },
          ],
          label: "Type d'appareil",
        },
        {
          name: "os",
          type: "text",
          label: "Système d'exploitation",
        },
        {
          name: "browser",
          type: "text",
          label: "Navigateur",
        },
        {
          name: "screenResolution",
          type: "text",
          label: "Résolution d'écran",
        },
      ],
    },
    {
      name: "funnel",
      type: "group",
      label: "Informations du Tunnel",
      fields: [
        {
          name: "step",
          type: "number",
          label: "Étape du tunnel",
          admin: {
            description: "Numéro d'étape dans le tunnel d'acquisition",
          },
        },
        {
          name: "funnelName",
          type: "text",
          label: "Nom du tunnel",
          admin: {
            description: "Ex: subscription, onboarding, checkout",
          },
        },
        {
          name: "conversionValue",
          type: "number",
          label: "Valeur de conversion",
          admin: {
            description: "Valeur monétaire de l'événement (en euros)",
          },
        },
      ],
    },
    {
      name: "performance",
      type: "group",
      label: "Métriques de Performance",
      fields: [
        {
          name: "pageLoadTime",
          type: "number",
          label: "Temps de chargement (ms)",
        },
        {
          name: "coreWebVitals",
          type: "json",
          label: "Core Web Vitals",
          admin: {
            description: "LCP, FID, CLS scores (JSON)",
          },
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, req }) => {
        // Enrichir les données avec des informations côté serveur
        if (!data.timestamp) {
          data.timestamp = new Date().toISOString();
        }

        // Ajouter l'IP du client (pour les admins)
        if (req.headers["x-forwarded-for"]) {
          data.ipAddress = req.headers["x-forwarded-for"].split(",")[0].trim();
        } else if (req.socket?.remoteAddress) {
          data.ipAddress = req.socket.remoteAddress;
        }

        // Ajouter le user agent
        if (req.headers["user-agent"]) {
          data.userAgent = req.headers["user-agent"];
        }

        return data;
      },
    ],
  },
  indexes: [
    {
      fields: ["eventName", "timestamp"],
    },
    {
      fields: ["user", "timestamp"],
    },
    {
      fields: ["sessionId", "timestamp"],
    },
    {
      fields: ["campaign.utm_source", "campaign.utm_campaign"],
    },
  ],
};

export default AnalyticsEvents;
