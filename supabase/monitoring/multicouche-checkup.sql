-- ═══════════════════════════════════════════════════════════════════════════
-- Monitoring Génizio — Vague 6 du plan multicouche (2026-08-15)
-- À exécuter dans Supabase Studio (SQL Editor). Aucune migration, aucun push :
-- ce fichier est un OUTIL de diagnostic, pas un changement de schéma.
--
-- Objectif : vérifier que les chemins chauds (Admin OS, mentor, parent) restent
-- rapides à l'échelle, et surveiller la croissance des tables.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. pg_stat_statements : les 10 requêtes les plus lentes ──────────────
-- ⚠️ Noms de colonnes PostgreSQL 14+ (Supabase est en 15+) : mean_exec_TIME,
-- max_exec_TIME, total_exec_TIME (avant PG 13, c'était *_exec_ms).
-- Vérifié en prod le 2026-08-15 : la vue EXISTE (l'erreur précédente de colonne
-- prouve que pg_stat_statements est actif — pas de « relation does not exist »).
SELECT calls, mean_exec_time, max_exec_time, total_exec_time,
       substring(query, 1, 120) AS query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- ── 2. Requêtes les plus FRÉQUENTES (N+1 à traquer) ───────────────────────
SELECT calls, mean_exec_time,
       substring(query, 1, 120) AS query
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 10;

-- ── 3. Scan séquentiels sur les tables chaudes (index manquants) ─────────
SELECT schemaname, relname, seq_scan, seq_tup_read, idx_scan
FROM pg_stat_user_tables
WHERE relname IN (
  'mentors', 'mentor_sessions', 'mentor_reports', 'parent_profiles',
  'season_enrollments', 'challenges', 'child_profiles', 'orders', 'payments',
  'family_coverages', 'observation_events', 'generation_audits', 'app_notifications'
)
ORDER BY seq_scan DESC;

-- ── 4. Tailles de tables (croissance) ─────────────────────────────────────
SELECT relname, n_live_tup AS lignes_estimees,
       pg_size_pretty(pg_total_relation_size(quote_ident(relname))) AS taille
FROM pg_stat_user_tables
WHERE relname IN (
  'mentors', 'mentor_sessions', 'mentor_reports', 'parent_profiles',
  'season_enrollments', 'challenges', 'child_profiles', 'orders', 'payments',
  'family_coverages', 'observation_events', 'generation_audits'
)
ORDER BY n_live_tup DESC;

-- ── 5. Probes RLS mentor (Vague 2) — à lancer avec UN COMPTE MENTOR réel ──
-- 5a. Le mentor lit SON enfant assigné (attendu : lignes retournées) :
--   SELECT id, name FROM child_profiles
--   WHERE id IN (SELECT child_profile_id FROM mentors
--                WHERE mentor_user_id = auth.uid() AND removed_at IS NULL);
-- 5b. Un enfant NON assigné (attendu : 0 ligne — même requête avec un autre id).
-- 5c. Un compte étranger (ni parent ni mentor) sur child_profiles (attendu : 0 ligne).
-- 5d. parent_profiles : le parent lit son propre contact ; un mentor N'Y A PAS accès
--     directement (lecture mentor uniquement via service role + assertMentorOperator).

-- ── 6. Activité mentor : journaux & bilans ────────────────────────────────
-- Journal d'audit (décision #74) : qui a écrit sur les défis des enfants ?
--   SELECT child_profile_id, action, created_at FROM mentor_actions
--   ORDER BY created_at DESC LIMIT 50;
-- Bilans en attente de validation parent (le payout de la 12e séance en dépend) :
--   SELECT child_profile_id, status, period_start, period_end
--   FROM mentor_reports WHERE status IN ('draft','submitted') ORDER BY period_start;
