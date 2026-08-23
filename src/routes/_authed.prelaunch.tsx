import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getSupabaseServerClient } from "#/utils/supabase/server";
import { getSupabaseBrowserClient } from "#/utils/supabase/client";
import { inr } from "#/components/ui";

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
  const [err, setErr] = useState<string | null>(null);
  const [editBudget, setEditBudget] = useState<{ id: string; val: string } | null>(null);

  const saveBudget = async () => {
    if (!editBudget) return;
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("prelaunch_categories")
      .update({ budget: Number(editBudget.val) })
      .eq("id", editBudget.id);
    if (error) { setErr(error.message); return; }
    setEditBudget(null);
    router.invalidate();
  };

  const spentByCategory = (catId: string) =>
    expenses.filter((e) => e.category_id === catId).reduce((s, e) => s + Number(e.amount), 0);

  const totalBudget = categories.reduce((s, c) => s + Number(c.budget), 0);
  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const pctUsed = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const addExpense = async () => {
    if (!amount || !note || !categoryId) return;
    setSaving(true); setErr(null);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("prelaunch_expenses").insert({
      category_id: categoryId,
      note,
      amount: Number(amount),
      logged_by: null, // nullable — avoids FK violation if founder row not yet set up
    });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setAmount(""); setNote("");
    router.invalidate();
  };

  return (
    <div className="min-h-full">
      {/* Page header */}
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <h1 className="text-xl font-semibold text-slate-900">Pre-launch spending</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Everything spent before hard launch, tracked against your {inr(totalBudget)} budget.
        </p>
      </div>

      <div className="p-8 space-y-5">
        {/* Overall progress */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{inr(totalSpent)} spent</p>
              <p className="text-xs text-slate-500">of {inr(totalBudget)} total budget</p>
            </div>
            <span className={`text-sm font-semibold ${pctUsed > 90 ? "text-red-600" : "text-slate-700"}`}>
              {pctUsed}%
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-2.5 rounded-full transition-all ${pctUsed > 90 ? "bg-red-500" : "bg-blue-600"}`}
              style={{ width: `${Math.min(100, pctUsed)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* Category breakdown */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">By category</h2>
            <div className="space-y-4">
              {categories.map((c) => {
                const spent = spentByCategory(c.id);
                const budget = Number(c.budget);
                const p = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
                const isEditing = editBudget?.id === c.id;
                return (
                  <div key={c.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-700 truncate">{c.name}</span>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="text-xs text-slate-500">{inr(spent)} /</span>
                        {isEditing ? (
                          <>
                            <input
                              type="number"
                              value={editBudget.val}
                              onChange={(e) => setEditBudget({ id: c.id, val: e.target.value })}
                              onKeyDown={(e) => { if (e.key === "Enter") saveBudget(); if (e.key === "Escape") setEditBudget(null); }}
                              className="w-24 rounded border border-blue-300 px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                              autoFocus
                            />
                            <button type="button" onClick={saveBudget} className="text-xs font-medium text-blue-600 hover:text-blue-800">Save</button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditBudget({ id: c.id, val: String(budget) })}
                            className="text-xs text-slate-500 underline-offset-2 hover:underline hover:text-slate-700"
                            title="Click to edit budget"
                          >
                            {inr(budget)}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-1.5 rounded-full ${p >= 90 ? "bg-red-500" : "bg-blue-600"}`}
                        style={{ width: `${p}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Log expense */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Log an expense</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Note</label>
                  <input
                    placeholder="What was it for?"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={addExpense}
                disabled={saving || !amount || !note}
                className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300"
              >
                {saving ? "Saving…" : "Add to log"}
              </button>
              {err && <p className="text-xs text-red-600">{err}</p>}
            </div>

            {/* Recent */}
            {expenses.length > 0 && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-medium text-slate-500">Recent</p>
                <div className="space-y-1.5">
                  {expenses.slice(0, 5).map((e) => (
                    <div key={e.id} className="flex items-center justify-between">
                      <span className="text-xs text-slate-600 truncate">{e.note}</span>
                      <span className="ml-2 shrink-0 text-xs font-medium text-slate-800">{inr(Number(e.amount))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


