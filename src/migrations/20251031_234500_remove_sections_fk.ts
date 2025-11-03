import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from 'drizzle-orm'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'payload_locked_documents_rels_sections_fk'
          AND table_name = 'payload_locked_documents_rels'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          DROP CONSTRAINT "payload_locked_documents_rels_sections_fk";
      END IF;

      IF EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE indexname = 'payload_locked_documents_rels_sections_id_idx'
      ) THEN
        DROP INDEX "payload_locked_documents_rels_sections_id_idx";
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'payload_locked_documents_rels'
          AND column_name = 'sections_id'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          DROP COLUMN "sections_id";
      END IF;
    END $$;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN "sections_id" integer;
  `);
}
