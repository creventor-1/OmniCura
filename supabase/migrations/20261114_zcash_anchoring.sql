-- OmniCura: Zcash anchoring + record access grants.
-- Safe to run more than once. Paste this whole file into the Supabase SQL editor and click Run.

-- 1. Anchoring columns on assessments
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS record_hash TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS zcash_txid TEXT,
  ADD COLUMN IF NOT EXISTS zcash_block_height BIGINT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

ALTER TABLE public.assessments DROP CONSTRAINT IF EXISTS assessments_verification_status_check;
ALTER TABLE public.assessments ADD CONSTRAINT assessments_verification_status_check
  CHECK (verification_status IN ('unverified', 'pending', 'verified', 'tampered'));

-- 2. Owners may record the anchor txid after insert; clinical content stays immutable.
REVOKE UPDATE ON public.assessments FROM anon, authenticated;
GRANT UPDATE (zcash_txid, zcash_block_height, verification_status, verified_at)
  ON public.assessments TO authenticated;

DROP POLICY IF EXISTS "Users can record anchor txids on their own assessments" ON public.assessments;
CREATE POLICY "Users can record anchor txids on their own assessments"
  ON public.assessments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Record access grants (data ownership)
CREATE TABLE IF NOT EXISTS public.record_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  record_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
  grantee_entity TEXT NOT NULL,
  access_level TEXT NOT NULL CHECK (access_level IN ('read', 'emergency_only')),
  status TEXT NOT NULL DEFAULT 'granted' CHECK (status IN ('granted', 'revoked')),
  event_hash TEXT NOT NULL,
  zcash_txid TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

ALTER TABLE public.record_access_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own record access grants" ON public.record_access_grants;
CREATE POLICY "Users can view their own record access grants"
  ON public.record_access_grants FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own record access grants" ON public.record_access_grants;
CREATE POLICY "Users can insert their own record access grants"
  ON public.record_access_grants FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own record access grants" ON public.record_access_grants;
CREATE POLICY "Users can update their own record access grants"
  ON public.record_access_grants FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own record access grants" ON public.record_access_grants;
CREATE POLICY "Users can delete their own record access grants"
  ON public.record_access_grants FOR DELETE USING (auth.uid() = user_id);

-- Make PostgREST pick up the new columns immediately.
NOTIFY pgrst, 'reload schema';
