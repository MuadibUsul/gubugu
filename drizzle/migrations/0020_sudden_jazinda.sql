CREATE TABLE "recognition_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source" varchar(16) NOT NULL,
	"provider" varchar(32) NOT NULL,
	"candidate_map" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"confirmed_candidate_id" text,
	"confirmed_goods_id" uuid,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recognition_attempts_source_check" CHECK ("recognition_attempts"."source" in ('camera', 'upload')),
	CONSTRAINT "recognition_attempts_provider_check" CHECK ("recognition_attempts"."provider" in ('mock-placeholder', 'embedding-search')),
	CONSTRAINT "recognition_attempts_candidate_map_object_check" CHECK (jsonb_typeof("recognition_attempts"."candidate_map") = 'object'),
	CONSTRAINT "recognition_attempts_expiry_check" CHECK ("recognition_attempts"."expires_at" > "recognition_attempts"."created_at"),
	CONSTRAINT "recognition_attempts_confirmation_check" CHECK (("recognition_attempts"."confirmed_at" is null and "recognition_attempts"."confirmed_candidate_id" is null and "recognition_attempts"."confirmed_goods_id" is null)
        or ("recognition_attempts"."confirmed_at" is not null and "recognition_attempts"."confirmed_candidate_id" is not null and "recognition_attempts"."confirmed_goods_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "user_goods" ADD COLUMN "lit_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "recognition_attempts" ADD CONSTRAINT "recognition_attempts_confirmed_goods_id_goods_id_fk" FOREIGN KEY ("confirmed_goods_id") REFERENCES "public"."goods"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "recognition_attempts_user_created_idx" ON "recognition_attempts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "recognition_attempts_expires_at_idx" ON "recognition_attempts" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "user_goods" ADD CONSTRAINT "user_goods_lit_owned_only_check" CHECK ("user_goods"."lit_at" is null or "user_goods"."status" = 'owned');
--> statement-breakpoint
-- Attempts are private server-side proof records. The app owner role writes them;
-- direct Supabase clients receive no policy and therefore no access.
ALTER TABLE "recognition_attempts" ENABLE ROW LEVEL SECURITY;
