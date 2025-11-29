-- Authenticated users can browse database themes
alter table if exists public.themes enable row level security;
create policy "Authenticated users can read themes" on public.themes
  for select using (auth.role() = 'authenticated');

-- Users may only save a theme if their tier meets or exceeds the requirement
alter table if exists public.users enable row level security;
create policy "Users can save eligible themes" on public.users
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and (
      new.theme_id is null
      or exists (
        select 1
        from public.themes t
        where t.id = new.theme_id
          and (
            new.plan_tier = 'pro'
            or (new.plan_tier = 'plus' and t.required_plan in ('plus', 'free'))
            or (new.plan_tier = 'free' and t.required_plan = 'free')
          )
      )
    )
  );
