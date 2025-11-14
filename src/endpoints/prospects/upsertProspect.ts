import type { Payload, PayloadRequest } from "payload";

import type { ProspectStatus } from "../../collections/Prospects";
import type { Prospect } from "../../payload-types";

const ALLOWED_FIELDS = [
  "email",
  "firstName",
  "lastName",
  "billingCycle",
  "selectedPrice",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "metadata",
] as const;

type ProspectRequestBody = Partial<Record<(typeof ALLOWED_FIELDS)[number], unknown>> & {
  status?: ProspectStatus;
};

const PROSPECTS_COLLECTION = "prospects" as const;

type ProspectUpsertableFields = (typeof ALLOWED_FIELDS)[number];
type ProspectInput = Partial<Pick<Prospect, ProspectUpsertableFields>>;
type ProspectWithAttempts = Prospect & { attemptCount?: number };

const normalizeEmail = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length ? trimmed : null;
};

const sanitizeData = (body: ProspectRequestBody): ProspectInput => {
  const data: ProspectInput = {};

  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) {
      // @ts-expect-error - keys align with Prospect fields defined in ALLOWED_FIELDS
      data[key] = body[key] as Prospect[ProspectUpsertableFields];
    }
  }

  const normalizedEmail = normalizeEmail(data.email);
  if (normalizedEmail) {
    data.email = normalizedEmail;
  }

  if (typeof data.billingCycle === "string" && !["monthly", "yearly"].includes(data.billingCycle)) {
    delete data.billingCycle;
  }

  if (typeof data.selectedPrice === "string") {
    const parsed = Number.parseFloat(data.selectedPrice);
    data.selectedPrice = Number.isFinite(parsed) ? parsed : undefined;
  }

  return data;
};

const isNameCompatible = (
  existing: Pick<Prospect, "firstName" | "lastName">,
  incoming: { firstName?: unknown; lastName?: unknown }
) => {
  const providedFirst = typeof incoming.firstName === "string" ? incoming.firstName.trim() : "";
  const providedLast = typeof incoming.lastName === "string" ? incoming.lastName.trim() : "";

  const existingFirst = (existing.firstName ?? "").trim();
  const existingLast = (existing.lastName ?? "").trim();

  if (!existingFirst && !existingLast) {
    return true;
  }

  const firstMatches = !existingFirst || existingFirst.localeCompare(providedFirst, "fr", { sensitivity: "accent" }) === 0;
  const lastMatches = !existingLast || existingLast.localeCompare(providedLast, "fr", { sensitivity: "accent" }) === 0;

  return firstMatches && lastMatches;
};

const incrementAttemptCount = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value + 1;
  }
  return 1;
};

export const upsertProspectHandler = async (req: PayloadRequest): Promise<Response> => {
  try {
    const body = (await req.json!()) as ProspectRequestBody;
    const sanitized = sanitizeData(body);

    const normalizedEmail = normalizeEmail(body.email);
    if (!normalizedEmail) {
      return Response.json({ error: "Adresse e-mail requise." }, { status: 400 });
    }

    const payload = req.payload as Payload;

    const existing = (await payload.find({
      collection: PROSPECTS_COLLECTION,
      where: {
        email: {
          equals: normalizedEmail,
        },
      },
      limit: 1,
    })) as { docs: ProspectWithAttempts[] };

    const now = new Date().toISOString();

    if (existing.docs.length > 0) {
      const prospect = existing.docs[0];

      if (!prospect) {
        return Response.json({ error: "Prospect introuvable." }, { status: 500 });
      }

      if (!isNameCompatible(prospect, body)) {
        return Response.json(
          {
            error: "Adresse e-mail déjà utilisée. Vérifiez vos prénom et nom.",
            code: "prospect_name_mismatch",
          },
          { status: 409 },
        );
      }

      const hasStatusUpdate = typeof body.status === "string" && body.status.length > 0;
      const updateData: ProspectInput & {
        lastPaymentAttemptAt: string;
        attemptCount: number;
      } = {
        ...sanitized,
        lastPaymentAttemptAt: now,
        attemptCount: incrementAttemptCount(prospect.attemptCount),
      };

      const updateOptions = {
        collection: PROSPECTS_COLLECTION,
        id: prospect.id,
        draft: false,
        data: {
          ...updateData,
          email: (updateData.email ?? prospect.email) as Prospect["email"],
          ...(hasStatusUpdate ? { status: body.status } : {}),
        },
      } as Parameters<typeof payload.update>[0];

      const result = (await payload.update(updateOptions)) as Prospect;

      return Response.json(
        {
          prospect: result,
          created: false,
          code: "prospect_updated",
          message: "Prospect mis à jour",
        },
        { status: 200 },
      );
    }

    const createData: ProspectInput & {
      status: ProspectStatus;
      lastPaymentAttemptAt: string;
      attemptCount: number;
    } = {
      ...sanitized,
      status: "pending",
      lastPaymentAttemptAt: now,
      attemptCount: 1,
    };

    const createOptions = {
      collection: PROSPECTS_COLLECTION,
      draft: false,
      data: {
        ...createData,
        email: (createData.email ?? normalizedEmail) as Prospect["email"],
      },
    } as Parameters<typeof payload.create>[0];

    const result = (await payload.create(createOptions)) as Prospect;

    return Response.json(
      {
        prospect: result,
        created: true,
        code: "prospect_created",
        message: "Prospect créé",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[Prospects] upsertProspect failed", error);
    return Response.json(
      { error: "Impossible d'enregistrer le prospect." },
      { status: 500 },
    );
  }
};
