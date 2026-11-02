# Luanne Pratas — contexto do projeto

Catálogo online da **Luanne Pratas 925** (joias de prata — Instagram `@luannepratas`, WhatsApp (62) 9 8592-3529). Cliente do Brayam. O cliente vê as peças com foto e preço e chama no WhatsApp; não há carrinho nem pagamento. Painel `admin.html` pra cadastrar peças, fotos, marcar indisponível e trocar as 3 fotos do topo (hero).

## Onde está cada coisa (produção)

| O quê | Onde | Conta |
|---|---|---|
| Site | https://luanne-pratas.vercel.app (admin em `/admin.html`) | — |
| Hospedagem | Vercel, projeto `brayam-s-projects/luanne-pratas` | Vercel `brayam777` |
| Código | GitHub `brayam777/luanne-pratas` — push na `main` publica sozinho | GitHub `brayam777` |
| Banco + login | Supabase ref **`ietooopjzlnzmguubrrv`** (sa-east-1; nome no painel: "luanne-pratas") | Supabase **brayamfelipe02@gmail.com** |
| Fotos | S3 (MinIO) `https://s3.inovai.dev.br`, bucket `catalogo-brayam`, prefixo `luanne-pratas/` | chaves nas env vars da Vercel (`S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`) e em `SUPABASE_CREDENTIALS.local` (só no computador do Brayam) |

**NÃO usar:**
- Outros projetos Supabase: a conta do Brayam tem projetos de **outros clientes e de outro app**. O deste site é **só** o `ietooopjzlnzmguubrrv` — confira o ref antes de qualquer `link`, `db push` ou SQL. Nunca faça `supabase link` neste ref a partir de uma pasta que já esteja ligada a outro projeto.
- Bucket Supabase Storage `luanne-photos`: **legado e vazio** (fotos migradas pra S3 em 2026-10-15).
- O bucket `catalogo-brayam` é compartilhado com outros sites — só mexa no prefixo `luanne-pratas/`.

## Stack e convenções

- Site estático: HTML + CSS + JS puro (ES modules), **sem build**. Dependências só pra função serverless (AWS SDK).
- A página pública (`js/main.js`) lê o Supabase por `fetch` direto na API REST, **sem supabase-js** — de propósito, pra carregar rápido no celular. Só o admin usa `supabase-js` (via esm.sh, `js/supabase-config.js`). Não traga a biblioteca pra página pública.
- Uma função da Vercel: `api/presign-upload.js` (Node, CommonJS). Valida a sessão do admin no Supabase (`/auth/v1/user`) e devolve URLs assinadas de upload pra S3 (foto + miniatura). A chave secreta da S3 nunca vai pro navegador.
- Português nos textos e comentários; comentário só quando o "porquê" não é óbvio.
- **Não use regex com lookbehind** no JS do site — quebra no Safari/iOS antigo.

## Regras de negócio (e onde mudar junto)

- **Categorias** — a lista aparece em 4 lugares que precisam bater: o `check` do banco (última versão em `20260822090000_add_conjunto_category.sql`), o `<select>` em `admin.html`, `CATEGORY_ORDER` em `js/main.js` (define a ordem dos filtros) e `CATEGORIES` em `tests/smoke.mjs`. Adicionar categoria = nova migração + os outros 3.
- **Gênero**: `feminino` | `masculino` (ou vazio), com `check` no banco; filtros fixos em `GENDER_FILTERS` (`js/main.js`).
- **Disponível / indisponível**: coluna `available` (boolean). Peça indisponível aparece cinza com "Indisponível" e o preço vira "Esgotado" — por isso as indisponíveis costumam ter **preço 0**. Peça **disponível** com preço 0 apareceria como "R$ 0,00" (o `npm test` avisa).
- **Quem pode editar**: login por **senha única** (sem e-mail na tela) numa conta fixa `brayamfelipe02@gmail.com`. Esse e-mail aparece em 3 lugares que precisam bater: `SHARED_LOGIN_EMAIL` em `js/admin.js`, `ADMIN_EMAIL` em `api/presign-upload.js` e a tabela `luanne_admins` (RLS via `is_luanne_admin()`). A senha do painel **não está no repositório** — fica em `SUPABASE_CREDENTIALS.local` no computador do Brayam. Trocar a senha = `update auth.users set encrypted_password = crypt('nova', gen_salt('bf')) where email = '...'` rodado no banco.
- **URL e chave pública (anon) do Supabase** estão em `js/config.js`, `api/presign-upload.js` e `tests/smoke.mjs` (é a chave *anon*, pode ficar no código; a `service_role` NUNCA).
- **WhatsApp/Instagram**: constantes `WHATSAPP_NUMBER` e `INSTAGRAM_HANDLE` no topo de `js/main.js` (o número também aparece em `index.html`).
- **Fotos**: o admin comprime no navegador (máx. 1600px, JPEG 0.82 — `compressImage()` em `js/admin.js`) e gera também uma **miniatura de 600px**. A função devolve duas URLs assinadas (`<uuid>.jpg` e `<uuid>-thumb.jpg`) e o navegador faz PUT direto na S3. Cards, hero e lista do admin carregam a miniatura via `thumbUrl()` (`js/config.js`), caindo na foto cheia se a miniatura não existir. Formatos que o navegador não decodifica (ex.: HEIC no Chrome) sobem como vieram, sem miniatura.
- **Hero**: tabela de uma linha `luanne_settings` (`hero_photo_1..3`), editável no painel; chaves no S3 no formato `hero-N-<uuid>.jpg`.

## Banco de dados

Tabelas: `luanne_products` (name, category, gender, size, price, available, image_url, created_at), `luanne_settings` (hero) e `luanne_admins` (email). RLS: leitura pública dos produtos e do hero; escrita só admin.

**Migrações NÃO vão com o push.** O push só publica o site. Aqui o histórico remoto está em dia (10 migrações, conferido em 2026-11-02). Mudança de banco:
1. Crie um arquivo novo em `supabase/migrations/` (`AAAAMMDDHHMMSS_descricao.sql`), idempotente quando der.
2. `npx supabase login` com a conta **brayamfelipe02@gmail.com** (confira com `npx supabase projects list`), depois `npx supabase link --project-ref ietooopjzlnzmguubrrv`, `npx supabase migration list` e `npx supabase db push`.
3. A conexão direta por `--db-url` **não funciona** (host só IPv6 e a senha antiga do pooler foi recusada) — use o `link` acima. O SQL Editor do painel Supabase também serve.
4. O `supabase login` é global: trocar de conta tira o acesso aos projetos da outra.

## Rodar local

- `npm run serve` → http://localhost:8081 (servidor estático simples `serve.cjs`; **não** roda `/api`, então upload de foto no admin não funciona assim).
- Pra testar o admin com upload: `npx vercel link` (projeto `luanne-pratas`) e `npx vercel dev`. As variáveis `S3_*` da Vercel são do tipo *Secret* — `vercel env pull` **não** traz o valor; crie o `.env.local` à mão com os valores de `SUPABASE_CREDENTIALS.local`.
- Atenção: local ou não, o site usa o **banco de produção** (não há banco de teste). Cuidado ao cadastrar/apagar peças.

## Testes

- `npm test` — smoke test do site publicado (home, admin, API recusa sem login, arquivos internos dão 404, catálogo/categorias/fotos na S3, miniaturas). Sem dependências. Outro endereço: `BASE_URL=http://localhost:3000 npm test`.
- `npm run test:s3` — confere a S3 (credenciais, política só-leitura, escrita anônima bloqueada). Precisa de `npm install` e do `.env.local` (ver acima).

## S3 / MinIO

O servidor recusa `DeleteObjects` em lote do AWS SDK atual (exige Content-MD5) — apague **um por um**. Os uploads novos não definem `Cache-Control` (ver pendências).

## Deploy

Push na `main` do GitHub → a Vercel publica em produção sozinha (repositório conectado com `vercel git connect` em 2026-11-02; antes disso o deploy era manual com `vercel deploy --prod --scope brayam-s-projects`, que ainda funciona em emergência — às vezes falha uma vez com "Not authorized", é só repetir). Confira com `npx vercel ls luanne-pratas --scope brayam-s-projects`. (O `vercel link` acrescenta `.vercel` e `.env*` no fim do `.gitignore`; é redundante e inofensivo.) O `.vercelignore` impede que `tests/`, `supabase/`, `CLAUDE.md`, `README.md`, `serve.cjs`, `.claude/` e qualquer `*.local`/`.env*` vão pro site.

## Pendências

- `js/supabase-config.js` importa `@supabase/supabase-js@2` **solto** do esm.sh. Uma versão ruim do esm.sh já quebrou outro site do Brayam (travar em uma versão testada resolve) — considere fixar a versão.
- "Berloque coração" está **disponível com preço R$ 0** (aparece "R$ 0,00" pra cliente) — ajustar o preço ou marcar indisponível.
- Uploads novos na S3 não definem `Cache-Control` (`api/presign-upload.js`); as chaves são UUID e nunca sobrescritas, então um cache longo economizaria banda.
- Sem banco de teste: tudo roda contra produção.
- Backup das fotos originais (≈490 MB, de antes da compressão) está só no computador antigo, em `C:\Users\Brayam\dyad-apps\backups\luanne-pratas-fotos-supabase-2026-10-15` — não está no GitHub nem na nuvem.
- Os scripts de migração pra S3 e de gerar miniaturas em lote (feitos em 2026-10) eram descartáveis e não foram guardados. Foto antiga sem miniatura funciona (cai na foto cheia).
