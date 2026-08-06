-- ============================================================================
-- Naya 3.0 « Le Loup » — Chantier 2 (C2.2) : journal d'audit des générations IA
-- ----------------------------------------------------------------------------
-- Le Loup vérifie sémantiquement chaque sortie IA (shadow d'abord, enforce via
-- NAYA_VERIFY_ENFORCE ensuite) ; chaque verdict est journalisé ici pour
-- l'apprentissage (chantier 3, agrégation par règle/domaine) et le reporting
-- admin (C2.5). Rien ici ne bloque la génération : l'écriture est en
-- arrière-plan après livraison.
-- ============================================================================

create table if not exists public.generation_audits (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references public.child_profiles(id) on delete cascade,
  kind text not null,                -- challenge_bulk | challenge_single | homework | recommendation | discriminant | support_retest | hypothesis | proof_validation | not_completed_classification | synthesis | letter | narrative | proof_tampon
  source_function text not null,     -- nom de la fonction serveur appelante
  verdict text not null,             -- conforme | mineur | majeur
  violations jsonb not null default '[]'::jsonb,
  model text,                        -- modèle IA utilisé (si connu)
  estimated_cost numeric,            -- coût estimé de la génération (USD)
  regenerated boolean not null default false,     -- true si le mode enforce a recadré et régénéré
  semantic_checked boolean not null default false, -- true si la vérification sémantique IA a tourné
  context jsonb not null default '{}'::jsonb,      -- contexte de vérification (âge, domaine, direction…)
  created_at timestamptz not null default now(),
  processed boolean not null default false         -- consommé par l'apprentissage (chantier 3)
);

create index if not exists generation_audits_kind_created_idx
  on public.generation_audits (kind, created_at desc);

create index if not exists generation_audits_child_idx
  on public.generation_audits (child_id);

create index if not exists generation_audits_processed_idx
  on public.generation_audits (processed)
  where processed = false;

create index if not exists generation_audits_verdict_idx
  on public.generation_audits (verdict);
