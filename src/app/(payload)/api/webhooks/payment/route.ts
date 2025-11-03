import Stripe from 'stripe';
import { NextResponse } from 'next/server';

import { getPayloadInstance } from '@/utils/payloadInstance';
import { getStripeClient } from '@/services/stripe';
import { StripeWebhookService } from '@/services/stripe/StripeWebhookService';

const RAW_BODY_HEADER = 'x-stripe-raw-body';
const SIGNATURE_HEADER = 'stripe-signature';
const STRIPE_EVENT_ID_HEADER = 'x-stripe-event-id';

function readRawBody(request: Request): Promise<string> {
  const cloned = request.clone();
  return cloned.text();
}

export async function POST(request: Request) {
  const stripeClient = getStripeClient();
  const webhookSecret = stripeClient.getWebhookSecret();

  if (!webhookSecret) {
    return NextResponse.json(
      { ok: false, error: 'Stripe webhook secret not configured.' },
      { status: 500 },
    );
  }

  let rawBody = request.headers.get(RAW_BODY_HEADER);
  if (!rawBody) {
    rawBody = await readRawBody(request);
  }

  const signature = request.headers.get(SIGNATURE_HEADER);

  if (!signature) {
    return NextResponse.json(
      { ok: false, error: 'Missing Stripe-Signature header.' },
      { status: 400 },
    );
  }

  const payloadClient = await getPayloadInstance();
  const webhookService = new StripeWebhookService(stripeClient, payloadClient);

  let event: Stripe.Event;

  try {
    event = webhookService.verifySignature(rawBody, signature);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Invalid signature.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }

  const requestId =
    request.headers.get('x-request-id') ??
    request.headers.get('x-correlation-id') ??
    request.headers.get(STRIPE_EVENT_ID_HEADER) ??
    event.id;

  try {
    const result = await webhookService.processEvent(event);

    if (!result.success) {
      console.error('[stripe webhook] processing error', {
        requestId,
        eventId: event.id,
        eventType: event.type,
        error: result.error,
      });
    } else {
      console.info('[stripe webhook] processed', {
        requestId,
        eventId: event.id,
        eventType: event.type,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[stripe webhook] unexpected failure', {
      requestId,
      eventId: event.id,
      eventType: event.type,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        ok: false,
        error: 'Internal processing error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
