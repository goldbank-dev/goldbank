/**
 * @module ValidationHooks
 * @description Hooks for document validation (CPF/CNPJ) and external data fetching (ViaCEP/BrasilAPI).
 */

import { useToast } from "@/hooks/use-toast";

/**
 * Hook providing document validation, formatting, and address lookup utilities.
 * 
 * @function useCpfCnpj
 * @returns {Object} Validation and formatting methods
 */
export const useCpfCnpj = () => {
  const { toast } = useToast();

  /**
   * Validates a CPF string using standard checksum algorithm.
   * 
   * @param {string} cpf - Raw or formatted CPF string
   * @returns {boolean} True if valid
   */
  const validateCPF = (cpf: string) => {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
    let sum = 0, rest;
    for (let i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    rest = (sum * 10) % 11;
    if ((rest === 10) || (rest === 11)) rest = 0;
    if (rest !== parseInt(cpf.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    rest = (sum * 10) % 11;
    if ((rest === 10) || (rest === 11)) rest = 0;
    if (rest !== parseInt(cpf.substring(10, 11))) return false;
    return true;
  };

  /**
   * Validates a CNPJ string using standard checksum algorithm.
   * 
   * @param {string} cnpj - Raw or formatted CNPJ string
   * @returns {boolean} True if valid
   */
  const validateCNPJ = (cnpj: string) => {
    cnpj = cnpj.replace(/[^\d]+/g, '');
    if (cnpj.length !== 14 || !!cnpj.match(/(\d)\1{13}/)) return false;
    let length = cnpj.length - 2;
    let numbers = cnpj.substring(0, length);
    let digits = cnpj.substring(length);
    let sum = 0;
    let pos = length - 7;
    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;
    length = length + 1;
    numbers = cnpj.substring(0, length);
    sum = 0;
    pos = length - 7;
    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;
    return true;
  };

  /**
   * Fetches company data from BrasilAPI using CNPJ.
   * 
   * @async
   * @param {string} cnpj - Raw or formatted CNPJ
   * @returns {Promise<any|null>} Company data or null on error
   */
  const fetchCnpjData = async (cnpj: string) => {
    const cleanCnpj = cnpj.replace(/[^\d]+/g, '');
    if (cleanCnpj.length !== 14) return null;
    
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao buscar dados do CNPJ');
      }
      return await response.json();
    } catch (error: any) {
      console.error('Error fetching CNPJ:', error);
      toast({
        variant: "destructive",
        title: "Erro ao buscar CNPJ",
        description: error.message || "Não foi possível buscar os dados do CNPJ automaticamente.",
      });
      return null;
    }
  };

  /**
   * Fetches address information from ViaCEP using CEP.
   * 
   * @async
   * @param {string} cep - Raw or formatted CEP
   * @returns {Promise<any|null>} Address data or null if not found
   */
  const fetchCepData = async (cep: string) => {
    const cleanCep = cep.replace(/[^\d]+/g, '');
    if (cleanCep.length !== 8) return null;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (data.erro) throw new Error('CEP não encontrado');
      return data;
    } catch (error) {
      console.error('Error fetching CEP:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível buscar o endereço pelo CEP.",
      });
      return null;
    }
  };

  /**
   * Formats a raw numeric string into CPF (000.000.000-00) or CNPJ (00.000.000/0000-00).
   * 
   * @param {string} value - Raw numeric string
   * @returns {string} Formatted document string
   */
  const formatDocument = (value: string) => {
    const clean = value.replace(/[^\d]/g, '');
    if (clean.length <= 11) {
      return clean
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    }
    return clean
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  /**
   * Formats a raw numeric string into CEP (00000-000).
   * 
   * @param {string} value - Raw numeric string
   * @returns {string} Formatted CEP string
   */
  const formatCep = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{3})\d+?$/, '$1');
  };

  return {
    validateCPF,
    validateCNPJ,
    fetchCnpjData,
    fetchCepData,
    formatDocument,
    formatCep
  };
};
