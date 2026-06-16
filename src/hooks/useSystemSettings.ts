import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSystemSettings = () => {
  return useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*");
      
      if (error) throw error;
      
      return data.reduce((acc: any, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
