/**
 * @module DashboardHooks
 * @description Integrated hooks for Supabase authentication, profiles, and dashboard data management.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to retrieve the currently authenticated user from Supabase.
 * Uses TanStack Query for caching and global state management.
 * 
 * @function useUser
 * @returns {import("@tanstack/react-query").UseQueryResult<import("@supabase/supabase-js").User, Error>} The query object containing user data
 */
export const useUser = () => {
  return useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      return user;
    },
    staleTime: Infinity,
  });
};

/**
 * Hook to fetch the profile of the current authenticated user.
 * Automatically depends on useUser and will only execute when the user is available.
 * 
 * @function useProfile
 * @returns {import("@tanstack/react-query").UseQueryResult<any, Error>} The query object containing profile data
 */
export const useProfile = () => {
  const { data: user } = useUser();
  
  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

/**
 * Hook to fetch all active investment tokens available in the system.
 * 
 * @function useTokens
 * @returns {import("@tanstack/react-query").UseQueryResult<any[], Error>} The query object containing active tokens
 */
export const useTokens = () => {
  return useQuery({
    queryKey: ["tokens-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tokens").select("*").eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });
};

/**
 * Hook to fetch transactions for the current user.
 * 
 * @function useTransactions
 * @param {number} [limit] - Optional limit for the number of transactions to return
 * @returns {import("@tanstack/react-query").UseQueryResult<any[], Error>} The query object containing transaction history
 */
export const useTransactions = (limit?: number) => {
  const { data: user } = useUser();
  
  return useQuery({
    queryKey: ["transactions", user?.id, limit],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      let query = supabase.from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
};

/**
 * Hook to fetch the most recent notifications for the current user.
 * 
 * @function useNotifications
 * @returns {import("@tanstack/react-query").UseQueryResult<any[], Error>} The query object containing notifications
 */
export const useNotifications = () => {
  const { data: user } = useUser();
  
  return useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
};

/**
 * Hook to fetch the current KYC status of the user.
 * 
 * @function useKYCStatus
 * @returns {import("@tanstack/react-query").UseQueryResult<string, Error>} User's KYC status
 */
export const useKYCStatus = () => {
  const { data: user } = useUser();
  
  return useQuery({
    queryKey: ["kyc-status", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("kyc_documents")
        .select("status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.status || 'pending';
    },
    enabled: !!user,
  });
};

/**
 * Comprehensive hook that aggregates all dashboard-related data.
 * Ideal for components that need a holistic view of the user's account status.
 * 
 * @function useDashboardData
 * @returns {Object} Combined data, loading states, and refetch functions
 * @property {Object|null} data - Aggregated user, profile, tokens, and transactions
 * @property {boolean} isLoading - Combined loading state
 * @property {Function} refetch - Function to trigger a manual refresh
 * @property {boolean} isFetching - Active fetching status
 */
export const useDashboardData = () => {
  const { data: user, isLoading: userLoading } = useUser();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: tokens, isLoading: tokensLoading } = useTokens();
  const { data: transactions, isLoading: txLoading, refetch, isFetching } = useTransactions(5);

  return {
    data: user ? {
      profile,
      tokens,
      transactions,
      user
    } : null,
    isLoading: userLoading || profileLoading || tokensLoading || txLoading,
    refetch,
    isFetching
  };
};

/**
 * Helper hook for prefetching data during navigation or idle time.
 * 
 * @function usePrefetchData
 * @returns {Object} Methods to prefetch specific dashboard entities
 */
export const usePrefetchData = () => {
  const queryClient = useQueryClient();
  const { data: user } = useUser();

  const prefetchTransactions = async () => {
    if (!user) return;
    await queryClient.prefetchQuery({
      queryKey: ["transactions", user.id, undefined],
      queryFn: async () => {
        const { data } = await supabase.from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        return data || [];
      }
    });
  };

  return { prefetchTransactions };
};
