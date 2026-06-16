/**
 * CRUD de chaves PIX do usuário.
 * Usa a subconta Asaas individual de cada usuário (asaas_subconta_key).
 *
 * GET    → lista chaves
 * POST   → adiciona chave (registra no DICT via subconta do usuário)
 * DELETE → remove chave
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { asaas, asaasWithKey, corsHeaders, errRes, jsonRes, getAuthUser, detectPixKeyType, supabaseAdmin } from '../_shared/asaas.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = await getAuthUser(req);
  if (!auth) return errRes('Unauthorized', 401);
  const { user, client } = auth;

  // ── GET — lista chaves ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await client
      .from('pix_keys')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) return errRes('Erro ao buscar chaves.');
    return jsonRes(data ?? []);
  }

  // ── POST — adiciona chave ───────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { key } = await req.json();
    if (!key?.trim()) return errRes('Chave PIX inválida.');
    const cleanKey = key.trim();
    const keyType  = detectPixKeyType(cleanKey);

    // Verifica duplicata
    const { data: existing } = await client
      .from('pix_keys').select('id').eq('user_id', user.id).eq('key', cleanKey).maybeSingle();
    if (existing) return errRes('Chave PIX já cadastrada.');

    // Limite de 5 chaves
    const { count } = await client
      .from('pix_keys').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    if ((count ?? 0) >= 5) return errRes('Limite de 5 chaves PIX atingido.');

    // Busca subconta key do usuário
    const { data: profile } = await supabaseAdmin()
      .from('profiles').select('asaas_subconta_key').eq('user_id', user.id).maybeSingle();

    const userApiKey   = profile?.asaas_subconta_key ?? '';
    const hasSubconta  = !!userApiKey;

    // Tenta registrar no DICT via subconta do usuário (ou conta mestre como fallback)
    let dictStatus = 'LOCAL_ONLY';
    let finalKey   = cleanKey;

    try {
      const body: Record<string, string> = { type: keyType };
      if (keyType !== 'EVP') body.key = cleanKey;

      const { data: dictData, status } = hasSubconta
        ? await asaasWithKey('POST', '/pix/addressKeys', userApiKey, body)
        : await asaas('POST', '/pix/addressKeys', body);

      if (status < 400) {
        dictStatus = (dictData as any)?.status ?? 'ACTIVE';
        // EVP: usa a chave UUID gerada pelo Asaas
        if (keyType === 'EVP' && (dictData as any)?.key) {
          finalKey = (dictData as any).key;
        }
      } else {
        const reason = (dictData as any)?.errors?.[0]?.description ?? '';
        console.warn('[PIX-KEYS] DICT register failed:', reason);
        dictStatus = hasSubconta ? 'PENDING_APPROVAL' : 'LOCAL_ONLY';
      }
    } catch (e) {
      console.warn('[PIX-KEYS] DICT register error:', e);
      dictStatus = 'LOCAL_ONLY';
    }

    const { data: inserted, error } = await client
      .from('pix_keys')
      .insert({ user_id: user.id, key: finalKey, key_type: keyType, dict_status: dictStatus })
      .select().single();
    if (error) return errRes('Erro ao salvar chave.');

    return jsonRes({ success: true, pixKey: inserted, dictStatus });
  }

  // ── DELETE — remove chave ───────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { key } = await req.json();
    if (!key?.trim()) return errRes('Chave inválida.');

    // Remove do DICT via subconta do usuário (best-effort)
    const { data: profile } = await supabaseAdmin()
      .from('profiles').select('asaas_subconta_key').eq('user_id', user.id).maybeSingle();

    if (profile?.asaas_subconta_key) {
      try {
        await asaasWithKey('DELETE', `/pix/addressKeys/${encodeURIComponent(key.trim())}`, profile.asaas_subconta_key);
      } catch { /* ignora */ }
    }

    const { error } = await client
      .from('pix_keys').delete().eq('user_id', user.id).eq('key', key.trim());
    if (error) return errRes('Erro ao remover chave.');
    return jsonRes({ success: true });
  }

  return errRes('Método não permitido.', 405);
});
