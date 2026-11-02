-- Renames "Acessórios" to "Piercing" and adds "Triozinho" as a fixed category.

-- Step 1: temporarily allow both old and new category names so the UPDATE below doesn't
-- violate the check constraint.
alter table public.luanne_products
  drop constraint if exists luanne_products_category_check;

alter table public.luanne_products
  add constraint luanne_products_category_check
  check (category in ('Colares', 'Brincos', 'Pulseiras', 'Pingentes', 'Acessórios', 'Piercing', 'Berloques', 'Anéis', 'Tornozeleiras', 'Infantil', 'Triozinho'));

-- Step 2: migrate the data.
update public.luanne_products set category = 'Piercing' where category = 'Acessórios';

-- Step 3: lock the constraint down to the final set (no more "Acessórios").
alter table public.luanne_products
  drop constraint if exists luanne_products_category_check;

alter table public.luanne_products
  add constraint luanne_products_category_check
  check (category in ('Colares', 'Brincos', 'Pulseiras', 'Pingentes', 'Piercing', 'Berloques', 'Anéis', 'Tornozeleiras', 'Infantil', 'Triozinho'));

insert into public.luanne_products (name, category, price)
select 'Triozinho Clássico', 'Triozinho', 59.90
where not exists (select 1 from public.luanne_products where category = 'Triozinho');
