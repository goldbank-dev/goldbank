/**
 * Cliente para as Edge Functions Asaas.
 * Todas as chamadas passam o JWT do Supabase no header Authorization.
 */
import { supabase } from '@/integrations/supabase/client';

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token ?? ''}`,
  };
}

const BASE = import.meta.env.VITE_SUPABASE_URL;
const fn   = (name: string) => `${BASE}/functions/v1/${name}`;

async function call<T>(
  method: string,
  fnName: string,
  body?: unknown,
  params?: Record<string, string>,
): Promise<T> {
  let url = fn(fnName);
  if (params) {
    const qs = new URLSearchParams(params).toString();
    url = `${url}?${qs}`;
  }
  const headers = await authHeaders();
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data as T;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PixDepositResult {
  chargeId: string;
  qrCodeBase64: string;
  qrCodePayload: string;
  amount: number;
  expiresAt: string;
  isMock: boolean;
  message?: string;
}

export interface PixSendResult {
  transferId: string;
  status: string;
  value: number;
  pixKey: string;
  keyType: string;
}

export interface PixLookupResult {
  key: string;
  keyType: string;
  keyTypeLabel: string;
  valid: boolean;
  found: boolean | null;
  ownerName?: string;
  ownerTaxId?: string;
  bankName?: string;
  ispb?: string;
  accountType?: string;
  _error?: string;
}

export interface PixKey {
  id: string;
  key: string;
  key_type: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP';
  dict_status: string;
  created_at: string;
}

export interface KycUploadResult {
  success: boolean;
  kycStatus: string;
  documentId: string;
  isMock: boolean;
  message: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const createPixDeposit = (amount: number, description?: string) =>
  call<PixDepositResult>('POST', 'pix-deposit', { amount, description });

export const sendPix = (pixKey: string, amount: number, description?: string) =>
  call<PixSendResult>('POST', 'pix-send', { pixKey, amount, description });

export const lookupPixKey = (key: string) =>
  call<PixLookupResult>('GET', 'pix-lookup', undefined, { key });

export const getPixKeys = () =>
  call<PixKey[]>('GET', 'pix-keys');

export const addPixKey = (key: string) =>
  call<{ success: boolean; pixKey: PixKey; dictStatus: string }>('POST', 'pix-keys', { key });

export const deletePixKey = (key: string) =>
  call<{ success: boolean }>('DELETE', 'pix-keys', { key });

export const uploadKycDocuments = (
  frontBase64: string,
  backBase64: string,
  selfieBase64: string,
) =>
  call<KycUploadResult>('POST', 'kyc-upload', { frontBase64, backBase64, selfieBase64 });
