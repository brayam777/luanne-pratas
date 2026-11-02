// Standalone Supabase project for Luanne Pratas (public URL and anon key — not secrets).
export const SUPABASE_URL = 'https://ietooopjzlnzmguubrrv.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlldG9vb3Bqemxuem1ndXVicnJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MDQ3NzIsImV4cCI6MjEwMTA4MDc3Mn0.rEWcyU5vMNy5XDAmDgrY4eHvI3XwS4jsf3DRkASBgNA';

const S3_PHOTO = /^https:\/\/s3\.inovai\.dev\.br\/catalogo-brayam\/luanne-pratas\/[^/]+\.jpg$/i;

// Miniatura de 600px gerada junto com cada foto JPEG do S3 (sufixo -thumb).
// Fotos sem miniatura (formato antigo/original) usam a própria foto.
export function thumbUrl(url) {
  if (!url || !S3_PHOTO.test(url) || /-thumb\.jpg$/i.test(url)) return url;
  return url.replace(/\.jpg$/i, '-thumb.jpg');
}
