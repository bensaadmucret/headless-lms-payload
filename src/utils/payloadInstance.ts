import { getPayload } from 'payload';

let payloadInstance: any = null;

export async function getPayloadInstance() {
  if (!payloadInstance) {
    payloadInstance = await getPayload({
      config: require('../payload.config'),
    });
  }
  return payloadInstance;
}
