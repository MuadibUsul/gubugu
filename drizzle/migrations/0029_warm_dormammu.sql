ALTER TABLE "user_scans" ADD COLUMN "recognition_attempt_id" uuid;--> statement-breakpoint
ALTER TABLE "user_scans" ADD COLUMN "resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_scans" ADD CONSTRAINT "user_scans_recognition_attempt_id_recognition_attempts_id_fk" FOREIGN KEY ("recognition_attempt_id") REFERENCES "public"."recognition_attempts"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "user_scans_recognition_attempt_id_unique" ON "user_scans" USING btree ("recognition_attempt_id");