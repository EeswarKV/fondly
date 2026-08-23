import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { getSupabaseBrowserClient } from "#/utils/supabase/client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate({ to: "/" });
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "4rem 1rem", fontFamily: "Helvetica Neue, Arial, sans-serif" }}>
      <form
        onSubmit={handleLogin}
        style={{ width: 340, border: "1px solid #D7E3EA", borderRadius: 12, padding: "2rem 1.75rem" }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#0F5C7A" }} />
        </div>
        <div style={{ textAlign: "center", fontSize: 16, fontWeight: 500, marginBottom: 4, color: "#1B2A33" }}>
          Chocolatehouse HQ
        </div>
        <div style={{ textAlign: "center", fontSize: 13, color: "#5C7480", marginBottom: 24 }}>
          Founder access only
        </div>

        <label style={{ fontSize: 12, color: "#5C7480" }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: "100%", margin: "6px 0 14px", padding: 8, border: "1px solid #D7E3EA", borderRadius: 6, boxSizing: "border-box" }}
        />

        <label style={{ fontSize: 12, color: "#5C7480" }}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: "100%", margin: "6px 0 20px", padding: 8, border: "1px solid #D7E3EA", borderRadius: 6, boxSizing: "border-box" }}
        />

        {error && <div style={{ fontSize: 12.5, color: "#C1443B", marginBottom: 14 }}>{error}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", background: "#0F5C7A", color: "#fff", border: "none", padding: 10, borderRadius: 6, fontSize: 13.5, fontWeight: 500, cursor: "pointer" }}
        >
          {loading ? "Logging in..." : "Log in"}
        </button>

        <div style={{ textAlign: "center", fontSize: 12, color: "#8A9AA3", marginTop: 16 }}>
          Accounts are invite-only, added by an admin founder in Supabase
        </div>
      </form>
    </div>
  );
}
