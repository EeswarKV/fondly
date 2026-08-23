import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "#/utils/supabase/server";
import { inr } from "#/components/ui";

const fetchDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const [{ data: tasks }, { data: categories }, { data: expenses }, { data: blockers }] =
    await Promise.all([
      supabase.from("tasks").select("status"),
      supabase.from("prelaunch_categories").select("budget"),
      supabase.from("prelaunch_expenses").select("amount, note, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("blockers").select("id, title").eq("resolved", false),
    ]);

  const totalTasks = tasks?.length ?? 0;
  const doneTasks = tasks?.filter((t) => t.status === "done").length ?? 0;
  const completion = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const totalBudget = (categories ?? []).reduce((s, c) => s + Number(c.budget), 0);
  const totalSpent = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);

  return { completion, totalTasks, doneTasks, totalBudget, totalSpent, recentExpenses: expenses ?? [], openBlockers: blockers ?? [] };
});

export const Route = createFileRoute("/_authed/")({
  loader: () => fetchDashboard(),
  component: Dashboard,
});

function Dashboard() {
  const { completion, doneTasks, totalTasks, totalBudget, totalSpent, recentExpenses, openBlockers } = Route.useLoaderData();
  const spentPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  return (
    <div className="min-h-full">
      {/* Page header */}
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {completion}% of the way to launch · {doneTasks} of {totalTasks} tasks verified
        </p>
      </div>

      <div className="p-8 space-y-5">
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Roadmap progress</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{completion}%</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-1.5 rounded-full bg-blue-600 transition-all" style={{ width: `${completion}%` }} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tasks verified</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {doneTasks}
              <span className="text-base font-normal text-slate-400"> / {totalTasks}</span>
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Open blockers</p>
            <p className={`mt-2 text-2xl font-bold ${openBlockers.length > 0 ? "text-red-600" : "text-slate-900"}`}>
              {openBlockers.length}
            </p>
          </div>
        </div>

        {/* Blockers alert */}
        {openBlockers.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="text-sm font-medium text-red-800">
              ⚠ Active blocker: {openBlockers[0].title}
            </p>
          </div>
        )}

        {/* Pre-launch budget */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Pre-launch budget</h2>
            <span className="text-sm text-slate-500">{inr(totalSpent)} of {inr(totalBudget)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-2 rounded-full transition-all ${spentPct > 90 ? "bg-red-500" : "bg-blue-600"}`}
              style={{ width: `${Math.min(100, spentPct)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">{spentPct}% used</p>
        </div>

        {/* Recent spending */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Recent spending</h2>
          {recentExpenses.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing logged yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentExpenses.map((e, i) => (
                <div key={i} className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-slate-700">{e.note}</span>
                  <span className="text-sm font-medium text-slate-900">{inr(Number(e.amount))}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


const inr = (n: number) => "\u20b9" + Math.round(n).toLocaleString("en-IN");

const fetchDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();

  const [{ data: tasks }, { data: categories }, { data: expenses }, { data: blockers }] =
    await Promise.all([
      supabase.from("tasks").select("status"),
      supabase.from("prelaunch_categories").select("budget"),
      supabase.from("prelaunch_expenses").select("amount, note, created_at").order("created_at", { ascending: false }).limit(3),
      supabase.from("blockers").select("id, title").eq("resolved", false),
    ]);

  const totalTasks = tasks?.length ?? 0;
  const doneTasks = tasks?.filter((t) => t.status === "done").length ?? 0;
  const completion = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const totalBudget = (categories ?? []).reduce((s, c) => s + Number(c.budget), 0);
  const totalSpent = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
  // Note: this spent total only reflects the 3 most recent rows fetched above for
  // display; the Pre-launch screen computes the true running total from all rows.

  return { completion, totalTasks, doneTasks, totalBudget, recentExpenses: expenses ?? [], openBlockers: blockers ?? [] };
});

export const Route = createFileRoute("/_authed/")({
  loader: () => fetchDashboard(),
  component: Dashboard,
});

function Dashboard() {
  const { completion, doneTasks, totalTasks, recentExpenses, openBlockers } = Route.useLoaderData();

  return (
    <div>
      <h2 style={{ fontFamily: display, fontSize: 22, margin: "0 0 4px" }}>Dashboard</h2>
      <p style={{ fontSize: 13.5, color: P.cocoaSoft, marginBottom: 20 }}>
        {completion}% of the way to launch · {doneTasks}/{totalTasks} roadmap tasks verified
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        <Card>
          <div style={{ fontSize: 12, color: P.cocoaSoft, marginBottom: 3 }}>Roadmap complete</div>
          <div style={{ fontSize: 19, fontWeight: 700 }}>{completion}%</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: P.cocoaSoft, marginBottom: 3 }}>Tasks verified</div>
          <div style={{ fontSize: 19, fontWeight: 700 }}>{doneTasks} / {totalTasks}</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: P.cocoaSoft, marginBottom: 3 }}>Open blockers</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: openBlockers.length > 0 ? P.rust : P.cocoa }}>
            {openBlockers.length}
          </div>
        </Card>
      </div>

      {openBlockers.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Alert icon="\u26a0" color={P.rust}>{openBlockers[0].title}</Alert>
        </div>
      )}

      <Card>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Recent pre-launch spending</div>
        {recentExpenses.length === 0 && (
          <div style={{ fontSize: 13, color: P.cocoaSoft }}>Nothing logged yet.</div>
        )}
        {recentExpenses.map((e, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${P.line}`, fontSize: 13 }}>
            <span>{e.note}</span><span style={{ color: P.cocoaSoft }}>{inr(Number(e.amount))}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
