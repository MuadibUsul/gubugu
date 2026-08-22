CREATE TYPE "public"."notification_type" AS ENUM('exchange_proposed', 'exchange_accepted', 'exchange_shipping', 'exchange_received', 'exchange_completed', 'exchange_cancelled');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"actor_id" uuid,
	"type" "notification_type" NOT NULL,
	"exchange_id" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_exchange_id_exchanges_id_fk" FOREIGN KEY ("exchange_id") REFERENCES "public"."exchanges"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "notifications_recipient_created_at_idx" ON "notifications" USING btree ("recipient_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_exchange_id_idx" ON "notifications" USING btree ("exchange_id");--> statement-breakpoint
CREATE INDEX "notifications_unread_recipient_idx" ON "notifications" USING btree ("recipient_id","created_at") WHERE "notifications"."read_at" is null;
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "notifications_recipient_read" ON "notifications" FOR SELECT
  USING (recipient_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "notifications_recipient_update" ON "notifications" FOR UPDATE
  USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());
