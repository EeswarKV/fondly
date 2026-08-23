import { Link, Outlet, createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { Avatar } from "#/components/ui";
import { fetchSession } from "#/utils/founders";

export const Route = createFileRoute("/_authed")({
  // staleTime: Infinity means auth + founders are fetched ONCE per page load.
  // Subsequent sidebar navigation is instant — no network call on every click.
  // Data is refreshed only when router.invalidate() is called (after mutations).
  staleTime: Infinity,
  beforeLoad: async () => {
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

  // Preload all sibling routes in the background so the first click is instant
  useEffect(() => {
    router.preloadRoute({ to: "/" });
    router.preloadRoute({ to: "/roadmap" });
    router.preloadRoute({ to: "/notes" });
    router.preloadRoute({ to: "/prelaunch" });
  }, [router]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col bg-white border-r border-slate-200">
        {/* Logo */}
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-[18px]">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white select-none">
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

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}


