const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { randomUUID } = require('crypto');

// URL/anon key públicas (as mesmas de js/supabase-config.js) — usadas só pra
// confirmar no servidor que quem pede a URL de upload é o admin logado.
const SUPABASE_URL = 'https://ietooopjzlnzmguubrrv.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlldG9vb3Bqemxuem1ndXVicnJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MDQ3NzIsImV4cCI6MjEwMTA4MDc3Mn0.rEWcyU5vMNy5XDAmDgrY4eHvI3XwS4jsf3DRkASBgNA';
const ADMIN_EMAIL = 'brayamfelipe02@gmail.com';
const SITE_PREFIX = 'luanne-pratas';
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif']);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  let user;
  try {
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!userResp.ok) throw new Error('invalid session');
    user = await userResp.json();
  } catch {
    res.status(401).json({ error: 'Sessão inválida, entre novamente.' });
    return;
  }

  if (user.email !== ADMIN_EMAIL) {
    res.status(403).json({ error: 'Não autorizado' });
    return;
  }

  const { ext, contentType } = req.body || {};
  const cleanExt = String(ext || '').toLowerCase();
  if (!ALLOWED_EXT.has(cleanExt)) {
    res.status(400).json({ error: 'Formato de imagem não suportado' });
    return;
  }

  const id = randomUUID();
  const key = `${SITE_PREFIX}/${id}.${cleanExt}`;
  const wantsThumb = req.body.withThumb === true && cleanExt === 'jpg';
  const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
    },
    forcePathStyle: true,
  });

  try {
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ContentType: contentType || 'application/octet-stream',
    });
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    const publicUrl = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${key}`;
    let thumbUploadUrl = null;
    if (wantsThumb) {
      const thumbCommand = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: `${SITE_PREFIX}/${id}-thumb.jpg`,
        ContentType: 'image/jpeg',
      });
      thumbUploadUrl = await getSignedUrl(s3, thumbCommand, { expiresIn: 300 });
    }
    res.status(200).json({ uploadUrl, publicUrl, thumbUploadUrl });
  } catch (err) {
    console.error('presign error', err);
    res.status(500).json({ error: 'Não foi possível preparar o upload' });
  }
};
