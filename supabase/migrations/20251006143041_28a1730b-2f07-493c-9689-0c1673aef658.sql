-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('owner', 'member');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view all roles"
  ON public.user_roles
  FOR SELECT
  USING (true);

-- Create security definer function to check roles safely (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create member_invitations table (for future email invitation system)
CREATE TABLE public.member_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invited_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  location_ids UUID[] NOT NULL DEFAULT '{}',
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on member_invitations
ALTER TABLE public.member_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view invitations"
  ON public.member_invitations
  FOR SELECT
  USING (true);

CREATE POLICY "Owners can manage invitations"
  ON public.member_invitations
  FOR ALL
  USING (public.has_role(auth.uid(), 'owner'));

-- Add trigger for member_invitations updated_at
CREATE TRIGGER update_member_invitations_updated_at
  BEFORE UPDATE ON public.member_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update profiles table with new fields
ALTER TABLE public.profiles
  ADD COLUMN location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN phone_number TEXT,
  ADD COLUMN slack_user_id TEXT,
  ADD COLUMN slack_workspace_id TEXT,
  ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;