import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getSupabaseServerClient } from "#/utils/supabase/server";
import { getSupabaseBrowserClient } from "#/utils/supabase/client";
import { Avatar } from "#/components/ui";
import type { Founder } from "#/utils/founders";

type Task = {
  id: string; phase_id: string; title: string;
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

const STATUS: Record<Task["status"], { label: string; dot: string }> = {
  todo:       { label: "To do",                  dot: "bg-slate-300" },
  inprogress: { label: "In progress",             dot: "bg-blue-500" },
  review:     { label: "Awaiting verification",   dot: "bg-amber-400" },
  done:       { label: "Done",                    dot: "bg-green-500" },
};

function findFounder(founders: Founder[], id: string | null) {
  return founders.find((f) => f.id === id);
}

function TaskRow({ task, founders, logs, onChanged }: {
  task: Task; founders: Founder[]; logs: TaskLog[]; onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const otherFounders = founders.filter((f) => f.id !== task.assignee_id);
  const [verifier, setVerifier] = useState(otherFounders[0]?.id ?? "");
  const meta = STATUS[task.status];
  const assignee = findFounder(founders, task.assignee_id);
  const verifiedBy = findFounder(founders, task.verified_by);
  const taskLogs = logs.filter((l) => l.task_id === task.id);

  const updateStatus = async (fields: Partial<Task>) => {
    setSaving(true);
    const supabase = getSupabaseBrowserClient();
    await supabase.from("tasks").update(fields).eq("id", task.id);
    setSaving(false);
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
    <div className={`rounded-xl border bg-white transition-all ${task.status === "done" ? "border-slate-100 opacity-60" : "border-slate-200"}`}>
      {/* Task header row */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
        <span className={`flex-1 text-sm text-slate-900 ${task.status === "done" ? "line-through text-slate-400" : ""}`}>
          {task.title}
        </span>
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-xs text-slate-400">{meta.label}</span>
          <Avatar founder={assignee} size={20} />
          <span className="text-slate-300 text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Expanded panel */}
      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
          {/* Logs */}
          {taskLogs.length > 0 && (
            <div className="space-y-1.5">
              {taskLogs.map((l) => (
                <p key={l.id} className="text-xs text-slate-500">
                  <span className="font-medium text-slate-700">
                    {new Date(l.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                  {" · "}{l.note}
                </p>
              ))}
            </div>
          )}
          {task.status === "done" && verifiedBy && (
            <p className="text-xs font-medium text-green-600">✓ Verified by {verifiedBy.name}</p>
          )}

          {/* Add log */}
          <div className="flex gap-2">
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Log what got done…"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="button"
              onClick={addLog}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 transition-colors hover:bg-slate-50"
            >
              Log
            </button>
          </div>

          {/* Status actions */}
          <div className="flex flex-wrap items-center gap-2">
            {task.status === "todo" && (
              <button
                type="button"
                disabled={saving}
                onClick={() => updateStatus({ status: "inprogress" })}
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50"
              >
                Start
              </button>
            )}
            {task.status === "inprogress" && (
              <button
                type="button"
                disabled={saving}
                onClick={() => updateStatus({ status: "review" })}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
              >
                Mark ready for verification
              </button>
            )}
            {task.status === "review" && (
              <>
                <span className="text-xs text-slate-500">Verify as</span>
                <select
                  value={verifier}
                  onChange={(e) => setVerifier(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                >
                  {otherFounders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => updateStatus({ status: "done", verified_by: verifier })}
                  className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50"
                >
                  Confirm complete
                </button>
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
    <div className="min-h-full">
      {/* Page header */}
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <h1 className="text-xl font-semibold text-slate-900">Roadmap to launch</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          A task counts as done only once another founder verifies it.
        </p>
      </div>

      <div className="p-8 space-y-5">
        {/* Overall progress */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">{done} of {tasks.length} tasks complete</p>
            <span className="text-sm font-semibold text-slate-900">{pct}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-2.5 rounded-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Phases */}
        {phases.map((phase) => {
          const phaseTasks = tasks.filter((t) => t.phase_id === phase.id);
          const pDone = phaseTasks.filter((t) => t.status === "done").length;
          return (
            <div key={phase.id}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">{phase.label}</h2>
                <span className="text-xs text-slate-400">{pDone}/{phaseTasks.length} done</span>
              </div>
              {phaseTasks.length === 0 ? (
                <p className="text-xs italic text-slate-400">No tasks in this phase yet.</p>
              ) : (
                <div className="space-y-2">
                  {phaseTasks.map((t) => (
                    <TaskRow key={t.id} task={t} founders={founders} logs={logs} onChanged={() => router.invalidate()} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Blockers */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Blockers</h2>

          {blockers.length === 0 ? (
            <p className="text-sm text-slate-400">No active blockers.</p>
          ) : (
            <div className="mb-4 space-y-2">
              {blockers.map((b) => (
                <div key={b.id} className="flex gap-3 rounded-lg border-l-4 border-red-400 bg-red-50 px-4 py-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-red-800">{b.title}</p>
                      <Avatar founder={findFounder(founders, b.raised_by)} size={16} />
                    </div>
                    {b.note && <p className="mt-0.5 text-xs text-red-600">{b.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add blocker */}
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <input
              value={bTitle}
              onChange={(e) => setBTitle(e.target.value)}
              placeholder="What's blocking things?"
              className="min-w-48 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <input
              value={bNote}
              onChange={(e) => setBNote(e.target.value)}
              placeholder="Details (optional)"
              className="min-w-36 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <select
              value={bBy}
              onChange={(e) => setBBy(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              {founders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <button
              type="button"
              onClick={addBlocker}
              disabled={!bTitle.trim()}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
            >
              Add blocker
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


