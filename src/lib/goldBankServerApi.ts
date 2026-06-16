import axios from 'axios';

const GOLDBANK_URL =
  import.meta.env.VITE_GOLDBANK_API_URL ||
  'https://goldbank-server-529742420922.southamerica-east1.run.app';

export const goldBankApi = axios.create({
  baseURL: GOLDBANK_URL,
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
});

const TOKEN_KEY = 'goldbank_token';
const USER_KEY = 'goldbank_user';

export function getGoldbankToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setGoldbankSession(token: string, user: GoldbankUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearGoldbankSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getGoldbankUser(): GoldbankUser | null {
  const s = localStorage.getItem(USER_KEY);
  return s ? JSON.parse(s) : null;
}

goldBankApi.interceptors.request.use((config) => {
  const token = getGoldbankToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Request-Timestamp'] = Date.now().toString();
  config.headers['X-App-Platform'] = 'web';
  return config;
});

goldBankApi.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) clearGoldbankSession();
    return Promise.reject(error);
  },
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GoldbankUser {
  id: string;
  name: string;
  email: string;
  walletAddress?: string;
}

export interface GoldbankWalletBalance {
  balance: number;
  availableBalance: number;
  totalTransferValue: number;
  isDemo?: boolean;
  message?: string;
}

export interface GoldbankDashboardSummary {
  totalBalanceBRL: number;
  bankBalanceBRL: number;
  cryptoBalanceBRL: number;
  accountsCount: number;
  monthlyInflow: number;
  monthlyOutflow: number;
}

export interface GoldbankTransaction {
  id: string;
  type: 'INFLOW' | 'OUTFLOW';
  category: string;
  amount: number;
  description: string;
  date: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

export interface PixDepositResponse {
  qrCodeBase64: string;
  qrCodePayload: string;
  value: number;
  chargeId: string;
}

export interface SendPixRequest {
  pixKey: string;
  amount: number;
  description?: string;
}

export interface SendPixResponse {
  id: string;
  status: string;
  value: number;
  pixKey: string;
  keyType: string;
}

export interface SendGTKRequest {
  toAddress: string;
  amount: string;
}

export interface SendGTKResponse {
  txHash: string;
  from: string;
  to: string;
  amount: string;
  status: string;
}

export interface MbCryptoPrice {
  coin: string;
  last: number;
  open: number;
}

export interface BinancePrice {
  symbol: string;
  price: number;
}

// ─── Auth calls ───────────────────────────────────────────────────────────────

export async function goldbankRegister(name: string, email: string, password: string) {
  const { data } = await goldBankApi.post('/api/auth/register', { name, email, password });
  if (data.token) setGoldbankSession(data.token, data.user);
  return data as { token: string; user: GoldbankUser };
}

export async function goldbankLogin(email: string, password: string) {
  const { data } = await goldBankApi.post('/api/auth/login', { email, password });
  if (data.token) setGoldbankSession(data.token, data.user);
  return data as { token: string; user: GoldbankUser };
}
