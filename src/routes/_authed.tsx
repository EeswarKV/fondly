import { Link, Outlet, createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { P, Avatar, body } from "#/components/ui";
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
          <span style={{ color: P.accent, fontSize: 18 }}>\u25c6</span>
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
