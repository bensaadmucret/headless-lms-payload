-- Script pour ajouter ON DELETE CASCADE à la contrainte de clé étrangère quiz dans quiz_submissions
-- 1. D'abord, supprimer la contrainte existante
ALTER TABLE public.quiz_submissions 
DROP CONSTRAINT IF EXISTS quiz_submissions_quiz_fk;

-- 2. Recréer la contrainte avec ON DELETE CASCADE
ALTER TABLE public.quiz_submissions 
ADD CONSTRAINT quiz_submissions_quiz_fk 
FOREIGN KEY (quiz) 
REFERENCES public.quizzes(id) 
ON DELETE CASCADE 
ON UPDATE NO ACTION;
