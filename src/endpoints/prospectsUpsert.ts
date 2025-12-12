import type { Endpoint, PayloadRequest } from 'payload';

interface UpsertProspectRequestBody {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  billingCycle?: 'monthly' | 'yearly';
  selectedPrice?: number;
}

export const prospectsUpsertEndpoint: Endpoint = {
  path: '/prospect-upsert',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    try {
      const body = await (req as any).json() as UpsertProspectRequestBody | null;

      const email = body?.email?.trim();
      const firstName = body?.firstName?.trim();
      const lastName = body?.lastName?.trim();
      const role = body?.role ?? 'student';
      const billingCycle = body?.billingCycle;
      const selectedPrice = body?.selectedPrice;

      if (!email || !firstName || !lastName) {
        return Response.json(
          {
            error: 'Bad Request',
            message: "Les champs email, firstName et lastName sont requis",
          },
          { status: 400 },
        );
      }

      // Rechercher un prospect existant par email (cast pour collection custom)
      const existing = await (req.payload as any).find({
        collection: 'prospects',
        where: {
          email: {
            equals: email,
          },
        },
        limit: 1,
      });

      let created = false;
      let code: 'prospect_created' | 'prospect_updated';
      let prospectDoc: any;

      const baseData: Record<string, unknown> = {
        email,
        firstName,
        lastName,
        role,
      };

      if (billingCycle === 'monthly' || billingCycle === 'yearly') {
        baseData.billingCycle = billingCycle;
      }

      if (typeof selectedPrice === 'number' && !Number.isNaN(selectedPrice)) {
        baseData.selectedPrice = selectedPrice;
      }

      if (existing.docs.length > 0) {
        const existingDoc = existing.docs[0] as any;

        prospectDoc = await (req.payload as any).update({
          collection: 'prospects',
          id: existingDoc.id,
          data: baseData,
        });

        code = 'prospect_updated';
      } else {
        prospectDoc = await (req.payload as any).create({
          collection: 'prospects',
          data: {
            ...baseData,
            status: 'pending',
          },
        });

        created = true;
        code = 'prospect_created';
      }

      return Response.json({
        prospect: {
          id: String(prospectDoc.id),
          email: prospectDoc.email,
          firstName: prospectDoc.firstName,
          lastName: prospectDoc.lastName,
          billingCycle: prospectDoc.billingCycle ?? null,
          selectedPrice:
            typeof prospectDoc.selectedPrice === 'number'
              ? prospectDoc.selectedPrice
              : null,
        },
        created,
        code,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur lors de l'enregistrement du prospect";

      req.payload.logger?.error?.('[ProspectsUpsert] Failed to upsert prospect', {
        error: message,
      });

      return Response.json(
        {
          error: "Erreur lors de l'enregistrement du prospect",
          message,
        },
        { status: 500 },
      );
    }
  },
};
