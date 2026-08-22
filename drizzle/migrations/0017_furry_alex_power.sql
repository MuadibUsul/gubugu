CREATE TABLE "local_auth_accounts" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "local_auth_accounts" ADD CONSTRAINT "local_auth_accounts_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "local_auth_accounts_email_unique" ON "local_auth_accounts" USING btree ("email");
--> statement-breakpoint
-- Credentials are server-only. With no policies, RLS denies every Data API
-- read or write while the application owner continues to use the domain layer.
ALTER TABLE "local_auth_accounts" ENABLE ROW LEVEL SECURITY;
