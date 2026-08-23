import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "#/utils/supabase/server";

export type Founder = {
  id: string;
  name: string;
  initial: string;
  color: string;
};

// Single round-trip that replaces fetchCurrentUser + ensureFounder + fetchFounders.
// Called once from _authed.tsx beforeLoad — 3x faster than three separate calls.
export const fetchSession = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const name = (user.email ?? "Founder").split("@")[0].replace(/[._-]/g, " ");
  const initial = name[0]?.toUpperCase() ?? "F";
  await supabase.from("founders").upsert(
    { id: user.id, name, initial, color: "#2563EB" },
    { onConflict: "id", ignoreDuplicates: true },
  );

  const { data: founders } = await supabase
    .from("founders")
    .select("id, name, initial, color")
    .order("name");

  return {
    user: { id: user.id, email: user.email ?? "" },
    founders: (founders ?? []) as Founder[],
  };
});

export const fetchCurrentUser = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    return { id: data.user.id, email: data.user.email ?? "" };
  },
);

export const fetchFounders = createServerFn({ method: "GET" }).handler(
  async (): Promise<Founder[]> => {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase.from("founders").select("id, name, initial, color").order("name");
    return data ?? [];
  },
);

export const ensureFounder = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const name = (user.email ?? "Founder").split("@")[0].replace(/[._-]/g, " ");
  const initial = name[0]?.toUpperCase() ?? "F";
  await supabase.from("founders").upsert(
    { id: user.id, name, initial, color: "#2563EB" },
    { onConflict: "id", ignoreDuplicates: true },
  );
});


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

// Auto-creates a minimal founders row for the current auth user if one doesn't
// exist yet. This prevents FK violations on notes.owner_id and
// prelaunch_expenses.logged_by which both reference founders(id).
export const ensureFounder = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const name = (user.email ?? "Founder").split("@")[0].replace(/[._-]/g, " ");
    const initial = name[0]?.toUpperCase() ?? "F";
    await supabase.from("founders").upsert(
      { id: user.id, name, initial, color: "#2563EB" },
      { onConflict: "id", ignoreDuplicates: true },
    );
  },
);

