import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_product_page_blocks_related_products_source" AS ENUM('auto', 'collection', 'fixed');
  CREATE TABLE "payload"."product_page_blocks_product_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"show_brand" boolean DEFAULT true,
  	"show_breadcrumbs" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."product_page_blocks_product_description" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar DEFAULT 'Description',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."product_page_blocks_product_details" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"show_sku" boolean DEFAULT true,
  	"show_category" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."product_page_blocks_related_products" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar DEFAULT 'You may also like',
  	"source" "payload"."enum_product_page_blocks_related_products_source" DEFAULT 'auto' NOT NULL,
  	"collection_id" integer,
  	"limit" numeric DEFAULT 4,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."product_page_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"content" jsonb NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."product_page_blocks_embed" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"html" varchar NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."product_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload"."product_page_blocks_product_hero" ADD CONSTRAINT "product_page_blocks_product_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."product_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."product_page_blocks_product_description" ADD CONSTRAINT "product_page_blocks_product_description_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."product_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."product_page_blocks_product_details" ADD CONSTRAINT "product_page_blocks_product_details_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."product_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."product_page_blocks_related_products" ADD CONSTRAINT "product_page_blocks_related_products_collection_id_wms_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "payload"."wms_collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."product_page_blocks_related_products" ADD CONSTRAINT "product_page_blocks_related_products_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."product_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."product_page_blocks_rich_text" ADD CONSTRAINT "product_page_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."product_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."product_page_blocks_embed" ADD CONSTRAINT "product_page_blocks_embed_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."product_page"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "product_page_blocks_product_hero_order_idx" ON "payload"."product_page_blocks_product_hero" USING btree ("_order");
  CREATE INDEX "product_page_blocks_product_hero_parent_id_idx" ON "payload"."product_page_blocks_product_hero" USING btree ("_parent_id");
  CREATE INDEX "product_page_blocks_product_hero_path_idx" ON "payload"."product_page_blocks_product_hero" USING btree ("_path");
  CREATE INDEX "product_page_blocks_product_description_order_idx" ON "payload"."product_page_blocks_product_description" USING btree ("_order");
  CREATE INDEX "product_page_blocks_product_description_parent_id_idx" ON "payload"."product_page_blocks_product_description" USING btree ("_parent_id");
  CREATE INDEX "product_page_blocks_product_description_path_idx" ON "payload"."product_page_blocks_product_description" USING btree ("_path");
  CREATE INDEX "product_page_blocks_product_details_order_idx" ON "payload"."product_page_blocks_product_details" USING btree ("_order");
  CREATE INDEX "product_page_blocks_product_details_parent_id_idx" ON "payload"."product_page_blocks_product_details" USING btree ("_parent_id");
  CREATE INDEX "product_page_blocks_product_details_path_idx" ON "payload"."product_page_blocks_product_details" USING btree ("_path");
  CREATE INDEX "product_page_blocks_related_products_order_idx" ON "payload"."product_page_blocks_related_products" USING btree ("_order");
  CREATE INDEX "product_page_blocks_related_products_parent_id_idx" ON "payload"."product_page_blocks_related_products" USING btree ("_parent_id");
  CREATE INDEX "product_page_blocks_related_products_path_idx" ON "payload"."product_page_blocks_related_products" USING btree ("_path");
  CREATE INDEX "product_page_blocks_related_products_collection_idx" ON "payload"."product_page_blocks_related_products" USING btree ("collection_id");
  CREATE INDEX "product_page_blocks_rich_text_order_idx" ON "payload"."product_page_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "product_page_blocks_rich_text_parent_id_idx" ON "payload"."product_page_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "product_page_blocks_rich_text_path_idx" ON "payload"."product_page_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "product_page_blocks_embed_order_idx" ON "payload"."product_page_blocks_embed" USING btree ("_order");
  CREATE INDEX "product_page_blocks_embed_parent_id_idx" ON "payload"."product_page_blocks_embed" USING btree ("_parent_id");
  CREATE INDEX "product_page_blocks_embed_path_idx" ON "payload"."product_page_blocks_embed" USING btree ("_path");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."product_page_blocks_product_hero" CASCADE;
  DROP TABLE "payload"."product_page_blocks_product_description" CASCADE;
  DROP TABLE "payload"."product_page_blocks_product_details" CASCADE;
  DROP TABLE "payload"."product_page_blocks_related_products" CASCADE;
  DROP TABLE "payload"."product_page_blocks_rich_text" CASCADE;
  DROP TABLE "payload"."product_page_blocks_embed" CASCADE;
  DROP TABLE "payload"."product_page" CASCADE;
  DROP TYPE "payload"."enum_product_page_blocks_related_products_source";`)
}
