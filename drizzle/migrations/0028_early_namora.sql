ALTER TABLE "user_scans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_scans" ADD CONSTRAINT "user_scans_top_score_range_check" CHECK ("user_scans"."top_score" is null or ("user_scans"."top_score" >= 0 and "user_scans"."top_score" <= 100));--> statement-breakpoint
CREATE POLICY "user_scans_self_read" ON "user_scans" FOR SELECT USING (user_id = auth.uid());
