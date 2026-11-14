-- OmniCura: cross-device share invitations (the "Share with Doctor" QR code / link).
-- Safe to run more than once. Paste this whole file into the Supabase SQL editor and click Run.
--
-- Invitations used to live only in the patient's browser, so a QR code scanned on a
-- phone could not be found there and showed "Invalid or Expired Invitation". This
-- table holds them server-side. Row level security is on with NO policies, so the
-- anon key cannot read, list or edit rows directly. The only way in is through the
-- functions below, which enforce the consent flow:
--   * lookup is by exact token only (128-bit random), nothing can be listed;
--   * the clinical snapshot is returned only while access is approved, and is
--     uploaded by the patient at approval time (none is stored before that);
--   * a clinician can only move an invitation from pending_request to awaiting_approval;
--   * approve / deny / revoke require the patient's owner key, stored as a SHA-256 hash;
--   * unclaimed invitations expire after 7 days.

CREATE TABLE IF NOT EXISTS public.share_invitations (
  token TEXT PRIMARY KEY,
  owner_key_hash TEXT NOT NULL,
  record_id TEXT NOT NULL,
  patient_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending_request'
    CHECK (status IN ('pending_request', 'awaiting_approval', 'approved', 'denied', 'revoked')),
  access_level TEXT NOT NULL DEFAULT 'read' CHECK (access_level IN ('read', 'emergency_only')),
  requester_name TEXT,
  requester_facility TEXT,
  requester_role TEXT,
  snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('milliseconds', now()),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  requested_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  denied_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ
);

ALTER TABLE public.share_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.share_invitations FROM anon, authenticated;

-- Public view of one invitation. The snapshot is only included while approved.
CREATE OR REPLACE FUNCTION public.share_invite_json(inv public.share_invitations)
RETURNS JSONB
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'token', inv.token,
    'recordId', inv.record_id,
    'patientName', inv.patient_name,
    'status', inv.status,
    'accessLevel', inv.access_level,
    'requesterName', inv.requester_name,
    'requesterFacility', inv.requester_facility,
    'requesterRole', inv.requester_role,
    'createdAt', inv.created_at,
    'expiresAt', inv.expires_at,
    'requestedAt', inv.requested_at,
    'approvedAt', inv.approved_at,
    'deniedAt', inv.denied_at,
    'revokedAt', inv.revoked_at,
    'viewedAt', inv.viewed_at,
    'assessmentSnapshot', CASE WHEN inv.status = 'approved' THEN inv.snapshot END
  );
$$;

CREATE OR REPLACE FUNCTION public.share_invite_key_hash(p_key TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT encode(sha256(convert_to(coalesce(p_key, ''), 'UTF8')), 'hex');
$$;

-- Patient registers a new invitation. Idempotent for the same token + owner key.
CREATE OR REPLACE FUNCTION public.share_invite_create(
  p_token TEXT,
  p_owner_key TEXT,
  p_record_id TEXT,
  p_patient_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.share_invitations;
BEGIN
  IF p_token IS NULL OR p_token !~ '^inv_[A-Za-z0-9_-]{16,64}$' THEN
    RAISE EXCEPTION 'Invalid invitation token.' USING ERRCODE = '22023';
  END IF;
  IF length(coalesce(p_owner_key, '')) NOT BETWEEN 32 AND 128 THEN
    RAISE EXCEPTION 'Invalid owner key.' USING ERRCODE = '22023';
  END IF;
  IF length(coalesce(p_record_id, '')) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Invalid record id.' USING ERRCODE = '22023';
  END IF;

  -- Housekeeping: drop invitations nobody claimed before they expired.
  DELETE FROM public.share_invitations
   WHERE status = 'pending_request' AND expires_at < now() - interval '1 day';

  INSERT INTO public.share_invitations (token, owner_key_hash, record_id, patient_name)
  VALUES (p_token, public.share_invite_key_hash(p_owner_key), p_record_id, left(btrim(p_patient_name), 120))
  ON CONFLICT (token) DO NOTHING;

  SELECT * INTO inv FROM public.share_invitations WHERE token = p_token;
  IF inv.owner_key_hash <> public.share_invite_key_hash(p_owner_key) THEN
    RAISE EXCEPTION 'This invitation token is already registered.' USING ERRCODE = '42501';
  END IF;

  RETURN public.share_invite_json(inv);
END;
$$;

-- Anyone holding the link: read the invitation. NULL when unknown or expired.
CREATE OR REPLACE FUNCTION public.share_invite_get(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.share_invitations;
BEGIN
  SELECT * INTO inv FROM public.share_invitations WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF inv.status = 'pending_request' AND inv.expires_at < now() THEN
    RETURN NULL;
  END IF;
  RETURN public.share_invite_json(inv);
END;
$$;

-- Clinician: submit an access request. Only works once, on an unexpired pending invitation.
-- Returns the current state when the invitation was already claimed (the caller compares
-- the requester name to tell whether its own request was the one recorded).
CREATE OR REPLACE FUNCTION public.share_invite_request(
  p_token TEXT,
  p_requester_name TEXT,
  p_requester_facility TEXT,
  p_requester_role TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.share_invitations;
BEGIN
  IF length(btrim(coalesce(p_requester_name, ''))) NOT BETWEEN 2 AND 120
     OR length(btrim(coalesce(p_requester_facility, ''))) NOT BETWEEN 2 AND 160 THEN
    RAISE EXCEPTION 'Please provide your full name and clinical facility.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.share_invitations
     SET status = 'awaiting_approval',
         requester_name = btrim(p_requester_name),
         requester_facility = btrim(p_requester_facility),
         requester_role = left(nullif(btrim(coalesce(p_requester_role, '')), ''), 80),
         requested_at = date_trunc('milliseconds', now())
   WHERE token = p_token
     AND status = 'pending_request'
     AND expires_at > now()
  RETURNING * INTO inv;

  IF FOUND THEN
    RETURN public.share_invite_json(inv);
  END IF;

  SELECT * INTO inv FROM public.share_invitations WHERE token = p_token;
  IF NOT FOUND OR inv.status = 'pending_request' THEN
    RETURN NULL; -- unknown or expired
  END IF;
  RETURN public.share_invite_json(inv);
END;
$$;

-- Patient (owner key required): approve, deny or revoke.
CREATE OR REPLACE FUNCTION public.share_invite_owner_update(
  p_token TEXT,
  p_owner_key TEXT,
  p_status TEXT,
  p_access_level TEXT DEFAULT NULL,
  p_snapshot JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.share_invitations;
  ts TIMESTAMPTZ := date_trunc('milliseconds', now());
BEGIN
  SELECT * INTO inv FROM public.share_invitations WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF inv.owner_key_hash <> public.share_invite_key_hash(p_owner_key) THEN
    RAISE EXCEPTION 'Only the patient who created this invitation can change it.' USING ERRCODE = '42501';
  END IF;

  IF p_status = 'approved' THEN
    IF inv.status NOT IN ('awaiting_approval', 'approved') THEN
      RAISE EXCEPTION 'There is no pending request to approve.' USING ERRCODE = '22023';
    END IF;
    IF p_snapshot IS NULL OR jsonb_typeof(p_snapshot) <> 'object' OR octet_length(p_snapshot::text) > 200000 THEN
      RAISE EXCEPTION 'A clinical snapshot is required to approve access.' USING ERRCODE = '22023';
    END IF;
    UPDATE public.share_invitations
       SET status = 'approved',
           access_level = coalesce(p_access_level, access_level),
           snapshot = p_snapshot,
           approved_at = coalesce(approved_at, ts)
     WHERE token = p_token
    RETURNING * INTO inv;
  ELSIF p_status = 'denied' THEN
    IF inv.status NOT IN ('awaiting_approval', 'denied') THEN
      RAISE EXCEPTION 'There is no pending request to deny.' USING ERRCODE = '22023';
    END IF;
    UPDATE public.share_invitations
       SET status = 'denied', snapshot = NULL, denied_at = coalesce(denied_at, ts)
     WHERE token = p_token
    RETURNING * INTO inv;
  ELSIF p_status = 'revoked' THEN
    UPDATE public.share_invitations
       SET status = 'revoked', snapshot = NULL, revoked_at = coalesce(revoked_at, ts)
     WHERE token = p_token
    RETURNING * INTO inv;
  ELSE
    RAISE EXCEPTION 'Unsupported status %.', p_status USING ERRCODE = '22023';
  END IF;

  RETURN public.share_invite_json(inv);
END;
$$;

-- Clinician: record the first time an approved report was opened.
CREATE OR REPLACE FUNCTION public.share_invite_mark_viewed(p_token TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.share_invitations
     SET viewed_at = date_trunc('milliseconds', now())
   WHERE token = p_token AND status = 'approved' AND viewed_at IS NULL;
$$;

-- Internal helpers are not callable from the API.
REVOKE ALL ON FUNCTION public.share_invite_json(public.share_invitations) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.share_invite_key_hash(TEXT) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.share_invite_create(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.share_invite_get(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.share_invite_request(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.share_invite_owner_update(TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.share_invite_mark_viewed(TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.share_invite_create(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.share_invite_get(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.share_invite_request(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.share_invite_owner_update(TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.share_invite_mark_viewed(TEXT) TO anon, authenticated;

-- Make PostgREST pick up the new functions immediately.
NOTIFY pgrst, 'reload schema';
