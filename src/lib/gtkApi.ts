import axios from 'axios';
import { useQuery } from '@tanstack/react-query';

const GTK_API = import.meta.env.VITE_GTK_API_URL || 'https://gtk-api-529742420922.southamerica-east1.run.app';

export const gtkApi = axios.create({
  baseURL: GTK_API,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

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
  const { data } = await gtkApi.get('/api/v1/system/info');
  return data;
}

export async function getGTKBalance(address: string): Promise<GTKBalance> {
  const { data } = await gtkApi.get(`/api/v1/balance/${address}`);
  return data;
}

export async function getGTKPrice(): Promise<GTKPrice> {
  const { data } = await gtkApi.get('/api/v1/system/price');
  return data;
}

export async function getGTKHealth() {
  const { data } = await gtkApi.get('/health');
  return data;
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
