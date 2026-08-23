import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getSupabaseServerClient } from "#/utils/supabase/server";
import { getSupabaseBrowserClient } from "#/utils/supabase/client";

type Note = { id: string; text: string; reminder_at: string | null; done: boolean };

const fetchNotes = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.from("notes").select("id, text, reminder_at, done").order("created_at", { ascending: false });
  return (data ?? []) as Note[];
});

export const Route = createFileRoute("/_authed/notes")({
  staleTime: Infinity,
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
  const [err, setErr] = useState<string | null>(null);
  const [editReminderFor, setEditReminderFor] = useState<string | null>(null);
  const [reminderVal, setReminderVal] = useState("");

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
    setSaving(true); setErr(null);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("notes").insert({
      owner_id: user.id,
      text: text.trim(),
      reminder_at: reminder || null,
    });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setText(""); setReminder("");
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

  const saveReminder = async (noteId: string) => {
    const supabase = getSupabaseBrowserClient();
    await supabase.from("notes")
      .update({ reminder_at: reminderVal ? new Date(reminderVal).toISOString() : null })
      .eq("id", noteId);
    setEditReminderFor(null);
    router.invalidate();
  };

  return (
    <div className="min-h-full">
      {/* Page header */}
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <h1 className="text-xl font-semibold text-slate-900">My Notes</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Private to you — only your account can read these, enforced by the database.
        </p>
      </div>

      <div className="p-8 max-w-2xl space-y-4">
        {/* Add note card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote(); }}
            placeholder="What's on your mind? (Cmd+Enter to save)"
            rows={3}
            className="w-full resize-none border-0 text-sm text-slate-900 placeholder-slate-400 outline-none"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">Remind me</label>
              <input
                type="datetime-local"
                value={reminder}
                onChange={(e) => setReminder(e.target.value)}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button
              type="button"
              onClick={addNote}
              disabled={saving || !text.trim()}
              className="ml-auto rounded-lg bg-blue-800 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-900 disabled:bg-blue-300"
            >
              {saving ? "Adding…" : "Add note"}
            </button>
          </div>
        </div>

        {err && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
        )}

        {/* Notes list */}
        {sorted.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-slate-400">No notes yet. Add your first one above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((n) => {
              const overdue = n.reminder_at && !n.done && new Date(n.reminder_at) < now;
              return (
                <div
                  key={n.id}
                  className={`flex gap-3 rounded-xl border bg-white px-5 py-4 transition-opacity ${
                    overdue ? "border-red-200" : "border-slate-200"
                  } ${n.done ? "opacity-50" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={n.done}
                    onChange={() => toggleDone(n)}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-blue-600"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm text-slate-900 ${n.done ? "line-through text-slate-400" : ""}`}>
                      {n.text}
                    </p>
                    {editReminderFor === n.id ? (
                      <div className="mt-1.5 flex items-center gap-2">
                        <input
                          type="datetime-local"
                          defaultValue={n.reminder_at ? n.reminder_at.slice(0, 16) : ""}
                          onChange={(e) => setReminderVal(e.target.value)}
                          className="rounded border border-slate-200 px-2 py-0.5 text-xs bg-white text-slate-900 outline-none focus:border-blue-500"
                          autoFocus
                        />
                        <button type="button" onClick={() => saveReminder(n.id)} className="text-xs font-medium text-blue-800">Save</button>
                        <button type="button" onClick={() => setEditReminderFor(null)} className="text-xs text-slate-400">Cancel</button>
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center gap-2">
                        {n.reminder_at && (
                          <p className={`text-xs ${overdue ? "text-red-500" : "text-slate-400"}`}>
                            ⏰ {overdue ? "Overdue — " : ""}{fmtReminder(n.reminder_at)}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => { setEditReminderFor(n.id); setReminderVal(n.reminder_at?.slice(0, 16) ?? ""); }}
                          className="text-[10px] text-slate-300 hover:text-blue-700 transition-colors"
                          title="Set/edit reminder"
                        >
                          {n.reminder_at ? "edit reminder" : "⏰ add reminder"}
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(n)}
                    className="shrink-0 text-lg leading-none text-slate-300 transition-colors hover:text-red-400"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


