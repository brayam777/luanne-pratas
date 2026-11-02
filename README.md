# Luanne Pratas 925

Catálogo online de joias de prata com pedido pelo WhatsApp.

- Site: https://luanne-pratas.vercel.app
- Painel: https://luanne-pratas.vercel.app/admin.html (senha única, não fica no repositório)

HTML/CSS/JS puro, banco e login no Supabase, fotos numa S3 própria, hospedado na Vercel. Detalhes técnicos, contas e regras de negócio estão em [CLAUDE.md](CLAUDE.md).

## Rodar local

```bash
npm run serve
```

Abre em http://localhost:8081. Esse servidor simples não roda a função `/api` (upload de fotos); pra testar o painel completo use `npx vercel dev` (ver abaixo). O site local usa o banco de **produção**.

## Testes

```bash
npm test
```

Smoke test do site publicado. Pra conferir também a S3: `npm install`, crie o `.env.local` (ver abaixo) e `npm run test:s3`.

## Publicar

Commit + `git push` na branch `main` → a Vercel publica sozinha em alguns segundos.

Mudanças no **banco** não vão com o push: crie um `.sql` em `supabase/migrations/` e aplique pela CLI do Supabase (conta brayamfelipe02@gmail.com) ou no SQL Editor — passo a passo em [CLAUDE.md](CLAUDE.md#banco-de-dados).

## Continuar em outro computador

**Instalar:** [Git](https://git-scm.com/downloads), [Node.js LTS](https://nodejs.org) (vem com `npm`/`npx`) e o [GitHub CLI](https://cli.github.com).

**Comandos:**

```bash
gh auth login --web
gh repo clone brayam777/luanne-pratas
cd luanne-pratas
npm install
npm test
```

**Só se for testar o painel com upload:**

```bash
npx vercel login
npx vercel link --yes --project luanne-pratas --scope brayam-s-projects
npx vercel dev
```

As variáveis `S3_*` da Vercel são do tipo *Secret* e **não** descem com `vercel env pull`. Crie um `.env.local` (já ignorado pelo git) com `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY` e `S3_SECRET_KEY` — os valores ficam em `SUPABASE_CREDENTIALS.local` no computador antigo; leve esse arquivo por um canal seguro, nunca pelo GitHub.

**Só se for mexer no banco pela CLI** (o SQL Editor do painel do Supabase também serve):

```bash
npx supabase login
npx supabase link --project-ref ietooopjzlnzmguubrrv
npx supabase migration list
```

Entre com a conta **brayamfelipe02@gmail.com** no Supabase.

**Publicar:** `git add`, `git commit` e `git push` — a Vercel faz o resto.

**Não vai pelo GitHub:** a senha do painel e as chaves da S3 (ficam em `SUPABASE_CREDENTIALS.local`) e o backup das fotos originais antigas (`C:\Users\Brayam\dyad-apps\backups\luanne-pratas-fotos-supabase-2026-10-15`).
