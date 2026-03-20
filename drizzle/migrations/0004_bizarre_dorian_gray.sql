CREATE TYPE "public"."goods_image_embedding_status" AS ENUM('pending', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "goods_image_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goods_image_id" uuid NOT NULL,
	"status" "goods_image_embedding_status" DEFAULT 'pending' NOT NULL,
	"provider" varchar(64) NOT NULL,
	"model" varchar(128) NOT NULL,
	"model_version" varchar(64),
	"dimensions" integer,
	"source_checksum" varchar(128),
	"embedding_payload" jsonb,
	"indexed_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goods_image_embeddings_dimensions_positive_check" CHECK ("goods_image_embeddings"."dimensions" is null or "goods_image_embeddings"."dimensions" > 0)
);
--> statement-breakpoint
ALTER TABLE "goods_image_embeddings" ADD CONSTRAINT "goods_image_embeddings_goods_image_id_goods_images_id_fk" FOREIGN KEY ("goods_image_id") REFERENCES "public"."goods_images"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "goods_image_embeddings_image_provider_model_unique" ON "goods_image_embeddings" USING btree ("goods_image_id","provider","model");--> statement-breakpoint
CREATE INDEX "goods_image_embeddings_status_idx" ON "goods_image_embeddings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "goods_image_embeddings_provider_model_idx" ON "goods_image_embeddings" USING btree ("provider","model");