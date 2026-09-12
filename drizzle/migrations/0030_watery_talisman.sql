ALTER TABLE "user_scans" ADD COLUMN "back_asset_key" text;--> statement-breakpoint
ALTER TABLE "user_scans" ADD COLUMN "capture_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "user_scans_user_capture_unique" ON "user_scans" USING btree ("user_id","capture_id");