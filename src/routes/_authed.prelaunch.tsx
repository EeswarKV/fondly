import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getSupabaseServerClient } from "#/utils/supabase/server";
import { getSupabaseBrowserClient } from "#/utils/supabase/client";
import { P, Card, display, inr } from "#/components/ui";

const fetchPrelaunch = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const [{ data: categories }, { data: expenses }] = await Promise.all([
    supabase.from("prelaunch_categories").select("id, name, budget").order("name"),
    supabase.from("prelaunch_expenses").select("id, category_id, note, amount, created_at").order("created_at", { ascending: false }),
  ]);
  return { categories: categories ?? [], expenses: expenses ?? [] };
});

export const Route = createFileRoute("/_authed/prelaunch")({
  loader: () => fetchPrelaunch(),
  component: PreLaunch,
});

function PreLaunch() {
  const { categories, expenses } = Route.useLoaderData();
  const router = useRouter();
  const { user } = Route.useRouteContext();

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  const spentByCategory = (catId: string) =>
    expenses.filter((e) => e.category_id === catId).reduce((s, e) => s + Number(e.amount), 0);

  const totalBudget = categories.reduce((s, c) => s + Number(c.budget), 0);
  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const pctUsed = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const addExpense = async () => {
    if (!amount || !note || !categoryId) return;
    setSaving(true);
    const supabase = getSupabaseBrowserClient();
    await supabase.from("prelaunch_expenses").insert({
      category_id: categoryId,
      note,
      amount: Number(amount),
      logged_by: user.id,
    });
    setAmount(""); setNote("");
    setSaving(false);
    router.invalidate();
  };

  return (
    <div>
      <h2 style={{ fontFamily: display, fontSize: 22, margin: "0 0 4px" }}>Pre-launch spending</h2>
      <p style={{ fontSize: 13.5, color: P.cocoaSoft, marginBottom: 20 }}>
        Everything spent before hard launch, tracked against your {inr(totalBudget)} pre-launch budget.
      </p>

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{inr(totalSpent)} spent of {inr(totalBudget)}</span>
          <span style={{ fontSize: 13, color: P.cocoaSoft }}>{pctUsed}% used</span>
        </div>
        <div style={{ background: P.line, borderRadius: 6, height: 10, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(100, pctUsed)}%`, height: "100%", background: P.accent }} />
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>By category</div>
          {categories.map((c) => {
            const spent = spentByCategory(c.id);
            const p = Math.min(100, Math.round((spent / Number(c.budget)) * 100));
            return (
              <div key={c.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span>{c.name}</span>
                  <span style={{ color: P.cocoaSoft }}>{inr(spent)} / {inr(Number(c.budget))}</span>
                </div>
                <div style={{ background: P.line, borderRadius: 5, height: 6, overflow: "hidden" }}>
                  <div style={{ width: `${p}%`, height: "100%", background: p >= 90 ? P.rust : P.accent }} />
                </div>
              </div>
            );
          })}
        </Card>

        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Log a pre-launch expense</div>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ width: "100%", padding: 8, border: `1px solid ${P.line}`, borderRadius: 6, marginBottom: 8, fontSize: 12.5 }}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input placeholder="Amount (\u20b9)" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: 100, padding: 8, border: `1px solid ${P.line}`, borderRadius: 6 }} />
            <input placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} style={{ flex: 1, padding: 8, border: `1px solid ${P.line}`, borderRadius: 6 }} />
          </div>
          <button onClick={addExpense} disabled={saving} style={{ width: "100%", background: "#fff", color: P.accent, border: `1px solid ${P.accent}`, fontWeight: 700, padding: 9, borderRadius: 6, fontSize: 13, cursor: "pointer" }}>
            {saving ? "Saving..." : "Add to log"}
          </button>
          <div style={{ marginTop: 14, fontSize: 12, color: P.cocoaSoft, marginBottom: 6 }}>Recent</div>
          {expenses.slice(0, 4).map((e) => (
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: `1px solid ${P.line}` }}>
              <span>{e.note}</span><span style={{ color: P.cocoaSoft }}>{inr(Number(e.amount))}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
