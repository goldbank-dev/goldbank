/**
 * POST /functions/v1/register-user
 * Chamada logo após signUp() — cria subconta Asaas individual para o usuário.
 * Cada usuário tem sua própria conta Asaas (não apenas customer).
 * Body: { name, email, cpfCnpj, phone?, postalCode?, address?, addressNumber?, province? }
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { asaas, asaasWithKey, corsHeaders, errRes, jsonRes, getAuthUser, supabaseAdmin } from '../_shared/asaas.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = await getAuthUser(req);
  if (!auth) return errRes('Unauthorized', 401);
  const { user } = auth;

  try {
    const { name, email, cpfCnpj, phone, postalCode, address, addressNumber, province } = await req.json();

    // Verifica se já tem subconta criada
    const { data: profile } = await supabaseAdmin()
      .from('profiles')
      .select('asaas_subconta_id, asaas_subconta_key, asaas_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profile?.asaas_subconta_id && profile?.asaas_subconta_key) {
      return jsonRes({ subcontaId: profile.asaas_subconta_id, created: false });
    }

    const cleanCpf   = (cpfCnpj ?? '').replace(/\D/g, '');
    const cleanPhone = (phone ?? '').replace(/\D/g, '');
    const cleanCep   = (postalCode ?? '').replace(/\D/g, '');
    const displayName = name ?? email ?? 'Cliente GoldBank';

    // ── Criar subconta Asaas (POST /accounts) ──────────────────────────────
    const subcontaBody: Record<string, unknown> = {
      name:       displayName,
      email:      email,
      loginEmail: email,
      cpfCnpj:    cleanCpf || undefined,
      webhooks: [{
        url:        `${Deno.env.get('SUPABASE_URL')}/functions/v1/pix-webhook`,
        email:      email,
        apiVersion: '3',
        authToken:  Deno.env.get('ASAAS_WEBHOOK_TOKEN') ?? '',
        enabled:    true,
        interrupted: false,
        events:     ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_CREATED'],
      }],
    };
    if (cleanPhone) subcontaBody.mobilePhone = cleanPhone;
    if (address)    subcontaBody.address = address;
    if (addressNumber) subcontaBody.addressNumber = addressNumber;
    if (province)   subcontaBody.province = province;
    if (cleanCep)   subcontaBody.postalCode = cleanCep;

    const { data: acct, status: acctStatus } = await asaas('POST', '/accounts', subcontaBody);

    let subcontaId: string;
    let subcontaKey: string;

    if (acctStatus >= 400) {
      const errMsg = (acct as any)?.errors?.[0]?.description ?? 'Erro Asaas';
      console.warn('[REGISTER-USER] Subconta error:', errMsg);

      // Fallback: cria como customer na conta mestre
      const { data: cust, status: custStatus } = await asaas('POST', '/customers', {
        name: displayName, email,
        cpfCnpj: cleanCpf || undefined,
        mobilePhone: cleanPhone || undefined,
        notificationDisabled: true,
      });

      if (custStatus >= 400) {
        // Usa ID temporário — será re-tentado no próximo login
        subcontaId  = `pending_${user.id.replace(/-/g, '').slice(0, 12)}`;
        subcontaKey = '';
      } else {
        subcontaId  = (cust as any).id;
        subcontaKey = '';
      }
    } else {
      subcontaId  = (acct as any).id;
      subcontaKey = (acct as any).apiKey ?? '';
    }

    // ── Salva no perfil ───────────────────────────────────────────────────
    const updateData: Record<string, unknown> = {
      asaas_subconta_id:  subcontaId,
      asaas_subconta_key: subcontaKey,
      asaas_customer_id:  subcontaId,
      cpf_cnpj:           cleanCpf || null,
      updated_at:         new Date().toISOString(),
    };
    if (name) updateData.display_name = name;

    await supabaseAdmin().from('profiles').update(updateData).eq('user_id', user.id);

    // ── Auto-gera chave PIX EVP para o usuário (se subconta criada com sucesso) ──
    if (subcontaKey) {
      try {
        const { data: evp, status: evpStatus } = await asaasWithKey(
          'POST', '/pix/addressKeys', subcontaKey, { type: 'EVP' }
        );
        if (evpStatus < 400 && (evp as any)?.key) {
          await supabaseAdmin().from('pix_keys').upsert({
            user_id:     user.id,
            key:         (evp as any).key,
            key_type:    'EVP',
            dict_status: (evp as any).status ?? 'ACTIVE',
          }, { onConflict: 'user_id,key' });
          console.log('[REGISTER-USER] EVP key criada:', (evp as any).key);
        }
      } catch (e) {
        console.warn('[REGISTER-USER] EVP key error:', e);
      }
    }

    return jsonRes({ subcontaId, created: true, hasOwnKey: !!subcontaKey });

  } catch (err) {
    console.error('[REGISTER-USER ERROR]', err);
    return errRes('Erro ao criar conta no sistema de pagamentos.');
  }
});
