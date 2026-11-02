import { supabase } from './supabase-config.js';
import { thumbUrl } from './config.js';

const MAX_PHOTO_SIDE = 1600;
const PHOTO_QUALITY = 0.82;
const THUMB_SIDE = 600;
const THUMB_QUALITY = 0.78;

function jpegFromBitmap(bitmap, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

// Fotos de celular chegam com 1–8 MB; reduz pra no máximo 1600px e JPEG, e gera
// uma miniatura de 600px pros cartões do catálogo. Se o navegador não conseguir
// ler o formato (ex: HEIC no Chrome), sobe o arquivo original sem miniatura.
async function compressImage(file) {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const blob = await jpegFromBitmap(bitmap, MAX_PHOTO_SIDE, PHOTO_QUALITY);
    const thumb = await jpegFromBitmap(bitmap, THUMB_SIDE, THUMB_QUALITY);
    bitmap.close();
    if (blob && thumb && blob.size < file.size) return { blob, thumb, ext: 'jpg', contentType: 'image/jpeg' };
  } catch (err) {
    console.warn('compressão falhou, enviando original', err);
  }
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  return { blob: file, thumb: null, ext, contentType: file.type || 'image/jpeg' };
}

// Pede uma URL assinada pra function do servidor (que confere a sessão de admin
// e guarda a chave secreta do S3) e manda a foto direto pro S3 com ela.
async function uploadPhoto(file) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Sessão expirada, entre novamente.');

  const { blob, thumb, ext, contentType } = await compressImage(file);

  const presignResp = await fetch('/api/presign-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ ext, contentType, withThumb: Boolean(thumb) }),
  });
  if (!presignResp.ok) {
    const body = await presignResp.json().catch(() => ({}));
    throw new Error(body.error || 'Não foi possível preparar o envio da foto.');
  }
  const { uploadUrl, publicUrl, thumbUploadUrl } = await presignResp.json();

  const puts = [fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: blob })];
  if (thumb && thumbUploadUrl) {
    puts.push(fetch(thumbUploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: thumb }));
  }
  const results = await Promise.all(puts);
  if (!results[0].ok) throw new Error('Falha ao enviar a foto.');

  return publicUrl;
}

const loginView = document.getElementById('loginView');
const panelView = document.getElementById('panelView');
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const sessionInfo = document.getElementById('sessionInfo');
const panelMessage = document.getElementById('panelMessage');
const logoutBtn = document.getElementById('logoutBtn');
const productForm = document.getElementById('productForm');
const productList = document.getElementById('productList');
const productFormTitle = document.getElementById('productFormTitle');
const productFormSubmit = document.getElementById('productFormSubmit');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editingProductId = document.getElementById('editingProductId');
const currentPhotoHint = document.getElementById('currentPhotoHint');
const productNameInput = document.getElementById('productName');
const productCategoryInput = document.getElementById('productCategory');
const productGenderInput = document.getElementById('productGender');
const productSizeInput = document.getElementById('productSize');
const productPriceInput = document.getElementById('productPrice');
const productPhotoInput = document.getElementById('productPhoto');
const heroPhotoMessage = document.getElementById('heroPhotoMessage');

let editingImageUrl = null;
let products = [];

const currency = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const genderLabel = (g) => (g === 'masculino' ? 'Masculino' : g === 'feminino' ? 'Feminino' : '');

function showMessage(el, text, isError = false) {
  el.textContent = text;
  el.classList.toggle('error', isError);
}

function gemIcon() {
  return `<svg class="icon-gem" viewBox="0 0 64 64"><path d="M8 22 L32 6 L56 22 L32 58 Z" /><path d="M8 22 L56 22 M20 22 L32 58 M44 22 L32 58 M32 6 L20 22 M32 6 L44 22" /></svg>`;
}

function enterEditMode(product) {
  editingProductId.value = product.id;
  editingImageUrl = product.image_url;
  productNameInput.value = product.name;
  productCategoryInput.value = product.category;
  productGenderInput.value = product.gender || '';
  productSizeInput.value = product.size || '';
  productPriceInput.value = product.price;
  productPhotoInput.value = '';
  productFormTitle.textContent = 'Editar peça';
  productFormSubmit.textContent = 'Salvar alterações';
  cancelEditBtn.hidden = false;
  currentPhotoHint.hidden = !product.image_url;
  productForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function exitEditMode() {
  editingProductId.value = '';
  editingImageUrl = null;
  productForm.reset();
  productFormTitle.textContent = 'Adicionar peça';
  productFormSubmit.textContent = 'Adicionar';
  cancelEditBtn.hidden = true;
  currentPhotoHint.hidden = true;
}

async function loadProductList() {
  const { data, error } = await supabase
    .from('luanne_products')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    showMessage(panelMessage, 'Não foi possível carregar as peças agora.', true);
    return;
  }

  products = data;

  if (data.length === 0) {
    productList.innerHTML = '<p class="admin-list-empty">Nenhuma peça cadastrada ainda.</p>';
    return;
  }

  productList.innerHTML = data
    .map((p) => {
      const available = p.available !== false;
      return `
      <div class="admin-list-item${available ? '' : ' is-unavailable'}" data-id="${p.id}">
        ${
          p.image_url
            ? `<img class="admin-list-thumb" src="${thumbUrl(p.image_url)}" alt="${p.name}" loading="lazy" decoding="async" onerror="if(this.src!=='${p.image_url}')this.src='${p.image_url}'" />`
            : `<span class="admin-list-thumb">${gemIcon()}</span>`
        }
        <div class="admin-list-info">
          <div class="admin-list-name">${p.name}</div>
          <div class="admin-list-meta">${p.category}${p.gender ? ' · ' + genderLabel(p.gender) : ''}${p.size ? ' · Tam. ' + p.size : ''} · ${currency(Number(p.price))}</div>
          ${available ? '' : '<span class="admin-unavailable-badge">Indisponível</span>'}
        </div>
        <div class="admin-list-actions">
          <button class="admin-toggle-available${available ? '' : ' is-off'}" data-toggle-available="${p.id}">
            ${available ? 'Marcar indisponível' : 'Marcar disponível'}
          </button>
          <button class="admin-list-delete" data-delete="${p.id}">Remover</button>
        </div>
      </div>`;
    })
    .join('');
}

async function loadHeroPhotos() {
  const { data, error } = await supabase.from('luanne_settings').select('*').eq('id', true).maybeSingle();
  if (error || !data) return;
  [1, 2, 3].forEach((n) => {
    const url = data[`hero_photo_${n}`];
    const preview = document.getElementById(`heroPreview${n}`);
    preview.innerHTML = url ? `<img src="${thumbUrl(url)}" alt="Foto ${n}" onerror="if(this.src!=='${url}')this.src='${url}'" />` : '';
  });
}

async function handleHeroPhotoChange(slot, file) {
  showMessage(heroPhotoMessage, 'Enviando...');
  let url;
  try {
    url = await uploadPhoto(file);
  } catch (err) {
    console.error('hero upload error', err);
    showMessage(heroPhotoMessage, `Não foi possível enviar a foto: ${err.message}`, true);
    return;
  }

  const { error } = await supabase
    .from('luanne_settings')
    .update({ [`hero_photo_${slot}`]: url })
    .eq('id', true);

  if (error) {
    console.error('hero settings save error', error);
    showMessage(heroPhotoMessage, `Não foi possível salvar a foto: ${error.message}`, true);
    return;
  }

  showMessage(heroPhotoMessage, 'Foto de destaque atualizada!');
  loadHeroPhotos();
}

function wireHeroPhotoSlots() {
  [1, 2, 3].forEach((n) => {
    document.getElementById(`heroPhotoInput${n}`).addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleHeroPhotoChange(n, file);
    });
  });
}

// Login é por senha única compartilhada — por trás dos panos ainda é uma
// conta normal do Supabase Auth, só que com e-mail fixo (não pedimos e-mail
// na tela). O e-mail continua sendo o que está autorizado em luanne_admins.
const SHARED_LOGIN_EMAIL = 'brayamfelipe02@gmail.com';

async function handleLogin(e) {
  e.preventDefault();
  const password = document.getElementById('loginPassword').value;
  showMessage(loginMessage, 'Entrando...');
  const { error } = await supabase.auth.signInWithPassword({
    email: SHARED_LOGIN_EMAIL,
    password,
  });
  if (error) {
    showMessage(loginMessage, 'Senha incorreta. Tente novamente.', true);
    return;
  }
  loginForm.reset();
}

async function handleLogout() {
  await supabase.auth.signOut();
}

async function handleSubmitProduct(e) {
  e.preventDefault();
  const id = editingProductId.value;
  const name = productNameInput.value.trim();
  const category = productCategoryInput.value;
  const gender = productGenderInput.value;
  const size = productSizeInput.value.trim() || null;
  const price = parseFloat(productPriceInput.value);
  const file = productPhotoInput.files[0];

  showMessage(panelMessage, 'Salvando...');

  let image_url = id ? editingImageUrl : null;
  if (file) {
    try {
      image_url = await uploadPhoto(file);
    } catch (err) {
      console.error('upload error', err);
      showMessage(panelMessage, `Não foi possível enviar a foto: ${err.message}`, true);
      return;
    }
  }

  const { error } = id
    ? await supabase.from('luanne_products').update({ name, category, gender, size, price, image_url }).eq('id', id)
    : await supabase.from('luanne_products').insert({ name, category, gender, size, price, image_url });

  if (error) {
    console.error('save error', error);
    showMessage(panelMessage, `Não foi possível salvar a peça: ${error.message}`, true);
    return;
  }

  exitEditMode();
  showMessage(panelMessage, id ? 'Peça atualizada!' : 'Peça adicionada!');
  loadProductList();
}

async function handleProductListClick(e) {
  const toggleBtn = e.target.closest('[data-toggle-available]');
  if (toggleBtn) {
    const product = products.find((p) => p.id === toggleBtn.dataset.toggleAvailable);
    if (!product) return;
    const available = product.available === false;
    toggleBtn.disabled = true;
    const { error } = await supabase.from('luanne_products').update({ available }).eq('id', product.id);
    if (error) {
      toggleBtn.disabled = false;
      showMessage(panelMessage, 'Não foi possível mudar a disponibilidade da peça.', true);
      return;
    }
    showMessage(panelMessage, available ? `"${product.name}" está disponível de novo.` : `"${product.name}" marcada como indisponível.`);
    loadProductList();
    return;
  }

  const deleteBtn = e.target.closest('[data-delete]');
  if (deleteBtn) {
    if (!confirm('Remover esta peça do catálogo?')) return;
    const { error } = await supabase.from('luanne_products').delete().eq('id', deleteBtn.dataset.delete);
    if (error) {
      showMessage(panelMessage, 'Não foi possível remover a peça.', true);
      return;
    }
    if (editingProductId.value === deleteBtn.dataset.delete) exitEditMode();
    loadProductList();
    return;
  }

  const item = e.target.closest('.admin-list-item');
  if (!item) return;
  const product = products.find((p) => p.id === item.dataset.id);
  if (product) enterEditMode(product);
}

async function renderForSession(session) {
  if (session) {
    loginView.hidden = true;
    panelView.hidden = false;
    sessionInfo.textContent = 'Logado';
    await loadProductList();
    await loadHeroPhotos();
  } else {
    loginView.hidden = false;
    panelView.hidden = true;
  }
}

loginForm.addEventListener('submit', handleLogin);
logoutBtn.addEventListener('click', handleLogout);
productForm.addEventListener('submit', handleSubmitProduct);
productList.addEventListener('click', handleProductListClick);
cancelEditBtn.addEventListener('click', exitEditMode);
wireHeroPhotoSlots();

supabase.auth.onAuthStateChange((_event, session) => {
  renderForSession(session);
});

supabase.auth.getSession().then(({ data }) => renderForSession(data.session));
