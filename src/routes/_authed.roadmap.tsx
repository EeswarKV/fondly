import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getSupabaseServerClient } from "#/utils/supabase/server";
import { getSupabaseBrowserClient } from "#/utils/supabase/client";
import { P, Card, Avatar, display } from "#/components/ui";
import type { Founder } from "#/utils/founders";

type Task = {
  id: string;
  phase_id: string;
  title: string;
  assignee_id: string | null;
  status: "todo" | "inprogress" | "review" | "done";
  verified_by: string | null;
};
type TaskLog = { id: string; task_id: string; author_id: string | null; note: string; created_at: string };
type Blocker = { id: string; title: string; note: string | null; raised_by: string | null; resolved: boolean };

const fetchRoadmap = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const [{ data: phases }, { data: tasks }, { data: logs }, { data: blockers }] = await Promise.all([
    supabase.from("phases").select("id, label, sort_order").order("sort_order"),
    supabase.from("tasks").select("id, phase_id, title, assignee_id, status, verified_by"),
    supabase.from("task_logs").select("id, task_id, author_id, note, created_at").order("created_at"),
    supabase.from("blockers").select("id, title, note, raised_by, resolved").eq("resolved", false).order("created_at", { ascending: false }),
  ]);
  return {
    phases: phases ?? [],
    tasks: (tasks ?? []) as Task[],
    logs: (logs ?? []) as TaskLog[],
    blockers: (blockers ?? []) as Blocker[],
  };
});

export const Route = createFileRoute("/_authed/roadmap")({
  loader: () => fetchRoadmap(),
  component: Roadmap,
});

const STATUS_META = {
  todo: { label: "To do", icon: "\u25cb", color: P.cocoaSoft },
  inprogress: { label: "In progress", icon: "\u25d0", color: P.accent },
  review: { label: "Awaiting verification", icon: "\u25c9", color: P.indigo },
  done: { label: "Done", icon: "\u2713", color: P.sage },
} as const;

function findFounder(founders: Founder[], id: string | null) {
  return founders.find((f) => f.id === id);
}

function TaskRow({ task, founders, logs, onChanged }: { task: Task; founders: Founder[]; logs: TaskLog[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const otherFounders = founders.filter((f) => f.id !== task.assignee_id);
  const [verifier, setVerifier] = useState(otherFounders[0]?.id ?? "");
  const meta = STATUS_META[task.status];
  const assignee = findFounder(founders, task.assignee_id);
  const verifiedByFounder = findFounder(founders, task.verified_by);
  const taskLogs = logs.filter((l) => l.task_id === task.id);

  const updateStatus = async (fields: Partial<Task>) => {
    const supabase = getSupabaseBrowserClient();
    await supabase.from("tasks").update(fields).eq("id", task.id);
    onChanged();
  };
  const addLog = async () => {
    if (!noteText.trim()) return;
    const supabase = getSupabaseBrowserClient();
    await supabase.from("task_logs").insert({ task_id: task.id, author_id: task.assignee_id, note: noteText.trim() });
    setNoteText("");
    onChanged();
  };

  return (
    <div style={{ border: `1px solid ${P.line}`, borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setOpen(!open)}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: meta.color, fontSize: 13 }}>{meta.icon}</span>
          <span style={{ fontSize: 13, textDecoration: task.status === "done" ? "line-through" : "none" }}>{task.title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: meta.color }}>{meta.label}</span>
          <Avatar founder={assignee} size={18} />
        </div>
      </div>

      {open && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${P.line}` }}>
          {taskLogs.map((l) => (
            <div key={l.id} style={{ fontSize: 11.5, color: P.cocoaSoft, marginBottom: 5 }}>
              {new Date(l.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}: {l.note}
            </div>
          ))}
          {task.status === "done" && verifiedByFounder && (
            <div style={{ fontSize: 11.5, color: P.sage, marginBottom: 8 }}>Verified by {verifiedByFounder.name}</div>
          )}
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Log what got done..." style={{ flex: 1, padding: 6, border: `1px solid ${P.line}`, borderRadius: 6, fontSize: 12 }} />
            <button onClick={addLog} style={{ border: `1px solid ${P.line}`, background: "#fff", padding: "0 12px", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}>Log</button>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {task.status === "todo" && (
              <button onClick={() => updateStatus({ status: "inprogress" })} style={{ border: `1px solid ${P.accent}`, background: "#fff", color: P.accent, padding: "5px 12px", borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>Start</button>
            )}
            {task.status === "inprogress" && (
              <button onClick={() => updateStatus({ status: "review" })} style={{ border: `1px solid ${P.indigo}`, background: "#fff", color: P.indigo, padding: "5px 12px", borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>Mark ready for verification</button>
            )}
            {task.status === "review" && (
              <>
                <span style={{ fontSize: 11, color: P.cocoaSoft }}>Verify as:</span>
                <select value={verifier} onChange={(e) => setVerifier(e.target.value)} style={{ padding: 5, border: `1px solid ${P.line}`, borderRadius: 6, fontSize: 11.5 }}>
                  {otherFounders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <button onClick={() => updateStatus({ status: "done", verified_by: verifier })} style={{ border: `1px solid ${P.sage}`, background: "#fff", color: P.sage, padding: "5px 12px", borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>Confirm complete</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Roadmap() {
  const { phases, tasks, logs, blockers } = Route.useLoaderData();
  const { founders } = Route.useRouteContext();
  const router = useRouter();

  const [bTitle, setBTitle] = useState("");
  const [bNote, setBNote] = useState("");
  const [bBy, setBBy] = useState(founders[0]?.id ?? "");

  const done = tasks.filter((t) => t.status === "done").length;
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  const addBlocker = async () => {
    if (!bTitle.trim()) return;
    const supabase = getSupabaseBrowserClient();
    await supabase.from("blockers").insert({ title: bTitle.trim(), note: bNote.trim() || null, raised_by: bBy });
    setBTitle(""); setBNote("");
    router.invalidate();
  };

  return (
    <div>
      <h2 style={{ fontFamily: display, fontSize: 22, margin: "0 0 4px" }}>Roadmap to launch</h2>
      <p style={{ fontSize: 13.5, color: P.cocoaSoft, marginBottom: 16 }}>
        A task only counts as done once a founder other than the assignee verifies it.
      </p>
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{done} of {tasks.length} tasks verified complete</span>
          <span style={{ fontSize: 13, color: P.cocoaSoft }}>{pct}%</span>
        </div>
        <div style={{ background: P.line, borderRadius: 6, height: 10, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: P.sage }} />
        </div>
      </Card>

      {phases.map((phase) => {
        const phaseTasks = tasks.filter((t) => t.phase_id === phase.id);
        const pDone = phaseTasks.filter((t) => t.status === "done").length;
        return (
          <div key={phase.id} style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{phase.label}</div>
              <div style={{ fontSize: 11.5, color: P.cocoaSoft }}>{pDone}/{phaseTasks.length} done</div>
            </div>
            {phaseTasks.length === 0 && (
              <div style={{ fontSize: 12.5, color: P.cocoaSoft, fontStyle: "italic" }}>No tasks yet in this phase.</div>
            )}
            {phaseTasks.map((t) => (
              <TaskRow key={t.id} task={t} founders={founders} logs={logs} onChanged={() => router.invalidate()} />
            ))}
          </div>
        );
      })}

      <Card>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Struggles & blockers</div>
        {blockers.length === 0 && <div style={{ fontSize: 12.5, color: P.cocoaSoft }}>None right now.</div>}
        {blockers.map((b) => (
          <div key={b.id} style={{ borderLeft: `3px solid ${P.rust}`, paddingLeft: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}>
              <span>{b.title}</span>
              <Avatar founder={findFounder(founders, b.raised_by)} size={15} />
            </div>
            {b.note && <div style={{ fontSize: 11.5, color: P.cocoaSoft, marginTop: 2 }}>{b.note}</div>}
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
          <input value={bTitle} onChange={(e) => setBTitle(e.target.value)} placeholder="What's blocking things?" style={{ flex: 1, padding: 7, border: `1px solid ${P.line}`, borderRadius: 6, fontSize: 12, minWidth: 160 }} />
          <input value={bNote} onChange={(e) => setBNote(e.target.value)} placeholder="Details (optional)" style={{ flex: 1, padding: 7, border: `1px solid ${P.line}`, borderRadius: 6, fontSize: 12, minWidth: 140 }} />
          <select value={bBy} onChange={(e) => setBBy(e.target.value)} style={{ padding: 7, border: `1px solid ${P.line}`, borderRadius: 6, fontSize: 12 }}>
            {founders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <button onClick={addBlocker} style={{ border: `1px solid ${P.rust}`, background: "#fff", color: P.rust, padding: "0 12px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Add</button>
        </div>
      </Card>
    </div>
  );
}
