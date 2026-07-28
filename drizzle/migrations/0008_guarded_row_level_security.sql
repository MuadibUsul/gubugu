-- Row level security for a future client that talks to Supabase directly.
--
-- Today every read and write goes through server/ using DATABASE_URL, which
-- connects as the table owner. Owners bypass RLS unless FORCE ROW LEVEL
-- SECURITY is set, so enabling this changes nothing for the current app. It
-- exists so the policies are already correct whenever the planned iOS thin
-- client starts using the anon/authenticated roles, rather than being written
-- under pressure at that point.
--
-- auth.uid() is provided by Supabase. Create a stub only when it is missing, so
-- this migration also applies to a plain Postgres in CI. On Supabase the DO
-- block is a no-op and the real function is used.
--
-- The stub reads the same request.jwt.claim.sub setting Supabase populates,
-- which lets the policies be exercised against a plain Postgres by issuing
-- `set local request.jwt.claim.sub = '<uuid>'`.
CREATE SCHEMA IF NOT EXISTS auth;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    EXECUTE 'CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid $f$';
  END IF;
END
$$;
--> statement-breakpoint
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ips','characters','series','goods','goods_images','goods_image_embeddings',
    'tags','goods_tags','goods_characters','profiles','user_goods',
    'catalog_submissions','posts','post_images','ratings','exchange_listings'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END
$$;
--> statement-breakpoint

-- Encyclopedia: published rows are world readable, writes stay server-side.
CREATE POLICY "ips_public_read" ON "ips" FOR SELECT USING (status = 'published');--> statement-breakpoint
CREATE POLICY "characters_public_read" ON "characters" FOR SELECT USING (status = 'published');--> statement-breakpoint
CREATE POLICY "series_public_read" ON "series" FOR SELECT USING (status = 'published');--> statement-breakpoint
CREATE POLICY "goods_public_read" ON "goods" FOR SELECT USING (status = 'published');--> statement-breakpoint
CREATE POLICY "tags_public_read" ON "tags" FOR SELECT USING (true);--> statement-breakpoint

CREATE POLICY "goods_images_public_read" ON "goods_images" FOR SELECT USING (
  EXISTS (SELECT 1 FROM goods g WHERE g.id = goods_images.goods_id AND g.status = 'published')
);--> statement-breakpoint
CREATE POLICY "goods_tags_public_read" ON "goods_tags" FOR SELECT USING (
  EXISTS (SELECT 1 FROM goods g WHERE g.id = goods_tags.goods_id AND g.status = 'published')
);--> statement-breakpoint
CREATE POLICY "goods_characters_public_read" ON "goods_characters" FOR SELECT USING (
  EXISTS (SELECT 1 FROM goods g WHERE g.id = goods_characters.goods_id AND g.status = 'published')
);--> statement-breakpoint

-- Embeddings back recognition and are never client readable.
-- Enabling RLS with no policy denies all non-owner access.

-- Profiles: public ones are readable by anyone; you can always read and edit
-- your own. Inserts are server-side so a handle cannot be squatted directly.
CREATE POLICY "profiles_public_read" ON "profiles" FOR SELECT USING (
  visibility = 'public' OR id = auth.uid()
);--> statement-breakpoint
CREATE POLICY "profiles_self_update" ON "profiles" FOR UPDATE
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());--> statement-breakpoint

-- Collection state is private to its owner.
CREATE POLICY "user_goods_self_all" ON "user_goods" FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint

-- Community content is public only once approved and visible; authors can
-- always see their own, including while pending.
CREATE POLICY "posts_public_read" ON "posts" FOR SELECT USING (
  (status = 'visible' AND moderation_status = 'approved') OR user_id = auth.uid()
);--> statement-breakpoint
CREATE POLICY "posts_self_insert" ON "posts" FOR INSERT WITH CHECK (user_id = auth.uid());--> statement-breakpoint

CREATE POLICY "post_images_public_read" ON "post_images" FOR SELECT USING (
  (status = 'visible' AND moderation_status = 'approved')
  OR EXISTS (SELECT 1 FROM posts p WHERE p.id = post_images.post_id AND p.user_id = auth.uid())
);--> statement-breakpoint

CREATE POLICY "ratings_public_read" ON "ratings" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "ratings_self_write" ON "ratings" FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint

CREATE POLICY "exchange_listings_public_read" ON "exchange_listings" FOR SELECT USING (
  (moderation_status = 'approved' AND status <> 'closed') OR user_id = auth.uid()
);--> statement-breakpoint
CREATE POLICY "exchange_listings_self_write" ON "exchange_listings" FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint

-- Submissions are visible to their author and to server-side moderation only.
CREATE POLICY "catalog_submissions_self_read" ON "catalog_submissions" FOR SELECT
  USING (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "catalog_submissions_self_insert" ON "catalog_submissions" FOR INSERT
  WITH CHECK (user_id = auth.uid());
