import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from 'drizzle-orm'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  console.log('🧹 Nettoyage des relations payload_locked_documents_rels...')

  // Supprimer la colonne knowledge_base_id de la table des relations
  await db.execute(sql`
    DO $$ 
    BEGIN
      -- Supprimer la colonne knowledge_base_id si elle existe
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payload_locked_documents_rels' AND column_name = 'knowledge_base_id') THEN
        ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "knowledge_base_id";
        RAISE NOTICE 'Colonne knowledge_base_id supprimée de payload_locked_documents_rels';
      END IF;
      
      -- Supprimer l'index associé s'il existe
      IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'payload_locked_documents_rels_knowledge_base_id_idx') THEN
        DROP INDEX "payload_locked_documents_rels_knowledge_base_id_idx";
        RAISE NOTICE 'Index knowledge_base_id supprimé';
      END IF;
    END $$;
  `)

  console.log('✅ Nettoyage des relations terminé')
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  console.log('⚠️ Cette migration ne peut pas être annulée automatiquement.')
  console.log('   La colonne knowledge_base_id ne sera pas restaurée.')
}