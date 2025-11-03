import { CollectionConfig } from "payload";

export const AnalyticsSessions: CollectionConfig = {
  slug: "analytics-sessions",
  labels: {
    singular: "Session Analytics",
    plural: "Sessions Analytics",
  },
  admin: {
    useAsTitle: "sessionId",
    defaultColumns: ["sessionId", "user", "startTime", "endTime", "eventCount"],
    group: "Analytics",
    description: "Sessions utilisateur pour regrouper les événements analytics",
  },
  access: {
    read: ({ req: { user } }) => {
      if (user?.role === "admin") {
        return true;
      }
      return {
        user: {
          equals: user?.id,
        },
      };
    },
    create: () => true,
    update: ({ req: { user } }) => {
      return user?.role === "admin";
    },
    delete: ({ req: { user } }) => {
      return user?.role === "admin";
    },
  },
  fields: [
    {
      name: "sessionId",
      type: "text",
      required: true,
      unique: true,
      label: "ID de Session",
      admin: {
        description: "Identifiant unique de session (généré côté client)",
      },
    },
    {
      name: "user",
      type: "relationship",
      relationTo: "users",
      label: "Utilisateur",
    },
    {
      name: "startTime",
      type: "date",
      required: true,
      label: "Début de Session",
      defaultValue: () => new Date().toISOString(),
    },
    {
      name: "endTime",
      type: "date",
      label: "Fin de Session",
      admin: {
        description: "Laisser vide pour les sessions actives",
      },
    },
    {
      name: "eventCount",
      type: "number",
      defaultValue: 0,
      label: "Nombre d'Événements",
    },
    {
      name: "pageViews",
      type: "number",
      defaultValue: 0,
      label: "Pages Vues",
    },
    {
      name: "duration",
      type: "number",
      label: "Durée (secondes)",
      admin: {
        description: "Durée totale de la session",
      },
    },
    {
      name: "deviceInfo",
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
          ],
          label: "Type",
        },
        {
          name: "os",
          type: "text",
          label: "OS",
        },
        {
          name: "browser",
          type: "text",
          label: "Navigateur",
        },
      ],
    },
    {
      name: "location",
      type: "group",
      label: "Localisation",
      fields: [
        {
          name: "country",
          type: "text",
          label: "Pays",
        },
        {
          name: "city",
          type: "text",
          label: "Ville",
        },
        {
          name: "region",
          type: "text",
          label: "Région",
        },
      ],
    },
    {
      name: "referrer",
      type: "text",
      label: "Referrer",
    },
    {
      name: "landingPage",
      type: "text",
      label: "Page d'atterrissage",
    },
    {
      name: "exitPage",
      type: "text",
      label: "Page de sortie",
    },
    {
      name: "conversionGoals",
      type: "array",
      label: "Objectifs de Conversion",
      fields: [
        {
          name: "goal",
          type: "text",
          label: "Objectif",
        },
        {
          name: "achieved",
          type: "checkbox",
          label: "Atteint",
        },
        {
          name: "value",
          type: "number",
          label: "Valeur",
        },
      ],
    },
    {
      name: "customProperties",
      type: "json",
      label: "Propriétés Personnalisées",
    },
  ],
  hooks: {
    afterRead: [
      async ({ doc, req }) => {
        if (!doc.sessionId) {
          return doc;
        }

        // Compter les événements associés
        const events = await req.payload.find({
          collection: "analytics-events",
          where: {
            sessionId: {
              equals: doc.sessionId,
            },
          },
        });

        // Mettre à jour le compte d'événements
        doc.eventCount = events.totalDocs;

        // Calculer la durée si la session est terminée
        if (doc.startTime && doc.endTime) {
          const duration =
            new Date(doc.endTime).getTime() - new Date(doc.startTime).getTime();
          doc.duration = Math.round(duration / 1000); // Convertir en secondes
        }

        return doc;
      },
    ],
  },
};

export default AnalyticsSessions;
