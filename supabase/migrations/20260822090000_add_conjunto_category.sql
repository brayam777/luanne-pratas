-- Adds "Conjunto" as a fixed category and moves existing necklace+earring
-- sets (currently miscategorized under "Colares") into it.

alter table public.luanne_products
  drop constraint if exists luanne_products_category_check;

alter table public.luanne_products
  add constraint luanne_products_category_check
  check (category in ('Colares', 'Brincos', 'Pulseiras', 'Pingentes', 'Piercing', 'Berloques', 'Anéis', 'Tornozeleiras', 'Infantil', 'Triozinho', 'Conjunto'));

update public.luanne_products
set category = 'Conjunto'
where category = 'Colares' and name ilike 'conjunto%';
