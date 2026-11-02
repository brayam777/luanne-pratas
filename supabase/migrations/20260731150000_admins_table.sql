-- Replaces the hardcoded admin-email array with a proper table so admins can
-- be managed from the admin panel UI instead of editing migrations.

create table if not exists public.luanne_admins (
  email text primary key,
  added_at timestamptz not null default now()
);

alter table public.luanne_admins enable row level security;

create policy "Admins can view admin list"
  on public.luanne_admins for select
  using (exists (select 1 from public.luanne_admins a where a.email = auth.jwt() ->> 'email'));

create policy "Admins can add admins"
  on public.luanne_admins for insert
  with check (exists (select 1 from public.luanne_admins a where a.email = auth.jwt() ->> 'email'));

create policy "Admins can remove admins"
  on public.luanne_admins for delete
  using (exists (select 1 from public.luanne_admins a where a.email = auth.jwt() ->> 'email'));

insert into public.luanne_admins (email) values ('brayamfelipe02@gmail.com')
on conflict (email) do nothing;

create or replace function public.luanne_prevent_last_admin_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.luanne_admins) <= 1 then
    raise exception 'Não é possível remover o último administrador.';
  end if;
  return old;
end;
$$;

drop trigger if exists luanne_admins_prevent_last_delete on public.luanne_admins;
create trigger luanne_admins_prevent_last_delete
  before delete on public.luanne_admins
  for each row execute function public.luanne_prevent_last_admin_delete();

-- Swap the products policy to check the admins table instead of a hardcoded array.
drop policy if exists "Admin can manage luanne products" on public.luanne_products;
create policy "Admin can manage luanne products"
  on public.luanne_products for all
  using (exists (select 1 from public.luanne_admins a where a.email = auth.jwt() ->> 'email'))
  with check (exists (select 1 from public.luanne_admins a where a.email = auth.jwt() ->> 'email'));

-- Swap the storage policies the same way.
drop policy if exists "Admin can upload luanne photos" on storage.objects;
create policy "Admin can upload luanne photos"
  on storage.objects for insert
  with check (bucket_id = 'luanne-photos' and exists (select 1 from public.luanne_admins a where a.email = auth.jwt() ->> 'email'));

drop policy if exists "Admin can update luanne photos" on storage.objects;
create policy "Admin can update luanne photos"
  on storage.objects for update
  using (bucket_id = 'luanne-photos' and exists (select 1 from public.luanne_admins a where a.email = auth.jwt() ->> 'email'));

drop policy if exists "Admin can delete luanne photos" on storage.objects;
create policy "Admin can delete luanne photos"
  on storage.objects for delete
  using (bucket_id = 'luanne-photos' and exists (select 1 from public.luanne_admins a where a.email = auth.jwt() ->> 'email'));
