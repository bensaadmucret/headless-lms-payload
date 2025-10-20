/**
 * Script pour corriger la table import_jobs
 * Supprime et recrée la table avec les bonnes contraintes
 */

import { getPayload } from 'payload'
import config from '../src/payload.config'

async function fixImportJobs() {
  console.log('🔧 Fixing import_jobs table...')
  
  try {
    const payload = await getPayload({ config })
    
    // Supprimer les enums existants
    await payload.db.drizzle.execute(`
      DROP TYPE IF EXISTS enum_import_jobs_import_type CASCADE;
      DROP TYPE IF EXISTS enum_import_jobs_status CASCADE;
    `)
    
    console.log('✅ Dropped existing enums')
    
    // Supprimer la table existante
    await payload.db.drizzle.execute(`
      DROP TABLE IF EXISTS import_jobs CASCADE;
    `)
    
    console.log('✅ Dropped existing table')
    
    // Recréer les enums
    await payload.db.drizzle.execute(`
      CREATE TYPE enum_import_jobs_import_type AS ENUM ('questions', 'quizzes', 'flashcards', 'learning-path');
      CREATE TYPE enum_import_jobs_status AS ENUM ('pending', 'validating', 'validated', 'processing', 'completed', 'failed', 'validation_failed');
    `)
    
    console.log('✅ Created new enums')
    
    // Recréer la table
    await payload.db.drizzle.execute(`
      CREATE TABLE import_jobs (
        id serial PRIMARY KEY NOT NULL,
        uploaded_file_id integer NOT NULL,
        file_name varchar NOT NULL,
        import_type enum_import_jobs_import_type NOT NULL,
        status enum_import_jobs_status DEFAULT 'pending' NOT NULL,
        progress numeric DEFAULT 0,
        uploaded_by_id integer NOT NULL,
        create_quiz_container boolean DEFAULT false,
        quiz_metadata_title varchar,
        quiz_metadata_description varchar,
        quiz_metadata_category_id integer,
        validation_results jsonb,
        processing_results jsonb,
        errors jsonb,
        completed_at timestamp(3) with time zone,
        updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
        created_at timestamp(3) with time zone DEFAULT now() NOT NULL
      );
    `)
    
    console.log('✅ Created new table')
    
    // Ajouter les contraintes de clés étrangères
    await payload.db.drizzle.execute(`
      ALTER TABLE import_jobs 
        ADD CONSTRAINT import_jobs_uploaded_file_id_media_id_fk 
        FOREIGN KEY (uploaded_file_id) REFERENCES media(id) ON DELETE CASCADE;
      
      ALTER TABLE import_jobs 
        ADD CONSTRAINT import_jobs_uploaded_by_id_users_id_fk 
        FOREIGN KEY (uploaded_by_id) REFERENCES users(id) ON DELETE CASCADE;
      
      ALTER TABLE import_jobs 
        ADD CONSTRAINT import_jobs_quiz_metadata_category_id_categories_id_fk 
        FOREIGN KEY (quiz_metadata_category_id) REFERENCES categories(id) ON DELETE SET NULL;
    `)
    
    console.log('✅ Added foreign key constraints')
    
    // Créer les index
    await payload.db.drizzle.execute(`
      CREATE INDEX import_jobs_status_idx ON import_jobs(status);
      CREATE INDEX import_jobs_uploaded_by_id_idx ON import_jobs(uploaded_by_id);
      CREATE INDEX import_jobs_created_at_idx ON import_jobs(created_at);
    `)
    
    console.log('✅ Created indexes')
    
    console.log('🎉 Import jobs table fixed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error fixing import_jobs table:', error)
    process.exit(1)
  }
}

fixImportJobs()
