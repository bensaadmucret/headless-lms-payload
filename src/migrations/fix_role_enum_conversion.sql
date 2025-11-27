-- Migration pour corriger le problème de conversion du type enum pour la colonne role
-- Cette migration doit être exécutée AVANT de pousser le nouveau schéma
-- IMPORTANT: Le rôle 'teacher' a été supprimé du système

-- Étape 1: Supprimer la valeur par défaut actuelle (si elle existe)
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;

-- Étape 2: Convertir tous les utilisateurs 'teacher' en 'admin' (si existants)
UPDATE "users" SET "role" = 'admin' WHERE "role" = 'teacher';

-- Étape 3: Mettre à jour toutes les valeurs NULL ou vides vers 'student'
UPDATE "users" SET "role" = 'student' WHERE "role" IS NULL OR "role" = '';

-- Étape 4: Supprimer l'ancien type enum s'il existe
DROP TYPE IF EXISTS "public"."enum_users_role" CASCADE;

-- Étape 5: Créer le nouveau type enum (sans 'teacher')
CREATE TYPE "public"."enum_users_role" AS ENUM ('superadmin', 'admin', 'student');

-- Étape 6: Convertir la colonne vers le type enum
ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."enum_users_role" USING "role"::"public"."enum_users_role";

-- Étape 7: Définir la nouvelle valeur par défaut
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'student'::"public"."enum_users_role";

-- Étape 8: S'assurer que la colonne est NOT NULL
ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL;
