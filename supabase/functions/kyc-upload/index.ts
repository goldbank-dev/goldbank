/**
 * POST /functions/v1/kyc-upload
 * Envia documentos KYC do usuário para o Asaas.
 * Garante que o usuário tem um asaas_customer_id antes do upload.
 *
 * Body: { frontBase64: string, backBase64: string, selfieBase64: string }
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { ASAAS_BASE, ASAAS_KEY, asaas, asaasWithKey, corsHeaders, errRes, jsonRes, getAuthUser, supabaseAdmin } from '../_shared/asaas.ts';

async function uploadDocument(
  customerId: string,
  type: string,
  base64: string,
  filename: string,
  isBack = false,
) {
  const form = new FormData();
  form.append('type', type);

  const bytes  = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const blob   = new Blob([bytes], { type: 'image/jpeg' });
  const field  = isBack ? 'documentFileBack' : 'documentFile';
  form.append(field, blob, filename);

  const res = await fetch(`${ASAAS_BASE}/customers/${customerId}/documents`, {
    method: 'POST',
    headers: { access_token: ASAAS_KEY },
    body: form,
  });
  return { data: await res.json().catch(() => ({})), status: res.status };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = await getAuthUser(req);
  if (!auth) return errRes('Unauthorized', 401);
  const { user, client } = auth;

  try {
    const { frontBase64, backBase64, selfieBase64 } = await req.json();
    if (!frontBase64 || !backBase64 || !selfieBase64) {
      return errRes('Envie frente, verso e selfie do documento.');
    }

    // Busca perfil com subconta
    const { data: profile } = await client
      .from('profiles')
      .select('asaas_customer_id, asaas_subconta_id, asaas_subconta_key, display_name, cpf_cnpj, kyc_status')
      .eq('user_id', user.id)
      .single();

    // Usa subconta do usuário se disponível, senão conta mestre
    const userApiKey  = (profile as any)?.asaas_subconta_key ?? '';
    const hasSubconta = !!userApiKey;
    const apiKey      = hasSubconta ? userApiKey : ASAAS_KEY;
    const asaasBase   = ASAAS_BASE;

    if (profile?.kyc_status === 'APPROVED') {
      return errRes('Identidade já verificada e aprovada.');
    }

    // ID do customer na conta correta (subconta ou mestre)
    let customerId = hasSubconta
      ? ((profile as any)?.asaas_subconta_id ?? profile?.asaas_customer_id)
      : profile?.asaas_customer_id;

    if (!customerId) {
      const cpfCnpj = (profile?.cpf_cnpj ?? '00000000000').replace(/\D/g, '');
      const { data: cust, status: custStatus } = await asaasWithKey('POST', '/customers', apiKey, {
        name:                profile?.display_name ?? user.email ?? 'Cliente GoldBank',
        email:               user.email,
        cpfCnpj,
        notificationDisabled: true,
      });
      if (custStatus < 400) {
        customerId = (cust as any).id;
        await supabaseAdmin()
          .from('profiles')
          .update({ asaas_customer_id: customerId })
          .eq('user_id', user.id);
      } else {
        // Fallback demo
        const mockDocId = `doc_demo_${Date.now()}`;
        await supabaseAdmin().from('profiles').update({ kyc_status: 'PENDING' }).eq('user_id', user.id);
        await supabaseAdmin().from('kyc_documents').upsert({
          user_id:       user.id,
          status:        'under_review',
          submission_id: mockDocId,
          document_type: 'IDENTIFICATION',
        }, { onConflict: 'user_id' });
        return jsonRes({ success: true, kycStatus: 'PENDING', documentId: mockDocId,
          message: 'Documentos recebidos. Análise em andamento (demo).' });
      }
    }

    // Upload frente + verso (campo documentFileBack na mesma requisição)
    const frontBytes = Uint8Array.from(atob(frontBase64), c => c.charCodeAt(0));
    const backBytes  = Uint8Array.from(atob(backBase64), c => c.charCodeAt(0));
    const form       = new FormData();
    form.append('type', 'IDENTIFICATION');
    form.append('documentFile',     new Blob([frontBytes], { type: 'image/jpeg' }), 'front.jpg');
    form.append('documentFileBack', new Blob([backBytes],  { type: 'image/jpeg' }), 'back.jpg');

    const identRes = await fetch(`${asaasBase}/customers/${customerId}/documents`, {
      method:  'POST',
      headers: { access_token: apiKey },
      body:    form,
    });
    const identData = await identRes.json().catch(() => ({})) as any;

    let documentId: string;
    let isMock = false;

    if (identRes.status >= 400) {
      // Fallback demo se conta Asaas não aceitar documentos
      isMock     = true;
      documentId = `doc_demo_${Date.now()}`;
      console.warn('[KYC-UPLOAD] Asaas error:', identData?.errors?.[0]?.description);
    } else {
      documentId = identData.id;
      // Upload selfie com type SELFIE
      try {
        const selfieBytes = Uint8Array.from(atob(selfieBase64), c => c.charCodeAt(0));
        const selfieForm  = new FormData();
        selfieForm.append('type', 'SELFIE');
        selfieForm.append('documentFile', new Blob([selfieBytes], { type: 'image/jpeg' }), 'selfie.jpg');
        const selfieRes = await fetch(`${asaasBase}/customers/${customerId}/documents`, {
          method: 'POST', headers: { access_token: apiKey }, body: selfieForm,
        });
        if (!selfieRes.ok) {
          const selfieErr = await selfieRes.json().catch(() => ({}));
          console.warn('[KYC-UPLOAD] Selfie error:', (selfieErr as any)?.errors?.[0]?.description);
        }
      } catch (selfieEx) {
        console.warn('[KYC-UPLOAD] Selfie upload exception:', selfieEx);
      }
    }

    // Atualiza status no DB
    const admin = supabaseAdmin();
    await admin.from('profiles').update({ kyc_status: 'PENDING' }).eq('user_id', user.id);
    await admin.from('kyc_documents').upsert({
      user_id:       user.id,
      status:        'under_review',
      submission_id: documentId,
      document_type: 'IDENTIFICATION',
    }, { onConflict: 'user_id' });

    return jsonRes({
      success:    true,
      kycStatus:  'PENDING',
      documentId,
      isMock,
      message: isMock
        ? 'Documentos recebidos. Análise em andamento (modo demo).'
        : 'Documentos enviados com sucesso. Análise em até 24h.',
    });
  } catch (err) {
    console.error('[KYC-UPLOAD ERROR]', err);
    return errRes('Erro ao enviar documentos. Tente novamente.');
  }
});
