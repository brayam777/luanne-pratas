-- Fixes "infinite recursion detected in policy for relation luanne_admins":
-- policies that queried luanne_admins from within a luanne_admins policy (or
-- from policies on other tables) triggered RLS on luanne_admins again,
-- recursively. A security definer function run as the table owner bypasses
-- RLS on the lookup, breaking the cycle.

create or replace function public.is_luanne_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.luanne_admins where email = auth.jwt() ->> 'email');
$$;

drop policy if exists "Admins can view admin list" on public.luanne_admins;
create policy "Admins can view admin list"
  on public.luanne_admins for select
  using (public.is_luanne_admin());

drop policy if exists "Admins can add admins" on public.luanne_admins;
create policy "Admins can add admins"
  on public.luanne_admins for insert
  with check (public.is_luanne_admin());

drop policy if exists "Admins can remove admins" on public.luanne_admins;
create policy "Admins can remove admins"
  on public.luanne_admins for delete
  using (public.is_luanne_admin());

drop policy if exists "Admin can manage luanne products" on public.luanne_products;
create policy "Admin can manage luanne products"
  on public.luanne_products for all
  using (public.is_luanne_admin())
  with check (public.is_luanne_admin());

drop policy if exists "Admin can upload luanne photos" on storage.objects;
create policy "Admin can upload luanne photos"
  on storage.objects for insert
  with check (bucket_id = 'luanne-photos' and public.is_luanne_admin());

drop policy if exists "Admin can update luanne photos" on storage.objects;
create policy "Admin can update luanne photos"
  on storage.objects for update
  using (bucket_id = 'luanne-photos' and public.is_luanne_admin());

drop policy if exists "Admin can delete luanne photos" on storage.objects;
create policy "Admin can delete luanne photos"
  on storage.objects for delete
  using (bucket_id = 'luanne-photos' and public.is_luanne_admin());
