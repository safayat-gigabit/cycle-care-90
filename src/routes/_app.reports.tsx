import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedCycle } from "@/lib/cycle-store";
import { CycleSelector, useCycles } from "@/components/CycleSelector";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

export const Route = createFileRoute("/_app/reports")({
  component: ReportsPage,
});

type UserReport = { id: string; name: string; meals: number; deposit: number; cost: number; balance: number };

function ReportsPage() {
  const { cycles } = useCycles();
  const [selected] = useSelectedCycle();
  const [report, setReport] = useState<{
    totalMeals: number; totalBazar: number; totalExtra: number; perMeal: number; users: UserReport[];
  } | null>(null);

  const cycle = cycles.find(c => c.id === selected);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      const [profiles, meals, bazar, extra, deposits] = await Promise.all([
        supabase.from("profiles").select("id, name").order("name"),
        supabase.from("meals").select("user_id, meal_count").eq("cycle_id", selected),
        supabase.from("bazar").select("amount").eq("cycle_id", selected),
        supabase.from("extra_costs").select("amount").eq("cycle_id", selected),
        supabase.from("deposits").select("user_id, amount").eq("cycle_id", selected),
      ]);
      const totalMeals = (meals.data ?? []).reduce((s, r) => s + Number(r.meal_count), 0);
      const totalBazar = (bazar.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
      const totalExtra = (extra.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
      const perMeal = totalMeals > 0 ? (totalBazar + totalExtra) / totalMeals : 0;

      const mealMap = new Map<string, number>();
      (meals.data ?? []).forEach(m => mealMap.set(m.user_id, (mealMap.get(m.user_id) ?? 0) + Number(m.meal_count)));
      const depMap = new Map<string, number>();
      (deposits.data ?? []).forEach(d => depMap.set(d.user_id, (depMap.get(d.user_id) ?? 0) + Number(d.amount)));

      const users: UserReport[] = (profiles.data ?? []).map(p => {
        const m = mealMap.get(p.id) ?? 0;
        const d = depMap.get(p.id) ?? 0;
        const cost = m * perMeal;
        return { id: p.id, name: p.name, meals: m, deposit: d, cost, balance: d - cost };
      });

      setReport({ totalMeals, totalBazar, totalExtra, perMeal, users });
    })();
  }, [selected]);

  const totalExpense = (report?.totalBazar ?? 0) + (report?.totalExtra ?? 0);

  return (
    <div>
      <PageHeader
        title="Report"
        description={cycle ? `Hisab for ${cycle.name}` : "Select a cycle"}
        actions={<CycleSelector />}
      />
      {!report && selected && <Card className="p-8 text-center text-muted-foreground">Loading…</Card>}
      {report && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Summary label="Total meals" value={report.totalMeals.toFixed(2)} />
            <Summary label="Total bazar" value={`৳${report.totalBazar.toFixed(2)}`} />
            <Summary label="Extra costs" value={`৳${report.totalExtra.toFixed(2)}`} />
            <Summary label="Per meal cost" value={`৳${report.perMeal.toFixed(2)}`} accent />
          </div>
          <Card className="p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-sm text-muted-foreground">Total expense</div>
              <div className="text-2xl font-bold tabular-nums">৳{totalExpense.toFixed(2)}</div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-border font-semibold">Per-member hisab</div>
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium text-right">Meals</th>
                  <th className="px-4 py-3 font-medium text-right">Meal cost</th>
                  <th className="px-4 py-3 font-medium text-right">Deposit</th>
                  <th className="px-4 py-3 font-medium text-right">Balance</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.users.map(u => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{u.meals.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">৳{u.cost.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-success">৳{u.deposit.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${u.balance >= 0 ? "text-success" : "text-destructive"}`}>
                      ৳{u.balance.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      {u.balance >= 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-success"><ArrowDownCircle className="h-3.5 w-3.5" /> Will receive</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-destructive"><ArrowUpCircle className="h-3.5 w-3.5" /> Need to pay</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}

function Summary({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className={`p-4 ${accent ? "bg-gradient-primary text-primary-foreground border-transparent shadow-glow" : ""}`}>
      <div className={`text-xs ${accent ? "text-primary-foreground/80" : "text-muted-foreground"} mb-1`}>{label}</div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
    </Card>
  );
}
