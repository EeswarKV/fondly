import { Link, Outlet, createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Avatar } from "#/components/ui";
import { fetchCurrentUser, fetchFounders } from "#/utils/founders";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async () => {
    const user = await fetchCurrentUser();
    if (!user) throw redirect({ to: "/login" });
    return { user };
  },
  loader: async ({ context }) => {
    const founders = await fetchFounders();
    return { user: context.user, founders };
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
  const { user, founders } = Route.useLoaderData();
  const router = useRouter();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col bg-white border-r border-slate-200">
        {/* Logo */}
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-[18px]">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white select-none">
            ◆
          </div>
          <span className="text-sm font-semibold text-slate-800">Chocolatehouse</span>
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
                      ? "bg-blue-50 text-blue-700 font-medium"
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


export const Route = createFileRoute("/_authed")({
  beforeLoad: async () => {
    const user = await fetchCurrentUser();
    if (!user) throw redirect({ to: "/login" });
    return { user };
  },
  loader: async ({ context }) => {
    const founders = await fetchFounders();
    return { user: context.user, founders };
  },
  component: AuthedLayout,
});

const NAV = [
  { to: "/", label: "Dashboard", icon: "\u2302", color: P.accent },
  { to: "/prelaunch", label: "Pre-launch", icon: "\u26f4", color: P.steel },
  { to: "/roadmap", label: "Roadmap", icon: "\u2691", color: P.indigo },
  { to: "/notes", label: "Notes", icon: "\u270e", color: P.purple },
] as const;

function AuthedLayout() {
  const { user, founders } = Route.useLoaderData();
  const router = useRouter();

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#fff", fontFamily: body, color: P.cocoa }}>
      <div style={{ width: 200, borderRight: `1px solid ${P.line}`, padding: "20px 12px", flexShrink: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px", marginBottom: 24 }}>
          <span style={{ color: P.accent, fontSize: 18 }}>◆</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Chocolatehouse</span>
        </div>

        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            activeOptions={{ exact: n.to === "/" }}
            style={{ textDecoration: "none" }}
            activeProps={{ style: { background: "transparent" } }}
          >
            {({ isActive }: { isActive: boolean }) => (
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8,
                  fontSize: 13, cursor: "pointer", marginBottom: 2,
                  borderLeft: isActive ? `3px solid ${n.color}` : "3px solid transparent",
                  color: isActive ? P.cocoa : P.cocoaSoft,
                  fontWeight: isActive ? 700 : 400,
                }}
              >
                <span style={{ width: 16, textAlign: "center", color: n.color }}>{n.icon}</span>
                {n.label}
              </div>
            )}
          </Link>
        ))}

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px", marginBottom: 10 }}>
          {founders.map((f) => (
            <div key={f.id} style={{ marginLeft: -6 }}>
              <Avatar founder={f} size={24} />
            </div>
          ))}
        </div>
        <div
          onClick={async () => {
            const { getSupabaseBrowserClient } = await import("#/utils/supabase/client");
            await getSupabaseBrowserClient().auth.signOut();
            router.navigate({ to: "/login" });
          }}
          style={{ fontSize: 12, color: P.cocoaSoft, padding: "0 8px", cursor: "pointer" }}
        >
          Log out ({user.email})
        </div>
      </div>
      <div style={{ flex: 1, padding: 32, maxWidth: 900 }}>
        <Outlet />
      </div>
    </div>
  );
}
