-- ============================================================================
-- Suppression différenciée des défis + signal d'abandon pour le Loup (#58)
-- ----------------------------------------------------------------------------
-- Trois angles validés (Décision #58) :
-- 1. SOFT-DELETE : un défi n'est plus jamais supprimé physiquement (sauf
--    suppression de profil, qui cascade et purge tout). La colonne deleted_at
--    masque la ligne à toutes les lectures (RLS côté client, filtres explicites
--    côté service role). Avantage induit : proof_image_url reste référencé, fini
--    les fichiers Storage orphelins à la suppression d'un défi.
-- 2. TABLE challenge_outcomes : le « signal d'issue » de chaque défi supprimé
--    (type, raison, domaine, statut au moment de la suppression, jours en
--    attente) — consommé par l'agrégation du Loup (chantier 3, Décision #56).
--    Écriture service role uniquement (aucune policy RLS).
-- 3. Le signal CHALLENGE_ABANDONED (Jumeau Pédagogique) est PRÉSERVÉ : avec le
--    soft-delete le trigger DELETE ne tirerait plus ; une branche du trigger
--    UPDATE émet l'événement au passage deleted_at NULL -> not null.
-- ============================================================================

-- ── 1. Soft-delete sur challenges ──────────────────────────────────────────

alter table public.challenges
  add column if not exists deleted_at timestamptz;

-- Lecture des défis actifs par enfant (active-challenge, listes, gardes).
create index if not exists challenges_child_active_idx
  on public.challenges (child_id) where deleted_at is null;

-- ── 2. Table challenge_outcomes (signal d'issue, service role) ─────────────

create table if not exists public.challenge_outcomes (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  -- deleted_uncompleted : supprimé avant d'être terminé ; deleted_completed : terminé puis supprimé.
  kind text not null check (kind in ('deleted_uncompleted', 'deleted_completed')),
  -- Vocabulaire applicatif : pas_le_bon_moment | deja_fait_autrement | pas_interesse | doublon | NULL (sans raison).
  reason_chip text check (
    reason_chip is null
    or reason_chip in ('pas_le_bon_moment', 'deja_fait_autrement', 'pas_interesse', 'doublon')
  ),
  reason_note text,
  domain text not null,
  -- Statut du défi au moment de la suppression (todo | in_progress | completed | not_completed).
  status_when_deleted text not null,
  pending_duration_days numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists challenge_outcomes_child_idx
  on public.challenge_outcomes (child_id);
create index if not exists challenge_outcomes_signal_idx
  on public.challenge_outcomes (reason_chip, domain, kind);
create index if not exists challenge_outcomes_created_idx
  on public.challenge_outcomes (created_at desc);

-- RLS activée sans AUCUNE policy : seuls le service role (le Loup, les fonctions
-- serveur) peuvent lire/écrire. Les parents ne voient jamais ces traces.
alter table public.challenge_outcomes enable row level security;

-- ── 3. RLS sur challenges : les supprimés deviennent invisibles ─────────────

-- Policy 1 (FOR ALL, owner) : SELECT/UPDATE/DELETE exigent une ligne active
-- (deleted_at IS NULL) appartenant au parent. Le soft-delete passe car l'ancienne
-- ligne a deleted_at NULL ; tout accès post-suppression est bloqué.
drop policy if exists "Parents manage their own challenges" on public.challenges;
create policy "Parents manage their own challenges"
  on public.challenges for all
  to authenticated
  using (auth.uid() = user_id and deleted_at is null)
  with check (auth.uid() = user_id);

-- Policy 2 (lecture publique des complétés) : corrige la fuite — une ligne
-- complétée soft-deletée serait restée visible publiquement sans ce garde.
drop policy if exists "Anyone can view completed challenges" on public.challenges;
create policy "Anyone can view completed challenges"
  on public.challenges for select
  to authenticated
  using (status = 'completed' and deleted_at is null);

-- Policy publique sur child_profiles : un profil n'est « public » que s'il a un
-- défi complété NON supprimé.
drop policy if exists "Public can view profiles with completed challenges" on public.child_profiles;
create policy "Public can view profiles with completed challenges"
  on public.child_profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.challenges c
      where c.child_id = child_profiles.id and c.status = 'completed' and c.deleted_at is null
    )
  );

-- ── 4. Trigger : préserver CHALLENGE_ABANDONED au soft-delete ───────────────

-- Nouvelle branche dans log_challenge_observation : passage deleted_at NULL ->
-- NOT NULL sur un défi non terminé = signal d'abandon (payload identique à la
-- branche DELETE historique). Le trigger UPDATE existant appelle déjà cette
-- fonction sur toute mise à jour.
create or replace function public.log_challenge_observation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days_open numeric;
begin
  if TG_OP = 'INSERT' then
    insert into public.observation_events (child_id, user_id, type, payload)
    values (
      NEW.child_id, NEW.user_id, 'CHALLENGE_ASSIGNED',
      jsonb_build_object(
        'challenge_id', NEW.id,
        'domain', NEW.domain,
        'difficulty', NEW.difficulty,
        'requires_supervision', NEW.requires_supervision,
        'target_intelligences', NEW.target_intelligences
      )
    );
    return NEW;
  end if;

  if TG_OP = 'UPDATE' and OLD.status is distinct from NEW.status then
    v_days_open := round((EXTRACT(EPOCH FROM (now() - NEW.created_at)) / 86400.0)::numeric, 2);
    if NEW.status = 'in_progress' then
      insert into public.observation_events (child_id, user_id, type, payload)
      values (
        NEW.child_id, NEW.user_id, 'CHALLENGE_STARTED',
        jsonb_build_object(
          'challenge_id', NEW.id,
          'domain', NEW.domain,
          'days_since_assigned', v_days_open
        )
      );
    elsif NEW.status = 'completed' then
      insert into public.observation_events (child_id, user_id, type, payload)
      values (
        NEW.child_id, NEW.user_id, 'CHALLENGE_COMPLETED',
        jsonb_build_object(
          'challenge_id', NEW.id,
          'domain', NEW.domain,
          'difficulty', NEW.difficulty,
          'target_intelligences', NEW.target_intelligences,
          'ai_validated', NEW.ai_observations is not null,
          'has_proof_image', NEW.proof_image_url is not null,
          'days_since_assigned', v_days_open
        )
      );
    end if;
    -- Transition completed -> todo (reset) : volontairement sans événement.
    return NEW;
  end if;

  -- Soft-delete (Décision #58) : un défi masqué sans avoir été complété = abandon.
  if TG_OP = 'UPDATE' and OLD.deleted_at is null and NEW.deleted_at is not null then
    if OLD.status <> 'completed'
       and exists (select 1 from public.child_profiles cp where cp.id = OLD.child_id) then
      insert into public.observation_events (child_id, user_id, type, payload)
      values (
        OLD.child_id, OLD.user_id, 'CHALLENGE_ABANDONED',
        jsonb_build_object(
          'challenge_id', OLD.id,
          'domain', OLD.domain,
          'status_when_deleted', OLD.status,
          'days_since_assigned',
            round((EXTRACT(EPOCH FROM (now() - OLD.created_at)) / 86400.0)::numeric, 2)
        )
      );
    end if;
    return NEW;
  end if;

  if TG_OP = 'DELETE' then
    -- Garde EXISTS : lors d'une suppression de profil entier, la cascade
    -- supprime les défis alors que child_profiles est déjà en cours de
    -- suppression — insérer violerait la FK et ferait échouer la suppression.
    if OLD.status <> 'completed'
       and exists (select 1 from public.child_profiles cp where cp.id = OLD.child_id) then
      insert into public.observation_events (child_id, user_id, type, payload)
      values (
        OLD.child_id, OLD.user_id, 'CHALLENGE_ABANDONED',
        jsonb_build_object(
          'challenge_id', OLD.id,
          'domain', OLD.domain,
          'status_when_deleted', OLD.status,
          'days_since_assigned',
            round((EXTRACT(EPOCH FROM (now() - OLD.created_at)) / 86400.0)::numeric, 2)
        )
      );
    end if;
    return OLD;
  end if;

  return NEW;
end;
$$;

-- Défense en profondeur (décision #22) : CREATE OR REPLACE préserve les
-- privilèges, on re-révoque par précaution.
revoke execute on function public.log_challenge_observation() from public, anon, authenticated;
