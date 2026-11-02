-- Adds "Infantil" to the fixed category list.

alter table public.luanne_products
  drop constraint if exists luanne_products_category_check;

alter table public.luanne_products
  add constraint luanne_products_category_check
  check (category in ('Colares', 'Brincos', 'Pulseiras', 'Pingentes', 'Acessórios', 'Berloques', 'Anéis', 'Tornozeleiras', 'Infantil'));

insert into public.luanne_products (name, category, price)
select 'Conjunto Infantil Coração', 'Infantil', 49.90
where not exists (select 1 from public.luanne_products where category = 'Infantil');
