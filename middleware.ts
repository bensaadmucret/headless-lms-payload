import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const DEV_FALLBACK_ORIGINS = ['http://localhost:8080', 'http://127.0.0.1:8080'];

const computeAllowedOrigins = (): string[] => {
  const envOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  const frontendUrl = process.env.FRONTEND_URL?.trim();
  if (frontendUrl) {
    envOrigins.push(frontendUrl);
  }

  if (process.env.NODE_ENV !== 'production') {
    envOrigins.push(...DEV_FALLBACK_ORIGINS);
  }

  return Array.from(new Set(envOrigins));
};

const allowedOrigins = computeAllowedOrigins();

const DEFAULT_ALLOWED_HEADERS = 'Content-Type, Authorization, X-Requested-With, Accept, Origin';
const DEFAULT_ALLOWED_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';

function getAllowedOrigin(requestOrigin: string | null): string | undefined {
  if (!requestOrigin) {
    return undefined;
  }

  if (allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  return undefined;
}

function applyCorsHeaders(
  response: NextResponse,
  origin: string | undefined,
  request: NextRequest
): NextResponse {
  if (!origin) {
    return response;
  }

  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Vary', 'Origin');
  const requestedHeaders = request.headers.get('access-control-request-headers');
  if (requestedHeaders) {
    response.headers.set(
      'Access-Control-Allow-Headers',
      `${DEFAULT_ALLOWED_HEADERS}, ${requestedHeaders}`
    );
  } else {
    response.headers.set('Access-Control-Allow-Headers', DEFAULT_ALLOWED_HEADERS);
  }
  response.headers.set('Access-Control-Allow-Methods', DEFAULT_ALLOWED_METHODS);

  return response;
}

export function middleware(request: NextRequest): NextResponse {
  const requestOrigin = request.headers.get('origin');
  const origin = getAllowedOrigin(requestOrigin);

  console.info('[CORS] middleware', {
    method: request.method,
    url: request.nextUrl.pathname,
    origin: requestOrigin,
    allowed: origin,
    allowedOrigins,
  });

  if (request.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 });
    return applyCorsHeaders(preflight, origin, request);
  }

  const response = NextResponse.next();
  return applyCorsHeaders(response, origin, request);
}

export const config = {
  matcher: ['/api/:path*'],
};
