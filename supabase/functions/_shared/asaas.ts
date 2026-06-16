/**
 * Asaas API client — compartilhado entre todas as Edge Functions.
 * Autenticação: header `access_token`.
 * Documentação: https://api.asaas.com/v3
 */

export const ASAAS_BASE = Deno.env.get('ASAAS_BASE_URL') ?? 'https://api.asaas.com/v3';
export const ASAAS_KEY  = Deno.env.get('ASAAS_API_KEY') ?? '';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

export function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errRes(message: string, status = 400, errorId?: string): Response {
  return jsonRes({ error: message, error_id: errorId ?? crypto.randomUUID() }, status);
}

/** Wrapper para chamadas à API Asaas usando a chave mestra do GoldBank */
export async function asaas(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ data: unknown; status: number }> {
  return asaasWithKey(method, path, ASAAS_KEY, body);
}

/** Wrapper para chamadas à API Asaas usando a chave da subconta do usuário */
export async function asaasWithKey(
  method: string,
  path: string,
  apiKey: string,
  body?: unknown,
): Promise<{ data: unknown; status: number }> {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    method,
    headers: {
      access_token: apiKey,
      'Content-Type': 'application/json',
      'User-Agent': 'GoldBank-Web/1.0',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { data, status: res.status };
}

/** Detecta tipo de chave PIX a partir do valor */
export function detectPixKeyType(key: string): 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP' {
  const clean = key.replace(/\D/g, '');
  if (/^[^@]+@[^@]+\.[^@]+$/.test(key)) return 'EMAIL';
  if (/^\+?55\d{10,11}$/.test(key) || /^\d{10,11}$/.test(clean)) return 'PHONE';
  if (clean.length === 11) return 'CPF';
  if (clean.length === 14) return 'CNPJ';
  return 'EVP';
}

/** Extrai e valida JWT do usuário Supabase */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function supabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

export async function getAuthUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const client = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  return { user, client };
}
