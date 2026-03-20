ALTER TABLE "post_images" ADD COLUMN "storage_path" text;--> statement-breakpoint
UPDATE "post_images" SET "storage_path" = "image_url" WHERE "storage_path" IS NULL;--> statement-breakpoint
ALTER TABLE "post_images" ALTER COLUMN "storage_path" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "post_images" ADD COLUMN "status" "post_status" DEFAULT 'visible' NOT NULL;--> statement-breakpoint
CREATE INDEX "post_images_status_idx" ON "post_images" USING btree ("status");
