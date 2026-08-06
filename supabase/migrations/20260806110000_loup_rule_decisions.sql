-- ============================================================================
-- Le Loup qui apprend — décisions de validation des règles apprises
-- ----------------------------------------------------------------------------
-- Étend generation_audits (chantier 2) avec un état de décision à 5 valeurs :
--   en_attente (par défaut) → règle encore en observation, proposée en suggestion
--   auto        → auto-acquittée : franchit le seuil de confiance élevé
--                 (≥ N occurrences, ≥ M enfants distincts) ; le flag processed
--                 est posé par la même écriture (idempotent, cf. Décision #56).
--   valide      → l'admin a cliqué « Intégrer » (règle pertinente)
--   a_revoir    → l'admin a cliqué « À revoir » (règle suspecte, re-contrôler)
--   rejete      → l'admin a cliqué « Rejeter » (faux positif, bruit)
-- decision_by trace l'auteur (email admin, ou 'système' pour l'auto) et
-- decision_at la date ; decision_note porte un commentaire humain optionnel.
--
-- Le flag processed existant reste le marqueur « traité » (sorti des
-- suggestions) ; un audit est traité dès qu'une décision ≠ en_attente est posée.
-- Aucun pg_cron : l'auto-acquittement est une étape paresseuse idempotente
-- déclenchée à la consultation du panneau admin (Décision #56 — le projet
-- écarte pg_cron par décisions #3 et #54).
-- ============================================================================

alter table public.generation_audits
  add column if not exists decision text not null default 'en_attente',
  add column if not exists decision_at timestamptz,
  add column if not exists decision_by text,
  add column if not exists decision_note text;

alter table public.generation_audits
  drop constraint if exists generation_audits_decision_check;
alter table public.generation_audits
  add constraint generation_audits_decision_check
  check (decision in ('en_attente', 'auto', 'valide', 'a_revoir', 'rejete'));

-- Lecture rapide du journal des décisions (panneau admin) par décision + date.
create index if not exists generation_audits_decision_created_idx
  on public.generation_audits (decision, created_at desc);
