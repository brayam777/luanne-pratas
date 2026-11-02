-- Schema for the standalone Luanne Pratas Supabase project.
-- Run once against the project with: supabase db query -f luanne-pratas/supabase/schema.sql --db-url <...>

create table if not exists public.luanne_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  price numeric not null,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.luanne_products enable row level security;

create policy "Public can view luanne products"
  on public.luanne_products for select
  using (true);

create policy "Admin can manage luanne products"
  on public.luanne_products for all
  using (auth.jwt() ->> 'email' = any (array['brayamfelipe02@gmail.com']))
  with check (auth.jwt() ->> 'email' = any (array['brayamfelipe02@gmail.com']));

insert into storage.buckets (id, name, public)
values ('luanne-photos', 'luanne-photos', true)
on conflict (id) do nothing;

create policy "Public can view luanne photos"
  on storage.objects for select
  using (bucket_id = 'luanne-photos');

create policy "Admin can upload luanne photos"
  on storage.objects for insert
  with check (bucket_id = 'luanne-photos' and auth.jwt() ->> 'email' = any (array['brayamfelipe02@gmail.com']));

create policy "Admin can update luanne photos"
  on storage.objects for update
  using (bucket_id = 'luanne-photos' and auth.jwt() ->> 'email' = any (array['brayamfelipe02@gmail.com']));

create policy "Admin can delete luanne photos"
  on storage.objects for delete
  using (bucket_id = 'luanne-photos' and auth.jwt() ->> 'email' = any (array['brayamfelipe02@gmail.com']));

insert into public.luanne_products (name, category, price) values
  ('Anel Solitário', 'Anéis', 89.90),
  ('Anel Trançado', 'Anéis', 79.90),
  ('Brinco Argola Fina', 'Brincos', 69.90),
  ('Brinco Ponto de Luz', 'Brincos', 59.90),
  ('Colar Corrente Veneziana', 'Colares', 129.90),
  ('Colar Coração', 'Colares', 109.90),
  ('Pulseira Elos', 'Pulseiras', 99.90),
  ('Pulseira Riviera', 'Pulseiras', 119.90);
