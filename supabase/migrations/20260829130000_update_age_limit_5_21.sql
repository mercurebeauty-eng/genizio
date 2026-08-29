-- Update the age limit to 21 years old (2026-08-29)
-- As per user request, Genizio will now cover high school and transition to higher education
-- (up to 21 years old).

ALTER TABLE public.child_profiles DROP CONSTRAINT IF EXISTS child_profiles_age_check;
ALTER TABLE public.child_profiles
  ADD CONSTRAINT child_profiles_age_check CHECK (age BETWEEN 5 AND 21);
