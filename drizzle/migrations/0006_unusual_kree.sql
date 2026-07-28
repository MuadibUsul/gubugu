CREATE TYPE "public"."profile_visibility" AS ENUM('public', 'followers', 'private');--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"handle" varchar(64) NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"avatar_image_url" text,
	"bio" text,
	"city" varchar(64),
	"accent_title" varchar(120),
	"visibility" "profile_visibility" DEFAULT 'public' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_handle_format_check" CHECK ("profiles"."handle" ~ '^[a-z0-9][a-z0-9._-]*[a-z0-9]$'),
	CONSTRAINT "profiles_display_name_not_empty_check" CHECK (char_length(trim("profiles"."display_name")) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_handle_unique" ON "profiles" USING btree ("handle");--> statement-breakpoint
CREATE INDEX "profiles_visibility_idx" ON "profiles" USING btree ("visibility");