import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_products_assignment_status" AS ENUM('unknown', 'assigned', 'unassigned');
  CREATE TYPE "payload"."enum_products_wms_image_import_status" AS ENUM('pending', 'complete', 'failed', 'no-image', 'protected');
  CREATE TYPE "payload"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'import-wms-content-image');
  CREATE TYPE "payload"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "payload"."enum_payload_jobs_task_slug" AS ENUM('inline', 'import-wms-content-image');
  CREATE TYPE "payload"."enum_homepage_benefits_icon" AS ENUM('truck', 'rotate', 'card', 'shield', 'clock', 'star', 'package');
  CREATE TABLE "payload"."users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "payload"."users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"profile_photo_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"source_key" varchar,
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
  	"sizes_thumbnail_filename" varchar
  );
  
  CREATE TABLE "payload"."wms_collections" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"wms_collection_id" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"assigned" boolean DEFAULT true,
  	"wms_description" varchar,
  	"show_in_storefront" boolean DEFAULT true,
  	"show_in_menu" boolean DEFAULT true,
  	"menu_order" numeric DEFAULT 0,
  	"display_title" varchar,
  	"description" varchar,
  	"banner_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."products_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"show_in_storefront" boolean DEFAULT true NOT NULL,
  	"title" varchar NOT NULL,
  	"wms_product_id" varchar NOT NULL,
  	"assignment_status" "payload"."enum_products_assignment_status" DEFAULT 'unknown',
  	"last_synced_at" timestamp(3) with time zone,
  	"description" varchar,
  	"hide_related" boolean DEFAULT false,
  	"image_url" varchar,
  	"wms_image_import_status" "payload"."enum_products_wms_image_import_status",
  	"wms_image_source_url" varchar,
  	"wms_image_import_error" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."products_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"wms_collections_id" integer,
  	"products_id" integer
  );
  
  CREATE TABLE "payload"."payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload"."payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "payload"."enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "payload"."enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload"."payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "payload"."enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"wms_collections_id" integer,
  	"products_id" integer
  );
  
  CREATE TABLE "payload"."payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload"."payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."homepage_hero_slides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"title" varchar NOT NULL,
  	"href" varchar
  );
  
  CREATE TABLE "payload"."homepage_benefits" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" "payload"."enum_homepage_benefits_icon" DEFAULT 'truck',
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."homepage_showcase_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"collection_id" integer NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "payload"."homepage_quick_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "payload"."homepage_banners" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"name" varchar NOT NULL,
  	"designation" varchar,
  	"quote" varchar NOT NULL,
  	"bg_color" varchar DEFAULT '#101010',
  	"dark_bg" boolean DEFAULT true
  );
  
  CREATE TABLE "payload"."homepage" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_enabled" boolean DEFAULT true,
  	"benefits_enabled" boolean DEFAULT true,
  	"showcase_enabled" boolean DEFAULT true,
  	"showcase_heading" varchar DEFAULT 'The VPR Collection',
  	"showcase_fallback_id" integer,
  	"quick_links_enabled" boolean DEFAULT true,
  	"banners_enabled" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."homepage_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"wms_collections_id" integer
  );
  
  CREATE TABLE "payload"."site_settings_header_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL,
  	"external" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."site_settings_footer_quick_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL,
  	"external" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."site_settings_footer_service_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL,
  	"external" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_name" varchar DEFAULT 'VPR Collection',
  	"logo_id" integer,
  	"logo_width" numeric DEFAULT 150,
  	"favicon_id" integer,
  	"announcement_enabled" boolean DEFAULT true,
  	"announcement_text" varchar DEFAULT 'Free Shipping On Every Order!',
  	"announcement_href" varchar,
  	"warning_enabled" boolean DEFAULT true,
  	"warning_line1" varchar DEFAULT 'Warning: This product contain nicotine.',
  	"warning_line2" varchar DEFAULT 'Nicotine is an addictive chemical.',
  	"contact_phone" varchar DEFAULT '(626) 698-0098',
  	"contact_email" varchar DEFAULT 'info@vprcollection.com',
  	"contact_hours" varchar DEFAULT 'Monday - Friday
  10:00a-5:00p PST',
  	"legal_text" varchar,
  	"newsletter_form_url" varchar DEFAULT 'https://form.jotform.com/240252043265446',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."site_settings_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"wms_collections_id" integer
  );
  
  ALTER TABLE "payload"."users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."users" ADD CONSTRAINT "users_profile_photo_id_media_id_fk" FOREIGN KEY ("profile_photo_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."wms_collections" ADD CONSTRAINT "wms_collections_banner_id_media_id_fk" FOREIGN KEY ("banner_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products_images" ADD CONSTRAINT "products_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products_images" ADD CONSTRAINT "products_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products_rels" ADD CONSTRAINT "products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products_rels" ADD CONSTRAINT "products_rels_wms_collections_fk" FOREIGN KEY ("wms_collections_id") REFERENCES "payload"."wms_collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products_rels" ADD CONSTRAINT "products_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "payload"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_wms_collections_fk" FOREIGN KEY ("wms_collections_id") REFERENCES "payload"."wms_collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."homepage_hero_slides" ADD CONSTRAINT "homepage_hero_slides_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."homepage_hero_slides" ADD CONSTRAINT "homepage_hero_slides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."homepage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."homepage_benefits" ADD CONSTRAINT "homepage_benefits_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."homepage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."homepage_showcase_images" ADD CONSTRAINT "homepage_showcase_images_collection_id_wms_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "payload"."wms_collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."homepage_showcase_images" ADD CONSTRAINT "homepage_showcase_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."homepage_showcase_images" ADD CONSTRAINT "homepage_showcase_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."homepage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."homepage_quick_links" ADD CONSTRAINT "homepage_quick_links_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."homepage_quick_links" ADD CONSTRAINT "homepage_quick_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."homepage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."homepage_banners" ADD CONSTRAINT "homepage_banners_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."homepage_banners" ADD CONSTRAINT "homepage_banners_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."homepage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."homepage" ADD CONSTRAINT "homepage_showcase_fallback_id_media_id_fk" FOREIGN KEY ("showcase_fallback_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."homepage_rels" ADD CONSTRAINT "homepage_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."homepage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."homepage_rels" ADD CONSTRAINT "homepage_rels_wms_collections_fk" FOREIGN KEY ("wms_collections_id") REFERENCES "payload"."wms_collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."site_settings_header_links" ADD CONSTRAINT "site_settings_header_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."site_settings_footer_quick_links" ADD CONSTRAINT "site_settings_footer_quick_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."site_settings_footer_service_links" ADD CONSTRAINT "site_settings_footer_service_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."site_settings" ADD CONSTRAINT "site_settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."site_settings" ADD CONSTRAINT "site_settings_favicon_id_media_id_fk" FOREIGN KEY ("favicon_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."site_settings_rels" ADD CONSTRAINT "site_settings_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."site_settings_rels" ADD CONSTRAINT "site_settings_rels_wms_collections_fk" FOREIGN KEY ("wms_collections_id") REFERENCES "payload"."wms_collections"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "payload"."users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "payload"."users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_profile_photo_idx" ON "payload"."users" USING btree ("profile_photo_id");
  CREATE INDEX "users_updated_at_idx" ON "payload"."users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "payload"."users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "payload"."users" USING btree ("email");
  CREATE UNIQUE INDEX "media_source_key_idx" ON "payload"."media" USING btree ("source_key");
  CREATE INDEX "media_updated_at_idx" ON "payload"."media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "payload"."media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "payload"."media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "payload"."media" USING btree ("sizes_thumbnail_filename");
  CREATE UNIQUE INDEX "wms_collections_wms_collection_id_idx" ON "payload"."wms_collections" USING btree ("wms_collection_id");
  CREATE INDEX "wms_collections_banner_idx" ON "payload"."wms_collections" USING btree ("banner_id");
  CREATE INDEX "wms_collections_updated_at_idx" ON "payload"."wms_collections" USING btree ("updated_at");
  CREATE INDEX "wms_collections_created_at_idx" ON "payload"."wms_collections" USING btree ("created_at");
  CREATE INDEX "products_images_order_idx" ON "payload"."products_images" USING btree ("_order");
  CREATE INDEX "products_images_parent_id_idx" ON "payload"."products_images" USING btree ("_parent_id");
  CREATE INDEX "products_images_image_idx" ON "payload"."products_images" USING btree ("image_id");
  CREATE UNIQUE INDEX "products_wms_product_id_idx" ON "payload"."products" USING btree ("wms_product_id");
  CREATE INDEX "products_updated_at_idx" ON "payload"."products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "payload"."products" USING btree ("created_at");
  CREATE INDEX "products_rels_order_idx" ON "payload"."products_rels" USING btree ("order");
  CREATE INDEX "products_rels_parent_idx" ON "payload"."products_rels" USING btree ("parent_id");
  CREATE INDEX "products_rels_path_idx" ON "payload"."products_rels" USING btree ("path");
  CREATE INDEX "products_rels_wms_collections_id_idx" ON "payload"."products_rels" USING btree ("wms_collections_id");
  CREATE INDEX "products_rels_products_id_idx" ON "payload"."products_rels" USING btree ("products_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload"."payload_kv" USING btree ("key");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload"."payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload"."payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload"."payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload"."payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload"."payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload"."payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload"."payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload"."payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload"."payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload"."payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload"."payload_jobs" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload"."payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload"."payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload"."payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload"."payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload"."payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload"."payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_wms_collections_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("wms_collections_id");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload"."payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload"."payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload"."payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload"."payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload"."payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload"."payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload"."payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload"."payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload"."payload_migrations" USING btree ("created_at");
  CREATE INDEX "homepage_hero_slides_order_idx" ON "payload"."homepage_hero_slides" USING btree ("_order");
  CREATE INDEX "homepage_hero_slides_parent_id_idx" ON "payload"."homepage_hero_slides" USING btree ("_parent_id");
  CREATE INDEX "homepage_hero_slides_image_idx" ON "payload"."homepage_hero_slides" USING btree ("image_id");
  CREATE INDEX "homepage_benefits_order_idx" ON "payload"."homepage_benefits" USING btree ("_order");
  CREATE INDEX "homepage_benefits_parent_id_idx" ON "payload"."homepage_benefits" USING btree ("_parent_id");
  CREATE INDEX "homepage_showcase_images_order_idx" ON "payload"."homepage_showcase_images" USING btree ("_order");
  CREATE INDEX "homepage_showcase_images_parent_id_idx" ON "payload"."homepage_showcase_images" USING btree ("_parent_id");
  CREATE INDEX "homepage_showcase_images_collection_idx" ON "payload"."homepage_showcase_images" USING btree ("collection_id");
  CREATE INDEX "homepage_showcase_images_image_idx" ON "payload"."homepage_showcase_images" USING btree ("image_id");
  CREATE INDEX "homepage_quick_links_order_idx" ON "payload"."homepage_quick_links" USING btree ("_order");
  CREATE INDEX "homepage_quick_links_parent_id_idx" ON "payload"."homepage_quick_links" USING btree ("_parent_id");
  CREATE INDEX "homepage_quick_links_image_idx" ON "payload"."homepage_quick_links" USING btree ("image_id");
  CREATE INDEX "homepage_banners_order_idx" ON "payload"."homepage_banners" USING btree ("_order");
  CREATE INDEX "homepage_banners_parent_id_idx" ON "payload"."homepage_banners" USING btree ("_parent_id");
  CREATE INDEX "homepage_banners_image_idx" ON "payload"."homepage_banners" USING btree ("image_id");
  CREATE INDEX "homepage_showcase_fallback_idx" ON "payload"."homepage" USING btree ("showcase_fallback_id");
  CREATE INDEX "homepage_rels_order_idx" ON "payload"."homepage_rels" USING btree ("order");
  CREATE INDEX "homepage_rels_parent_idx" ON "payload"."homepage_rels" USING btree ("parent_id");
  CREATE INDEX "homepage_rels_path_idx" ON "payload"."homepage_rels" USING btree ("path");
  CREATE INDEX "homepage_rels_wms_collections_id_idx" ON "payload"."homepage_rels" USING btree ("wms_collections_id");
  CREATE INDEX "site_settings_header_links_order_idx" ON "payload"."site_settings_header_links" USING btree ("_order");
  CREATE INDEX "site_settings_header_links_parent_id_idx" ON "payload"."site_settings_header_links" USING btree ("_parent_id");
  CREATE INDEX "site_settings_footer_quick_links_order_idx" ON "payload"."site_settings_footer_quick_links" USING btree ("_order");
  CREATE INDEX "site_settings_footer_quick_links_parent_id_idx" ON "payload"."site_settings_footer_quick_links" USING btree ("_parent_id");
  CREATE INDEX "site_settings_footer_service_links_order_idx" ON "payload"."site_settings_footer_service_links" USING btree ("_order");
  CREATE INDEX "site_settings_footer_service_links_parent_id_idx" ON "payload"."site_settings_footer_service_links" USING btree ("_parent_id");
  CREATE INDEX "site_settings_logo_idx" ON "payload"."site_settings" USING btree ("logo_id");
  CREATE INDEX "site_settings_favicon_idx" ON "payload"."site_settings" USING btree ("favicon_id");
  CREATE INDEX "site_settings_rels_order_idx" ON "payload"."site_settings_rels" USING btree ("order");
  CREATE INDEX "site_settings_rels_parent_idx" ON "payload"."site_settings_rels" USING btree ("parent_id");
  CREATE INDEX "site_settings_rels_path_idx" ON "payload"."site_settings_rels" USING btree ("path");
  CREATE INDEX "site_settings_rels_wms_collections_id_idx" ON "payload"."site_settings_rels" USING btree ("wms_collections_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."users_sessions" CASCADE;
  DROP TABLE "payload"."users" CASCADE;
  DROP TABLE "payload"."media" CASCADE;
  DROP TABLE "payload"."wms_collections" CASCADE;
  DROP TABLE "payload"."products_images" CASCADE;
  DROP TABLE "payload"."products" CASCADE;
  DROP TABLE "payload"."products_rels" CASCADE;
  DROP TABLE "payload"."payload_kv" CASCADE;
  DROP TABLE "payload"."payload_jobs_log" CASCADE;
  DROP TABLE "payload"."payload_jobs" CASCADE;
  DROP TABLE "payload"."payload_locked_documents" CASCADE;
  DROP TABLE "payload"."payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload"."payload_preferences" CASCADE;
  DROP TABLE "payload"."payload_preferences_rels" CASCADE;
  DROP TABLE "payload"."payload_migrations" CASCADE;
  DROP TABLE "payload"."homepage_hero_slides" CASCADE;
  DROP TABLE "payload"."homepage_benefits" CASCADE;
  DROP TABLE "payload"."homepage_showcase_images" CASCADE;
  DROP TABLE "payload"."homepage_quick_links" CASCADE;
  DROP TABLE "payload"."homepage_banners" CASCADE;
  DROP TABLE "payload"."homepage" CASCADE;
  DROP TABLE "payload"."homepage_rels" CASCADE;
  DROP TABLE "payload"."site_settings_header_links" CASCADE;
  DROP TABLE "payload"."site_settings_footer_quick_links" CASCADE;
  DROP TABLE "payload"."site_settings_footer_service_links" CASCADE;
  DROP TABLE "payload"."site_settings" CASCADE;
  DROP TABLE "payload"."site_settings_rels" CASCADE;
  DROP TYPE "payload"."enum_products_assignment_status";
  DROP TYPE "payload"."enum_products_wms_image_import_status";
  DROP TYPE "payload"."enum_payload_jobs_log_task_slug";
  DROP TYPE "payload"."enum_payload_jobs_log_state";
  DROP TYPE "payload"."enum_payload_jobs_task_slug";
  DROP TYPE "payload"."enum_homepage_benefits_icon";`)
}
