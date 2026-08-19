// Cria o cliente Supabase usado em toda a aplicação.
// Depende de js/config.js (variáveis SUPABASE_URL / SUPABASE_ANON_KEY) e da
// biblioteca @supabase/supabase-js carregada via <script> no <head>/antes deste arquivo.
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
