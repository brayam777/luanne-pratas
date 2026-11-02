-- Locks categories to a fixed list (admin picks from a dropdown from now on,
-- no more free-text typing) and adds a gender field to each product.

alter table public.luanne_products
  drop constraint if exists luanne_products_category_check;

alter table public.luanne_products
  add constraint luanne_products_category_check
  check (category in ('Colares', 'Brincos', 'Pulseiras', 'Pingentes', 'Acessórios', 'Berloques', 'Anéis', 'Tornozeleiras'));

alter table public.luanne_products
  add column if not exists gender text;

alter table public.luanne_products
  drop constraint if exists luanne_products_gender_check;

alter table public.luanne_products
  add constraint luanne_products_gender_check
  check (gender is null or gender in ('feminino', 'masculino'));

insert into public.luanne_products (name, category, price)
select 'Tornozeleira Elos', 'Tornozeleiras', 69.90
where not exists (select 1 from public.luanne_products where category = 'Tornozeleiras');
