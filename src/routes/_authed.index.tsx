import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "#/utils/supabase/server";
import { P, Card, Alert, display } from "#/components/ui";

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
