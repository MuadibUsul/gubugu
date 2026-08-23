ALTER TYPE "public"."achievement_kind" ADD VALUE 'type_breadth';--> statement-breakpoint
ALTER TABLE "achievements" DROP CONSTRAINT "achievements_threshold_matches_kind_check";--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_threshold_matches_kind_check" CHECK ((kind::text in ('owned_count', 'type_breadth') and threshold is not null and threshold > 0)
          or (kind::text not in ('owned_count', 'type_breadth') and threshold is null));