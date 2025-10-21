import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_generationlogs_result_ai_provider" AS ENUM('code-supernova', 'google-gemini', 'openai-gpt', 'local');
  CREATE TYPE "public"."enum_import_jobs_errors_type" AS ENUM('validation', 'database', 'mapping', 'reference', 'system');
  CREATE TYPE "public"."enum_import_jobs_errors_severity" AS ENUM('critical', 'major', 'minor', 'warning');
  CREATE TYPE "public"."enum_import_jobs_import_type" AS ENUM('questions', 'quizzes', 'flashcards', 'learning-path');
  CREATE TYPE "public"."enum_import_jobs_status" AS ENUM('pending', 'validating', 'validated', 'processing', 'completed', 'failed', 'validation_failed');
  CREATE TYPE "public"."enum_flashcards_difficulty" AS ENUM('easy', 'medium', 'hard');
  CREATE TYPE "public"."enum_flashcards_level" AS ENUM('PASS', 'LAS', 'both');
  CREATE TYPE "public"."enum_flashcard_decks_level" AS ENUM('PASS', 'LAS', 'both');
  CREATE TYPE "public"."enum_flashcard_decks_difficulty" AS ENUM('easy', 'medium', 'hard');
  CREATE TYPE "public"."enum_learning_paths_level" AS ENUM('PASS', 'LAS', 'both');
  CREATE TYPE "public"."enum_learning_paths_difficulty" AS ENUM('easy', 'medium', 'hard');
  CREATE TYPE "public"."enum_learning_path_steps_difficulty" AS ENUM('easy', 'medium', 'hard');
  CREATE TABLE "subscription_plans_limitations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"limitation" varchar
  );
  
  CREATE TABLE "import_jobs_errors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_import_jobs_errors_type",
  	"severity" "enum_import_jobs_errors_severity",
  	"message" varchar,
  	"item_index" numeric
  );
  
  CREATE TABLE "import_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"uploaded_file_id" integer NOT NULL,
  	"file_name" varchar,
  	"import_type" "enum_import_jobs_import_type" NOT NULL,
  	"status" "enum_import_jobs_status" DEFAULT 'pending' NOT NULL,
  	"progress" numeric DEFAULT 0,
  	"uploaded_by_id" integer NOT NULL,
  	"create_quiz_container" boolean DEFAULT false,
  	"quiz_metadata_title" varchar,
  	"quiz_metadata_description" varchar,
  	"quiz_metadata_category_id" integer,
  	"validation_results" jsonb,
  	"processing_results" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "flashcards_hints" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"hint" varchar NOT NULL
  );
  
  CREATE TABLE "flashcards_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tag" varchar NOT NULL
  );
  
  CREATE TABLE "flashcards" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"front" varchar NOT NULL,
  	"back" varchar NOT NULL,
  	"category_id" integer NOT NULL,
  	"difficulty" "enum_flashcards_difficulty" DEFAULT 'medium' NOT NULL,
  	"level" "enum_flashcards_level" DEFAULT 'both' NOT NULL,
  	"deck_id" integer,
  	"image_url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "flashcard_decks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"deck_name" varchar NOT NULL,
  	"description" varchar,
  	"category_id" integer NOT NULL,
  	"level" "enum_flashcard_decks_level" DEFAULT 'both' NOT NULL,
  	"difficulty" "enum_flashcard_decks_difficulty" DEFAULT 'medium',
  	"card_count" numeric DEFAULT 0,
  	"author" varchar,
  	"source" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "learning_paths_prerequisites" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"prerequisite" varchar NOT NULL
  );
  
  CREATE TABLE "learning_paths_objectives" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"objective" varchar NOT NULL
  );
  
  CREATE TABLE "learning_paths" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"level" "enum_learning_paths_level" DEFAULT 'both' NOT NULL,
  	"difficulty" "enum_learning_paths_difficulty" DEFAULT 'medium' NOT NULL,
  	"estimated_duration" numeric NOT NULL,
  	"step_count" numeric DEFAULT 0,
  	"author" varchar,
  	"source" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "learning_path_steps_prerequisites" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"step_id" varchar NOT NULL
  );
  
  CREATE TABLE "learning_path_steps_objectives" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"objective" varchar NOT NULL
  );
  
  CREATE TABLE "learning_path_steps" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"learning_path_id" integer NOT NULL,
  	"step_id" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"order" numeric NOT NULL,
  	"estimated_time" numeric NOT NULL,
  	"difficulty" "enum_learning_path_steps_difficulty" DEFAULT 'medium' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "learning_path_steps_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"questions_id" integer
  );
  
  ALTER TABLE "knowledge_base_errors" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "knowledge_base" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "knowledge_base_errors" CASCADE;
  DROP TABLE "knowledge_base" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_knowledge_base_fk";
  
  DROP INDEX "payload_locked_documents_rels_knowledge_base_id_idx";
  ALTER TABLE "subscription_plans_features" ALTER COLUMN "feature" SET NOT NULL;
  ALTER TABLE "subscription_plans" ADD COLUMN "description" varchar NOT NULL;
  ALTER TABLE "subscription_plans" ADD COLUMN "price_monthly" numeric NOT NULL;
  ALTER TABLE "subscription_plans" ADD COLUMN "price_yearly" numeric NOT NULL;
  ALTER TABLE "subscription_plans" ADD COLUMN "highlighted" boolean DEFAULT false;
  ALTER TABLE "subscription_plans" ADD COLUMN "cta_label" varchar DEFAULT 'Commencer' NOT NULL;
  ALTER TABLE "subscription_plans" ADD COLUMN "cta_href" varchar DEFAULT '/onboarding' NOT NULL;
  ALTER TABLE "subscription_plans" ADD COLUMN "display_order" numeric DEFAULT 0;
  ALTER TABLE "generationlogs" ADD COLUMN "result_ai_provider" "enum_generationlogs_result_ai_provider";
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "import_jobs_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "flashcards_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "flashcard_decks_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "learning_paths_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "learning_path_steps_id" integer;
  ALTER TABLE "subscription_plans_limitations" ADD CONSTRAINT "subscription_plans_limitations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."subscription_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "import_jobs_errors" ADD CONSTRAINT "import_jobs_errors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."import_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_uploaded_file_id_media_id_fk" FOREIGN KEY ("uploaded_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_quiz_metadata_category_id_categories_id_fk" FOREIGN KEY ("quiz_metadata_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "flashcards_hints" ADD CONSTRAINT "flashcards_hints_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."flashcards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "flashcards_tags" ADD CONSTRAINT "flashcards_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."flashcards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_deck_id_flashcard_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."flashcard_decks"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "flashcard_decks" ADD CONSTRAINT "flashcard_decks_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "learning_paths_prerequisites" ADD CONSTRAINT "learning_paths_prerequisites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."learning_paths"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "learning_paths_objectives" ADD CONSTRAINT "learning_paths_objectives_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."learning_paths"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "learning_path_steps_prerequisites" ADD CONSTRAINT "learning_path_steps_prerequisites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."learning_path_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "learning_path_steps_objectives" ADD CONSTRAINT "learning_path_steps_objectives_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."learning_path_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "learning_path_steps" ADD CONSTRAINT "learning_path_steps_learning_path_id_learning_paths_id_fk" FOREIGN KEY ("learning_path_id") REFERENCES "public"."learning_paths"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "learning_path_steps_rels" ADD CONSTRAINT "learning_path_steps_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."learning_path_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "learning_path_steps_rels" ADD CONSTRAINT "learning_path_steps_rels_questions_fk" FOREIGN KEY ("questions_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "subscription_plans_limitations_order_idx" ON "subscription_plans_limitations" USING btree ("_order");
  CREATE INDEX "subscription_plans_limitations_parent_id_idx" ON "subscription_plans_limitations" USING btree ("_parent_id");
  CREATE INDEX "import_jobs_errors_order_idx" ON "import_jobs_errors" USING btree ("_order");
  CREATE INDEX "import_jobs_errors_parent_id_idx" ON "import_jobs_errors" USING btree ("_parent_id");
  CREATE INDEX "import_jobs_uploaded_file_idx" ON "import_jobs" USING btree ("uploaded_file_id");
  CREATE INDEX "import_jobs_uploaded_by_idx" ON "import_jobs" USING btree ("uploaded_by_id");
  CREATE INDEX "import_jobs_quiz_metadata_quiz_metadata_category_idx" ON "import_jobs" USING btree ("quiz_metadata_category_id");
  CREATE INDEX "import_jobs_updated_at_idx" ON "import_jobs" USING btree ("updated_at");
  CREATE INDEX "import_jobs_created_at_idx" ON "import_jobs" USING btree ("created_at");
  CREATE INDEX "flashcards_hints_order_idx" ON "flashcards_hints" USING btree ("_order");
  CREATE INDEX "flashcards_hints_parent_id_idx" ON "flashcards_hints" USING btree ("_parent_id");
  CREATE INDEX "flashcards_tags_order_idx" ON "flashcards_tags" USING btree ("_order");
  CREATE INDEX "flashcards_tags_parent_id_idx" ON "flashcards_tags" USING btree ("_parent_id");
  CREATE INDEX "flashcards_category_idx" ON "flashcards" USING btree ("category_id");
  CREATE INDEX "flashcards_deck_idx" ON "flashcards" USING btree ("deck_id");
  CREATE INDEX "flashcards_updated_at_idx" ON "flashcards" USING btree ("updated_at");
  CREATE INDEX "flashcards_created_at_idx" ON "flashcards" USING btree ("created_at");
  CREATE INDEX "flashcard_decks_category_idx" ON "flashcard_decks" USING btree ("category_id");
  CREATE INDEX "flashcard_decks_updated_at_idx" ON "flashcard_decks" USING btree ("updated_at");
  CREATE INDEX "flashcard_decks_created_at_idx" ON "flashcard_decks" USING btree ("created_at");
  CREATE INDEX "learning_paths_prerequisites_order_idx" ON "learning_paths_prerequisites" USING btree ("_order");
  CREATE INDEX "learning_paths_prerequisites_parent_id_idx" ON "learning_paths_prerequisites" USING btree ("_parent_id");
  CREATE INDEX "learning_paths_objectives_order_idx" ON "learning_paths_objectives" USING btree ("_order");
  CREATE INDEX "learning_paths_objectives_parent_id_idx" ON "learning_paths_objectives" USING btree ("_parent_id");
  CREATE INDEX "learning_paths_updated_at_idx" ON "learning_paths" USING btree ("updated_at");
  CREATE INDEX "learning_paths_created_at_idx" ON "learning_paths" USING btree ("created_at");
  CREATE INDEX "learning_path_steps_prerequisites_order_idx" ON "learning_path_steps_prerequisites" USING btree ("_order");
  CREATE INDEX "learning_path_steps_prerequisites_parent_id_idx" ON "learning_path_steps_prerequisites" USING btree ("_parent_id");
  CREATE INDEX "learning_path_steps_objectives_order_idx" ON "learning_path_steps_objectives" USING btree ("_order");
  CREATE INDEX "learning_path_steps_objectives_parent_id_idx" ON "learning_path_steps_objectives" USING btree ("_parent_id");
  CREATE INDEX "learning_path_steps_learning_path_idx" ON "learning_path_steps" USING btree ("learning_path_id");
  CREATE INDEX "learning_path_steps_updated_at_idx" ON "learning_path_steps" USING btree ("updated_at");
  CREATE INDEX "learning_path_steps_created_at_idx" ON "learning_path_steps" USING btree ("created_at");
  CREATE INDEX "learning_path_steps_rels_order_idx" ON "learning_path_steps_rels" USING btree ("order");
  CREATE INDEX "learning_path_steps_rels_parent_idx" ON "learning_path_steps_rels" USING btree ("parent_id");
  CREATE INDEX "learning_path_steps_rels_path_idx" ON "learning_path_steps_rels" USING btree ("path");
  CREATE INDEX "learning_path_steps_rels_questions_id_idx" ON "learning_path_steps_rels" USING btree ("questions_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_import_jobs_fk" FOREIGN KEY ("import_jobs_id") REFERENCES "public"."import_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_flashcards_fk" FOREIGN KEY ("flashcards_id") REFERENCES "public"."flashcards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_flashcard_decks_fk" FOREIGN KEY ("flashcard_decks_id") REFERENCES "public"."flashcard_decks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_learning_paths_fk" FOREIGN KEY ("learning_paths_id") REFERENCES "public"."learning_paths"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_learning_path_steps_fk" FOREIGN KEY ("learning_path_steps_id") REFERENCES "public"."learning_path_steps"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_import_jobs_id_idx" ON "payload_locked_documents_rels" USING btree ("import_jobs_id");
  CREATE INDEX "payload_locked_documents_rels_flashcards_id_idx" ON "payload_locked_documents_rels" USING btree ("flashcards_id");
  CREATE INDEX "payload_locked_documents_rels_flashcard_decks_id_idx" ON "payload_locked_documents_rels" USING btree ("flashcard_decks_id");
  CREATE INDEX "payload_locked_documents_rels_learning_paths_id_idx" ON "payload_locked_documents_rels" USING btree ("learning_paths_id");
  CREATE INDEX "payload_locked_documents_rels_learning_path_steps_id_idx" ON "payload_locked_documents_rels" USING btree ("learning_path_steps_id");
  ALTER TABLE "subscription_plans" DROP COLUMN "price";
  ALTER TABLE "subscription_plans" DROP COLUMN "billing_period";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "knowledge_base_id";
  DROP TYPE "public"."enum_subscription_plans_billing_period";
  DROP TYPE "public"."enum_knowledge_base_errors_type";
  DROP TYPE "public"."enum_knowledge_base_errors_severity";
  DROP TYPE "public"."enum_knowledge_base_import_type";
  DROP TYPE "public"."enum_knowledge_base_status";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_subscription_plans_billing_period" AS ENUM('monthly', 'yearly');
  CREATE TYPE "public"."enum_knowledge_base_errors_type" AS ENUM('validation', 'database', 'mapping', 'reference', 'system');
  CREATE TYPE "public"."enum_knowledge_base_errors_severity" AS ENUM('critical', 'major', 'minor', 'warning');
  CREATE TYPE "public"."enum_knowledge_base_import_type" AS ENUM('questions', 'flashcards', 'learning-paths', 'csv');
  CREATE TYPE "public"."enum_knowledge_base_status" AS ENUM('queued', 'processing', 'validating', 'preview', 'completed', 'failed');
  CREATE TABLE "knowledge_base_errors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_knowledge_base_errors_type",
  	"severity" "enum_knowledge_base_errors_severity",
  	"message" varchar,
  	"suggestion" varchar
  );
  
  CREATE TABLE "knowledge_base" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"original_file_id" integer NOT NULL,
  	"file_name" varchar,
  	"import_type" "enum_knowledge_base_import_type" NOT NULL,
  	"status" "enum_knowledge_base_status" DEFAULT 'queued',
  	"progress_total" numeric DEFAULT 0,
  	"progress_processed" numeric DEFAULT 0,
  	"progress_successful" numeric DEFAULT 0,
  	"progress_failed" numeric DEFAULT 0,
  	"validation_result" jsonb,
  	"import_options_dry_run" boolean DEFAULT false,
  	"import_options_batch_size" numeric DEFAULT 100,
  	"import_options_overwrite_existing" boolean DEFAULT false,
  	"import_options_generate_distractors" boolean DEFAULT true,
  	"import_options_require_human_validation" boolean DEFAULT true,
  	"imported_by_id" integer,
  	"completed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "subscription_plans_limitations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "import_jobs_errors" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "import_jobs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "flashcards_hints" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "flashcards_tags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "flashcards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "flashcard_decks" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "learning_paths_prerequisites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "learning_paths_objectives" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "learning_paths" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "learning_path_steps_prerequisites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "learning_path_steps_objectives" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "learning_path_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "learning_path_steps_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "subscription_plans_limitations" CASCADE;
  DROP TABLE "import_jobs_errors" CASCADE;
  DROP TABLE "import_jobs" CASCADE;
  DROP TABLE "flashcards_hints" CASCADE;
  DROP TABLE "flashcards_tags" CASCADE;
  DROP TABLE "flashcards" CASCADE;
  DROP TABLE "flashcard_decks" CASCADE;
  DROP TABLE "learning_paths_prerequisites" CASCADE;
  DROP TABLE "learning_paths_objectives" CASCADE;
  DROP TABLE "learning_paths" CASCADE;
  DROP TABLE "learning_path_steps_prerequisites" CASCADE;
  DROP TABLE "learning_path_steps_objectives" CASCADE;
  DROP TABLE "learning_path_steps" CASCADE;
  DROP TABLE "learning_path_steps_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_import_jobs_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_flashcards_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_flashcard_decks_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_learning_paths_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_learning_path_steps_fk";
  
  DROP INDEX "payload_locked_documents_rels_import_jobs_id_idx";
  DROP INDEX "payload_locked_documents_rels_flashcards_id_idx";
  DROP INDEX "payload_locked_documents_rels_flashcard_decks_id_idx";
  DROP INDEX "payload_locked_documents_rels_learning_paths_id_idx";
  DROP INDEX "payload_locked_documents_rels_learning_path_steps_id_idx";
  ALTER TABLE "subscription_plans_features" ALTER COLUMN "feature" DROP NOT NULL;
  ALTER TABLE "subscription_plans" ADD COLUMN "price" numeric NOT NULL;
  ALTER TABLE "subscription_plans" ADD COLUMN "billing_period" "enum_subscription_plans_billing_period" DEFAULT 'monthly' NOT NULL;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "knowledge_base_id" integer;
  ALTER TABLE "knowledge_base_errors" ADD CONSTRAINT "knowledge_base_errors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."knowledge_base"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "knowledge_base" ADD CONSTRAINT "knowledge_base_original_file_id_media_id_fk" FOREIGN KEY ("original_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "knowledge_base" ADD CONSTRAINT "knowledge_base_imported_by_id_users_id_fk" FOREIGN KEY ("imported_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "knowledge_base_errors_order_idx" ON "knowledge_base_errors" USING btree ("_order");
  CREATE INDEX "knowledge_base_errors_parent_id_idx" ON "knowledge_base_errors" USING btree ("_parent_id");
  CREATE INDEX "knowledge_base_original_file_idx" ON "knowledge_base" USING btree ("original_file_id");
  CREATE INDEX "knowledge_base_imported_by_idx" ON "knowledge_base" USING btree ("imported_by_id");
  CREATE INDEX "knowledge_base_updated_at_idx" ON "knowledge_base" USING btree ("updated_at");
  CREATE INDEX "knowledge_base_created_at_idx" ON "knowledge_base" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_knowledge_base_fk" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."knowledge_base"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_knowledge_base_id_idx" ON "payload_locked_documents_rels" USING btree ("knowledge_base_id");
  ALTER TABLE "subscription_plans" DROP COLUMN "description";
  ALTER TABLE "subscription_plans" DROP COLUMN "price_monthly";
  ALTER TABLE "subscription_plans" DROP COLUMN "price_yearly";
  ALTER TABLE "subscription_plans" DROP COLUMN "highlighted";
  ALTER TABLE "subscription_plans" DROP COLUMN "cta_label";
  ALTER TABLE "subscription_plans" DROP COLUMN "cta_href";
  ALTER TABLE "subscription_plans" DROP COLUMN "display_order";
  ALTER TABLE "generationlogs" DROP COLUMN "result_ai_provider";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "import_jobs_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "flashcards_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "flashcard_decks_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "learning_paths_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "learning_path_steps_id";
  DROP TYPE "public"."enum_generationlogs_result_ai_provider";
  DROP TYPE "public"."enum_import_jobs_errors_type";
  DROP TYPE "public"."enum_import_jobs_errors_severity";
  DROP TYPE "public"."enum_import_jobs_import_type";
  DROP TYPE "public"."enum_import_jobs_status";
  DROP TYPE "public"."enum_flashcards_difficulty";
  DROP TYPE "public"."enum_flashcards_level";
  DROP TYPE "public"."enum_flashcard_decks_level";
  DROP TYPE "public"."enum_flashcard_decks_difficulty";
  DROP TYPE "public"."enum_learning_paths_level";
  DROP TYPE "public"."enum_learning_paths_difficulty";
  DROP TYPE "public"."enum_learning_path_steps_difficulty";`)
}
