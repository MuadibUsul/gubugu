CREATE TYPE "public"."achievement_kind" AS ENUM('owned_count', 'character_complete', 'series_complete', 'ip_complete');--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" varchar(255) NOT NULL,
	"kind" "achievement_kind" NOT NULL,
	"threshold" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "achievements_threshold_matches_kind_check" CHECK ((kind = 'owned_count' and threshold is not null and threshold > 0)
          or (kind <> 'owned_count' and threshold is null))
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"achievement_id" uuid NOT NULL,
	"scope_id" uuid,
	"achieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "achievements_code_unique" ON "achievements" USING btree ("code");--> statement-breakpoint
CREATE INDEX "achievements_kind_idx" ON "achievements" USING btree ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "user_achievements_global_unique" ON "user_achievements" USING btree ("user_id","achievement_id") WHERE scope_id is null;--> statement-breakpoint
CREATE UNIQUE INDEX "user_achievements_scoped_unique" ON "user_achievements" USING btree ("user_id","achievement_id","scope_id") WHERE scope_id is not null;--> statement-breakpoint
CREATE INDEX "user_achievements_user_id_idx" ON "user_achievements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_achievements_achieved_at_idx" ON "user_achievements" USING btree ("achieved_at");--> statement-breakpoint

-- 与 0008 保持一致：新表同样纳入 RLS。今天的读写都走 server/ 以表 owner 身份
-- 连接，owner 绕过 RLS，所以这不改变当前行为；它是为将来 iOS 瘦客户端直连
-- Supabase 准备的。
ALTER TABLE "achievements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_achievements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- 成就定义是公开内容，任何人可读；写入只由 seed 以 owner 身份完成。
CREATE POLICY "achievements_public_read" ON "achievements" FOR SELECT USING (true);--> statement-breakpoint

-- 解锁记录只有本人可见可写，与 user_goods 同规则。
CREATE POLICY "user_achievements_self_read" ON "user_achievements" FOR SELECT USING (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "user_achievements_self_insert" ON "user_achievements" FOR INSERT WITH CHECK (user_id = auth.uid());
