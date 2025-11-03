import { toNextJsHandler } from 'better-auth/next-js';

import { getPayload } from '@/lib/payload';

const payloadPromise = getPayload();

export const { GET, POST } = toNextJsHandler(async (request) => {
  const payload = await payloadPromise;
  return payload.betterAuth.handler(request);
});
