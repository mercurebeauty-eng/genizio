-- Correctif RLS (2026-08-14, audit) : generation_audits était la SEULE table du schéma
-- public en RLS désactivée — le journal d'audit des générations IA (« Le Loup ») était donc
-- lisible/écrivable par tout rôle anon/authenticated. C'est un journal INTERNE (conformité
-- des verdicts IA) : il n'est lu/écrit que par le service role (naya-verifier.functions.ts,
-- admin-os.functions.ts). On active RLS sans aucune policy — même principe du moindre
-- privilège que payments/subscriptions/sponsorship_tokens.
ALTER TABLE public.generation_audits ENABLE ROW LEVEL SECURITY;
