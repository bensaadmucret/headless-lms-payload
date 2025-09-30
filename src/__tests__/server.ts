import dotenv from 'dotenv';
import path from 'path';
import payload from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import payloadConfig from '../payload.config';

// Load environment variables - prioritize .env.test for tests
dotenv.config({
  path: path.resolve(__dirname, '../../.env.test'),
});
// Fallback to .env if .env.test doesn't exist
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



  // Connect to the database and clear all data
  // This ensures that each test run starts with a clean slate
  const pg = await import('pg');
  const pool = new pg.Pool({
    connectionString: process.env.PAYLOAD_TEST_DATABASE_URI,
  });

  const db = await pool.connect();
  try {
    const { rows: tables } = await db.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public';
    `);

    // This is a critical step to prevent test failures due to schema mismatches or stale data.
    // It iterates through all tables and truncates them, effectively resetting the database.
    // The 'RESTART IDENTITY CASCADE' clause also resets auto-incrementing counters and cascades the truncation to related tables.
    for (const { tablename } of tables) {
      if (tablename.startsWith('_')) continue; // Skip Payload's internal tables
      await db.query(`TRUNCATE TABLE \"${tablename}\" RESTART IDENTITY CASCADE;`);
    }
  } finally {
    db.release();
    await pool.end();
  }

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
