-- Marca de disponibilidade por peça: o painel alterna com um botão e o site
-- bloqueia o pedido pelo WhatsApp das peças indisponíveis.

alter table public.luanne_products
  add column if not exists available boolean not null default true;

-- Peças que a cliente já vinha marcando como vendidas pelo nome
-- ("... VENDIDO💥", "VENDIDA", "VENDDO") passam a usar o campo novo,
-- e o sufixo sai do nome.
update public.luanne_products
set available = false,
    name = trim(regexp_replace(name, '[\s.]*VEND\w*\s*💥?\s*$', '', 'i'))
where name ~* 'VEND\w*\s*💥?\s*$';
