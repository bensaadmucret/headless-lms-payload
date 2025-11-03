-- Migration pour supprimer les rôles 'teacher' et 'superadmin' des enums
-- Date: 2025-10-31
-- Description: Nettoyage des rôles obsolètes après suppression du profil teacher

BEGIN;

-- 1. Migrer les utilisateurs avec le rôle 'teacher' vers 'admin' (si ils existent)
UPDATE users 
SET role = 'admin' 
WHERE role = 'teacher';

-- 2. Migrer les utilisateurs avec le rôle 'superadmin' vers 'admin' (si ils existent)
UPDATE users 
SET role = 'admin' 
WHERE role = 'superadmin';

-- 3. Nettoyer les badges_role_visibility (seulement si des données existent)
-- Supprimer les entrées 'superadmin' de la table badges_role_visibility
DELETE FROM badges_role_visibility 
WHERE value = 'superadmin';

-- 4. Recréer l'enum pour roleVisibility des badges pour supprimer 'superadmin'
-- Créer un nouvel enum temporaire
CREATE TYPE enum_badges_role_visibility_new AS ENUM ('admin', 'student');

-- Modifier la colonne value pour utiliser le nouveau type
ALTER TABLE badges_role_visibility 
ALTER COLUMN value TYPE enum_badges_role_visibility_new 
USING value::text::enum_badges_role_visibility_new;

-- Supprimer l'ancien enum et renommer le nouveau
DROP TYPE IF EXISTS enum_badges_role_visibility CASCADE;
ALTER TYPE enum_badges_role_visibility_new RENAME TO enum_badges_role_visibility;

-- 5. Vérifications finales
-- Compter les utilisateurs par rôle après migration
DO $$
DECLARE
    admin_count INTEGER;
    student_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin';
    SELECT COUNT(*) INTO student_count FROM users WHERE role = 'student';
    
    RAISE NOTICE 'Migration terminée:';
    RAISE NOTICE '- Utilisateurs admin: %', admin_count;
    RAISE NOTICE '- Utilisateurs student: %', student_count;
END $$;

COMMIT;

-- Script de vérification (à exécuter séparément si nécessaire)
-- SELECT role, COUNT(*) FROM users GROUP BY role;
-- SELECT "roleVisibility", COUNT(*) FROM badges WHERE "roleVisibility" IS NOT NULL GROUP BY "roleVisibility";