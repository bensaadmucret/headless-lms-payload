import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_hero_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_pages_hero_links_link_appearance" AS ENUM('default', 'outline');
  CREATE TYPE "public"."enum_pages_blocks_cta_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_pages_blocks_cta_links_link_appearance" AS ENUM('default', 'outline');
  CREATE TYPE "public"."enum_pages_blocks_content_columns_size" AS ENUM('oneThird', 'half', 'twoThirds', 'full');
  CREATE TYPE "public"."enum_pages_blocks_content_columns_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_pages_blocks_content_columns_link_appearance" AS ENUM('default', 'outline');
  CREATE TYPE "public"."enum_pages_blocks_archive_populate_by" AS ENUM('collection', 'selection');
  CREATE TYPE "public"."enum_pages_blocks_archive_relation_to" AS ENUM('posts');
  CREATE TYPE "public"."enum_pages_hero_type" AS ENUM('none', 'highImpact', 'mediumImpact', 'lowImpact');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_version_hero_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__pages_v_version_hero_links_link_appearance" AS ENUM('default', 'outline');
  CREATE TYPE "public"."enum__pages_v_blocks_cta_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__pages_v_blocks_cta_links_link_appearance" AS ENUM('default', 'outline');
  CREATE TYPE "public"."enum__pages_v_blocks_content_columns_size" AS ENUM('oneThird', 'half', 'twoThirds', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_content_columns_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__pages_v_blocks_content_columns_link_appearance" AS ENUM('default', 'outline');
  CREATE TYPE "public"."enum__pages_v_blocks_archive_populate_by" AS ENUM('collection', 'selection');
  CREATE TYPE "public"."enum__pages_v_blocks_archive_relation_to" AS ENUM('posts');
  CREATE TYPE "public"."enum__pages_v_version_hero_type" AS ENUM('none', 'highImpact', 'mediumImpact', 'lowImpact');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__posts_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_users_study_year" AS ENUM('pass', 'las');
  CREATE TYPE "public"."enum_users_role" AS ENUM('superadmin', 'admin', 'student');
  CREATE TYPE "public"."enum_users_subscription_status" AS ENUM('none', 'trialing', 'active', 'past_due', 'canceled');
  CREATE TYPE "public"."enum_subscriptions_history_type" AS ENUM('subscription_created', 'payment_succeeded', 'subscription_updated', 'payment_failed', 'subscription_canceled');
  CREATE TYPE "public"."enum_subscriptions_provider" AS ENUM('paddle', 'stripe');
  CREATE TYPE "public"."enum_subscriptions_status" AS ENUM('trialing', 'active', 'past_due', 'canceled');
  CREATE TYPE "public"."enum_webhook_retry_queue_status" AS ENUM('pending', 'processing', 'success', 'failed');
  CREATE TYPE "public"."enum_categories_level" AS ENUM('PASS', 'LAS', 'both');
  CREATE TYPE "public"."enum_courses_level" AS ENUM('beginner', 'intermediate', 'advanced');
  CREATE TYPE "public"."enum_quizzes_quiz_type" AS ENUM('standard', 'placement');
  CREATE TYPE "public"."enum_quizzes_validation_status" AS ENUM('draft', 'pending_review', 'approved', 'rejected');
  CREATE TYPE "public"."enum_questions_question_type" AS ENUM('multipleChoice');
  CREATE TYPE "public"."enum_questions_difficulty" AS ENUM('easy', 'medium', 'hard');
  CREATE TYPE "public"."enum_questions_student_level" AS ENUM('PASS', 'LAS', 'both');
  CREATE TYPE "public"."enum_questions_validation_status" AS ENUM('pending', 'approved', 'rejected', 'needs_review');
  CREATE TYPE "public"."enum_study_sessions_steps_type" AS ENUM('quiz', 'review', 'flashcards', 'video', 'reading');
  CREATE TYPE "public"."enum_study_sessions_steps_status" AS ENUM('pending', 'in-progress', 'completed', 'skipped');
  CREATE TYPE "public"."enum_study_sessions_status" AS ENUM('draft', 'in-progress', 'completed', 'paused');
  CREATE TYPE "public"."enum_study_sessions_context_difficulty" AS ENUM('beginner', 'intermediate', 'advanced');
  CREATE TYPE "public"."enum_badges_role_visibility" AS ENUM('superadmin', 'admin', 'student');
  CREATE TYPE "public"."enum_tenants_status" AS ENUM('active', 'suspended', 'inactive', 'trial');
  CREATE TYPE "public"."enum_tenants_settings_features" AS ENUM('analytics', 'api', 'certificates', 'white-label');
  CREATE TYPE "public"."enum_system_metrics_type" AS ENUM('usage', 'quota', 'incident', 'custom');
  CREATE TYPE "public"."enum_conversations_messages_role" AS ENUM('system', 'user', 'assistant');
  CREATE TYPE "public"."enum_conversations_context_difficulty" AS ENUM('beginner', 'intermediate', 'advanced');
  CREATE TYPE "public"."enum_adaptive_quiz_sessions_status" AS ENUM('active', 'completed', 'abandoned', 'expired');
  CREATE TYPE "public"."enum_adaptive_quiz_sessions_student_level" AS ENUM('PASS', 'LAS');
  CREATE TYPE "public"."enum_adaptive_quiz_results_recommendations_type" AS ENUM('study_more', 'practice_quiz', 'review_material', 'focus_category', 'maintain_strength');
  CREATE TYPE "public"."enum_adaptive_quiz_results_recommendations_priority" AS ENUM('high', 'medium', 'low');
  CREATE TYPE "public"."enum_adaptive_quiz_results_progress_comparison_trend" AS ENUM('improving', 'stable', 'declining');
  CREATE TYPE "public"."enum_generationlogs_action" AS ENUM('ai_quiz_generation', 'ai_questions_generation', 'ai_content_validation', 'auto_quiz_creation', 'generation_retry', 'generation_failure');
  CREATE TYPE "public"."enum_generationlogs_status" AS ENUM('started', 'in_progress', 'success', 'failed', 'cancelled', 'timeout');
  CREATE TYPE "public"."enum_generationlogs_generation_config_student_level" AS ENUM('PASS', 'LAS', 'both');
  CREATE TYPE "public"."enum_generationlogs_generation_config_difficulty" AS ENUM('easy', 'medium', 'hard');
  CREATE TYPE "public"."enum_generationlogs_result_ai_provider" AS ENUM('code-supernova', 'google-gemini', 'openai-gpt', 'local');
  CREATE TYPE "public"."enum_generationlogs_error_type" AS ENUM('ai_api_error', 'validation_failed', 'database_error', 'rate_limit_exceeded', 'invalid_config', 'timeout', 'unknown_error');
  CREATE TYPE "public"."enum_generationlogs_metadata_environment" AS ENUM('development', 'test', 'staging', 'production');
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
  CREATE TYPE "public"."enum_analytics_events_source" AS ENUM('website', 'mobile', 'api', 'admin', 'other');
  CREATE TYPE "public"."enum_analytics_events_device_type" AS ENUM('desktop', 'mobile', 'tablet', 'other');
  CREATE TYPE "public"."enum_analytics_sessions_device_info_type" AS ENUM('desktop', 'mobile', 'tablet');
  CREATE TYPE "public"."enum_redirects_to_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_forms_confirmation_type" AS ENUM('message', 'redirect');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'schedulePublish');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'schedulePublish');
  CREATE TYPE "public"."enum_cors_config_environment" AS ENUM('development', 'production');
  CREATE TYPE "public"."enum_header_nav_items_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_footer_nav_items_link_type" AS ENUM('reference', 'custom');
  CREATE TABLE "pages_hero_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_pages_hero_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_appearance" "enum_pages_hero_links_link_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "pages_blocks_cta_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_pages_blocks_cta_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_appearance" "enum_pages_blocks_cta_links_link_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "pages_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"rich_text" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_content_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"size" "enum_pages_blocks_content_columns_size" DEFAULT 'oneThird',
  	"rich_text" jsonb,
  	"enable_link" boolean,
  	"link_type" "enum_pages_blocks_content_columns_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_appearance" "enum_pages_blocks_content_columns_link_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "pages_blocks_content" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_media_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_archive" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"intro_content" jsonb,
  	"populate_by" "enum_pages_blocks_archive_populate_by" DEFAULT 'collection',
  	"relation_to" "enum_pages_blocks_archive_relation_to" DEFAULT 'posts',
  	"limit" numeric DEFAULT 10,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_form_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"form_id" integer,
  	"enable_intro" boolean,
  	"intro_content" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"hero_type" "enum_pages_hero_type" DEFAULT 'lowImpact',
  	"hero_rich_text" jsonb,
  	"hero_media_id" integer,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"slug" varchar,
  	"slug_lock" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" integer,
  	"posts_id" integer,
  	"categories_id" integer
  );
  
  CREATE TABLE "_pages_v_version_hero_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__pages_v_version_hero_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_appearance" "enum__pages_v_version_hero_links_link_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cta_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__pages_v_blocks_cta_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_appearance" "enum__pages_v_blocks_cta_links_link_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"rich_text" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_content_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"size" "enum__pages_v_blocks_content_columns_size" DEFAULT 'oneThird',
  	"rich_text" jsonb,
  	"enable_link" boolean,
  	"link_type" "enum__pages_v_blocks_content_columns_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_appearance" "enum__pages_v_blocks_content_columns_link_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_content" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_media_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_archive" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"intro_content" jsonb,
  	"populate_by" "enum__pages_v_blocks_archive_populate_by" DEFAULT 'collection',
  	"relation_to" "enum__pages_v_blocks_archive_relation_to" DEFAULT 'posts',
  	"limit" numeric DEFAULT 10,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_form_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"form_id" integer,
  	"enable_intro" boolean,
  	"intro_content" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_hero_type" "enum__pages_v_version_hero_type" DEFAULT 'lowImpact',
  	"version_hero_rich_text" jsonb,
  	"version_hero_media_id" integer,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_slug" varchar,
  	"version_slug_lock" boolean DEFAULT true,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_pages_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" integer,
  	"posts_id" integer,
  	"categories_id" integer
  );
  
  CREATE TABLE "posts_populated_authors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar
  );
  
  CREATE TABLE "posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"hero_image_id" integer,
  	"content" jsonb,
  	"meta_title" varchar,
  	"meta_image_id" integer,
  	"meta_description" varchar,
  	"published_at" timestamp(3) with time zone,
  	"slug" varchar,
  	"slug_lock" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_posts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "posts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"posts_id" integer,
  	"categories_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "_posts_v_version_populated_authors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"name" varchar
  );
  
  CREATE TABLE "_posts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_hero_image_id" integer,
  	"version_content" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_image_id" integer,
  	"version_meta_description" varchar,
  	"version_published_at" timestamp(3) with time zone,
  	"version_slug" varchar,
  	"version_slug_lock" boolean DEFAULT true,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__posts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_posts_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"posts_id" integer,
  	"categories_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"alt" varchar,
  	"caption" jsonb,
  	"extracted_content" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_square_url" varchar,
  	"sizes_square_width" numeric,
  	"sizes_square_height" numeric,
  	"sizes_square_mime_type" varchar,
  	"sizes_square_filesize" numeric,
  	"sizes_square_filename" varchar,
  	"sizes_small_url" varchar,
  	"sizes_small_width" numeric,
  	"sizes_small_height" numeric,
  	"sizes_small_mime_type" varchar,
  	"sizes_small_filesize" numeric,
  	"sizes_small_filename" varchar,
  	"sizes_medium_url" varchar,
  	"sizes_medium_width" numeric,
  	"sizes_medium_height" numeric,
  	"sizes_medium_mime_type" varchar,
  	"sizes_medium_filesize" numeric,
  	"sizes_medium_filename" varchar,
  	"sizes_large_url" varchar,
  	"sizes_large_width" numeric,
  	"sizes_large_height" numeric,
  	"sizes_large_mime_type" varchar,
  	"sizes_large_filesize" numeric,
  	"sizes_large_filename" varchar,
  	"sizes_xlarge_url" varchar,
  	"sizes_xlarge_width" numeric,
  	"sizes_xlarge_height" numeric,
  	"sizes_xlarge_mime_type" varchar,
  	"sizes_xlarge_filesize" numeric,
  	"sizes_xlarge_filename" varchar,
  	"sizes_og_url" varchar,
  	"sizes_og_width" numeric,
  	"sizes_og_height" numeric,
  	"sizes_og_mime_type" varchar,
  	"sizes_og_filesize" numeric,
  	"sizes_og_filename" varchar
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"first_name" varchar NOT NULL,
  	"last_name" varchar NOT NULL,
  	"study_year" "enum_users_study_year",
  	"onboarding_complete" boolean DEFAULT false,
  	"exam_date" timestamp(3) with time zone,
  	"study_profile_target_score" numeric,
  	"study_profile_study_hours_per_week" numeric,
  	"competency_profile" jsonb,
  	"has_taken_placement_quiz" boolean DEFAULT false,
  	"role" "enum_users_role" NOT NULL,
  	"subscription_status" "enum_users_subscription_status" DEFAULT 'none',
  	"subscription_end_date" timestamp(3) with time zone,
  	"stripe_customer_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"enable_a_p_i_key" boolean,
  	"api_key" varchar,
  	"api_key_index" varchar,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "subscriptions_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_subscriptions_history_type" NOT NULL,
  	"occurred_at" timestamp(3) with time zone NOT NULL,
  	"raw" jsonb
  );
  
  CREATE TABLE "subscriptions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"provider" "enum_subscriptions_provider" DEFAULT 'stripe' NOT NULL,
  	"customer_id" varchar,
  	"subscription_id" varchar NOT NULL,
  	"price_id" varchar,
  	"status" "enum_subscriptions_status" NOT NULL,
  	"trial_end" timestamp(3) with time zone,
  	"current_period_end" timestamp(3) with time zone,
  	"cancel_at_period_end" boolean DEFAULT false,
  	"last_payment_at" timestamp(3) with time zone,
  	"amount" numeric,
  	"currency" varchar DEFAULT 'EUR',
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "webhook_retry_queue" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_id" varchar NOT NULL,
  	"event_type" varchar NOT NULL,
  	"payload" jsonb NOT NULL,
  	"retry_count" numeric DEFAULT 0,
  	"max_retries" numeric DEFAULT 3,
  	"last_error" varchar,
  	"status" "enum_webhook_retry_queue_status" DEFAULT 'pending',
  	"next_retry_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "categories_breadcrumbs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"doc_id" integer,
  	"url" varchar,
  	"label" varchar
  );
  
  CREATE TABLE "categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar,
  	"slug_lock" boolean DEFAULT true,
  	"parent_category_id" integer,
  	"level" "enum_categories_level" DEFAULT 'both' NOT NULL,
  	"adaptive_settings_is_active" boolean DEFAULT true,
  	"adaptive_settings_minimum_questions" numeric DEFAULT 5,
  	"adaptive_settings_weight" numeric DEFAULT 1,
  	"parent_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "courses" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"level" "enum_courses_level" NOT NULL,
  	"author_id" integer NOT NULL,
  	"published" boolean DEFAULT false,
  	"tags" varchar,
  	"duration" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "quizzes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"quiz_type" "enum_quizzes_quiz_type" DEFAULT 'standard',
  	"description" varchar,
  	"course_id" integer,
  	"published" boolean DEFAULT false,
  	"duration" numeric,
  	"passing_score" numeric DEFAULT 70,
  	"validation_status" "enum_quizzes_validation_status" DEFAULT 'draft',
  	"validation_notes" varchar,
  	"validated_by" varchar,
  	"validated_at" timestamp(3) with time zone,
  	"generated_by_a_i" boolean DEFAULT false,
  	"ai_generation_metadata_generation_time" numeric,
  	"ai_generation_metadata_validation_score" numeric,
  	"ai_generation_metadata_ai_model" varchar,
  	"ai_generation_metadata_source_prompt" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "quizzes_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"questions_id" integer
  );
  
  CREATE TABLE "questions_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"option_text" varchar,
  	"is_correct" boolean DEFAULT false
  );
  
  CREATE TABLE "questions_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tag" varchar NOT NULL
  );
  
  CREATE TABLE "questions_validation_issues" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"issue" varchar
  );
  
  CREATE TABLE "questions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"question_text" jsonb NOT NULL,
  	"question_type" "enum_questions_question_type" DEFAULT 'multipleChoice' NOT NULL,
  	"explanation" varchar NOT NULL,
  	"course_id" integer,
  	"category_id" integer NOT NULL,
  	"difficulty" "enum_questions_difficulty" DEFAULT 'medium' NOT NULL,
  	"student_level" "enum_questions_student_level" DEFAULT 'both' NOT NULL,
  	"adaptive_metadata_average_time_seconds" numeric,
  	"adaptive_metadata_success_rate" numeric,
  	"adaptive_metadata_times_used" numeric DEFAULT 0,
  	"source_page_reference" varchar,
  	"generated_by_a_i" boolean DEFAULT false,
  	"ai_generation_prompt" varchar,
  	"validated_by_expert" boolean DEFAULT false,
  	"validated_by_id" integer,
  	"validation_status" "enum_questions_validation_status" DEFAULT 'pending',
  	"validation_notes" varchar,
  	"validated_at" timestamp(3) with time zone,
  	"regenerated_at" timestamp(3) with time zone,
  	"regeneration_reason" varchar,
  	"quality_score" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "quiz_submissions_answers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question_id" integer NOT NULL,
  	"answer" varchar,
  	"is_correct" boolean DEFAULT false NOT NULL
  );
  
  CREATE TABLE "quiz_submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"quiz_id" integer NOT NULL,
  	"student_id" integer NOT NULL,
  	"submission_date" timestamp(3) with time zone NOT NULL,
  	"final_score" numeric NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "study_sessions_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"step_id" numeric NOT NULL,
  	"type" "enum_study_sessions_steps_type" NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"status" "enum_study_sessions_steps_status" DEFAULT 'pending',
  	"metadata" jsonb,
  	"quiz_id" integer,
  	"started_at" timestamp(3) with time zone,
  	"completed_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "study_sessions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"user_id" integer NOT NULL,
  	"status" "enum_study_sessions_status" DEFAULT 'draft',
  	"estimated_duration" numeric,
  	"current_step" numeric DEFAULT 0,
  	"context_course_id" integer,
  	"context_difficulty" "enum_study_sessions_context_difficulty" DEFAULT 'beginner',
  	"context_is_spaced_repetition_schedule" boolean DEFAULT false,
  	"context_schedule_data" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "badges_role_visibility" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_badges_role_visibility",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "badges" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"icon_id" integer,
  	"criteria" jsonb,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "color_schemes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"is_default" boolean DEFAULT false,
  	"is_active" boolean DEFAULT true,
  	"theme_primary" varchar NOT NULL,
  	"theme_secondary" varchar NOT NULL,
  	"theme_accent" varchar NOT NULL,
  	"theme_background" varchar NOT NULL,
  	"theme_text" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "subscription_plans_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"feature" varchar NOT NULL
  );
  
  CREATE TABLE "subscription_plans_limitations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"limitation" varchar
  );
  
  CREATE TABLE "subscription_plans" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"price_monthly" numeric NOT NULL,
  	"price_yearly" numeric NOT NULL,
  	"currency" varchar DEFAULT 'EUR',
  	"highlighted" boolean DEFAULT false,
  	"cta_label" varchar DEFAULT 'Commencer' NOT NULL,
  	"cta_href" varchar DEFAULT '/onboarding' NOT NULL,
  	"limits_max_users" numeric,
  	"limits_max_storage" numeric,
  	"limits_max_courses" numeric,
  	"is_active" boolean DEFAULT true NOT NULL,
  	"display_order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tenants" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"status" "enum_tenants_status" DEFAULT 'active' NOT NULL,
  	"plan_id" integer NOT NULL,
  	"contact_name" varchar NOT NULL,
  	"contact_email" varchar NOT NULL,
  	"contact_phone" varchar,
  	"billing_address" varchar,
  	"billing_vat_number" varchar,
  	"billing_billing_email" varchar,
  	"quotas_max_users" numeric DEFAULT 100,
  	"quotas_max_storage" numeric DEFAULT 10,
  	"quotas_max_courses" numeric DEFAULT 50,
  	"branding_primary_color" varchar,
  	"branding_custom_domain" varchar,
  	"settings_features" "enum_tenants_settings_features",
  	"usage_users_count" numeric DEFAULT 0,
  	"usage_storage_used" numeric DEFAULT 0,
  	"usage_last_activity" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "system_metrics" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"timestamp" timestamp(3) with time zone NOT NULL,
  	"type" "enum_system_metrics_type" NOT NULL,
  	"value" numeric NOT NULL,
  	"description" varchar,
  	"tenant_id" integer,
  	"details" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "conversations_messages" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"role" "enum_conversations_messages_role" NOT NULL,
  	"content" varchar NOT NULL,
  	"timestamp" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "conversations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"user_id" integer NOT NULL,
  	"context_course_id" integer,
  	"context_difficulty" "enum_conversations_context_difficulty",
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "adaptive_quiz_sessions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"session_id" varchar NOT NULL,
  	"user_id" integer NOT NULL,
  	"status" "enum_adaptive_quiz_sessions_status" DEFAULT 'active' NOT NULL,
  	"based_on_analytics_analysis_date" timestamp(3) with time zone NOT NULL,
  	"based_on_analytics_overall_success_rate" numeric,
  	"based_on_analytics_total_quizzes_analyzed" numeric,
  	"question_distribution_weak_category_questions" numeric NOT NULL,
  	"question_distribution_strong_category_questions" numeric NOT NULL,
  	"question_distribution_total_questions" numeric NOT NULL,
  	"config_weak_questions_count" numeric DEFAULT 5,
  	"config_strong_questions_count" numeric DEFAULT 2,
  	"config_target_success_rate" numeric DEFAULT 0.6,
  	"student_level" "enum_adaptive_quiz_sessions_student_level" NOT NULL,
  	"expires_at" timestamp(3) with time zone,
  	"questions_count" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "adaptive_quiz_sessions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"questions_id" integer,
  	"categories_id" integer
  );
  
  CREATE TABLE "adaptive_quiz_results_category_results" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category_id" integer NOT NULL,
  	"questions_count" numeric NOT NULL,
  	"correct_answers" numeric NOT NULL,
  	"incorrect_answers" numeric NOT NULL,
  	"success_rate" numeric NOT NULL,
  	"score_improvement" numeric,
  	"previous_success_rate" numeric,
  	"average_time_per_question" numeric
  );
  
  CREATE TABLE "adaptive_quiz_results_recommendations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"recommendation_id" varchar NOT NULL,
  	"type" "enum_adaptive_quiz_results_recommendations_type" NOT NULL,
  	"category_id" integer NOT NULL,
  	"message" varchar NOT NULL,
  	"priority" "enum_adaptive_quiz_results_recommendations_priority" NOT NULL,
  	"action_url" varchar,
  	"estimated_time_minutes" numeric
  );
  
  CREATE TABLE "adaptive_quiz_results_improvement_areas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category_name" varchar NOT NULL
  );
  
  CREATE TABLE "adaptive_quiz_results_strength_areas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category_name" varchar NOT NULL
  );
  
  CREATE TABLE "adaptive_quiz_results" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"session_id" integer NOT NULL,
  	"user_id" integer NOT NULL,
  	"overall_score" numeric NOT NULL,
  	"max_score" numeric NOT NULL,
  	"success_rate" numeric NOT NULL,
  	"time_spent" numeric NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"progress_comparison_previous_average_score" numeric,
  	"progress_comparison_current_score" numeric,
  	"progress_comparison_improvement" numeric,
  	"progress_comparison_trend" "enum_adaptive_quiz_results_progress_comparison_trend",
  	"progress_comparison_streak_days" numeric,
  	"progress_comparison_last_quiz_date" timestamp(3) with time zone,
  	"next_adaptive_quiz_available_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "user_performances_category_performances" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category_id" varchar NOT NULL,
  	"category_name" varchar NOT NULL,
  	"total_questions" numeric NOT NULL,
  	"correct_answers" numeric NOT NULL,
  	"success_rate" numeric NOT NULL,
  	"last_attempt_date" timestamp(3) with time zone NOT NULL,
  	"questions_attempted" numeric NOT NULL,
  	"average_time_per_question" numeric
  );
  
  CREATE TABLE "user_performances_weakest_categories" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category_id" varchar NOT NULL,
  	"category_name" varchar NOT NULL,
  	"success_rate" numeric NOT NULL
  );
  
  CREATE TABLE "user_performances_strongest_categories" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category_id" varchar NOT NULL,
  	"category_name" varchar NOT NULL,
  	"success_rate" numeric NOT NULL
  );
  
  CREATE TABLE "user_performances" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"overall_success_rate" numeric NOT NULL,
  	"total_quizzes_taken" numeric NOT NULL,
  	"total_questions_answered" numeric NOT NULL,
  	"last_updated" timestamp(3) with time zone NOT NULL,
  	"analysis_date" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "generationlogs_result_question_ids" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question_id" varchar
  );
  
  CREATE TABLE "generationlogs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"action" "enum_generationlogs_action" NOT NULL,
  	"status" "enum_generationlogs_status" NOT NULL,
  	"generation_config_subject" varchar,
  	"generation_config_category_id" varchar,
  	"generation_config_category_name" varchar,
  	"generation_config_student_level" "enum_generationlogs_generation_config_student_level",
  	"generation_config_question_count" numeric,
  	"generation_config_difficulty" "enum_generationlogs_generation_config_difficulty",
  	"generation_config_medical_domain" varchar,
  	"generation_config_include_explanations" boolean DEFAULT true,
  	"generation_config_custom_instructions" varchar,
  	"result_quiz_id" varchar,
  	"result_questions_created" numeric DEFAULT 0,
  	"result_validation_score" numeric,
  	"result_ai_model" varchar,
  	"result_ai_provider" "enum_generationlogs_result_ai_provider",
  	"result_tokens_used" numeric,
  	"error_type" "enum_generationlogs_error_type",
  	"error_message" varchar,
  	"error_details" jsonb,
  	"error_stack_trace" varchar,
  	"performance_duration" numeric,
  	"performance_ai_response_time" numeric,
  	"performance_validation_time" numeric,
  	"performance_database_time" numeric,
  	"performance_retry_count" numeric DEFAULT 1,
  	"performance_prompt_length" numeric,
  	"performance_response_length" numeric,
  	"metadata_ip_address" varchar,
  	"metadata_user_agent" varchar,
  	"metadata_session_id" varchar,
  	"metadata_request_id" varchar,
  	"metadata_environment" "enum_generationlogs_metadata_environment",
  	"metadata_version" varchar DEFAULT '1.0.0',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"completed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
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
  
  CREATE TABLE "analytics_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_name" varchar NOT NULL,
  	"user_id" integer,
  	"session_id" varchar,
  	"properties" jsonb,
  	"source" "enum_analytics_events_source" DEFAULT 'website',
  	"timestamp" timestamp(3) with time zone NOT NULL,
  	"url" varchar,
  	"user_agent" varchar,
  	"ip_address" varchar,
  	"referrer" varchar,
  	"campaign_utm_source" varchar,
  	"campaign_utm_medium" varchar,
  	"campaign_utm_campaign" varchar,
  	"campaign_utm_content" varchar,
  	"campaign_utm_term" varchar,
  	"device_type" "enum_analytics_events_device_type",
  	"device_os" varchar,
  	"device_browser" varchar,
  	"device_screen_resolution" varchar,
  	"funnel_step" numeric,
  	"funnel_funnel_name" varchar,
  	"funnel_conversion_value" numeric,
  	"performance_page_load_time" numeric,
  	"performance_core_web_vitals" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "analytics_sessions_conversion_goals" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"goal" varchar,
  	"achieved" boolean,
  	"value" numeric
  );
  
  CREATE TABLE "analytics_sessions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"session_id" varchar NOT NULL,
  	"user_id" integer,
  	"start_time" timestamp(3) with time zone NOT NULL,
  	"end_time" timestamp(3) with time zone,
  	"event_count" numeric DEFAULT 0,
  	"page_views" numeric DEFAULT 0,
  	"duration" numeric,
  	"device_info_type" "enum_analytics_sessions_device_info_type",
  	"device_info_os" varchar,
  	"device_info_browser" varchar,
  	"location_country" varchar,
  	"location_city" varchar,
  	"location_region" varchar,
  	"referrer" varchar,
  	"landing_page" varchar,
  	"exit_page" varchar,
  	"custom_properties" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "redirects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"from" varchar NOT NULL,
  	"to_type" "enum_redirects_to_type" DEFAULT 'reference',
  	"to_url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "redirects_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" integer,
  	"posts_id" integer
  );
  
  CREATE TABLE "forms_blocks_checkbox" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"required" boolean,
  	"default_value" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_country" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"required" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_email" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"required" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_message" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"message" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_number" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"default_value" numeric,
  	"required" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_select_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_select" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"default_value" varchar,
  	"placeholder" varchar,
  	"required" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_state" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"required" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"default_value" varchar,
  	"required" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_textarea" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"default_value" varchar,
  	"required" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_emails" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"email_to" varchar,
  	"cc" varchar,
  	"bcc" varchar,
  	"reply_to" varchar,
  	"email_from" varchar,
  	"subject" varchar DEFAULT 'You''ve received a new message.' NOT NULL,
  	"message" jsonb
  );
  
  CREATE TABLE "forms" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"submit_button_label" varchar,
  	"confirmation_type" "enum_forms_confirmation_type" DEFAULT 'message',
  	"confirmation_message" jsonb,
  	"redirect_url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "form_submissions_submission_data" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"field" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "form_submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"form_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "search_categories" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"relation_to" varchar,
  	"title" varchar
  );
  
  CREATE TABLE "search" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"priority" numeric,
  	"slug" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "search_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"posts_id" integer
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" integer,
  	"posts_id" integer,
  	"media_id" integer,
  	"users_id" integer,
  	"subscriptions_id" integer,
  	"webhook_retry_queue_id" integer,
  	"categories_id" integer,
  	"courses_id" integer,
  	"quizzes_id" integer,
  	"questions_id" integer,
  	"quiz_submissions_id" integer,
  	"study_sessions_id" integer,
  	"badges_id" integer,
  	"color_schemes_id" integer,
  	"subscription_plans_id" integer,
  	"tenants_id" integer,
  	"system_metrics_id" integer,
  	"conversations_id" integer,
  	"adaptive_quiz_sessions_id" integer,
  	"adaptive_quiz_results_id" integer,
  	"user_performances_id" integer,
  	"generationlogs_id" integer,
  	"import_jobs_id" integer,
  	"flashcards_id" integer,
  	"flashcard_decks_id" integer,
  	"learning_paths_id" integer,
  	"learning_path_steps_id" integer,
  	"analytics_events_id" integer,
  	"analytics_sessions_id" integer,
  	"redirects_id" integer,
  	"forms_id" integer,
  	"form_submissions_id" integer,
  	"search_id" integer,
  	"payload_jobs_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cors_config_allowed_origins" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar NOT NULL,
  	"description" varchar,
  	"is_active" boolean DEFAULT true
  );
  
  CREATE TABLE "cors_config_custom_headers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"header" varchar NOT NULL,
  	"description" varchar
  );
  
  CREATE TABLE "cors_config" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"environment" "enum_cors_config_environment" DEFAULT 'development' NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "header_nav_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_header_nav_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_label" varchar NOT NULL
  );
  
  CREATE TABLE "header" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "header_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" integer,
  	"posts_id" integer
  );
  
  CREATE TABLE "footer_nav_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_footer_nav_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_label" varchar NOT NULL
  );
  
  CREATE TABLE "footer" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "footer_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" integer,
  	"posts_id" integer
  );
  
  ALTER TABLE "pages_hero_links" ADD CONSTRAINT "pages_hero_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cta_links" ADD CONSTRAINT "pages_blocks_cta_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cta" ADD CONSTRAINT "pages_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_content_columns" ADD CONSTRAINT "pages_blocks_content_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_content" ADD CONSTRAINT "pages_blocks_content_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_media_block" ADD CONSTRAINT "pages_blocks_media_block_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_media_block" ADD CONSTRAINT "pages_blocks_media_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_archive" ADD CONSTRAINT "pages_blocks_archive_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_form_block" ADD CONSTRAINT "pages_blocks_form_block_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_form_block" ADD CONSTRAINT "pages_blocks_form_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_hero_media_id_media_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_version_hero_links" ADD CONSTRAINT "_pages_v_version_hero_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cta_links" ADD CONSTRAINT "_pages_v_blocks_cta_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cta" ADD CONSTRAINT "_pages_v_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_content_columns" ADD CONSTRAINT "_pages_v_blocks_content_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_content" ADD CONSTRAINT "_pages_v_blocks_content_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_media_block" ADD CONSTRAINT "_pages_v_blocks_media_block_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_media_block" ADD CONSTRAINT "_pages_v_blocks_media_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_archive" ADD CONSTRAINT "_pages_v_blocks_archive_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_form_block" ADD CONSTRAINT "_pages_v_blocks_form_block_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_form_block" ADD CONSTRAINT "_pages_v_blocks_form_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_hero_media_id_media_id_fk" FOREIGN KEY ("version_hero_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_populated_authors" ADD CONSTRAINT "posts_populated_authors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_version_populated_authors" ADD CONSTRAINT "_posts_v_version_populated_authors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_parent_id_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "subscriptions_history" ADD CONSTRAINT "subscriptions_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_breadcrumbs" ADD CONSTRAINT "categories_breadcrumbs_doc_id_categories_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_breadcrumbs" ADD CONSTRAINT "categories_breadcrumbs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_category_id_categories_id_fk" FOREIGN KEY ("parent_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "courses" ADD CONSTRAINT "courses_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quizzes_rels" ADD CONSTRAINT "quizzes_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quizzes_rels" ADD CONSTRAINT "quizzes_rels_questions_fk" FOREIGN KEY ("questions_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "questions_options" ADD CONSTRAINT "questions_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "questions_tags" ADD CONSTRAINT "questions_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "questions_validation_issues" ADD CONSTRAINT "questions_validation_issues_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "questions" ADD CONSTRAINT "questions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "questions" ADD CONSTRAINT "questions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "questions" ADD CONSTRAINT "questions_validated_by_id_users_id_fk" FOREIGN KEY ("validated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quiz_submissions_answers" ADD CONSTRAINT "quiz_submissions_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quiz_submissions_answers" ADD CONSTRAINT "quiz_submissions_answers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quiz_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quiz_submissions" ADD CONSTRAINT "quiz_submissions_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quiz_submissions" ADD CONSTRAINT "quiz_submissions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "study_sessions_steps" ADD CONSTRAINT "study_sessions_steps_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "study_sessions_steps" ADD CONSTRAINT "study_sessions_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."study_sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_context_course_id_courses_id_fk" FOREIGN KEY ("context_course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "badges_role_visibility" ADD CONSTRAINT "badges_role_visibility_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "badges" ADD CONSTRAINT "badges_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "subscription_plans_features" ADD CONSTRAINT "subscription_plans_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."subscription_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "subscription_plans_limitations" ADD CONSTRAINT "subscription_plans_limitations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."subscription_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tenants" ADD CONSTRAINT "tenants_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "system_metrics" ADD CONSTRAINT "system_metrics_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conversations_messages" ADD CONSTRAINT "conversations_messages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conversations" ADD CONSTRAINT "conversations_context_course_id_courses_id_fk" FOREIGN KEY ("context_course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "adaptive_quiz_sessions" ADD CONSTRAINT "adaptive_quiz_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "adaptive_quiz_sessions_rels" ADD CONSTRAINT "adaptive_quiz_sessions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."adaptive_quiz_sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "adaptive_quiz_sessions_rels" ADD CONSTRAINT "adaptive_quiz_sessions_rels_questions_fk" FOREIGN KEY ("questions_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "adaptive_quiz_sessions_rels" ADD CONSTRAINT "adaptive_quiz_sessions_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "adaptive_quiz_results_category_results" ADD CONSTRAINT "adaptive_quiz_results_category_results_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "adaptive_quiz_results_category_results" ADD CONSTRAINT "adaptive_quiz_results_category_results_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."adaptive_quiz_results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "adaptive_quiz_results_recommendations" ADD CONSTRAINT "adaptive_quiz_results_recommendations_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "adaptive_quiz_results_recommendations" ADD CONSTRAINT "adaptive_quiz_results_recommendations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."adaptive_quiz_results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "adaptive_quiz_results_improvement_areas" ADD CONSTRAINT "adaptive_quiz_results_improvement_areas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."adaptive_quiz_results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "adaptive_quiz_results_strength_areas" ADD CONSTRAINT "adaptive_quiz_results_strength_areas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."adaptive_quiz_results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "adaptive_quiz_results" ADD CONSTRAINT "adaptive_quiz_results_session_id_adaptive_quiz_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."adaptive_quiz_sessions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "adaptive_quiz_results" ADD CONSTRAINT "adaptive_quiz_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "user_performances_category_performances" ADD CONSTRAINT "user_performances_category_performances_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."user_performances"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "user_performances_weakest_categories" ADD CONSTRAINT "user_performances_weakest_categories_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."user_performances"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "user_performances_strongest_categories" ADD CONSTRAINT "user_performances_strongest_categories_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."user_performances"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "user_performances" ADD CONSTRAINT "user_performances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "generationlogs_result_question_ids" ADD CONSTRAINT "generationlogs_result_question_ids_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."generationlogs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "generationlogs" ADD CONSTRAINT "generationlogs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
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
  ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "analytics_sessions_conversion_goals" ADD CONSTRAINT "analytics_sessions_conversion_goals_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."analytics_sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "analytics_sessions" ADD CONSTRAINT "analytics_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_checkbox" ADD CONSTRAINT "forms_blocks_checkbox_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_country" ADD CONSTRAINT "forms_blocks_country_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_email" ADD CONSTRAINT "forms_blocks_email_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_message" ADD CONSTRAINT "forms_blocks_message_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_number" ADD CONSTRAINT "forms_blocks_number_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_select_options" ADD CONSTRAINT "forms_blocks_select_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_select"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_select" ADD CONSTRAINT "forms_blocks_select_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_state" ADD CONSTRAINT "forms_blocks_state_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_text" ADD CONSTRAINT "forms_blocks_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_textarea" ADD CONSTRAINT "forms_blocks_textarea_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_emails" ADD CONSTRAINT "forms_emails_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "form_submissions_submission_data" ADD CONSTRAINT "form_submissions_submission_data_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "search_categories" ADD CONSTRAINT "search_categories_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."search"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "search" ADD CONSTRAINT "search_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "search_rels" ADD CONSTRAINT "search_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."search"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "search_rels" ADD CONSTRAINT "search_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_subscriptions_fk" FOREIGN KEY ("subscriptions_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_webhook_retry_queue_fk" FOREIGN KEY ("webhook_retry_queue_id") REFERENCES "public"."webhook_retry_queue"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_courses_fk" FOREIGN KEY ("courses_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_quizzes_fk" FOREIGN KEY ("quizzes_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_questions_fk" FOREIGN KEY ("questions_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_quiz_submissions_fk" FOREIGN KEY ("quiz_submissions_id") REFERENCES "public"."quiz_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_study_sessions_fk" FOREIGN KEY ("study_sessions_id") REFERENCES "public"."study_sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_badges_fk" FOREIGN KEY ("badges_id") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_color_schemes_fk" FOREIGN KEY ("color_schemes_id") REFERENCES "public"."color_schemes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_subscription_plans_fk" FOREIGN KEY ("subscription_plans_id") REFERENCES "public"."subscription_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tenants_fk" FOREIGN KEY ("tenants_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_system_metrics_fk" FOREIGN KEY ("system_metrics_id") REFERENCES "public"."system_metrics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_conversations_fk" FOREIGN KEY ("conversations_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_adaptive_quiz_sessions_fk" FOREIGN KEY ("adaptive_quiz_sessions_id") REFERENCES "public"."adaptive_quiz_sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_adaptive_quiz_results_fk" FOREIGN KEY ("adaptive_quiz_results_id") REFERENCES "public"."adaptive_quiz_results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_user_performances_fk" FOREIGN KEY ("user_performances_id") REFERENCES "public"."user_performances"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_generationlogs_fk" FOREIGN KEY ("generationlogs_id") REFERENCES "public"."generationlogs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_import_jobs_fk" FOREIGN KEY ("import_jobs_id") REFERENCES "public"."import_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_flashcards_fk" FOREIGN KEY ("flashcards_id") REFERENCES "public"."flashcards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_flashcard_decks_fk" FOREIGN KEY ("flashcard_decks_id") REFERENCES "public"."flashcard_decks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_learning_paths_fk" FOREIGN KEY ("learning_paths_id") REFERENCES "public"."learning_paths"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_learning_path_steps_fk" FOREIGN KEY ("learning_path_steps_id") REFERENCES "public"."learning_path_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_analytics_events_fk" FOREIGN KEY ("analytics_events_id") REFERENCES "public"."analytics_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_analytics_sessions_fk" FOREIGN KEY ("analytics_sessions_id") REFERENCES "public"."analytics_sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_redirects_fk" FOREIGN KEY ("redirects_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_forms_fk" FOREIGN KEY ("forms_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_form_submissions_fk" FOREIGN KEY ("form_submissions_id") REFERENCES "public"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_search_fk" FOREIGN KEY ("search_id") REFERENCES "public"."search"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payload_jobs_fk" FOREIGN KEY ("payload_jobs_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cors_config_allowed_origins" ADD CONSTRAINT "cors_config_allowed_origins_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cors_config"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cors_config_custom_headers" ADD CONSTRAINT "cors_config_custom_headers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cors_config"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header_nav_items" ADD CONSTRAINT "header_nav_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header_rels" ADD CONSTRAINT "header_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header_rels" ADD CONSTRAINT "header_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header_rels" ADD CONSTRAINT "header_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_nav_items" ADD CONSTRAINT "footer_nav_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_rels" ADD CONSTRAINT "footer_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_rels" ADD CONSTRAINT "footer_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_rels" ADD CONSTRAINT "footer_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_hero_links_order_idx" ON "pages_hero_links" USING btree ("_order");
  CREATE INDEX "pages_hero_links_parent_id_idx" ON "pages_hero_links" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cta_links_order_idx" ON "pages_blocks_cta_links" USING btree ("_order");
  CREATE INDEX "pages_blocks_cta_links_parent_id_idx" ON "pages_blocks_cta_links" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cta_order_idx" ON "pages_blocks_cta" USING btree ("_order");
  CREATE INDEX "pages_blocks_cta_parent_id_idx" ON "pages_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cta_path_idx" ON "pages_blocks_cta" USING btree ("_path");
  CREATE INDEX "pages_blocks_content_columns_order_idx" ON "pages_blocks_content_columns" USING btree ("_order");
  CREATE INDEX "pages_blocks_content_columns_parent_id_idx" ON "pages_blocks_content_columns" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_content_order_idx" ON "pages_blocks_content" USING btree ("_order");
  CREATE INDEX "pages_blocks_content_parent_id_idx" ON "pages_blocks_content" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_content_path_idx" ON "pages_blocks_content" USING btree ("_path");
  CREATE INDEX "pages_blocks_media_block_order_idx" ON "pages_blocks_media_block" USING btree ("_order");
  CREATE INDEX "pages_blocks_media_block_parent_id_idx" ON "pages_blocks_media_block" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_media_block_path_idx" ON "pages_blocks_media_block" USING btree ("_path");
  CREATE INDEX "pages_blocks_media_block_media_idx" ON "pages_blocks_media_block" USING btree ("media_id");
  CREATE INDEX "pages_blocks_archive_order_idx" ON "pages_blocks_archive" USING btree ("_order");
  CREATE INDEX "pages_blocks_archive_parent_id_idx" ON "pages_blocks_archive" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_archive_path_idx" ON "pages_blocks_archive" USING btree ("_path");
  CREATE INDEX "pages_blocks_form_block_order_idx" ON "pages_blocks_form_block" USING btree ("_order");
  CREATE INDEX "pages_blocks_form_block_parent_id_idx" ON "pages_blocks_form_block" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_form_block_path_idx" ON "pages_blocks_form_block" USING btree ("_path");
  CREATE INDEX "pages_blocks_form_block_form_idx" ON "pages_blocks_form_block" USING btree ("form_id");
  CREATE INDEX "pages_hero_hero_media_idx" ON "pages" USING btree ("hero_media_id");
  CREATE INDEX "pages_meta_meta_image_idx" ON "pages" USING btree ("meta_image_id");
  CREATE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");
  CREATE INDEX "pages_rels_order_idx" ON "pages_rels" USING btree ("order");
  CREATE INDEX "pages_rels_parent_idx" ON "pages_rels" USING btree ("parent_id");
  CREATE INDEX "pages_rels_path_idx" ON "pages_rels" USING btree ("path");
  CREATE INDEX "pages_rels_pages_id_idx" ON "pages_rels" USING btree ("pages_id");
  CREATE INDEX "pages_rels_posts_id_idx" ON "pages_rels" USING btree ("posts_id");
  CREATE INDEX "pages_rels_categories_id_idx" ON "pages_rels" USING btree ("categories_id");
  CREATE INDEX "_pages_v_version_hero_links_order_idx" ON "_pages_v_version_hero_links" USING btree ("_order");
  CREATE INDEX "_pages_v_version_hero_links_parent_id_idx" ON "_pages_v_version_hero_links" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_links_order_idx" ON "_pages_v_blocks_cta_links" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cta_links_parent_id_idx" ON "_pages_v_blocks_cta_links" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_order_idx" ON "_pages_v_blocks_cta" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cta_parent_id_idx" ON "_pages_v_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_path_idx" ON "_pages_v_blocks_cta" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_content_columns_order_idx" ON "_pages_v_blocks_content_columns" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_content_columns_parent_id_idx" ON "_pages_v_blocks_content_columns" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_content_order_idx" ON "_pages_v_blocks_content" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_content_parent_id_idx" ON "_pages_v_blocks_content" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_content_path_idx" ON "_pages_v_blocks_content" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_media_block_order_idx" ON "_pages_v_blocks_media_block" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_media_block_parent_id_idx" ON "_pages_v_blocks_media_block" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_media_block_path_idx" ON "_pages_v_blocks_media_block" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_media_block_media_idx" ON "_pages_v_blocks_media_block" USING btree ("media_id");
  CREATE INDEX "_pages_v_blocks_archive_order_idx" ON "_pages_v_blocks_archive" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_archive_parent_id_idx" ON "_pages_v_blocks_archive" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_archive_path_idx" ON "_pages_v_blocks_archive" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_form_block_order_idx" ON "_pages_v_blocks_form_block" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_form_block_parent_id_idx" ON "_pages_v_blocks_form_block" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_form_block_path_idx" ON "_pages_v_blocks_form_block" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_form_block_form_idx" ON "_pages_v_blocks_form_block" USING btree ("form_id");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_hero_version_hero_media_idx" ON "_pages_v" USING btree ("version_hero_media_id");
  CREATE INDEX "_pages_v_version_meta_version_meta_image_idx" ON "_pages_v" USING btree ("version_meta_image_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");
  CREATE INDEX "_pages_v_autosave_idx" ON "_pages_v" USING btree ("autosave");
  CREATE INDEX "_pages_v_rels_order_idx" ON "_pages_v_rels" USING btree ("order");
  CREATE INDEX "_pages_v_rels_parent_idx" ON "_pages_v_rels" USING btree ("parent_id");
  CREATE INDEX "_pages_v_rels_path_idx" ON "_pages_v_rels" USING btree ("path");
  CREATE INDEX "_pages_v_rels_pages_id_idx" ON "_pages_v_rels" USING btree ("pages_id");
  CREATE INDEX "_pages_v_rels_posts_id_idx" ON "_pages_v_rels" USING btree ("posts_id");
  CREATE INDEX "_pages_v_rels_categories_id_idx" ON "_pages_v_rels" USING btree ("categories_id");
  CREATE INDEX "posts_populated_authors_order_idx" ON "posts_populated_authors" USING btree ("_order");
  CREATE INDEX "posts_populated_authors_parent_id_idx" ON "posts_populated_authors" USING btree ("_parent_id");
  CREATE INDEX "posts_hero_image_idx" ON "posts" USING btree ("hero_image_id");
  CREATE INDEX "posts_meta_meta_image_idx" ON "posts" USING btree ("meta_image_id");
  CREATE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");
  CREATE INDEX "posts_updated_at_idx" ON "posts" USING btree ("updated_at");
  CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");
  CREATE INDEX "posts__status_idx" ON "posts" USING btree ("_status");
  CREATE INDEX "posts_rels_order_idx" ON "posts_rels" USING btree ("order");
  CREATE INDEX "posts_rels_parent_idx" ON "posts_rels" USING btree ("parent_id");
  CREATE INDEX "posts_rels_path_idx" ON "posts_rels" USING btree ("path");
  CREATE INDEX "posts_rels_posts_id_idx" ON "posts_rels" USING btree ("posts_id");
  CREATE INDEX "posts_rels_categories_id_idx" ON "posts_rels" USING btree ("categories_id");
  CREATE INDEX "posts_rels_users_id_idx" ON "posts_rels" USING btree ("users_id");
  CREATE INDEX "_posts_v_version_populated_authors_order_idx" ON "_posts_v_version_populated_authors" USING btree ("_order");
  CREATE INDEX "_posts_v_version_populated_authors_parent_id_idx" ON "_posts_v_version_populated_authors" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_parent_idx" ON "_posts_v" USING btree ("parent_id");
  CREATE INDEX "_posts_v_version_version_hero_image_idx" ON "_posts_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_posts_v_version_meta_version_meta_image_idx" ON "_posts_v" USING btree ("version_meta_image_id");
  CREATE INDEX "_posts_v_version_version_slug_idx" ON "_posts_v" USING btree ("version_slug");
  CREATE INDEX "_posts_v_version_version_updated_at_idx" ON "_posts_v" USING btree ("version_updated_at");
  CREATE INDEX "_posts_v_version_version_created_at_idx" ON "_posts_v" USING btree ("version_created_at");
  CREATE INDEX "_posts_v_version_version__status_idx" ON "_posts_v" USING btree ("version__status");
  CREATE INDEX "_posts_v_created_at_idx" ON "_posts_v" USING btree ("created_at");
  CREATE INDEX "_posts_v_updated_at_idx" ON "_posts_v" USING btree ("updated_at");
  CREATE INDEX "_posts_v_latest_idx" ON "_posts_v" USING btree ("latest");
  CREATE INDEX "_posts_v_autosave_idx" ON "_posts_v" USING btree ("autosave");
  CREATE INDEX "_posts_v_rels_order_idx" ON "_posts_v_rels" USING btree ("order");
  CREATE INDEX "_posts_v_rels_parent_idx" ON "_posts_v_rels" USING btree ("parent_id");
  CREATE INDEX "_posts_v_rels_path_idx" ON "_posts_v_rels" USING btree ("path");
  CREATE INDEX "_posts_v_rels_posts_id_idx" ON "_posts_v_rels" USING btree ("posts_id");
  CREATE INDEX "_posts_v_rels_categories_id_idx" ON "_posts_v_rels" USING btree ("categories_id");
  CREATE INDEX "_posts_v_rels_users_id_idx" ON "_posts_v_rels" USING btree ("users_id");
  CREATE INDEX "media_user_idx" ON "media" USING btree ("user_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_square_sizes_square_filename_idx" ON "media" USING btree ("sizes_square_filename");
  CREATE INDEX "media_sizes_small_sizes_small_filename_idx" ON "media" USING btree ("sizes_small_filename");
  CREATE INDEX "media_sizes_medium_sizes_medium_filename_idx" ON "media" USING btree ("sizes_medium_filename");
  CREATE INDEX "media_sizes_large_sizes_large_filename_idx" ON "media" USING btree ("sizes_large_filename");
  CREATE INDEX "media_sizes_xlarge_sizes_xlarge_filename_idx" ON "media" USING btree ("sizes_xlarge_filename");
  CREATE INDEX "media_sizes_og_sizes_og_filename_idx" ON "media" USING btree ("sizes_og_filename");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "subscriptions_history_order_idx" ON "subscriptions_history" USING btree ("_order");
  CREATE INDEX "subscriptions_history_parent_id_idx" ON "subscriptions_history" USING btree ("_parent_id");
  CREATE INDEX "subscriptions_user_idx" ON "subscriptions" USING btree ("user_id");
  CREATE UNIQUE INDEX "subscriptions_subscription_id_idx" ON "subscriptions" USING btree ("subscription_id");
  CREATE INDEX "subscriptions_updated_at_idx" ON "subscriptions" USING btree ("updated_at");
  CREATE INDEX "subscriptions_created_at_idx" ON "subscriptions" USING btree ("created_at");
  CREATE UNIQUE INDEX "webhook_retry_queue_event_id_idx" ON "webhook_retry_queue" USING btree ("event_id");
  CREATE INDEX "webhook_retry_queue_updated_at_idx" ON "webhook_retry_queue" USING btree ("updated_at");
  CREATE INDEX "webhook_retry_queue_created_at_idx" ON "webhook_retry_queue" USING btree ("created_at");
  CREATE INDEX "categories_breadcrumbs_order_idx" ON "categories_breadcrumbs" USING btree ("_order");
  CREATE INDEX "categories_breadcrumbs_parent_id_idx" ON "categories_breadcrumbs" USING btree ("_parent_id");
  CREATE INDEX "categories_breadcrumbs_doc_idx" ON "categories_breadcrumbs" USING btree ("doc_id");
  CREATE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");
  CREATE INDEX "categories_parent_category_idx" ON "categories" USING btree ("parent_category_id");
  CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");
  CREATE INDEX "categories_updated_at_idx" ON "categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "categories" USING btree ("created_at");
  CREATE INDEX "courses_author_idx" ON "courses" USING btree ("author_id");
  CREATE INDEX "courses_updated_at_idx" ON "courses" USING btree ("updated_at");
  CREATE INDEX "courses_created_at_idx" ON "courses" USING btree ("created_at");
  CREATE INDEX "quizzes_title_idx" ON "quizzes" USING btree ("title");
  CREATE INDEX "quizzes_course_idx" ON "quizzes" USING btree ("course_id");
  CREATE INDEX "quizzes_updated_at_idx" ON "quizzes" USING btree ("updated_at");
  CREATE INDEX "quizzes_created_at_idx" ON "quizzes" USING btree ("created_at");
  CREATE INDEX "quizzes_rels_order_idx" ON "quizzes_rels" USING btree ("order");
  CREATE INDEX "quizzes_rels_parent_idx" ON "quizzes_rels" USING btree ("parent_id");
  CREATE INDEX "quizzes_rels_path_idx" ON "quizzes_rels" USING btree ("path");
  CREATE INDEX "quizzes_rels_questions_id_idx" ON "quizzes_rels" USING btree ("questions_id");
  CREATE INDEX "questions_options_order_idx" ON "questions_options" USING btree ("_order");
  CREATE INDEX "questions_options_parent_id_idx" ON "questions_options" USING btree ("_parent_id");
  CREATE INDEX "questions_tags_order_idx" ON "questions_tags" USING btree ("_order");
  CREATE INDEX "questions_tags_parent_id_idx" ON "questions_tags" USING btree ("_parent_id");
  CREATE INDEX "questions_validation_issues_order_idx" ON "questions_validation_issues" USING btree ("_order");
  CREATE INDEX "questions_validation_issues_parent_id_idx" ON "questions_validation_issues" USING btree ("_parent_id");
  CREATE INDEX "questions_course_idx" ON "questions" USING btree ("course_id");
  CREATE INDEX "questions_category_idx" ON "questions" USING btree ("category_id");
  CREATE INDEX "questions_validated_by_idx" ON "questions" USING btree ("validated_by_id");
  CREATE INDEX "questions_updated_at_idx" ON "questions" USING btree ("updated_at");
  CREATE INDEX "questions_created_at_idx" ON "questions" USING btree ("created_at");
  CREATE INDEX "quiz_submissions_answers_order_idx" ON "quiz_submissions_answers" USING btree ("_order");
  CREATE INDEX "quiz_submissions_answers_parent_id_idx" ON "quiz_submissions_answers" USING btree ("_parent_id");
  CREATE INDEX "quiz_submissions_answers_question_idx" ON "quiz_submissions_answers" USING btree ("question_id");
  CREATE INDEX "quiz_submissions_quiz_idx" ON "quiz_submissions" USING btree ("quiz_id");
  CREATE INDEX "quiz_submissions_student_idx" ON "quiz_submissions" USING btree ("student_id");
  CREATE INDEX "quiz_submissions_updated_at_idx" ON "quiz_submissions" USING btree ("updated_at");
  CREATE INDEX "quiz_submissions_created_at_idx" ON "quiz_submissions" USING btree ("created_at");
  CREATE INDEX "study_sessions_steps_order_idx" ON "study_sessions_steps" USING btree ("_order");
  CREATE INDEX "study_sessions_steps_parent_id_idx" ON "study_sessions_steps" USING btree ("_parent_id");
  CREATE INDEX "study_sessions_steps_quiz_idx" ON "study_sessions_steps" USING btree ("quiz_id");
  CREATE INDEX "study_sessions_user_idx" ON "study_sessions" USING btree ("user_id");
  CREATE INDEX "study_sessions_context_context_course_idx" ON "study_sessions" USING btree ("context_course_id");
  CREATE INDEX "study_sessions_updated_at_idx" ON "study_sessions" USING btree ("updated_at");
  CREATE INDEX "study_sessions_created_at_idx" ON "study_sessions" USING btree ("created_at");
  CREATE INDEX "badges_role_visibility_order_idx" ON "badges_role_visibility" USING btree ("order");
  CREATE INDEX "badges_role_visibility_parent_idx" ON "badges_role_visibility" USING btree ("parent_id");
  CREATE UNIQUE INDEX "badges_name_idx" ON "badges" USING btree ("name");
  CREATE INDEX "badges_icon_idx" ON "badges" USING btree ("icon_id");
  CREATE INDEX "badges_updated_at_idx" ON "badges" USING btree ("updated_at");
  CREATE INDEX "badges_created_at_idx" ON "badges" USING btree ("created_at");
  CREATE UNIQUE INDEX "color_schemes_name_idx" ON "color_schemes" USING btree ("name");
  CREATE INDEX "color_schemes_updated_at_idx" ON "color_schemes" USING btree ("updated_at");
  CREATE INDEX "color_schemes_created_at_idx" ON "color_schemes" USING btree ("created_at");
  CREATE INDEX "subscription_plans_features_order_idx" ON "subscription_plans_features" USING btree ("_order");
  CREATE INDEX "subscription_plans_features_parent_id_idx" ON "subscription_plans_features" USING btree ("_parent_id");
  CREATE INDEX "subscription_plans_limitations_order_idx" ON "subscription_plans_limitations" USING btree ("_order");
  CREATE INDEX "subscription_plans_limitations_parent_id_idx" ON "subscription_plans_limitations" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "subscription_plans_name_idx" ON "subscription_plans" USING btree ("name");
  CREATE INDEX "subscription_plans_updated_at_idx" ON "subscription_plans" USING btree ("updated_at");
  CREATE INDEX "subscription_plans_created_at_idx" ON "subscription_plans" USING btree ("created_at");
  CREATE UNIQUE INDEX "tenants_name_idx" ON "tenants" USING btree ("name");
  CREATE UNIQUE INDEX "tenants_slug_idx" ON "tenants" USING btree ("slug");
  CREATE INDEX "tenants_plan_idx" ON "tenants" USING btree ("plan_id");
  CREATE INDEX "tenants_updated_at_idx" ON "tenants" USING btree ("updated_at");
  CREATE INDEX "tenants_created_at_idx" ON "tenants" USING btree ("created_at");
  CREATE INDEX "system_metrics_tenant_idx" ON "system_metrics" USING btree ("tenant_id");
  CREATE INDEX "system_metrics_updated_at_idx" ON "system_metrics" USING btree ("updated_at");
  CREATE INDEX "system_metrics_created_at_idx" ON "system_metrics" USING btree ("created_at");
  CREATE INDEX "conversations_messages_order_idx" ON "conversations_messages" USING btree ("_order");
  CREATE INDEX "conversations_messages_parent_id_idx" ON "conversations_messages" USING btree ("_parent_id");
  CREATE INDEX "conversations_user_idx" ON "conversations" USING btree ("user_id");
  CREATE INDEX "conversations_context_context_course_idx" ON "conversations" USING btree ("context_course_id");
  CREATE INDEX "conversations_updated_at_idx" ON "conversations" USING btree ("updated_at");
  CREATE INDEX "conversations_created_at_idx" ON "conversations" USING btree ("created_at");
  CREATE UNIQUE INDEX "adaptive_quiz_sessions_session_id_idx" ON "adaptive_quiz_sessions" USING btree ("session_id");
  CREATE INDEX "adaptive_quiz_sessions_user_idx" ON "adaptive_quiz_sessions" USING btree ("user_id");
  CREATE INDEX "adaptive_quiz_sessions_updated_at_idx" ON "adaptive_quiz_sessions" USING btree ("updated_at");
  CREATE INDEX "adaptive_quiz_sessions_created_at_idx" ON "adaptive_quiz_sessions" USING btree ("created_at");
  CREATE INDEX "adaptive_quiz_sessions_rels_order_idx" ON "adaptive_quiz_sessions_rels" USING btree ("order");
  CREATE INDEX "adaptive_quiz_sessions_rels_parent_idx" ON "adaptive_quiz_sessions_rels" USING btree ("parent_id");
  CREATE INDEX "adaptive_quiz_sessions_rels_path_idx" ON "adaptive_quiz_sessions_rels" USING btree ("path");
  CREATE INDEX "adaptive_quiz_sessions_rels_questions_id_idx" ON "adaptive_quiz_sessions_rels" USING btree ("questions_id");
  CREATE INDEX "adaptive_quiz_sessions_rels_categories_id_idx" ON "adaptive_quiz_sessions_rels" USING btree ("categories_id");
  CREATE INDEX "adaptive_quiz_results_category_results_order_idx" ON "adaptive_quiz_results_category_results" USING btree ("_order");
  CREATE INDEX "adaptive_quiz_results_category_results_parent_id_idx" ON "adaptive_quiz_results_category_results" USING btree ("_parent_id");
  CREATE INDEX "adaptive_quiz_results_category_results_category_idx" ON "adaptive_quiz_results_category_results" USING btree ("category_id");
  CREATE INDEX "adaptive_quiz_results_recommendations_order_idx" ON "adaptive_quiz_results_recommendations" USING btree ("_order");
  CREATE INDEX "adaptive_quiz_results_recommendations_parent_id_idx" ON "adaptive_quiz_results_recommendations" USING btree ("_parent_id");
  CREATE INDEX "adaptive_quiz_results_recommendations_category_idx" ON "adaptive_quiz_results_recommendations" USING btree ("category_id");
  CREATE INDEX "adaptive_quiz_results_improvement_areas_order_idx" ON "adaptive_quiz_results_improvement_areas" USING btree ("_order");
  CREATE INDEX "adaptive_quiz_results_improvement_areas_parent_id_idx" ON "adaptive_quiz_results_improvement_areas" USING btree ("_parent_id");
  CREATE INDEX "adaptive_quiz_results_strength_areas_order_idx" ON "adaptive_quiz_results_strength_areas" USING btree ("_order");
  CREATE INDEX "adaptive_quiz_results_strength_areas_parent_id_idx" ON "adaptive_quiz_results_strength_areas" USING btree ("_parent_id");
  CREATE INDEX "adaptive_quiz_results_session_idx" ON "adaptive_quiz_results" USING btree ("session_id");
  CREATE INDEX "adaptive_quiz_results_user_idx" ON "adaptive_quiz_results" USING btree ("user_id");
  CREATE INDEX "adaptive_quiz_results_updated_at_idx" ON "adaptive_quiz_results" USING btree ("updated_at");
  CREATE INDEX "adaptive_quiz_results_created_at_idx" ON "adaptive_quiz_results" USING btree ("created_at");
  CREATE INDEX "user_performances_category_performances_order_idx" ON "user_performances_category_performances" USING btree ("_order");
  CREATE INDEX "user_performances_category_performances_parent_id_idx" ON "user_performances_category_performances" USING btree ("_parent_id");
  CREATE INDEX "user_performances_category_performances_category_id_idx" ON "user_performances_category_performances" USING btree ("category_id");
  CREATE INDEX "user_performances_weakest_categories_order_idx" ON "user_performances_weakest_categories" USING btree ("_order");
  CREATE INDEX "user_performances_weakest_categories_parent_id_idx" ON "user_performances_weakest_categories" USING btree ("_parent_id");
  CREATE INDEX "user_performances_strongest_categories_order_idx" ON "user_performances_strongest_categories" USING btree ("_order");
  CREATE INDEX "user_performances_strongest_categories_parent_id_idx" ON "user_performances_strongest_categories" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "user_performances_user_idx" ON "user_performances" USING btree ("user_id");
  CREATE INDEX "user_performances_updated_at_idx" ON "user_performances" USING btree ("updated_at");
  CREATE INDEX "user_performances_created_at_idx" ON "user_performances" USING btree ("created_at");
  CREATE INDEX "generationlogs_result_question_ids_order_idx" ON "generationlogs_result_question_ids" USING btree ("_order");
  CREATE INDEX "generationlogs_result_question_ids_parent_id_idx" ON "generationlogs_result_question_ids" USING btree ("_parent_id");
  CREATE INDEX "generationlogs_user_idx" ON "generationlogs" USING btree ("user_id");
  CREATE INDEX "generationlogs_updated_at_idx" ON "generationlogs" USING btree ("updated_at");
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
  CREATE INDEX "analytics_events_user_idx" ON "analytics_events" USING btree ("user_id");
  CREATE INDEX "analytics_events_updated_at_idx" ON "analytics_events" USING btree ("updated_at");
  CREATE INDEX "analytics_events_created_at_idx" ON "analytics_events" USING btree ("created_at");
  CREATE INDEX "eventName_timestamp_idx" ON "analytics_events" USING btree ("event_name","timestamp");
  CREATE INDEX "user_timestamp_idx" ON "analytics_events" USING btree ("user_id","timestamp");
  CREATE INDEX "sessionId_timestamp_idx" ON "analytics_events" USING btree ("session_id","timestamp");
  CREATE INDEX "campaign_utm_source_campaign_utm_campaign_idx" ON "analytics_events" USING btree ("campaign_utm_source","campaign_utm_campaign");
  CREATE INDEX "analytics_sessions_conversion_goals_order_idx" ON "analytics_sessions_conversion_goals" USING btree ("_order");
  CREATE INDEX "analytics_sessions_conversion_goals_parent_id_idx" ON "analytics_sessions_conversion_goals" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "analytics_sessions_session_id_idx" ON "analytics_sessions" USING btree ("session_id");
  CREATE INDEX "analytics_sessions_user_idx" ON "analytics_sessions" USING btree ("user_id");
  CREATE INDEX "analytics_sessions_updated_at_idx" ON "analytics_sessions" USING btree ("updated_at");
  CREATE INDEX "analytics_sessions_created_at_idx" ON "analytics_sessions" USING btree ("created_at");
  CREATE UNIQUE INDEX "redirects_from_idx" ON "redirects" USING btree ("from");
  CREATE INDEX "redirects_updated_at_idx" ON "redirects" USING btree ("updated_at");
  CREATE INDEX "redirects_created_at_idx" ON "redirects" USING btree ("created_at");
  CREATE INDEX "redirects_rels_order_idx" ON "redirects_rels" USING btree ("order");
  CREATE INDEX "redirects_rels_parent_idx" ON "redirects_rels" USING btree ("parent_id");
  CREATE INDEX "redirects_rels_path_idx" ON "redirects_rels" USING btree ("path");
  CREATE INDEX "redirects_rels_pages_id_idx" ON "redirects_rels" USING btree ("pages_id");
  CREATE INDEX "redirects_rels_posts_id_idx" ON "redirects_rels" USING btree ("posts_id");
  CREATE INDEX "forms_blocks_checkbox_order_idx" ON "forms_blocks_checkbox" USING btree ("_order");
  CREATE INDEX "forms_blocks_checkbox_parent_id_idx" ON "forms_blocks_checkbox" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_checkbox_path_idx" ON "forms_blocks_checkbox" USING btree ("_path");
  CREATE INDEX "forms_blocks_country_order_idx" ON "forms_blocks_country" USING btree ("_order");
  CREATE INDEX "forms_blocks_country_parent_id_idx" ON "forms_blocks_country" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_country_path_idx" ON "forms_blocks_country" USING btree ("_path");
  CREATE INDEX "forms_blocks_email_order_idx" ON "forms_blocks_email" USING btree ("_order");
  CREATE INDEX "forms_blocks_email_parent_id_idx" ON "forms_blocks_email" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_email_path_idx" ON "forms_blocks_email" USING btree ("_path");
  CREATE INDEX "forms_blocks_message_order_idx" ON "forms_blocks_message" USING btree ("_order");
  CREATE INDEX "forms_blocks_message_parent_id_idx" ON "forms_blocks_message" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_message_path_idx" ON "forms_blocks_message" USING btree ("_path");
  CREATE INDEX "forms_blocks_number_order_idx" ON "forms_blocks_number" USING btree ("_order");
  CREATE INDEX "forms_blocks_number_parent_id_idx" ON "forms_blocks_number" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_number_path_idx" ON "forms_blocks_number" USING btree ("_path");
  CREATE INDEX "forms_blocks_select_options_order_idx" ON "forms_blocks_select_options" USING btree ("_order");
  CREATE INDEX "forms_blocks_select_options_parent_id_idx" ON "forms_blocks_select_options" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_select_order_idx" ON "forms_blocks_select" USING btree ("_order");
  CREATE INDEX "forms_blocks_select_parent_id_idx" ON "forms_blocks_select" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_select_path_idx" ON "forms_blocks_select" USING btree ("_path");
  CREATE INDEX "forms_blocks_state_order_idx" ON "forms_blocks_state" USING btree ("_order");
  CREATE INDEX "forms_blocks_state_parent_id_idx" ON "forms_blocks_state" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_state_path_idx" ON "forms_blocks_state" USING btree ("_path");
  CREATE INDEX "forms_blocks_text_order_idx" ON "forms_blocks_text" USING btree ("_order");
  CREATE INDEX "forms_blocks_text_parent_id_idx" ON "forms_blocks_text" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_text_path_idx" ON "forms_blocks_text" USING btree ("_path");
  CREATE INDEX "forms_blocks_textarea_order_idx" ON "forms_blocks_textarea" USING btree ("_order");
  CREATE INDEX "forms_blocks_textarea_parent_id_idx" ON "forms_blocks_textarea" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_textarea_path_idx" ON "forms_blocks_textarea" USING btree ("_path");
  CREATE INDEX "forms_emails_order_idx" ON "forms_emails" USING btree ("_order");
  CREATE INDEX "forms_emails_parent_id_idx" ON "forms_emails" USING btree ("_parent_id");
  CREATE INDEX "forms_updated_at_idx" ON "forms" USING btree ("updated_at");
  CREATE INDEX "forms_created_at_idx" ON "forms" USING btree ("created_at");
  CREATE INDEX "form_submissions_submission_data_order_idx" ON "form_submissions_submission_data" USING btree ("_order");
  CREATE INDEX "form_submissions_submission_data_parent_id_idx" ON "form_submissions_submission_data" USING btree ("_parent_id");
  CREATE INDEX "form_submissions_form_idx" ON "form_submissions" USING btree ("form_id");
  CREATE INDEX "form_submissions_updated_at_idx" ON "form_submissions" USING btree ("updated_at");
  CREATE INDEX "form_submissions_created_at_idx" ON "form_submissions" USING btree ("created_at");
  CREATE INDEX "search_categories_order_idx" ON "search_categories" USING btree ("_order");
  CREATE INDEX "search_categories_parent_id_idx" ON "search_categories" USING btree ("_parent_id");
  CREATE INDEX "search_slug_idx" ON "search" USING btree ("slug");
  CREATE INDEX "search_meta_meta_image_idx" ON "search" USING btree ("meta_image_id");
  CREATE INDEX "search_updated_at_idx" ON "search" USING btree ("updated_at");
  CREATE INDEX "search_created_at_idx" ON "search" USING btree ("created_at");
  CREATE INDEX "search_rels_order_idx" ON "search_rels" USING btree ("order");
  CREATE INDEX "search_rels_parent_idx" ON "search_rels" USING btree ("parent_id");
  CREATE INDEX "search_rels_path_idx" ON "search_rels" USING btree ("path");
  CREATE INDEX "search_rels_posts_id_idx" ON "search_rels" USING btree ("posts_id");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("posts_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_subscriptions_id_idx" ON "payload_locked_documents_rels" USING btree ("subscriptions_id");
  CREATE INDEX "payload_locked_documents_rels_webhook_retry_queue_id_idx" ON "payload_locked_documents_rels" USING btree ("webhook_retry_queue_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_courses_id_idx" ON "payload_locked_documents_rels" USING btree ("courses_id");
  CREATE INDEX "payload_locked_documents_rels_quizzes_id_idx" ON "payload_locked_documents_rels" USING btree ("quizzes_id");
  CREATE INDEX "payload_locked_documents_rels_questions_id_idx" ON "payload_locked_documents_rels" USING btree ("questions_id");
  CREATE INDEX "payload_locked_documents_rels_quiz_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("quiz_submissions_id");
  CREATE INDEX "payload_locked_documents_rels_study_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("study_sessions_id");
  CREATE INDEX "payload_locked_documents_rels_badges_id_idx" ON "payload_locked_documents_rels" USING btree ("badges_id");
  CREATE INDEX "payload_locked_documents_rels_color_schemes_id_idx" ON "payload_locked_documents_rels" USING btree ("color_schemes_id");
  CREATE INDEX "payload_locked_documents_rels_subscription_plans_id_idx" ON "payload_locked_documents_rels" USING btree ("subscription_plans_id");
  CREATE INDEX "payload_locked_documents_rels_tenants_id_idx" ON "payload_locked_documents_rels" USING btree ("tenants_id");
  CREATE INDEX "payload_locked_documents_rels_system_metrics_id_idx" ON "payload_locked_documents_rels" USING btree ("system_metrics_id");
  CREATE INDEX "payload_locked_documents_rels_conversations_id_idx" ON "payload_locked_documents_rels" USING btree ("conversations_id");
  CREATE INDEX "payload_locked_documents_rels_adaptive_quiz_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("adaptive_quiz_sessions_id");
  CREATE INDEX "payload_locked_documents_rels_adaptive_quiz_results_id_idx" ON "payload_locked_documents_rels" USING btree ("adaptive_quiz_results_id");
  CREATE INDEX "payload_locked_documents_rels_user_performances_id_idx" ON "payload_locked_documents_rels" USING btree ("user_performances_id");
  CREATE INDEX "payload_locked_documents_rels_generationlogs_id_idx" ON "payload_locked_documents_rels" USING btree ("generationlogs_id");
  CREATE INDEX "payload_locked_documents_rels_import_jobs_id_idx" ON "payload_locked_documents_rels" USING btree ("import_jobs_id");
  CREATE INDEX "payload_locked_documents_rels_flashcards_id_idx" ON "payload_locked_documents_rels" USING btree ("flashcards_id");
  CREATE INDEX "payload_locked_documents_rels_flashcard_decks_id_idx" ON "payload_locked_documents_rels" USING btree ("flashcard_decks_id");
  CREATE INDEX "payload_locked_documents_rels_learning_paths_id_idx" ON "payload_locked_documents_rels" USING btree ("learning_paths_id");
  CREATE INDEX "payload_locked_documents_rels_learning_path_steps_id_idx" ON "payload_locked_documents_rels" USING btree ("learning_path_steps_id");
  CREATE INDEX "payload_locked_documents_rels_analytics_events_id_idx" ON "payload_locked_documents_rels" USING btree ("analytics_events_id");
  CREATE INDEX "payload_locked_documents_rels_analytics_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("analytics_sessions_id");
  CREATE INDEX "payload_locked_documents_rels_redirects_id_idx" ON "payload_locked_documents_rels" USING btree ("redirects_id");
  CREATE INDEX "payload_locked_documents_rels_forms_id_idx" ON "payload_locked_documents_rels" USING btree ("forms_id");
  CREATE INDEX "payload_locked_documents_rels_form_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("form_submissions_id");
  CREATE INDEX "payload_locked_documents_rels_search_id_idx" ON "payload_locked_documents_rels" USING btree ("search_id");
  CREATE INDEX "payload_locked_documents_rels_payload_jobs_id_idx" ON "payload_locked_documents_rels" USING btree ("payload_jobs_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "cors_config_allowed_origins_order_idx" ON "cors_config_allowed_origins" USING btree ("_order");
  CREATE INDEX "cors_config_allowed_origins_parent_id_idx" ON "cors_config_allowed_origins" USING btree ("_parent_id");
  CREATE INDEX "cors_config_custom_headers_order_idx" ON "cors_config_custom_headers" USING btree ("_order");
  CREATE INDEX "cors_config_custom_headers_parent_id_idx" ON "cors_config_custom_headers" USING btree ("_parent_id");
  CREATE INDEX "header_nav_items_order_idx" ON "header_nav_items" USING btree ("_order");
  CREATE INDEX "header_nav_items_parent_id_idx" ON "header_nav_items" USING btree ("_parent_id");
  CREATE INDEX "header_rels_order_idx" ON "header_rels" USING btree ("order");
  CREATE INDEX "header_rels_parent_idx" ON "header_rels" USING btree ("parent_id");
  CREATE INDEX "header_rels_path_idx" ON "header_rels" USING btree ("path");
  CREATE INDEX "header_rels_pages_id_idx" ON "header_rels" USING btree ("pages_id");
  CREATE INDEX "header_rels_posts_id_idx" ON "header_rels" USING btree ("posts_id");
  CREATE INDEX "footer_nav_items_order_idx" ON "footer_nav_items" USING btree ("_order");
  CREATE INDEX "footer_nav_items_parent_id_idx" ON "footer_nav_items" USING btree ("_parent_id");
  CREATE INDEX "footer_rels_order_idx" ON "footer_rels" USING btree ("order");
  CREATE INDEX "footer_rels_parent_idx" ON "footer_rels" USING btree ("parent_id");
  CREATE INDEX "footer_rels_path_idx" ON "footer_rels" USING btree ("path");
  CREATE INDEX "footer_rels_pages_id_idx" ON "footer_rels" USING btree ("pages_id");
  CREATE INDEX "footer_rels_posts_id_idx" ON "footer_rels" USING btree ("posts_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pages_hero_links" CASCADE;
  DROP TABLE "pages_blocks_cta_links" CASCADE;
  DROP TABLE "pages_blocks_cta" CASCADE;
  DROP TABLE "pages_blocks_content_columns" CASCADE;
  DROP TABLE "pages_blocks_content" CASCADE;
  DROP TABLE "pages_blocks_media_block" CASCADE;
  DROP TABLE "pages_blocks_archive" CASCADE;
  DROP TABLE "pages_blocks_form_block" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "pages_rels" CASCADE;
  DROP TABLE "_pages_v_version_hero_links" CASCADE;
  DROP TABLE "_pages_v_blocks_cta_links" CASCADE;
  DROP TABLE "_pages_v_blocks_cta" CASCADE;
  DROP TABLE "_pages_v_blocks_content_columns" CASCADE;
  DROP TABLE "_pages_v_blocks_content" CASCADE;
  DROP TABLE "_pages_v_blocks_media_block" CASCADE;
  DROP TABLE "_pages_v_blocks_archive" CASCADE;
  DROP TABLE "_pages_v_blocks_form_block" CASCADE;
  DROP TABLE "_pages_v" CASCADE;
  DROP TABLE "_pages_v_rels" CASCADE;
  DROP TABLE "posts_populated_authors" CASCADE;
  DROP TABLE "posts" CASCADE;
  DROP TABLE "posts_rels" CASCADE;
  DROP TABLE "_posts_v_version_populated_authors" CASCADE;
  DROP TABLE "_posts_v" CASCADE;
  DROP TABLE "_posts_v_rels" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "subscriptions_history" CASCADE;
  DROP TABLE "subscriptions" CASCADE;
  DROP TABLE "webhook_retry_queue" CASCADE;
  DROP TABLE "categories_breadcrumbs" CASCADE;
  DROP TABLE "categories" CASCADE;
  DROP TABLE "courses" CASCADE;
  DROP TABLE "quizzes" CASCADE;
  DROP TABLE "quizzes_rels" CASCADE;
  DROP TABLE "questions_options" CASCADE;
  DROP TABLE "questions_tags" CASCADE;
  DROP TABLE "questions_validation_issues" CASCADE;
  DROP TABLE "questions" CASCADE;
  DROP TABLE "quiz_submissions_answers" CASCADE;
  DROP TABLE "quiz_submissions" CASCADE;
  DROP TABLE "study_sessions_steps" CASCADE;
  DROP TABLE "study_sessions" CASCADE;
  DROP TABLE "badges_role_visibility" CASCADE;
  DROP TABLE "badges" CASCADE;
  DROP TABLE "color_schemes" CASCADE;
  DROP TABLE "subscription_plans_features" CASCADE;
  DROP TABLE "subscription_plans_limitations" CASCADE;
  DROP TABLE "subscription_plans" CASCADE;
  DROP TABLE "tenants" CASCADE;
  DROP TABLE "system_metrics" CASCADE;
  DROP TABLE "conversations_messages" CASCADE;
  DROP TABLE "conversations" CASCADE;
  DROP TABLE "adaptive_quiz_sessions" CASCADE;
  DROP TABLE "adaptive_quiz_sessions_rels" CASCADE;
  DROP TABLE "adaptive_quiz_results_category_results" CASCADE;
  DROP TABLE "adaptive_quiz_results_recommendations" CASCADE;
  DROP TABLE "adaptive_quiz_results_improvement_areas" CASCADE;
  DROP TABLE "adaptive_quiz_results_strength_areas" CASCADE;
  DROP TABLE "adaptive_quiz_results" CASCADE;
  DROP TABLE "user_performances_category_performances" CASCADE;
  DROP TABLE "user_performances_weakest_categories" CASCADE;
  DROP TABLE "user_performances_strongest_categories" CASCADE;
  DROP TABLE "user_performances" CASCADE;
  DROP TABLE "generationlogs_result_question_ids" CASCADE;
  DROP TABLE "generationlogs" CASCADE;
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
  DROP TABLE "analytics_events" CASCADE;
  DROP TABLE "analytics_sessions_conversion_goals" CASCADE;
  DROP TABLE "analytics_sessions" CASCADE;
  DROP TABLE "redirects" CASCADE;
  DROP TABLE "redirects_rels" CASCADE;
  DROP TABLE "forms_blocks_checkbox" CASCADE;
  DROP TABLE "forms_blocks_country" CASCADE;
  DROP TABLE "forms_blocks_email" CASCADE;
  DROP TABLE "forms_blocks_message" CASCADE;
  DROP TABLE "forms_blocks_number" CASCADE;
  DROP TABLE "forms_blocks_select_options" CASCADE;
  DROP TABLE "forms_blocks_select" CASCADE;
  DROP TABLE "forms_blocks_state" CASCADE;
  DROP TABLE "forms_blocks_text" CASCADE;
  DROP TABLE "forms_blocks_textarea" CASCADE;
  DROP TABLE "forms_emails" CASCADE;
  DROP TABLE "forms" CASCADE;
  DROP TABLE "form_submissions_submission_data" CASCADE;
  DROP TABLE "form_submissions" CASCADE;
  DROP TABLE "search_categories" CASCADE;
  DROP TABLE "search" CASCADE;
  DROP TABLE "search_rels" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "cors_config_allowed_origins" CASCADE;
  DROP TABLE "cors_config_custom_headers" CASCADE;
  DROP TABLE "cors_config" CASCADE;
  DROP TABLE "header_nav_items" CASCADE;
  DROP TABLE "header" CASCADE;
  DROP TABLE "header_rels" CASCADE;
  DROP TABLE "footer_nav_items" CASCADE;
  DROP TABLE "footer" CASCADE;
  DROP TABLE "footer_rels" CASCADE;
  DROP TYPE "public"."enum_pages_hero_links_link_type";
  DROP TYPE "public"."enum_pages_hero_links_link_appearance";
  DROP TYPE "public"."enum_pages_blocks_cta_links_link_type";
  DROP TYPE "public"."enum_pages_blocks_cta_links_link_appearance";
  DROP TYPE "public"."enum_pages_blocks_content_columns_size";
  DROP TYPE "public"."enum_pages_blocks_content_columns_link_type";
  DROP TYPE "public"."enum_pages_blocks_content_columns_link_appearance";
  DROP TYPE "public"."enum_pages_blocks_archive_populate_by";
  DROP TYPE "public"."enum_pages_blocks_archive_relation_to";
  DROP TYPE "public"."enum_pages_hero_type";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum__pages_v_version_hero_links_link_type";
  DROP TYPE "public"."enum__pages_v_version_hero_links_link_appearance";
  DROP TYPE "public"."enum__pages_v_blocks_cta_links_link_type";
  DROP TYPE "public"."enum__pages_v_blocks_cta_links_link_appearance";
  DROP TYPE "public"."enum__pages_v_blocks_content_columns_size";
  DROP TYPE "public"."enum__pages_v_blocks_content_columns_link_type";
  DROP TYPE "public"."enum__pages_v_blocks_content_columns_link_appearance";
  DROP TYPE "public"."enum__pages_v_blocks_archive_populate_by";
  DROP TYPE "public"."enum__pages_v_blocks_archive_relation_to";
  DROP TYPE "public"."enum__pages_v_version_hero_type";
  DROP TYPE "public"."enum__pages_v_version_status";
  DROP TYPE "public"."enum_posts_status";
  DROP TYPE "public"."enum__posts_v_version_status";
  DROP TYPE "public"."enum_users_study_year";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_users_subscription_status";
  DROP TYPE "public"."enum_subscriptions_history_type";
  DROP TYPE "public"."enum_subscriptions_provider";
  DROP TYPE "public"."enum_subscriptions_status";
  DROP TYPE "public"."enum_webhook_retry_queue_status";
  DROP TYPE "public"."enum_categories_level";
  DROP TYPE "public"."enum_courses_level";
  DROP TYPE "public"."enum_quizzes_quiz_type";
  DROP TYPE "public"."enum_quizzes_validation_status";
  DROP TYPE "public"."enum_questions_question_type";
  DROP TYPE "public"."enum_questions_difficulty";
  DROP TYPE "public"."enum_questions_student_level";
  DROP TYPE "public"."enum_questions_validation_status";
  DROP TYPE "public"."enum_study_sessions_steps_type";
  DROP TYPE "public"."enum_study_sessions_steps_status";
  DROP TYPE "public"."enum_study_sessions_status";
  DROP TYPE "public"."enum_study_sessions_context_difficulty";
  DROP TYPE "public"."enum_badges_role_visibility";
  DROP TYPE "public"."enum_tenants_status";
  DROP TYPE "public"."enum_tenants_settings_features";
  DROP TYPE "public"."enum_system_metrics_type";
  DROP TYPE "public"."enum_conversations_messages_role";
  DROP TYPE "public"."enum_conversations_context_difficulty";
  DROP TYPE "public"."enum_adaptive_quiz_sessions_status";
  DROP TYPE "public"."enum_adaptive_quiz_sessions_student_level";
  DROP TYPE "public"."enum_adaptive_quiz_results_recommendations_type";
  DROP TYPE "public"."enum_adaptive_quiz_results_recommendations_priority";
  DROP TYPE "public"."enum_adaptive_quiz_results_progress_comparison_trend";
  DROP TYPE "public"."enum_generationlogs_action";
  DROP TYPE "public"."enum_generationlogs_status";
  DROP TYPE "public"."enum_generationlogs_generation_config_student_level";
  DROP TYPE "public"."enum_generationlogs_generation_config_difficulty";
  DROP TYPE "public"."enum_generationlogs_result_ai_provider";
  DROP TYPE "public"."enum_generationlogs_error_type";
  DROP TYPE "public"."enum_generationlogs_metadata_environment";
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
  DROP TYPE "public"."enum_learning_path_steps_difficulty";
  DROP TYPE "public"."enum_analytics_events_source";
  DROP TYPE "public"."enum_analytics_events_device_type";
  DROP TYPE "public"."enum_analytics_sessions_device_info_type";
  DROP TYPE "public"."enum_redirects_to_type";
  DROP TYPE "public"."enum_forms_confirmation_type";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  DROP TYPE "public"."enum_cors_config_environment";
  DROP TYPE "public"."enum_header_nav_items_link_type";
  DROP TYPE "public"."enum_footer_nav_items_link_type";`)
}
