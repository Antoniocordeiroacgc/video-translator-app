import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;

// Para uploads feitos pelo servidor (API routes), prefira a service_role key
// para não esbarrar em políticas de RLS do bucket. Se ela não existir,
// cai para a anon key (funciona se o bucket 'videos' for público e sem RLS restritiva).
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn(
    "[supabase] Variáveis de ambiente SUPABASE_URL / SUPABASE_ANON_KEY (ou SERVICE_ROLE_KEY) ausentes."
  );
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

export const VIDEOS_BUCKET = "videos";

/**
 * Faz upload de um Buffer para o bucket público 'videos' e retorna a URL pública.
 */
export async function uploadToSupabase(buffer, path, contentType) {
  const { error } = await supabaseAdmin.storage
    .from(VIDEOS_BUCKET)
    .upload(path, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Falha no upload para o Supabase Storage: ${error.message}`);
  }

  const { data } = supabaseAdmin.storage.from(VIDEOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
