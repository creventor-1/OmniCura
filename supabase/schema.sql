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
CREATE POLICY "Users can view their own health profile"
  ON public.health_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own health profile"
  ON public.health_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own health profile"
  ON public.health_profiles FOR UPDATE
  USING (auth.uid() = user_id);

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
CREATE POLICY "Users can view their own assessments"
  ON public.assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assessments"
  ON public.assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

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
CREATE POLICY "Users can view their own emergency contacts"
  ON public.emergency_contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emergency contacts"
  ON public.emergency_contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emergency contacts"
  ON public.emergency_contacts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emergency contacts"
  ON public.emergency_contacts FOR DELETE
  USING (auth.uid() = user_id);
