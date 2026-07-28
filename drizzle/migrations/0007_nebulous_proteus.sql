-- gin_trgm_ops requires pg_trgm. Supabase ships it; a self-hosted
-- Postgres needs it installed before this migration runs.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "characters_name_trgm_idx" ON "characters" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "goods_name_trgm_idx" ON "goods" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "goods_sku_code_trgm_idx" ON "goods" USING gin ("sku_code" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "goods_description_trgm_idx" ON "goods" USING gin ("description" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "ips_name_trgm_idx" ON "ips" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "ips_name_localized_trgm_idx" ON "ips" USING gin ("name_localized" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "series_name_trgm_idx" ON "series" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "tags_name_trgm_idx" ON "tags" USING gin ("name" gin_trgm_ops);