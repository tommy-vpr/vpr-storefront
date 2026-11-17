import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_navigation_main_menu_children_link_type" AS ENUM('collection', 'collections', 'path', 'url');
  CREATE TYPE "payload"."enum_navigation_main_menu_link_type" AS ENUM('collection', 'collections', 'path', 'url', 'brands');
  CREATE TABLE "payload"."navigation_main_menu_children" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"link_type" "payload"."enum_navigation_main_menu_children_link_type" DEFAULT 'collection',
  	"collection_id" integer,
  	"path" varchar,
  	"url" varchar
  );
  
  CREATE TABLE "payload"."navigation_main_menu" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"link_type" "payload"."enum_navigation_main_menu_link_type" DEFAULT 'collection' NOT NULL,
  	"collection_id" integer,
  	"path" varchar,
  	"url" varchar
  );
  
  CREATE TABLE "payload"."navigation" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload"."navigation_main_menu_children" ADD CONSTRAINT "navigation_main_menu_children_collection_id_wms_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "payload"."wms_collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."navigation_main_menu_children" ADD CONSTRAINT "navigation_main_menu_children_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."navigation_main_menu"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."navigation_main_menu" ADD CONSTRAINT "navigation_main_menu_collection_id_wms_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "payload"."wms_collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."navigation_main_menu" ADD CONSTRAINT "navigation_main_menu_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "navigation_main_menu_children_order_idx" ON "payload"."navigation_main_menu_children" USING btree ("_order");
  CREATE INDEX "navigation_main_menu_children_parent_id_idx" ON "payload"."navigation_main_menu_children" USING btree ("_parent_id");
  CREATE INDEX "navigation_main_menu_children_collection_idx" ON "payload"."navigation_main_menu_children" USING btree ("collection_id");
  CREATE INDEX "navigation_main_menu_order_idx" ON "payload"."navigation_main_menu" USING btree ("_order");
  CREATE INDEX "navigation_main_menu_parent_id_idx" ON "payload"."navigation_main_menu" USING btree ("_parent_id");
  CREATE INDEX "navigation_main_menu_collection_idx" ON "payload"."navigation_main_menu" USING btree ("collection_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."navigation_main_menu_children" CASCADE;
  DROP TABLE "payload"."navigation_main_menu" CASCADE;
  DROP TABLE "payload"."navigation" CASCADE;
  DROP TYPE "payload"."enum_navigation_main_menu_children_link_type";
  DROP TYPE "payload"."enum_navigation_main_menu_link_type";`)
}
