import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getSupabaseServerClient } from "#/utils/supabase/server";
import { getSupabaseBrowserClient } from "#/utils/supabase/client";
import { P, Card, display, body } from "#/components/ui";

type Note = { id: string; text: string; reminder_at: string | null; done: boolean };

const fetchNotes = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  // RLS already restricts this to the logged-in founder's own rows.
  const { data } = await supabase.from("notes").select("id, text, reminder_at, done").order("created_at", { ascending: false });
  return (data ?? []) as Note[];
});

export const Route = createFileRoute("/_authed/notes")({
  loader: () => fetchNotes(),
  component: Notes,
});

function fmtReminder(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + ", " +
    d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

function Notes() {
  const notes = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const router = useRouter();

  const [text, setText] = useState("");
  const [reminder, setReminder] = useState("");
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const sorted = [...notes].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (!a.reminder_at && !b.reminder_at) return 0;
    if (!a.reminder_at) return 1;
    if (!b.reminder_at) return -1;
    return new Date(a.reminder_at).getTime() - new Date(b.reminder_at).getTime();
  });

  const addNote = async () => {
    if (!text.trim()) return;
    setSaving(true);
    const supabase = getSupabaseBrowserClient();
    await supabase.from("notes").insert({
      owner_id: user.id,
      text: text.trim(),
      reminder_at: reminder || null,
    });
    setText(""); setReminder("");
    setSaving(false);
    router.invalidate();
  };
  const toggleDone = async (n: Note) => {
    const supabase = getSupabaseBrowserClient();
    await supabase.from("notes").update({ done: !n.done }).eq("id", n.id);
    router.invalidate();
  };
  const remove = async (n: Note) => {
    const supabase = getSupabaseBrowserClient();
    await supabase.from("notes").delete().eq("id", n.id);
    router.invalidate();
  };

  return (
    <div>
      <h2 style={{ fontFamily: display, fontSize: 22, margin: "0 0 4px" }}>My notes</h2>
      <p style={{ fontSize: 13.5, color: P.cocoaSoft, marginBottom: 20 }}>
        Private to you \u2014 only your account can read these, enforced by the database itself.
      </p>

      <Card style={{ marginBottom: 20 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Follow up with the vendor I met today"
          rows={2}
          style={{ width: "100%", padding: 10, border: `1px solid ${P.line}`, borderRadius: 6, fontSize: 13, fontFamily: body, resize: "vertical", boxSizing: "border-box", marginBottom: 10 }}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: 12, color: P.cocoaSoft }}>Remind me</label>
          <input type="datetime-local" value={reminder} onChange={(e) => setReminder(e.target.value)} style={{ padding: 7, border: `1px solid ${P.line}`, borderRadius: 6, fontSize: 12.5 }} />
          <button onClick={addNote} disabled={saving} style={{ marginLeft: "auto", background: "#fff", color: P.purple, border: `1px solid ${P.purple}`, fontWeight: 700, padding: "8px 16px", borderRadius: 6, fontSize: 13, cursor: "pointer" }}>
            {saving ? "Saving..." : "Add note"}
          </button>
        </div>
      </Card>

      {sorted.length === 0 && <div style={{ fontSize: 13, color: P.cocoaSoft }}>No notes yet.</div>}

      {sorted.map((n) => {
        const overdue = n.reminder_at && !n.done && new Date(n.reminder_at) < now;
        return (
          <div key={n.id} style={{ background: "#fff", border: `1px solid ${P.line}`, borderLeft: `3px solid ${overdue ? P.rust : n.done ? P.line : P.purple}`, borderRadius: 8, padding: "12px 14px", marginBottom: 8, opacity: n.done ? 0.55 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ display: "flex", gap: 10, flex: 1 }}>
                <input type="checkbox" checked={n.done} onChange={() => toggleDone(n)} style={{ marginTop: 3 }} />
                <div>
                  <div style={{ fontSize: 13, textDecoration: n.done ? "line-through" : "none" }}>{n.text}</div>
                  {n.reminder_at && (
                    <div style={{ fontSize: 11, color: overdue ? P.rust : P.cocoaSoft, marginTop: 4 }}>
                      {overdue ? "\u23f0 Overdue \u2014 " : "\u23f0 "}{fmtReminder(n.reminder_at)}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => remove(n)} style={{ border: "none", background: "transparent", color: P.cocoaSoft, cursor: "pointer", fontSize: 13 }}>\u2715</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
