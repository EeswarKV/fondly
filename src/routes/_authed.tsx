import { Link, Outlet, createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Avatar } from "#/components/ui";
import { fetchSession } from "#/utils/founders";
import type { Founder } from "#/utils/founders";

export const Route = createFileRoute("/_authed")({
  staleTime: Infinity,
  beforeLoad: async () => {
    // Client-side navigation: read session from local storage (instant, no network)
    // then fetch founders directly from Supabase — bypasses Vercel cold start entirely.
    if (typeof window !== "undefined") {
      const { getSupabaseBrowserClient } = await import("#/utils/supabase/client");
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession(); // local, ~0ms
      if (!session) throw redirect({ to: "/login" });
      const { data: founders } = await supabase
        .from("founders")
        .select("id, name, initial, color")
        .order("name");
      return {
        user: { id: session.user.id, email: session.user.email ?? "" },
        founders: (founders ?? []) as Founder[],
      };
    }
    // SSR: use server function (runs in-process, no HTTP hop)
    const session = await fetchSession();
    if (!session) throw redirect({ to: "/login" });
    return session;
  },
  component: AuthedLayout,
});

const NAV = [
  { to: "/", label: "Dashboard", icon: "⊞" },
  { to: "/prelaunch", label: "Pre-launch", icon: "◎" },
  { to: "/roadmap", label: "Roadmap", icon: "⚑" },
  { to: "/notes", label: "Notes", icon: "✎" },
] as const;

function AuthedLayout() {
  const { user, founders } = Route.useRouteContext();
  const router = useRouter();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar — hidden on mobile, visible on lg+ */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col bg-white border-r border-slate-200">
        {/* Logo */}
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-[18px]">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-800 text-sm font-bold text-white select-none">
            ◆
          </div>
          <span className="text-sm font-semibold text-slate-800">Fondly</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              style={{ textDecoration: "none" }}
            >
              {({ isActive }: { isActive: boolean }) => (
                <div
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer ${
                    isActive
                      ? "bg-blue-50 text-blue-900 font-medium"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <span className="w-4 shrink-0 text-center leading-none">{n.icon}</span>
                  {n.label}
                </div>
              )}
            </Link>
          ))}
        </nav>

        {/* Bottom: avatars + logout */}
        <div className="border-t border-slate-100 p-3">
          <div className="mb-2.5 flex -space-x-1.5">
            {founders.map((f) => (
              <div key={f.id} className="rounded-full ring-2 ring-white">
                <Avatar founder={f} size={26} />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={async () => {
              const { getSupabaseBrowserClient } = await import("#/utils/supabase/client");
              await getSupabaseBrowserClient().auth.signOut();
              router.navigate({ to: "/login" });
            }}
            className="w-full truncate text-left text-xs text-slate-400 transition-colors hover:text-slate-600"
          >
            Sign out · {user.email}
          </button>
        </div>
      </aside>

      {/* Main content — extra bottom padding on mobile for the bottom nav */}
      <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
        <Outlet />
      </main>

      {/* Bottom navigation — mobile only (hidden on lg+) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex lg:hidden border-t border-slate-200 bg-white">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            activeOptions={{ exact: n.to === "/" }}
            className="flex-1"
            style={{ textDecoration: "none" }}
          >
            {({ isActive }: { isActive: boolean }) => (
              <div
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                  isActive ? "text-blue-800" : "text-slate-500"
                }`}
              >
                <span className="text-xl leading-none">{n.icon}</span>
                {n.label}
              </div>
            )}
          </Link>
        ))}
        <button
          type="button"
          onClick={async () => {
            const { getSupabaseBrowserClient } = await import("#/utils/supabase/client");
            await getSupabaseBrowserClient().auth.signOut();
            router.navigate({ to: "/login" });
          }}
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-slate-500"
        >
          <span className="text-xl leading-none">⏻</span>
          Sign out
        </button>
      </nav>
    </div>
  );
}


