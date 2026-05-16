-- ─────────────────────────────────────────────────────────────────────
-- Fix: bucket name drift `atmosphere` → `atmospheric`
--
-- The SoundLibrary UI renders a category with id `atmospheric`, but the
-- admin ingest tool was inserting new rows with bucket `atmosphere`.
-- That mismatch left those rows invisible in the customer-facing
-- library even though they're perfectly fine assets on R2.
--
-- This migration is:
--   - idempotent: running twice is a no-op the second time
--   - reversible: the inverse update flips them back if needed
--   - scope-limited: only touches rows where bucket = 'atmosphere'
--
-- Verify count first, then run the UPDATE.
-- ─────────────────────────────────────────────────────────────────────

-- 1. Preview what will change. Should show only the misnamed rows.
select id, name, bucket
from public.sound_files
where bucket = 'atmosphere'
order by name;

-- 2. Run the rename.
update public.sound_files
   set bucket = 'atmospheric'
 where bucket = 'atmosphere';

-- 3. Confirm: this should return zero rows.
select id, name, bucket
from public.sound_files
where bucket = 'atmosphere';

-- ─── Rollback (if needed) ────────────────────────────────────────────
-- update public.sound_files
--    set bucket = 'atmosphere'
--  where bucket = 'atmospheric'
--    and id in ('<list-of-affected-ids>');
