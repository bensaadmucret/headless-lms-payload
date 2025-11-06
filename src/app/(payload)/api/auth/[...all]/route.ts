import { NextResponse, type NextRequest } from 'next/server';

import { getPayload } from '@/lib/payload';
import { logger } from '@/utils/logger';

const payloadPromise = getPayload();

type BetterAuthMetadata = Record<string, unknown> | string | null | undefined;

interface BetterAuthUser {
  readonly id: string;
  readonly email: string;
  readonly metadata?: BetterAuthMetadata;
  readonly tunnelStatus?: string;
  readonly selectedServiceType?: string;
  readonly billingCycle?: string;
  readonly checkoutSessionId?: string;
  readonly [key: string]: unknown;
}

interface BetterAuthSession {
  readonly user: BetterAuthUser | null;
  readonly [key: string]: unknown;
}

const parseMetadata = (metadata: BetterAuthMetadata): Record<string, unknown> => {
  if (!metadata) {
    return {};
  }

  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata) as Record<string, unknown>;
    } catch (error) {
      logger.warn('[BetterAuth Proxy] Failed to parse metadata string', { error });
      return {};
    }
  }

  if (typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }

  return {};
};

const enrichUser = (user: BetterAuthUser | null): BetterAuthUser | null => {
  if (!user) {
    return null;
  }

  const metadata = parseMetadata(user.metadata);

  const rawTunnelStatus = metadata['tunnelStatus'];
  const rawServiceType = metadata['selectedServiceType'];
  const rawBillingCycle = metadata['billingCycle'];
  const rawCheckoutSessionId = metadata['checkoutSessionId'];

  const metadataTunnelStatus = typeof rawTunnelStatus === 'string' ? rawTunnelStatus : undefined;
  const metadataServiceType = typeof rawServiceType === 'string' ? rawServiceType : undefined;
  const metadataBillingCycle = rawBillingCycle === 'monthly' || rawBillingCycle === 'yearly' ? rawBillingCycle : undefined;
  const metadataCheckoutSessionId = typeof rawCheckoutSessionId === 'string' ? rawCheckoutSessionId : undefined;

  const tunnelStatus = metadataTunnelStatus ?? user.tunnelStatus;
  const selectedServiceType = metadataServiceType ?? user.selectedServiceType;
  const billingCycle = metadataBillingCycle ?? user.billingCycle;
  const checkoutSessionId = metadataCheckoutSessionId ?? user.checkoutSessionId;

  return {
    ...user,
    tunnelStatus,
    selectedServiceType,
    billingCycle,
    checkoutSessionId,
  };
};

const enrichResponseBody = (body: unknown): unknown => {
  if (!body || typeof body !== 'object') {
    return body;
  }

  if (!('user' in body)) {
    return body;
  }

  const session = body as BetterAuthSession;
  return {
    ...session,
    user: enrichUser(session.user),
  } satisfies BetterAuthSession;
};

const cloneCookies = (source: Response, target: NextResponse) => {
    const headerAccessor = source.headers as unknown as { getSetCookie?: () => string[] };
    const setCookieHeaders = headerAccessor.getSetCookie?.();

    if (Array.isArray(setCookieHeaders) && setCookieHeaders.length > 0) {
      for (const cookie of setCookieHeaders) {
        target.headers.append('set-cookie', cookie);
      }
      return;
    }

    const singleHeader = source.headers.get('set-cookie');
    if (singleHeader) {
      target.headers.append('set-cookie', singleHeader);
    }
};

const handleRequest = async (request: NextRequest): Promise<Response> => {
  const payload = await payloadPromise;
  const betterAuth = (payload as unknown as {
    betterAuth?: { handler?: (request: NextRequest) => Promise<Response> };
  }).betterAuth;

  if (!betterAuth?.handler) {
    logger.error('[BetterAuth Proxy] BetterAuth plugin not initialized');
    return NextResponse.json(
      {
        error: 'betterauth_not_available',
        message: 'Authentication service temporarily unavailable.',
      },
      { status: 503 }
    );
  }

  const upstreamResponse = await betterAuth.handler(request);

  const contentType = upstreamResponse.headers.get('content-type') ?? '';

  if (!upstreamResponse.ok || !contentType.includes('application/json')) {
    logger.debug('[BetterAuth Proxy] Upstream response passthrough (non-JSON or error)', {
      url: request.nextUrl.pathname,
      status: upstreamResponse.status,
      ok: upstreamResponse.ok,
      contentType,
    });
    return upstreamResponse;
  }

  let body: unknown;

  try {
    body = await upstreamResponse.clone().json();
  } catch (error) {
    logger.warn('[BetterAuth Proxy] Failed to parse upstream JSON response', { error });
    return upstreamResponse;
  }

  const isObjectBody = Boolean(body && typeof body === 'object');
  const hasUser = Boolean(isObjectBody && 'user' in (body as Record<string, unknown>) && (body as { user: unknown }).user);
  const bodyKeys = isObjectBody ? Object.keys(body as Record<string, unknown>) : [];
  logger.debug('[BetterAuth Proxy] Upstream JSON response', {
    url: request.nextUrl.pathname,
    status: upstreamResponse.status,
    hasUser,
    keys: bodyKeys,
  });

  const enrichedBody = enrichResponseBody(body);

  const isEnrichedObject = Boolean(enrichedBody && typeof enrichedBody === 'object');
  const enrichedHasUser = Boolean(
    isEnrichedObject && 'user' in (enrichedBody as Record<string, unknown>) && (enrichedBody as { user: unknown }).user,
  );
  
  logger.debug('[BetterAuth Proxy] Enriched JSON response', {
    url: request.nextUrl.pathname,
    hasUser: enrichedHasUser,
  });

  const headers = new Headers(upstreamResponse.headers);
  headers.set('content-type', 'application/json');

  const nextResponse = new NextResponse(JSON.stringify(enrichedBody), {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });

  cloneCookies(upstreamResponse, nextResponse);

  return nextResponse;
};

export const GET = async (request: NextRequest) => handleRequest(request);

export const POST = async (request: NextRequest) => handleRequest(request);

export const dynamic = 'force-dynamic';
