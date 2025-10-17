-- Migration pour ajouter le champ title à la table import_jobs
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS title VARCHAR(255);

-- Mettre à jour les enregistrements existants avec un titre par défaut
UPDATE import_jobs 
SET title = COALESCE(file_name, 'Import sans nom') 
WHERE title IS NULL OR title = '';