-- Passeport d'Excellence : lettre d'orientation générée par Naya (distincte de la
-- synthèse pédagogique déjà utilisée sur le Portfolio/Passeport — ai_synthesis est
-- centrée observation/comportement, passport_letter est centrée orientation/avenir).
-- Même mécanique de cache que ai_synthesis (regénérée au plus une fois par semaine).
alter table public.child_profiles
  add column if not exists passport_letter text,
  add column if not exists passport_letter_generated_at timestamptz;
