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
      supabase.from("prelaunch_expenses").select("amount, note, created_at, logged_by").order("created_at", { ascending: false }),
      supabase.from("blockers").select("id, title").eq("resolved", false),
    ]);

  const totalTasks = tasks?.length ?? 0;
  const doneTasks = tasks?.filter((t) => t.status === "done").length ?? 0;
  const completion = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const totalBudget = (categories ?? []).reduce((s, c) => s + Number(c.budget), 0);
  const totalSpent = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);

  return { completion, totalTasks, doneTasks, totalBudget, totalSpent, allExpenses: expenses ?? [], recentExpenses: (expenses ?? []).slice(0, 5), openBlockers: blockers ?? [] };
});

export const Route = createFileRoute("/_authed/")({ staleTime: Infinity,
  loader: async () => {
    if (typeof window !== 'undefined') {
      const { getSupabaseBrowserClient } = await import("#/utils/supabase/client");
      const supabase = getSupabaseBrowserClient();
      const [{ data: tasks }, { data: categories }, { data: expenses }, { data: blockers }] = await Promise.all([
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
      return { completion, totalTasks, doneTasks, totalBudget, totalSpent, allExpenses: expenses ?? [], recentExpenses: (expenses ?? []).slice(0, 5), openBlockers: blockers ?? [] };
    }
    return fetchDashboard();
  },
  component: Dashboard,
});

function Dashboard() {
  const { completion, doneTasks, totalTasks, totalBudget, totalSpent, allExpenses, recentExpenses, openBlockers } = Route.useLoaderData();
  const { founders, user } = Route.useRouteContext();
  const spentPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  // Balance: how much each founder paid vs their fair share
  const fairShare = founders.length > 0 ? totalSpent / founders.length : 0;
  const balances = founders.map((f) => {
    const paid = (allExpenses as { amount: number; logged_by: string | null }[])
      .filter((e) => e.logged_by === f.id)
      .reduce((s, e) => s + Number(e.amount), 0);
    return { founder: f, paid, net: paid - fairShare }; // positive = others owe them
  });
  const myBalance = balances.find((b) => b.founder.id === user.id);

  return (
    <div className="min-h-full">
      {/* Page header */}
      <div className="border-b border-slate-200 bg-white px-4 py-4 lg:px-8 lg:py-6">
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {completion}% of the way to launch · {doneTasks} of {totalTasks} tasks verified
        </p>
      </div>

      <div className="p-4 lg:p-8 space-y-5">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Roadmap progress</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{completion}%</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-1.5 rounded-full bg-blue-800 transition-all" style={{ width: `${completion}%` }} />
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
              className={`h-2 rounded-full transition-all ${spentPct > 90 ? "bg-red-500" : "bg-blue-800"}`}
              style={{ width: `${Math.min(100, spentPct)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">{spentPct}% used</p>
        </div>

        {/* Expense split / balances */}
        {totalSpent > 0 && founders.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Expense split</h2>
              <span className="text-xs text-slate-400">Fair share: {inr(Math.round(fairShare))} each</span>
            </div>

            {/* My balance highlight */}
            {myBalance && (
              <div className={`mb-4 rounded-lg px-4 py-3 ${myBalance.net > 0 ? "bg-green-50 border border-green-200" : myBalance.net < 0 ? "bg-amber-50 border border-amber-200" : "bg-slate-50 border border-slate-200"}`}>
                <p className="text-xs text-slate-500">Your balance</p>
                {myBalance.net > 0 ? (
                  <p className="text-sm font-semibold text-green-700">Others owe you {inr(Math.round(myBalance.net))}</p>
                ) : myBalance.net < 0 ? (
                  <p className="text-sm font-semibold text-amber-700">You owe {inr(Math.round(-myBalance.net))} total</p>
                ) : (
                  <p className="text-sm font-semibold text-slate-700">You're settled up</p>
                )}
                <p className="mt-0.5 text-xs text-slate-400">You paid {inr(myBalance.paid)} of {inr(Math.round(fairShare))} fair share</p>
              </div>
            )}

            {/* Per-founder breakdown */}
            <div className="space-y-2">
              {balances.map(({ founder, paid, net }) => (
                <div key={founder.id} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${founder.id === user.id ? "bg-slate-50" : ""}`}>
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: founder.color }}
                  >
                    {founder.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {founder.name}{founder.id === user.id ? " (you)" : ""}
                    </p>
                    <p className="text-xs text-slate-400">Paid {inr(paid)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {net > 50 ? (
                      <span className="text-xs font-semibold text-green-600">+{inr(Math.round(net))}</span>
                    ) : net < -50 ? (
                      <span className="text-xs font-semibold text-amber-600">−{inr(Math.round(-net))}</span>
                    ) : (
                      <span className="text-xs text-slate-400">settled</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent spending */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Recent spending</h2>          {recentExpenses.length === 0 ? (
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

