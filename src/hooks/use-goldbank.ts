import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  goldBankApi,
  getGoldbankToken,
  GoldbankWalletBalance,
  GoldbankDashboardSummary,
  GoldbankTransaction,
  PixDepositResponse,
  SendPixRequest,
  SendPixResponse,
  SendGTKRequest,
  SendGTKResponse,
  MbCryptoPrice,
  BinancePrice,
} from '@/lib/goldBankServerApi';

const isAuthed = () => !!getGoldbankToken();

export const useGoldbankWalletBalance = () =>
  useQuery<GoldbankWalletBalance>({
    queryKey: ['gb-wallet-balance'],
    queryFn: async () => {
      const { data } = await goldBankApi.get('/api/wallet/balance');
      return data;
    },
    enabled: isAuthed(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

export const useGoldbankDashboard = () =>
  useQuery<GoldbankDashboardSummary>({
    queryKey: ['gb-dashboard'],
    queryFn: async () => {
      const { data } = await goldBankApi.get('/api/dashboard/summary');
      return data;
    },
    enabled: isAuthed(),
    refetchInterval: 60_000,
  });

export const useGoldbankTransactions = () =>
  useQuery<GoldbankTransaction[]>({
    queryKey: ['gb-transactions'],
    queryFn: async () => {
      const { data } = await goldBankApi.get('/api/wallet/transactions');
      return data;
    },
    enabled: isAuthed(),
    refetchInterval: 60_000,
  });

export const useCreatePixDeposit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { amount: number; description?: string }) => {
      const { data } = await goldBankApi.post('/api/pix/deposit', payload);
      return data as PixDepositResponse;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gb-wallet-balance'] });
    },
  });
};

export const useSendPixWeb = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SendPixRequest) => {
      const { data } = await goldBankApi.post('/api/pix/send', payload, {
        headers: { 'X-Fingerprint': 'web-' + Date.now() },
      });
      return data as SendPixResponse;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gb-wallet-balance'] });
      qc.invalidateQueries({ queryKey: ['gb-transactions'] });
      qc.invalidateQueries({ queryKey: ['gb-dashboard'] });
    },
  });
};

export const useSendGTKWeb = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SendGTKRequest) => {
      const { data } = await goldBankApi.post('/api/gtk/transfer', payload, {
        headers: { 'X-Fingerprint': 'web-' + Date.now() },
      });
      return data as SendGTKResponse;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gb-wallet-balance'] });
    },
  });
};

export const useMbPricesWeb = () =>
  useQuery<MbCryptoPrice[]>({
    queryKey: ['gb-mb-prices'],
    queryFn: async () => {
      const { data } = await goldBankApi.get('/api/crypto/mb/prices');
      return data;
    },
    enabled: isAuthed(),
    refetchInterval: 30_000,
  });

export const useBinancePricesWeb = () =>
  useQuery<BinancePrice[]>({
    queryKey: ['gb-binance-prices'],
    queryFn: async () => {
      const { data } = await goldBankApi.get('/api/crypto/binance/prices');
      return data;
    },
    enabled: isAuthed(),
    refetchInterval: 30_000,
  });
