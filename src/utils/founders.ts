import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "#/utils/supabase/server";

export type Founder = {
  id: string;
  name: string;
  initial: string;
  color: string;
};

export const fetchFounders = createServerFn({ method: "GET" }).handler(
  async (): Promise<Founder[]> => {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("founders")
      .select("id, name, initial, color")
      .order("name");
    if (error) throw error;
    return data ?? [];
  },
);

export const fetchCurrentUser = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    return { id: data.user.id, email: data.user.email ?? "" };
  },
);
