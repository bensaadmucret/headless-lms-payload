import { getPayload } from 'payload';

import type { ProspectStatus } from '../../collections/Prospects';
import type { Prospect } from '../../payload-types';

import config from '../../payload.config';

const ALLOWED_FIELDS = [
  'email',
  'firstName',
  'lastName',
  'billingCycle',
  'selectedPrice',
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'metadata',
] as const;

type ProspectRequestBody = Partial<Record<(typeof ALLOWED_FIELDS)[number], unknown>> & {
  status?: ProspectStatus;
};

const PROSPECTS_COLLECTION = 'prospects' as const;

const sanitizeData = (body: ProspectRequestBody) => {
  const data: Record<string, unknown> = {};

  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) {
      data[key] = body[key];
    }
  }

  if (typeof data.email === 'string') {
    data.email = data.email.trim().toLowerCase();
  }

  if (typeof data.billingCycle === 'string' && !['monthly', 'yearly'].includes(data.billingCycle)) {
    delete data.billingCycle;
  }

  if (typeof data.selectedPrice === 'string') {
    const parsed = Number.parseFloat(data.selectedPrice);
    data.selectedPrice = Number.isFinite(parsed) ? parsed : undefined;
  }

  return data;
};

export const createProspectEndpoint = {
  path: '/prospects',
  method: 'post',
  handler: async (req: any, res: any) => {
    try {
      const body = (req.body ?? {}) as ProspectRequestBody;
      const sanitized = sanitizeData(body);

      if (typeof sanitized.email !== 'string' || sanitized.email.length === 0) {
        return res.status(400).json({ error: 'Adresse e-mail requise.' });
      }

      const payload = await getPayload({ config });

      const existing = await payload.find<Prospect, Prospect>({
        collection: PROSPECTS_COLLECTION,
        where: {
          email: {
            equals: sanitized.email,
          },
        },
        limit: 1,
      });

      const now = new Date().toISOString();

      if (existing.docs.length > 0) {
        const prospect = existing.docs[0];

        if (!prospect) {
          return res.status(500).json({ error: 'Prospect introuvable.' });
        }

        const hasStatusUpdate = typeof body.status === 'string' && body.status.length > 0;
        const result = await payload.update<Prospect, Prospect>({
          collection: PROSPECTS_COLLECTION,
          id: prospect.id,
          data: {
            ...sanitized,
            ...(hasStatusUpdate
              ? { lastPaymentAttemptAt: now }
              : { lastPaymentAttemptAt: prospect.lastPaymentAttemptAt ?? null }),
          },
        });

        return res.status(200).json({
          prospect: result,
          created: false,
        });
      }

      const result = await payload.create<Prospect, Prospect>({
        collection: PROSPECTS_COLLECTION,
        data: {
          ...sanitized,
          status: 'pending',
        },
      });

      return res.status(201).json({
        prospect: result,
        created: true,
      });
    } catch (error) {
      console.error('[Prospects] createProspect failed', error);
      return res.status(500).json({ error: "Impossible d'enregistrer le prospect." });
    }
  },
};
