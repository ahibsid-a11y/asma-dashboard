import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export function useCurrentProfile() {
  return useQuery({
    queryKey: ["current-profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const [{ data, error }, { data: posData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,name,email,account_type,category,status")
          .eq("id", auth.user.id)
          .maybeSingle(),
        supabase
          .from("profile_positions")
          .select("position")
          .eq("user_id", auth.user.id),
      ]);
      if (error) throw error;
      if (!data) return null;
      const positions = (posData ?? []).map((p: any) => p.position);
      return {
        ...data,
        positions:
          positions.length > 0
            ? positions
            : data.account_type
              ? [data.account_type]
              : [],
      };
    },
  });
}
