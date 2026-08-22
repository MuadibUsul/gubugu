CREATE TABLE "follows" (
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_pkey" PRIMARY KEY("follower_id","following_id"),
	CONSTRAINT "follows_distinct_users_check" CHECK ("follows"."follower_id" <> "follows"."following_id")
);
--> statement-breakpoint
CREATE INDEX "follows_following_id_idx" ON "follows" USING btree ("following_id");
--> statement-breakpoint
ALTER TABLE "follows" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "follows_public_read" ON "follows" FOR SELECT USING (true);
--> statement-breakpoint
CREATE POLICY "follows_self_write" ON "follows" FOR ALL
  USING (follower_id = auth.uid()) WITH CHECK (follower_id = auth.uid());
