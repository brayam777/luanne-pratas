-- Single-row settings table to hold the 3 featured hero photos, editable
-- from the admin panel.

create table if not exists public.luanne_settings (
  id boolean primary key default true,
  hero_photo_1 text,
  hero_photo_2 text,
  hero_photo_3 text,
  constraint luanne_settings_single_row check (id)
);

insert into public.luanne_settings (id) values (true)
on conflict (id) do nothing;

alter table public.luanne_settings enable row level security;

drop policy if exists "Public can view luanne settings" on public.luanne_settings;
create policy "Public can view luanne settings"
  on public.luanne_settings for select
  using (true);

drop policy if exists "Admin can update luanne settings" on public.luanne_settings;
create policy "Admin can update luanne settings"
  on public.luanne_settings for update
  using (public.is_luanne_admin())
  with check (public.is_luanne_admin());
