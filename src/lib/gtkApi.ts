import axios from 'axios';
import { useQuery } from '@tanstack/react-query';

// O GTK API é protegido por x-api-key e não libera CORS para o browser.
// Por isso chamamos via Edge Function (gtk-proxy), que injeta a chave server-side.
const GTK_PROXY = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gtk-proxy`;
const SUPA_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function gtkGet<T>(path: string): Promise<T> {
  const { data } = await axios.get<T>(GTK_PROXY, {
    params: { path },
    headers: { Authorization: `Bearer ${SUPA_ANON}`, apikey: SUPA_ANON ?? '' },
    timeout: 10000,
  });
  return data as T;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GTKSystemInfo {
  totalSupply: string;
  totalGoldReserves: string;
  goldPricePerGram: string;
  isFullyBacked: boolean;
  reserveRatio: string;
  usdToBrl: number;
}

export interface GTKBalance {
  gtkBalance: string;
  goldGrams: string;
  goldValueUSD: string;
  goldValueBRL: string;
}

export interface GTKPrice {
  goldPricePerGram: number;
  currency: string;
  source: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function getGTKSystemInfo(): Promise<GTKSystemInfo> {
  return gtkGet<GTKSystemInfo>('/api/v1/system/info');
}

export async function getGTKBalance(address: string): Promise<GTKBalance> {
  return gtkGet<GTKBalance>(`/api/v1/balance/${address}`);
}

export async function getGTKPrice(): Promise<GTKPrice> {
  return gtkGet<GTKPrice>('/api/v1/system/price');
}

export async function getGTKHealth() {
  return gtkGet('/health');
}

// ─── React Query hooks ────────────────────────────────────────────────────────

export const useGTKSystemInfo = () =>
  useQuery<GTKSystemInfo>({
    queryKey: ['gtk-system-info'],
    queryFn: getGTKSystemInfo,
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 2,
  });

export const useGTKPrice = () =>
  useQuery<GTKPrice>({
    queryKey: ['gtk-price'],
    queryFn: getGTKPrice,
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 2,
  });
