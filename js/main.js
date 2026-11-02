import { SUPABASE_URL, SUPABASE_ANON_KEY, thumbUrl } from './config.js';

// ---- Config ----
const WHATSAPP_NUMBER = '5562985923529'; // (62) 9 8592-3529
const INSTAGRAM_HANDLE = 'luannepratas';

let PRODUCTS = [];

// A página pública só lê dados: busca direto na API REST do Supabase em vez de
// baixar a biblioteca supabase-js inteira (bem mais rápido no celular).
async function restGet(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

async function loadProducts() {
  try {
    PRODUCTS = await restGet('luanne_products?select=*&order=created_at.asc');
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
    PRODUCTS = null;
  }
}

async function loadHeroGallery() {
  let data;
  try {
    [data] = await restGet('luanne_settings?select=*&id=eq.true');
  } catch {
    return;
  }
  if (!data) return;

  const photos = [data.hero_photo_1, data.hero_photo_2, data.hero_photo_3].filter(Boolean);
  if (photos.length === 0) return;

  const gallery = document.getElementById('heroGallery');
  gallery.innerHTML = photos
    .map((url, i) => `<div class="hero-photo hero-photo-${i + 1}"><img src="${thumbUrl(url)}" alt="Luanne Pratas 925" decoding="async" onerror="if(this.src!=='${url}')this.src='${url}'" /></div>`)
    .join('');
  gallery.hidden = false;
  document.getElementById('heroInner').classList.add('has-gallery');
}

const currency = (v) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function waLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function gemIcon() {
  return `<svg class="icon-gem" viewBox="0 0 64 64"><path d="M8 22 L32 6 L56 22 L32 58 Z" /><path d="M8 22 L56 22 M20 22 L32 58 M44 22 L32 58 M32 6 L20 22 M32 6 L44 22" /></svg>`;
}

const CATEGORY_ORDER = ['Colares', 'Conjunto', 'Brincos', 'Pulseiras', 'Pingentes', 'Berloques', 'Anéis', 'Tornozeleiras', 'Infantil', 'Triozinho', 'Piercing'];

function orderedCategories() {
  const categories = [...new Set(PRODUCTS.map((p) => p.category))];
  categories.sort((a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b));
  return categories;
}

const genderLabel = (g) => (g === 'masculino' ? 'Masculino' : g === 'feminino' ? 'Feminino' : '');

const GENDER_FILTERS = [
  { value: 'feminino', label: '♀ Feminino' },
  { value: 'masculino', label: '♂ Masculino' },
];

let currentGender = 'all';
let currentCategory = 'all';

function renderGenderFilters() {
  const el = document.getElementById('genderFilters');
  const buttons = [
    `<button class="filter-btn filter-btn-gender active" data-gender="all">Todos</button>`,
    ...GENDER_FILTERS.map(
      (g) => `<button class="filter-btn filter-btn-gender" data-gender="${g.value}">${g.label}</button>`
    ),
  ];
  el.innerHTML = buttons.join('');

  el.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    el.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentGender = btn.dataset.gender;
    renderGrid();
  });
}

function renderCategoryFilters() {
  const el = document.getElementById('categoryFilters');
  const buttons = [
    `<button class="filter-btn active" data-category="all">Todas</button>`,
    ...orderedCategories().map((c) => `<button class="filter-btn" data-category="${c}">${c}</button>`),
  ];
  el.innerHTML = buttons.join('');

  el.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    el.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.dataset.category;
    renderGrid();
  });
}

const isAvailable = (p) => p.available !== false;

function cardHtml(p) {
  const available = isAvailable(p);
  const message = `Olá! Tenho interesse na peça "${p.name}" (${currency(p.price)}) que vi no site da Luanne Pratas.`;
  const media = p.image_url
    ? `<img src="${thumbUrl(p.image_url)}" data-full="${p.image_url}" alt="${p.name}" loading="lazy" decoding="async" />`
    : `${gemIcon()}<span class="placeholder-tag">foto em breve</span>`;
  const tags = [p.gender ? genderLabel(p.gender) : null, p.size ? `Tam. ${p.size}` : null].filter(Boolean);
  const cta = available
    ? `<a class="btn btn-whatsapp btn-sm card-cta" href="${waLink(message)}">Perguntar no WhatsApp</a>`
    : `<span class="btn btn-sm card-cta btn-unavailable" aria-disabled="true">Indisponível</span>`;
  return `
    <article class="card${available ? '' : ' card-unavailable'}">
      <div class="card-media">
        ${media}
        ${available ? '' : '<span class="unavailable-tag">Indisponível</span>'}
      </div>
      <div class="card-body">
        <span class="card-category">${p.category}${tags.length ? ` · ${tags.join(' · ')}` : ''}</span>
        <h3 class="card-name">${p.name}</h3>
        ${available ? `<span class="card-price">${currency(p.price)}</span>` : '<span class="card-price card-price-unavailable">Esgotado</span>'}
        ${cta}
      </div>
    </article>`;
}

function gridHtml(items) {
  const sorted = [...items].sort((a, b) => Number(!isAvailable(a)) - Number(!isAvailable(b)));
  return `<div class="catalog-grid">${sorted.map(cardHtml).join('')}</div>`;
}

function sizeSortValue(size) {
  if (!size) return Infinity;
  const n = parseInt(size, 10);
  return Number.isNaN(n) ? Infinity - 1 : n;
}

function itemsHtml(items) {
  const hasSizes = items.some((p) => p.size);
  if (!hasSizes) {
    return gridHtml(items);
  }

  const sizes = [...new Set(items.map((p) => p.size || ''))].sort(
    (a, b) => sizeSortValue(a) - sizeSortValue(b) || a.localeCompare(b)
  );

  return sizes
    .map((size) => {
      const sizeItems = items.filter((p) => (p.size || '') === size);
      const heading = size ? `Tamanho ${size}` : 'Outros tamanhos';
      return `
        <div class="size-group">
          <h4 class="size-heading">${heading}</h4>
          ${gridHtml(sizeItems)}
        </div>`;
    })
    .join('');
}

function groupedByCategoryHtml(pool) {
  const categories = orderedCategories().filter((category) => pool.some((p) => p.category === category));
  return categories
    .map((category) => {
      const items = pool.filter((p) => p.category === category);
      return `
        <div class="category-group">
          <h3 class="category-heading">${category}</h3>
          ${itemsHtml(items)}
        </div>`;
    })
    .join('');
}

function renderGrid() {
  const grid = document.getElementById('catalogGrid');

  if (PRODUCTS === null) {
    grid.innerHTML = '<p class="catalog-error">Não foi possível carregar o catálogo agora. Tente novamente em instantes.</p>';
    return;
  }

  if (PRODUCTS.length === 0) {
    grid.innerHTML = '<p class="catalog-empty">Nenhuma peça por aqui ainda — volte em breve!</p>';
    return;
  }

  const pool = PRODUCTS.filter(
    (p) =>
      (currentGender === 'all' || p.gender === currentGender) &&
      (currentCategory === 'all' || p.category === currentCategory)
  );

  if (pool.length === 0) {
    grid.innerHTML = '<p class="catalog-empty">Nenhuma peça por aqui ainda — volte em breve!</p>';
    return;
  }

  grid.innerHTML = currentCategory === 'all' ? groupedByCategoryHtml(pool) : itemsHtml(pool);
}

function wireGenericWhatsappLinks() {
  const generic = waLink('Olá! Vi o site da Luanne Pratas e gostaria de fazer uma encomenda.');
  document.querySelectorAll('[data-wa-generic]').forEach((el) => (el.href = generic));
}

function wireInstagramLink() {
  const link = document.getElementById('instagramLink');
  if (link) link.href = `https://instagram.com/${INSTAGRAM_HANDLE}`;
}

function wireMobileMenu() {
  const toggle = document.getElementById('menuToggle');
  const nav = document.getElementById('mobileNav');
  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
  nav.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    })
  );
}

function wireExternalLinks() {
  // Navega na mesma aba via location.href em vez de abrir nova aba (target="_blank")
  // ou window.open — mais confiável pra abrir o app nativo do WhatsApp no celular
  // (evita o padrão "aba em branco depois navega" que falha em alguns navegadores).
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a.btn-whatsapp, #instagramLink');
    if (!link || !link.href) return;
    e.preventDefault();
    window.location.href = link.href;
  });
}

function wireBackToTop() {
  const btn = document.getElementById('backToTop');
  window.addEventListener('scroll', () => {
    btn.hidden = window.scrollY < 500;
  });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

async function init() {
  document.getElementById('year').textContent = new Date().getFullYear();
  wireGenericWhatsappLinks();
  wireInstagramLink();
  wireMobileMenu();
  wireBackToTop();
  wireExternalLinks();
  wireThumbFallback();
  loadHeroGallery();
  await loadProducts();
  renderGenderFilters();
  renderCategoryFilters();
  renderGrid();
}

// Se uma miniatura ainda não existir no S3, mostra a foto completa no lugar.
function wireThumbFallback() {
  document.getElementById('catalogGrid').addEventListener(
    'error',
    (e) => {
      const img = e.target;
      if (img.tagName === 'IMG' && img.dataset.full && img.src !== img.dataset.full) img.src = img.dataset.full;
    },
    true
  );
}

init();
