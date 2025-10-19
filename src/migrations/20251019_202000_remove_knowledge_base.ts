import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from 'drizzle-orm'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  console.log('🗑️ Suppression de la collection knowledge-base et nettoyage de la base de données...')

  // Supprimer les contraintes de clés étrangères d'abord
  await db.execute(sql`
    DO $$ 
    BEGIN
      -- Supprimer les contraintes de clés étrangères si elles existent
      IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'knowledge_base_original_file_id_media_id_fk') THEN
        ALTER TABLE "knowledge_base" DROP CONSTRAINT "knowledge_base_original_file_id_media_id_fk";
      END IF;
      
      IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'knowledge_base_imported_by_id_users_id_fk') THEN
        ALTER TABLE "knowledge_base" DROP CONSTRAINT "knowledge_base_imported_by_id_users_id_fk";
      END IF;
      
      IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'knowledge_base_errors_parent_id_fk') THEN
        ALTER TABLE "knowledge_base_errors" DROP CONSTRAINT "knowledge_base_errors_parent_id_fk";
      END IF;
      
      IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payload_locked_documents_rels_knowledge_base_fk') THEN
        ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_knowledge_base_fk";
      END IF;
    END $$;
  `)

  // Supprimer les tables liées à knowledge-base
  await db.execute(sql`DROP TABLE IF EXISTS "knowledge_base_errors" CASCADE;`)
  await db.execute(sql`DROP TABLE IF EXISTS "knowledge_base" CASCADE;`)

  // Supprimer les enums liés à knowledge-base
  await db.execute(sql`DROP TYPE IF EXISTS "enum_knowledge_base_errors_type" CASCADE;`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_knowledge_base_errors_severity" CASCADE;`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_knowledge_base_import_type" CASCADE;`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_knowledge_base_status" CASCADE;`)

  // Nettoyer les références dans payload_locked_documents_rels
  await db.execute(sql`
    DO $$ 
    BEGIN
      -- Supprimer la colonne knowledge_base_id si elle existe
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payload_locked_documents_rels' AND column_name = 'knowledge_base_id') THEN
        ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "knowledge_base_id";
      END IF;
      
      -- Supprimer l'index associé s'il existe
      IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'payload_locked_documents_rels_knowledge_base_id_idx') THEN
        DROP INDEX "payload_locked_documents_rels_knowledge_base_id_idx";
      END IF;
    END $$;
  `)

  // Nettoyer les jobs de queue liés à knowledge-base (si la table existe)
  await db.execute(sql`
    DO $$ 
    BEGIN
      -- Supprimer les jobs liés à knowledge-base dans la table des jobs (si elle existe)
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jobs') THEN
        DELETE FROM "jobs" WHERE data::text LIKE '%knowledge-base%';
      END IF;
    END $$;
  `)

  console.log('✅ Collection knowledge-base supprimée et base de données nettoyée')
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  console.log('⚠️ Cette migration ne peut pas être annulée automatiquement.')
  console.log('   Pour restaurer la collection knowledge-base, vous devrez :')
  console.log('   1. Restaurer le fichier src/collections/KnowledgeBase.ts')
  console.log('   2. Ajouter KnowledgeBase dans payload.config.ts')
  console.log('   3. Exécuter une nouvelle migration pour recréer les tables')
}