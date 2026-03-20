CREATE TYPE "public"."rating_verdict" AS ENUM('positive', 'neutral', 'negative');--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "score" SET DATA TYPE numeric(4, 2);--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "artwork_score" smallint;--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "craftsmanship_score" smallint;--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "value_score" smallint;--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "rarity_score" smallint;--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "satisfaction_score" smallint;--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "worth_buying" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "overall_tag" "rating_verdict";--> statement-breakpoint
UPDATE "ratings"
SET
  "artwork_score" = least(greatest(round("score")::int, 1), 5),
  "craftsmanship_score" = least(greatest(round("score")::int, 1), 5),
  "value_score" = least(greatest(round("score")::int, 1), 5),
  "rarity_score" = least(greatest(round("score")::int, 1), 5),
  "satisfaction_score" = least(greatest(round("score")::int, 1), 5),
  "worth_buying" = "score" >= 4,
  "overall_tag" = case
    when "score" >= 4 then 'positive'::"rating_verdict"
    when "score" <= 2 then 'negative'::"rating_verdict"
    else 'neutral'::"rating_verdict"
  end
WHERE
  "artwork_score" IS NULL
  OR "craftsmanship_score" IS NULL
  OR "value_score" IS NULL
  OR "rarity_score" IS NULL
  OR "satisfaction_score" IS NULL
  OR "overall_tag" IS NULL;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "artwork_score" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "craftsmanship_score" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "value_score" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "rarity_score" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "satisfaction_score" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "overall_tag" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_artwork_score_range_check" CHECK ("ratings"."artwork_score" between 1 and 5);--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_craftsmanship_score_range_check" CHECK ("ratings"."craftsmanship_score" between 1 and 5);--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_value_score_range_check" CHECK ("ratings"."value_score" between 1 and 5);--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_rarity_score_range_check" CHECK ("ratings"."rarity_score" between 1 and 5);--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_satisfaction_score_range_check" CHECK ("ratings"."satisfaction_score" between 1 and 5);
