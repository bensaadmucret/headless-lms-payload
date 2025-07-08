import dotenv from 'dotenv';
import path from 'path';
import payload from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import payloadConfig from '../payload.config';

// Load environment variables
dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
});

let cachedPayload: any = null;

/**
 * Initializes and returns a Payload client for testing.
 * Caches the client to avoid re-initialization.
 */
export const getTestPayloadClient = async () => {
  if (cachedPayload) {
    return cachedPayload;
  }

  const resolvedConfig = await payloadConfig;

  resolvedConfig.db = postgresAdapter({
    pool: {
      connectionString: process.env.PAYLOAD_TEST_DATABASE_URI,
    },
  }) as any;

  resolvedConfig.secret = 'test-secret-key-for-ci-cd';



  const client = await payload.init({
    config: resolvedConfig,
  });

  // For testing purposes, use a fixed base URL
  // This URL won't actually be used for real HTTP requests
  // as we'll use the Payload client directly in tests
  process.env.PAYLOAD_PUBLIC_SERVER_URL = 'http://localhost:3000';

  cachedPayload = client;
  return client;
};
