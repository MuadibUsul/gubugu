CREATE TABLE "crawler_crawl_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"detail_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crawler_crawl_progress_detail_url_http_check" CHECK ("crawler_crawl_progress"."detail_url" ~* '^https?://')
);
--> statement-breakpoint
ALTER TABLE "crawler_crawl_progress" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "crawler_crawl_progress" ADD CONSTRAINT "crawler_crawl_progress_source_id_crawler_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."crawler_sources"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "crawler_crawl_progress_source_url_unique" ON "crawler_crawl_progress" USING btree ("source_id","detail_url");