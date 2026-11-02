// Smoke test do site publicado (sem dependências — só Node 18+).
// Uso: npm test            (testa produção)
//      BASE_URL=http://localhost:3000 npm test   (testa outro endereço, ex.: `vercel dev`)

const BASE_URL = (process.env.BASE_URL || 'https://luanne-pratas.vercel.app').replace(/\/$/, '');

// Mesma URL/chave pública de js/config.js (anon key — não é segredo).
const SUPABASE_URL = 'https://ietooopjzlnzmguubrrv.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlldG9vb3Bqemxuem1ndXVicnJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MDQ3NzIsImV4cCI6MjEwMTA4MDc3Mn0.rEWcyU5vMNy5XDAmDgrY4eHvI3XwS4jsf3DRkASBgNA';

const S3_PHOTO = /^https:\/\/s3\.inovai\.dev\.br\/catalogo-brayam\/luanne-pratas\/[^/]+\.(jpe?g|png|webp)$/i;
const CATEGORIES = ['Colares', 'Brincos', 'Pulseiras', 'Pingentes', 'Piercing', 'Berloques', 'Anéis', 'Tornozeleiras', 'Infantil', 'Triozinho', 'Conjunto'];

// Arquivos internos que NUNCA podem ser servidos pelo site (ver .vercelignore).
const MUST_BE_PRIVATE = [
  '/SUPABASE_CREDENTIALS.local',
  '/CLAUDE.md',
  '/README.md',
  '/serve.cjs',
  '/tests/smoke.mjs',
  '/supabase/migrations/20260731000000_init.sql',
  '/supabase/.temp/project-ref',
  '/.vercel/project.json',
  '/.claude/launch.json',
];

let failures = 0;
async function check(name, fn) {
  try {
    await fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    failures++;
    console.log(`FAIL  ${name} — ${err.message}`);
  }
}
function expect(cond, msg) {
  if (!cond) throw new Error(msg);
}

const rest = (path) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });

await check('home responde 200 e tem a marca', async () => {
  const r = await fetch(`${BASE_URL}/`);
  expect(r.status === 200, `status ${r.status}`);
  expect((await r.text()).includes('Luanne'), 'texto "Luanne" não apareceu');
});

await check('painel (admin.html) responde 200', async () => {
  const r = await fetch(`${BASE_URL}/admin.html`);
  expect(r.status === 200, `status ${r.status}`);
});

await check('API de upload recusa chamada sem login (401)', async () => {
  const r = await fetch(`${BASE_URL}/api/presign-upload`, { method: 'POST' });
  expect(r.status === 401, `status ${r.status} (esperado 401)`);
});

await check('API de upload recusa token falso (401)', async () => {
  const r = await fetch(`${BASE_URL}/api/presign-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-falso' },
    body: JSON.stringify({ ext: 'jpg', contentType: 'image/jpeg' }),
  });
  expect(r.status === 401, `status ${r.status} (esperado 401)`);
});

for (const path of MUST_BE_PRIVATE) {
  await check(`arquivo interno não é servido: ${path}`, async () => {
    const r = await fetch(`${BASE_URL}${path}`);
    expect(r.status === 404, `status ${r.status} (esperado 404)`);
  });
}

await check('catálogo tem peças, categorias válidas e todas as fotos na S3', async () => {
  const r = await rest('luanne_products?select=name,category,price,available,image_url');
  expect(r.ok, `Supabase respondeu ${r.status}`);
  const rows = await r.json();
  expect(rows.length > 0, 'catálogo vazio');
  const badCategory = rows.filter((p) => !CATEGORIES.includes(p.category));
  expect(badCategory.length === 0, `categoria inválida: ${badCategory[0]?.name} (${badCategory[0]?.category})`);
  // Peça indisponível costuma ficar com preço 0 (o site mostra "Esgotado"); já disponível com
  // preço 0 apareceria como "R$ 0,00" pra cliente — só avisa, não reprova.
  const freeAvailable = rows.filter((p) => p.available !== false && !(Number(p.price) > 0));
  if (freeAvailable.length) console.log(`WARN  disponível com preço 0: ${freeAvailable.map((p) => p.name).join(', ')}`);
  const badPhoto = rows.filter((p) => p.image_url && !S3_PHOTO.test(p.image_url));
  expect(badPhoto.length === 0, `foto fora da S3: ${badPhoto[0]?.name} → ${badPhoto[0]?.image_url}`);
});

await check('fotos do hero apontam pra S3 e carregam', async () => {
  const r = await rest('luanne_settings?select=hero_photo_1,hero_photo_2,hero_photo_3&id=eq.true');
  expect(r.ok, `Supabase respondeu ${r.status}`);
  const [row] = await r.json();
  const urls = Object.values(row || {}).filter(Boolean);
  for (const url of urls) {
    expect(S3_PHOTO.test(url), `hero fora da S3: ${url}`);
    const head = await fetch(url, { method: 'HEAD' });
    expect(head.ok, `hero ${head.status}: ${url}`);
  }
});

await check('primeira foto do catálogo e a miniatura -thumb carregam', async () => {
  const r = await rest('luanne_products?select=image_url&image_url=like.*.jpg&order=created_at.asc&limit=1');
  const [row] = await r.json();
  expect(row, 'nenhuma peça com foto .jpg');
  const thumb = row.image_url.replace(/\.jpg$/i, '-thumb.jpg');
  for (const url of [row.image_url, thumb]) {
    const head = await fetch(url, { method: 'HEAD' });
    expect(head.ok, `${head.status}: ${url}`);
  }
});

console.log(failures ? `\n${failures} falha(s).` : '\nTudo certo.');
process.exit(failures ? 1 : 0);
