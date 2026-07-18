create table if not exists public.supervisors (
  id uuid primary key default gen_random_uuid(),
  supervisor_user_id uuid references auth.users(id) on delete cascade not null,
  child_profile_id uuid references public.child_profiles(id) on delete cascade not null,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now() not null,
  unique(supervisor_user_id, child_profile_id)
);

alter table public.supervisors enable row level security;

create policy "Supervisors can read their own assignments"
  on public.supervisors
  for select
  using (auth.uid() = supervisor_user_id);
