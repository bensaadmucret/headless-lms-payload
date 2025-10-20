import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Vérifier si la table existe avant de faire quoi que ce soit
  await db.execute(sql`
    DO $$ 
    BEGIN
      -- Vérifier si la table payload_locked_documents_rels existe
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'payload_locked_documents_rels'
      ) THEN
        -- Supprimer la contrainte problématique si elle existe
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'payload_locked_documents_rels_import_jobs_fk'
          AND table_name = 'payload_locked_documents_rels'
        ) THEN
          ALTER TABLE "payload_locked_documents_rels" 
          DROP CONSTRAINT "payload_locked_documents_rels_import_jobs_fk";
        END IF;
        
        -- Nettoyer les références orphelines à import_jobs
        DELETE FROM "payload_locked_documents_rels" 
        WHERE "import_jobs_id" IS NOT NULL;
      END IF;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Pas de rollback nécessaire pour cette correction
}