import configPromise from '@payload-config';
import { getPayloadAuth } from 'payload-auth/better-auth';

export const getPayload = async () => getPayloadAuth(configPromise);
