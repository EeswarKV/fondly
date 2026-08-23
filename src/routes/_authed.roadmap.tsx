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
type Phase = { id: string; label: string; sort_order: number; tab: string };
type TaskLog = { id: string; task_id: string; author_id: string | null; note: string; created_at: string };
type Blocker = { id: string; title: string; note: string | null; raised_by: string | null; resolved: boolean };

const fetchRoadmap = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const [{ data: phases }, { data: tasks }, { data: logs }, { data: blockers }] = await Promise.all([
    supabase.from("phases").select("id, label, sort_order, tab").order("sort_order"),
    supabase.from("tasks").select("id, phase_id, title, assignee_id, status, verified_by"),
    supabase.from("task_logs").select("id, task_id, author_id, note, created_at").order("created_at"),
    supabase.from("blockers").select("id, title, note, raised_by, resolved")
      .eq("resolved", false).order("created_at", { ascending: false }),
  ]);
  return {
    phases: phases ?? [] as Phase[],
    tasks: (tasks ?? []) as Task[],
    logs: (logs ?? []) as TaskLog[],
    blockers: (blockers ?? []) as Blocker[],
  };
});

export const Route = createFileRoute("/_authed/roadmap")({
  staleTime: 30_000,
  loader: () => fetchRoadmap(),
  component: Roadmap,
});

const STATUS: Record<Task["status"], { label: string; dot: string }> = {
  todo:       { label: "To do",                dot: "bg-slate-300"  },
  inprogress: { label: "In progress",           dot: "bg-blue-700"   },
  review:     { label: "Awaiting verification", dot: "bg-amber-400"  },
  done:       { label: "Done",                  dot: "bg-green-500"  },
};

function findFounder(founders: Founder[], id: string | null) {
  return founders.find((f) => f.id === id);
}

function TaskRow({ task, founders, logs, onChanged }: {
  task: Task; founders: Founder[]; logs: TaskLog[]; onChanged: (optimistic?: Partial<Task>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState(false);
  const [titleVal, setTitleVal]  = useState(task.title);

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

  const saveTitle = async () => {
    if (!titleVal.trim() || titleVal === task.title) { setEditTitle(false); return; }
    const supabase = getSupabaseBrowserClient();
    await supabase.from("tasks").update({ title: titleVal.trim() }).eq("id", task.id);
    setEditTitle(false);
    onChanged();
  };

  const addLog = async () => {
    if (!noteText.trim()) return;
    const supabase = getSupabaseBrowserClient();
    await supabase.from("task_logs").insert({
      task_id: task.id,
      author_id: task.assignee_id,
      note: noteText.trim(),
    });
    setNoteText("");
    onChanged();
  };

  const deleteTask = async () => {
    if (!confirm(`Delete "${task.title}"?`)) return;
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) { alert(error.message); return; }
    onChanged();
  };

  return (
    <div className={`group rounded-xl border bg-white transition-all ${task.status === "done" ? "border-slate-100 opacity-60" : "border-slate-200"}`}>
      <div className="flex w-full items-center gap-3 px-4 py-3">
        <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />

        {editTitle ? (
          <input
            value={titleVal}
            onChange={(e) => setTitleVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setTitleVal(task.title); setEditTitle(false); } }}
            className="flex-1 rounded border border-blue-300 px-2 py-0.5 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onDoubleClick={() => setEditTitle(true)}
            onClick={() => setOpen(!open)}
            className={`flex-1 text-left text-sm text-slate-900 ${task.status === "done" ? "line-through text-slate-400" : ""}`}
            title="Click to expand · Double-click to rename"
          >
            {task.title}
          </button>
        )}

        <div className="flex shrink-0 items-center gap-2">
          {editTitle ? (
            <>
              <button type="button" onClick={saveTitle} className="text-xs font-medium text-blue-800">Save</button>
              <button type="button" onClick={() => { setTitleVal(task.title); setEditTitle(false); }} className="text-xs text-slate-400">✕</button>
            </>
          ) : (
            <>
              <span className="text-xs text-slate-400">{meta.label}</span>
              <Avatar founder={assignee} size={20} />
              <button
                type="button"
                onClick={deleteTask}
                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 text-sm transition-opacity"
                title="Delete task"
              >
                ×
              </button>
              <button
                type="button"
                onClick={() => setOpen(!open)}
                className="text-slate-300 text-xs"
              >
                {open ? "▲" : "▼"}
              </button>
            </>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
          {/* Change assignee */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-20 shrink-0">Assignee</span>
            <select
              value={task.assignee_id ?? ""}
              onChange={(e) => updateStatus({ assignee_id: e.target.value || null })}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs bg-white text-slate-900 outline-none focus:border-blue-500"
            >
              <option value="">Unassigned</option>
              {founders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

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
              onKeyDown={(e) => { if (e.key === "Enter") addLog(); }}
              placeholder="Log what got done…"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="button"
              onClick={addLog}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
            >
              Log
            </button>
          </div>

          {/* Status transitions */}
          <div className="flex flex-wrap items-center gap-2">
            {task.status === "todo" && (
              <button type="button" disabled={saving} onClick={() => updateStatus({ status: "inprogress" })}
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-900 hover:bg-blue-100 disabled:opacity-50">
                Start
              </button>
            )}
            {task.status === "inprogress" && (
              <button type="button" disabled={saving} onClick={() => updateStatus({ status: "review" })}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50">
                Ready for verification
              </button>
            )}
            {task.status === "review" && (
              <>
                <span className="text-xs text-slate-500">Verify as</span>
                <select value={verifier} onChange={(e) => setVerifier(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white text-slate-900 outline-none focus:border-blue-500">
                  {otherFounders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <button type="button" disabled={saving}
                  onClick={() => updateStatus({ status: "done", verified_by: verifier })}
                  className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-800 hover:bg-green-100 disabled:opacity-50">
                  Confirm complete
                </button>
              </>
            )}
            {task.status === "done" && (
              <button type="button" disabled={saving} onClick={() => updateStatus({ status: "todo", verified_by: null })}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-50">
                Reopen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AddTaskRow({ phaseId, founders, onDone }: {
  phaseId: string; founders: Founder[]; onDone: () => void;
}) {
  const [title,      setTitle]    = useState("");
  const [assigneeId, setAssignee] = useState(founders[0]?.id ?? "");
  const [saving,     setSaving]   = useState(false);
  const [err,        setErr]      = useState<string | null>(null);

  const create = async () => {
    if (!title.trim()) return;
    setSaving(true); setErr(null);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("tasks").insert({
      phase_id: phaseId,
      title: title.trim(),
      status: "todo",
      assignee_id: assigneeId || null,
    });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onDone();
  };

  return (
    <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/40 p-3">
      <div className="flex gap-2 flex-wrap items-center">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") create(); if (e.key === "Escape") onDone(); }}
          placeholder="Task title…"
          className="flex-1 min-w-40 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm bg-white text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          autoFocus
        />
        <select value={assigneeId} onChange={(e) => setAssignee(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs bg-white text-slate-900 outline-none focus:border-blue-500">
          <option value="">Unassigned</option>
          {founders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <button type="button" onClick={create} disabled={saving || !title.trim()}
          className="rounded-lg bg-blue-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-900 disabled:bg-blue-300">
          {saving ? "Adding…" : "Add task"}
        </button>
        <button type="button" onClick={onDone} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
      </div>
      {err && <p className="mt-1.5 text-xs text-red-600">{err}</p>}
    </div>
  );
}

function Roadmap() {
  const { phases, tasks, logs, blockers } = Route.useLoaderData();
  const { founders } = Route.useRouteContext();
  const router = useRouter();

  const [addingToPhase, setAddingToPhase] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'business' | 'chocolate'>('business');
  const [addingPhase, setAddingPhase] = useState(false);
  const [newPhaseLabel, setNewPhaseLabel] = useState('');
  const [bTitle, setBTitle] = useState("");
  const [bNote,  setBNote]  = useState("");
  const [bBy,    setBBy]    = useState(founders[0]?.id ?? "");
  const [bErr,   setBErr]   = useState<string | null>(null);

  const done = tasks.filter((t) => t.status === "done").length;
  const pct  = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  const visiblePhases = (phases as Phase[]).filter(p => (p.tab ?? 'business') === activeTab);

  const createPhase = async () => {
    if (!newPhaseLabel.trim()) return;
    const supabase = getSupabaseBrowserClient();
    const maxOrder = visiblePhases.reduce((max, p) => Math.max(max, p.sort_order), 0);
    await supabase.from('phases').insert({
      label: newPhaseLabel.trim(),
      sort_order: maxOrder + 1,
      tab: activeTab,
    });
    setNewPhaseLabel(''); setAddingPhase(false);
    router.invalidate();
  };

  const addBlocker = async () => {
    if (!bTitle.trim()) return;
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("blockers").insert({
      title: bTitle.trim(),
      note: bNote.trim() || null,
      raised_by: bBy || null,
    });
    if (error) { setBErr(error.message); return; }
    setBTitle(""); setBNote("");
    router.invalidate();
  };

  const resolveBlocker = async (id: string) => {
    const supabase = getSupabaseBrowserClient();
    await supabase.from("blockers").update({ resolved: true }).eq("id", id);
    router.invalidate();
  };

  return (
    <div className="min-h-full">
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <h1 className="text-xl font-semibold text-slate-900">Roadmap to launch</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          A task counts as done only once another founder verifies it. Double-click a title to rename it.
        </p>
      </div>

      <div className="p-8 space-y-5">
        {/* Tab switcher */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 w-fit">
          {(['business', 'chocolate'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setActiveTab(t); setAddingToPhase(null); setAddingPhase(false); }}
              className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
                activeTab === t
                  ? 'bg-blue-800 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t === 'business' ? '🏢 Business' : '🍫 Chocolate making'}
            </button>
          ))}
        </div>

        {/* Overall progress */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">{done} of {tasks.length} tasks complete</p>
            <span className="text-sm font-semibold text-slate-900">{pct}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-2.5 rounded-full bg-blue-800 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Phases for active tab */}
        {visiblePhases.map((phase) => {
          const phaseTasks = tasks.filter((t) => t.phase_id === phase.id);
          const pDone = phaseTasks.filter((t) => t.status === "done").length;
          const isAdding = addingToPhase === phase.id;
          return (
            <div key={phase.id}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">{phase.label}</h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{pDone}/{phaseTasks.length} done</span>
                  {!isAdding && (
                    <button
                      type="button"
                      onClick={() => setAddingToPhase(phase.id)}
                      className="text-xs font-medium text-blue-800 hover:text-blue-900"
                    >
                      + Add task
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {phaseTasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    founders={founders}
                    logs={logs}
                    onChanged={() => router.invalidate()}
                  />
                ))}
                {phaseTasks.length === 0 && !isAdding && (
                  <p className="text-xs italic text-slate-400">No tasks yet.</p>
                )}
                {isAdding && (
                  <AddTaskRow
                    phaseId={phase.id}
                    founders={founders}
                    onDone={() => { setAddingToPhase(null); router.invalidate(); }}
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* Add phase for this tab */}
        {addingPhase ? (
          <div className="flex items-center gap-2">
            <input
              value={newPhaseLabel}
              onChange={(e) => setNewPhaseLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createPhase(); if (e.key === 'Escape') setAddingPhase(false); }}
              placeholder={`Phase name for ${activeTab === 'business' ? 'Business' : 'Chocolate making'}…`}
              className="flex-1 rounded-lg border border-slate-200 bg-white text-slate-900 px-3 py-2 text-sm bg-white text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              autoFocus
            />
            <button type="button" onClick={createPhase} className="rounded-lg bg-blue-800 px-3 py-2 text-sm font-medium text-white hover:bg-blue-900">Add phase</button>
            <button type="button" onClick={() => setAddingPhase(false)} className="text-sm text-slate-400">Cancel</button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingPhase(true)}
            className="text-xs font-medium text-slate-400 hover:text-blue-800 transition-colors"
          >
            + Add phase to {activeTab === 'business' ? 'Business' : 'Chocolate making'}
          </button>
        )}

        {/* Blockers */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Blockers</h2>

          {blockers.length === 0 ? (
            <p className="mb-4 text-sm text-slate-400">No active blockers.</p>
          ) : (
            <div className="mb-4 space-y-2">
              {blockers.map((b) => (
                <div key={b.id} className="group flex items-start gap-3 rounded-lg border-l-4 border-red-400 bg-red-50 px-4 py-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-red-800">{b.title}</p>
                      <Avatar founder={findFounder(founders, b.raised_by)} size={16} />
                    </div>
                    {b.note && <p className="mt-0.5 text-xs text-red-600">{b.note}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => resolveBlocker(b.id)}
                    className="shrink-0 rounded px-2 py-0.5 text-xs text-red-400 hover:bg-red-100 hover:text-red-700"
                  >
                    Resolve
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <input
              value={bTitle}
              onChange={(e) => setBTitle(e.target.value)}
              placeholder="What's blocking things?"
              className="min-w-48 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <input
              value={bNote}
              onChange={(e) => setBNote(e.target.value)}
              placeholder="Details (optional)"
              className="min-w-36 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <select value={bBy} onChange={(e) => setBBy(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white text-slate-900 outline-none focus:border-blue-500">
              {founders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <button type="button" onClick={addBlocker} disabled={!bTitle.trim()}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50">
              Add blocker
            </button>
          </div>
          {bErr && <p className="mt-2 text-xs text-red-600">{bErr}</p>}
        </div>
      </div>
    </div>
  );
}
