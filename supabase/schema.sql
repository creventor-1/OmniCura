-- ==============================================================================
-- TriageAI - Supabase Database Schema & Row Level Security (RLS) Setup
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. HEALTH PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.health_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  age INTEGER,
  sex TEXT,
  allergies TEXT[] DEFAULT '{}',
  chronic_conditions TEXT[] DEFAULT '{}',
  medications TEXT[] DEFAULT '{}',
  blood_group TEXT,
  height NUMERIC,
  weight NUMERIC,
  allow_ai_use BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on health_profiles
ALTER TABLE public.health_profiles ENABLE ROW LEVEL SECURITY;

-- Health profiles policies
DROP POLICY IF EXISTS "Users can view their own health profile" ON public.health_profiles;
CREATE POLICY "Users can view their own health profile"
  ON public.health_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own health profile" ON public.health_profiles;
CREATE POLICY "Users can create their own health profile"
  ON public.health_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own health profile" ON public.health_profiles;
CREATE POLICY "Users can update their own health profile"
  ON public.health_profiles FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own health profile" ON public.health_profiles;
CREATE POLICY "Users can delete their own health profile"
  ON public.health_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- 3. ASSESSMENTS TABLE
CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  symptoms TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('non-urgent', 'urgent', 'emergency')),
  assessment_result JSONB NOT NULL,
  disclaimer TEXT NOT NULL
);

-- Enable RLS on assessments
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- Assessments policies
DROP POLICY IF EXISTS "Users can view their own assessments" ON public.assessments;
CREATE POLICY "Users can view their own assessments"
  ON public.assessments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own assessments" ON public.assessments;
CREATE POLICY "Users can create their own assessments"
  ON public.assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own assessments" ON public.assessments;
CREATE POLICY "Users can delete their own assessments"
  ON public.assessments FOR DELETE
  USING (auth.uid() = user_id);

-- 4. EMERGENCY CONTACTS TABLE
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  relationship TEXT,
  phone_number TEXT NOT NULL
);

-- Enable RLS on emergency_contacts
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Emergency contacts policies
DROP POLICY IF EXISTS "Users can view their own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can view their own emergency contacts"
  ON public.emergency_contacts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can insert their own emergency contacts"
  ON public.emergency_contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can update their own emergency contacts"
  ON public.emergency_contacts FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can delete their own emergency contacts"
  ON public.emergency_contacts FOR DELETE
  USING (auth.uid() = user_id);

-- 5. CRYPTOGRAPHIC VERIFICATION & ZCASH ATTESTATION EXTENSIONS (Phase 2+)
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS record_hash TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'pending', 'verified', 'tampered')),
  ADD COLUMN IF NOT EXISTS zcash_txid TEXT,
  ADD COLUMN IF NOT EXISTS zcash_block_height BIGINT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- 6. PATIENT RECORD ACCESS GRANTS TABLE (Data Ownership & Consent)
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
  ON public.record_access_grants FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own record access grants" ON public.record_access_grants;
CREATE POLICY "Users can insert their own record access grants"
  ON public.record_access_grants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own record access grants" ON public.record_access_grants;
CREATE POLICY "Users can update their own record access grants"
  ON public.record_access_grants FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own record access grants" ON public.record_access_grants;
CREATE POLICY "Users can delete their own record access grants"
  ON public.record_access_grants FOR DELETE
  USING (auth.uid() = user_id);


-- 7. ZCASH ANCHORING: allow the owner to record the anchor txid AFTER insert.
--    Clinical content stays immutable: UPDATE is revoked table-wide and re-granted
--    only on the anchoring columns.
REVOKE UPDATE ON public.assessments FROM anon, authenticated;
GRANT UPDATE (zcash_txid, zcash_block_height, verification_status, verified_at)
  ON public.assessments TO authenticated;

DROP POLICY IF EXISTS "Users can record anchor txids on their own assessments" ON public.assessments;
CREATE POLICY "Users can record anchor txids on their own assessments"
  ON public.assessments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
