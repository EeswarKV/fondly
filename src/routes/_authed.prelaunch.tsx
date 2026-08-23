import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getSupabaseServerClient } from "#/utils/supabase/server";
import { getSupabaseBrowserClient } from "#/utils/supabase/client";
import { inr } from "#/components/ui";

type Category = { id: string; name: string; budget: number };
type Expense = { id: string; category_id: string; note: string; amount: number; created_at: string };

const fetchPrelaunch = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const [{ data: categories }, { data: expenses }] = await Promise.all([
    supabase.from("prelaunch_categories").select("id, name, budget").order("name"),
    supabase.from("prelaunch_expenses")
      .select("id, category_id, note, amount, created_at")
      .order("created_at", { ascending: false }),
  ]);
  return {
    categories: (categories ?? []) as Category[],
    expenses: (expenses ?? []) as Expense[],
  };
});

export const Route = createFileRoute("/_authed/prelaunch")({
  staleTime: Infinity,
  loader: () => fetchPrelaunch(),
  component: PreLaunch,
});

function PreLaunch() {
  const { categories, expenses } = Route.useLoaderData();
  const router = useRouter();

  const totalBudget = categories.reduce((s, c) => s + Number(c.budget), 0);
  const totalSpent  = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const pctUsed = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  // ── overall target editing ──────────────────────────────────
  const [editTarget, setEditTarget] = useState(false);
  const [targetVal,  setTargetVal]  = useState("");

  const saveTotalTarget = async () => {
    const next = Number(targetVal);
    if (Number.isNaN(next) || next < 0) return;
    const supabase = getSupabaseBrowserClient();
    if (categories.length === 0) return;
    if (totalBudget === 0) {
      // distribute evenly
      const share = next / categories.length;
      await Promise.all(
        categories.map((c) =>
          supabase.from("prelaunch_categories").update({ budget: share }).eq("id", c.id),
        ),
      );
    } else {
      // scale proportionally
      await Promise.all(
        categories.map((c) =>
          supabase.from("prelaunch_categories")
            .update({ budget: Math.round((Number(c.budget) / totalBudget) * next) })
            .eq("id", c.id),
        ),
      );
    }
    setEditTarget(false);
    router.invalidate();
  };

  // ── category management ─────────────────────────────────────
  const [editCat,   setEditCat]   = useState<{ id: string; name: string } | null>(null);
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [catErr, setCatErr] = useState<string | null>(null);

  const saveCategoryName = async () => {
    if (!editCat?.name.trim()) return;
    const supabase = getSupabaseBrowserClient();
    await supabase.from("prelaunch_categories").update({ name: editCat.name.trim() }).eq("id", editCat.id);
    setEditCat(null);
    router.invalidate();
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("prelaunch_categories")
      .insert({ name: newCatName.trim(), budget: 0 });
    if (error) { setCatErr(error.message); return; }
    setNewCatName(""); setAddingCat(false);
    router.invalidate();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category and all its logged expenses?")) return;
    const supabase = getSupabaseBrowserClient();
    const { error: expErr } = await supabase.from("prelaunch_expenses").delete().eq("category_id", id);
    if (expErr) { setCatErr(expErr.message); return; }
    const { error } = await supabase.from("prelaunch_categories").delete().eq("id", id);
    if (error) { setCatErr(error.message); return; }
    router.invalidate();
  };

  // ── expense logging ─────────────────────────────────────────
  const [amount, setAmount] = useState("");
  const [note,   setNote]   = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [expErr, setExpErr] = useState<string | null>(null);

  const spentByCategory = (catId: string) =>
    expenses.filter((e) => e.category_id === catId).reduce((s, e) => s + Number(e.amount), 0);

  const addExpense = async () => {
    if (!amount || !note || !categoryId) return;
    setSaving(true); setExpErr(null);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("prelaunch_expenses").insert({
      category_id: categoryId,
      note,
      amount: Number(amount),
      logged_by: null,
    });
    setSaving(false);
    if (error) { setExpErr(error.message); return; }
    setAmount(""); setNote("");
    router.invalidate();
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <h1 className="text-xl font-semibold text-slate-900">Pre-launch spending</h1>
        <div className="mt-1 flex items-center gap-2 text-sm">
          <span className="text-slate-500">Total target:</span>
          {editTarget ? (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">₹</span>
              <input
                type="number"
                value={targetVal}
                onChange={(e) => setTargetVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTotalTarget();
                  if (e.key === "Escape") setEditTarget(false);
                }}
                className="w-36 rounded-lg border border-blue-400 px-2 py-0.5 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button type="button" onClick={saveTotalTarget} className="font-medium text-blue-800 hover:text-blue-900">Save</button>
              <button type="button" onClick={() => setEditTarget(false)} className="text-slate-400 hover:text-slate-600">Cancel</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setTargetVal(String(totalBudget)); setEditTarget(true); }}
              className="font-semibold text-slate-900 underline-offset-2 hover:underline"
              title="Click to edit budget target"
            >
              {inr(totalBudget)}
            </button>
          )}
        </div>
      </div>

      <div className="p-8 space-y-5">
        {/* Progress bar */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{inr(totalSpent)} spent</p>
              <p className="text-xs text-slate-500">of {inr(totalBudget)} target</p>
            </div>
            <span className={`text-sm font-semibold ${pctUsed > 90 ? "text-red-600" : "text-slate-900"}`}>
              {pctUsed}%
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-2.5 rounded-full transition-all ${pctUsed > 90 ? "bg-red-500" : "bg-blue-800"}`}
              style={{ width: `${Math.min(100, pctUsed)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* Category list */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Categories</h2>
              <button
                type="button"
                onClick={() => setAddingCat(true)}
                className="text-xs font-medium text-blue-800 hover:text-blue-900"
              >
                + Add category
              </button>
            </div>

            {addingCat && (
              <div className="mb-3 flex gap-2">
                <input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addCategory();
                    if (e.key === "Escape") setAddingCat(false);
                  }}
                  placeholder="Category name…"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm bg-white text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  autoFocus
                />
                <button type="button" onClick={addCategory} className="text-xs font-medium text-blue-800">Add</button>
                <button type="button" onClick={() => setAddingCat(false)} className="text-xs text-slate-400">✕</button>
              </div>
            )}

            {catErr && <p className="mb-2 text-xs text-red-600">{catErr}</p>}

            <div className="space-y-3">
              {categories.map((c) => {
                const spent = spentByCategory(c.id);
                const barPct = totalBudget > 0 ? Math.min(100, Math.round((spent / totalBudget) * 100)) : 0;
                const isEditing = editCat?.id === c.id;
                return (
                  <div key={c.id} className="group">
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <input
                            value={editCat.name}
                            onChange={(e) => setEditCat({ ...editCat, name: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveCategoryName();
                              if (e.key === "Escape") setEditCat(null);
                            }}
                            className="flex-1 rounded border border-blue-300 px-2 py-0.5 text-xs bg-white text-slate-900 outline-none"
                            autoFocus
                          />
                          <button type="button" onClick={saveCategoryName} className="text-xs text-blue-800 font-medium">Save</button>
                          <button type="button" onClick={() => setEditCat(null)} className="text-xs text-slate-400">✕</button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditCat({ id: c.id, name: c.name })}
                            className="flex-1 text-left text-xs text-slate-700 hover:text-blue-800"
                            title="Click to rename"
                          >
                            {c.name}
                          </button>
                          <span className="text-xs font-medium text-slate-900">{inr(spent)}</span>
                          <button
                            type="button"
                            onClick={() => deleteCategory(c.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 text-sm leading-none transition-opacity"
                          >
                            ×
                          </button>
                        </>
                      )}
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-1.5 rounded-full bg-blue-800" style={{ width: `${barPct}%` }} />
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
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
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
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white text-slate-900 outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Note</label>
                  <input
                    placeholder="What was it for?"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white text-slate-900 outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={addExpense}
                disabled={saving || !amount || !note}
                className="w-full rounded-lg bg-blue-800 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-900 disabled:bg-blue-300"
              >
                {saving ? "Saving…" : "Add to log"}
              </button>
              {expErr && <p className="text-xs text-red-600">{expErr}</p>}
            </div>

            {expenses.length > 0 && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-medium text-slate-500">Recent</p>
                <div className="space-y-1.5">
                  {expenses.slice(0, 6).map((e) => {
                    const cat = categories.find((c) => c.id === e.category_id);
                    return (
                      <div key={e.id} className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-slate-700 truncate">{e.note}</p>
                          {cat && <p className="text-[10px] text-slate-400">{cat.name}</p>}
                        </div>
                        <span className="shrink-0 text-xs font-medium text-slate-900">{inr(Number(e.amount))}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
