import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "payload"."age_verification" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"enabled" boolean DEFAULT true,
  	"logo_id" integer,
  	"heading" varchar DEFAULT 'Are you 21 or older?' NOT NULL,
  	"description" varchar DEFAULT 'You must be at least 21 years old to enter this website.' NOT NULL,
  	"confirm_label" varchar DEFAULT 'Yes, I’m 21 or older' NOT NULL,
  	"deny_label" varchar DEFAULT 'No, I’m under 21' NOT NULL,
  	"denied_redirect_url" varchar DEFAULT 'https://www.google.com' NOT NULL,
  	"denied_message" varchar DEFAULT 'Sorry, you must be 21 or older to enter this website.' NOT NULL,
  	"remember_days" numeric DEFAULT 30 NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload"."age_verification" ADD CONSTRAINT "age_verification_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "age_verification_logo_idx" ON "payload"."age_verification" USING btree ("logo_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."age_verification" CASCADE;`)
}
