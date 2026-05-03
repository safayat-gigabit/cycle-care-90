import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useSelectedCycle } from "@/lib/cycle-store";
import { useCycles, CycleSelector } from "@/components/CycleSelector";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { UtensilsCrossed, ShoppingBasket, Wallet, TrendingUp, Plus } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

type Stats = { totalMeals: number; totalBazar: number; totalExtra: number; myMeals: number; myDeposit: number; cycleName: string };

function Dashboard() {
  const { user, profile, role } = useAuth();
  const { cycles } = useCycles();
  const [selected] = useSelectedCycle();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selected || !user) return;
    setLoading(true);
    (async () => {
      const cycle = cycles.find(c => c.id === selected);
      const [meals, bazar, extra, myMeals, myDeposits] = await Promise.all([
        supabase.from("meals").select("meal_count").eq("cycle_id", selected),
        supabase.from("bazar").select("amount").eq("cycle_id", selected),
        supabase.from("extra_costs").select("amount").eq("cycle_id", selected),
        supabase.from("meals").select("meal_count").eq("cycle_id", selected).eq("user_id", user.id),
        supabase.from("deposits").select("amount").eq("cycle_id", selected).eq("user_id", user.id),
      ]);
      setStats({
        totalMeals: (meals.data ?? []).reduce((s, r) => s + Number(r.meal_count), 0),
        totalBazar: (bazar.data ?? []).reduce((s, r) => s + Number(r.amount), 0),
        totalExtra: (extra.data ?? []).reduce((s, r) => s + Number(r.amount), 0),
        myMeals: (myMeals.data ?? []).reduce((s, r) => s + Number(r.meal_count), 0),
        myDeposit: (myDeposits.data ?? []).reduce((s, r) => s + Number(r.amount), 0),
        cycleName: cycle?.name ?? "",
      });
      setLoading(false);
    })();
  }, [selected, user, cycles]);

  const totalExpense = (stats?.totalBazar ?? 0) + (stats?.totalExtra ?? 0);
  const perMeal = stats && stats.totalMeals > 0 ? totalExpense / stats.totalMeals : 0;
  const myCost = stats ? stats.myMeals * perMeal : 0;
  const balance = stats ? stats.myDeposit - myCost : 0;

  return (
    <div>
      <PageHeader
        title={`Hi, ${profile?.name ?? "there"} 👋`}
        description="Your mess at a glance"
        actions={<CycleSelector />}
      />

      {!cycles.length && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">No billing cycle yet. {role === "admin" ? "Create one to get started." : "Ask your admin to create a cycle."}</p>
          {role === "admin" && (
            <Link to="/cycles" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90">
              <Plus className="h-4 w-4" /> Create cycle
            </Link>
          )}
        </Card>
      )}

      {selected && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={UtensilsCrossed} label="Total meals" value={stats?.totalMeals.toFixed(2) ?? "—"} loading={loading} />
            <StatCard icon={ShoppingBasket} label="Total bazar" value={`৳${(stats?.totalBazar ?? 0).toFixed(0)}`} loading={loading} />
            <StatCard icon={Plus} label="Extra costs" value={`৳${(stats?.totalExtra ?? 0).toFixed(0)}`} loading={loading} />
            <StatCard icon={TrendingUp} label="Per meal cost" value={`৳${perMeal.toFixed(2)}`} loading={loading} accent />
          </div>

          <Card className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" /> Your hisab — {stats?.cycleName}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Mini label="Your meals" value={(stats?.myMeals ?? 0).toFixed(2)} />
              <Mini label="Your meal cost" value={`৳${myCost.toFixed(2)}`} />
              <Mini label="Your deposit" value={`৳${(stats?.myDeposit ?? 0).toFixed(2)}`} />
              <Mini
                label="Balance"
                value={`৳${balance.toFixed(2)}`}
                color={balance >= 0 ? "text-success" : "text-destructive"}
                hint={balance >= 0 ? "Will receive" : "Need to pay"}
              />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, loading, accent }: { icon: any; label: string; value: string; loading?: boolean; accent?: boolean }) {
  return (
    <Card className={`p-4 ${accent ? "bg-gradient-primary text-primary-foreground border-transparent" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-medium ${accent ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{label}</span>
        <Icon className={`h-4 w-4 ${accent ? "text-primary-foreground/80" : "text-muted-foreground"}`} />
      </div>
      <div className="text-2xl font-bold tabular-nums">
        {loading ? <span className="opacity-50">…</span> : value}
      </div>
    </Card>
  );
}

function Mini({ label, value, color, hint }: { label: string; value: string; color?: string; hint?: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${color ?? ""}`}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}
