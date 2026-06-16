/**
 * POST /functions/v1/pix-deposit
 * Cria cobrança PIX no Asaas e salva em pix_charges.
 * Retorna QR Code (base64 + payload copia-e-cola).
 *
 * Body: { amount: number, description?: string }
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { asaas, asaasWithKey, corsHeaders, errRes, jsonRes, getAuthUser, supabaseAdmin } from '../_shared/asaas.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = await getAuthUser(req);
  if (!auth) return errRes('Unauthorized', 401);
  const { user, client } = auth;

  try {
    const { amount, description } = await req.json();
    if (!amount || amount < 1) return errRes('Valor mínimo de R$ 1,00.');

    // Busca dados da subconta e customer do perfil
    const { data: profile } = await client
      .from('profiles')
      .select('asaas_customer_id, asaas_subconta_id, asaas_subconta_key, display_name, cpf_cnpj')
      .eq('user_id', user.id)
      .single();

    // Usa subconta própria se disponível, senão usa customer na conta mestre
    const userApiKey   = (profile as any)?.asaas_subconta_key ?? '';
    const hasSubconta  = !!userApiKey;
    const callAsaas    = hasSubconta
      ? (m: string, p: string, b?: unknown) => asaasWithKey(m, p, userApiKey, b)
      : asaas;

    let customerId = hasSubconta
      ? (profile as any)?.asaas_subconta_id   // na subconta, o "customer" é o próprio dono
      : profile?.asaas_customer_id;

    // Se ainda não tem customer/subconta no Asaas, cria automaticamente
    if (!customerId) {
      const cpfCnpj = (profile?.cpf_cnpj ?? '00000000000').replace(/\D/g, '');
      const name    = profile?.display_name ?? user.email ?? 'Cliente GoldBank';
      const { data: cust, status: custStatus } = await callAsaas('POST', '/customers', {
        name,
        email: user.email,
        cpfCnpj,
        notificationDisabled: true,
      });
      if (custStatus >= 400) {
        // Cria com CPF genérico para não bloquear demo
        console.warn('[PIX-DEPOSIT] Asaas customer error, usando fallback:', (cust as any)?.errors?.[0]?.description);
        customerId = `demo_${user.id.replace(/-/g, '').slice(0, 12)}`;
      } else {
        customerId = (cust as any).id;
        // Salva para próximas chamadas
        await supabaseAdmin()
          .from('profiles')
          .update({ asaas_customer_id: customerId })
          .eq('user_id', user.id);
      }
    }

    const externalRef = `web_${user.id.replace(/-/g, '').slice(0, 16)}_${Date.now()}`;
    const dueDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    let chargeId: string;
    let qrCodeBase64 = '';
    let qrCodePayload = '';
    let isMock = false;

    // Tenta criar cobrança real no Asaas (via subconta do usuário ou conta mestre)
    const { data: payment, status: payStatus } = await callAsaas('POST', '/payments', {
      customer: customerId,
      billingType: 'PIX',
      value: amount,
      dueDate,
      description: description || 'Depósito GoldBank',
      externalReference: externalRef,
    });

    if (payStatus >= 400) {
      // Fallback demo — QR válido mas não processável
      isMock = true;
      chargeId = `demo_${Date.now()}`;
      const amt = Number(amount).toFixed(2);
      qrCodePayload = `00020101021226840014br.gov.bcb.pix0136goldbank-web-demo-${Date.now()}5204000053039865406${amt}5802BR5925GOLD BANK CARTOES SA6008SAOPAULO62070503***6304CAFE`;
    } else {
      chargeId = (payment as any).id;
      // Busca QR Code
      const { data: qr } = await callAsaas('GET', `/payments/${chargeId}/pixQrCode`);
      qrCodeBase64  = (qr as any)?.encodedImage ?? '';
      qrCodePayload = (qr as any)?.payload ?? '';
    }

    // Salva cobrança no banco
    await supabaseAdmin().from('pix_charges').insert({
      user_id:         user.id,
      asaas_charge_id: chargeId,
      qr_code_payload: qrCodePayload,
      qr_code_base64:  qrCodeBase64,
      amount,
      description:     description || 'Depósito GoldBank',
      status:          'PENDING',
      is_mock:         isMock,
      expires_at:      new Date(Date.now() + 86400000).toISOString(),
    });

    return jsonRes({
      chargeId,
      qrCodeBase64,
      qrCodePayload,
      amount,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      isMock,
      message: isMock ? 'QR de demonstração (conta PIX aguardando aprovação).' : undefined,
    });
  } catch (err) {
    console.error('[PIX-DEPOSIT ERROR]', err);
    return errRes('Erro ao gerar cobrança PIX. Tente novamente.');
  }
});
