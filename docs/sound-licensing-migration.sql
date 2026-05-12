-- ─────────────────────────────────────────────────────────────────────
-- Sound licensing metadata
-- Adds `source` and `license_type` to public.sound_files so every
-- asset can carry provenance and license info. Both columns are
-- nullable so existing rows stay valid without backfilling.
--
-- Safe to re-run: ADD COLUMN IF NOT EXISTS / COMMENT statements are
-- idempotent.
-- ─────────────────────────────────────────────────────────────────────

alter table public.sound_files
  add column if not exists source       text,
  add column if not exists license_type text;

comment on column public.sound_files.source is
  'Where the audio originated. Free-form text. Typical values: Sonniss, Pixabay, ZapSplat, Freesound, Self-recorded, Generated, Unknown, Other.';

comment on column public.sound_files.license_type is
  'License the asset is distributed under. Free-form text. Typical values: Commercial License, Pixabay License, CC0, Creative Commons, Royalty-Free, Unknown, Other.';
