import { getPayload } from 'payload';
import type { Payload } from 'payload';

let payloadInstance: Payload | null = null;

export async function getPayloadInstance(): Promise<Payload> {
  if (!payloadInstance) {
    const { default: config } = await import('../payload.config');
    payloadInstance = await getPayload({
      config,
    });
  }

  return payloadInstance;
}
