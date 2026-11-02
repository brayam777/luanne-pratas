-- Adds a proper "size" field so items (rings, etc.) with the same size can be
-- grouped together on the site instead of following insertion order.

alter table public.luanne_products
  add column if not exists size text;

-- Best-effort backfill for existing rings: many were named like "Anel 18",
-- "Anel coração 18" — extract a trailing number (preceded by whitespace, at
-- the very end of the name) as the size. Names like "Anel 2 corações" or
-- "Anel falange" have no trailing number and are correctly left alone.
update public.luanne_products
set size = substring(name from '\s(\d+)$')
where category = 'Anéis' and size is null and name ~ '\s\d+$';
