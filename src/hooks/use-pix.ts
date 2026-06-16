/**
 * Hooks TanStack Query para operações PIX (Asaas).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPixDeposit, sendPix, lookupPixKey,
  getPixKeys, addPixKey, deletePixKey, uploadKycDocuments,
} from '@/lib/asaasApi';

export const usePixDeposit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ amount, description }: { amount: number; description?: string }) =>
      createPixDeposit(amount, description),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pix-charges'] });
    },
  });
};

export const useSendPix = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pixKey, amount, description }: { pixKey: string; amount: number; description?: string }) =>
      sendPix(pixKey, amount, description),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};

export const usePixLookup = () =>
  useMutation({ mutationFn: (key: string) => lookupPixKey(key) });

export const usePixKeys = () =>
  useQuery({ queryKey: ['pix-keys'], queryFn: getPixKeys });

export const useAddPixKey = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => addPixKey(key),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pix-keys'] }),
  });
};

export const useDeletePixKey = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => deletePixKey(key),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pix-keys'] }),
  });
};

export const useKycUpload = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ frontBase64, backBase64, selfieBase64 }: {
      frontBase64: string; backBase64: string; selfieBase64: string;
    }) => uploadKycDocuments(frontBase64, backBase64, selfieBase64),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
};
