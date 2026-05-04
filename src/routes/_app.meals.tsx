import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useSelectedCycle } from "@/lib/cycle-store";
import { CycleSelector, useCycles } from "@/components/CycleSelector";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/meals")({
  component: MealsPage,
});

type Profile = { id: string; name: string };
type MealRow = { user_id: string; date: string; meal_count: number };

function MealsPage() {
  const { user, role } = useAuth();
  const { cycles } = useCycles();
  const [selected] = useSelectedCycle();
  const isAdmin = role === "admin";

  const cycle = cycles.find((c) => c.id === selected);

  const [users, setUsers] = useState<Profile[]>([]);
  // map key: `${userId}|${date}` -> string (so empty input is allowed transiently)
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const dates = useMemo(() => {
    if (!cycle) return [];
    return eachDayOfInterval({
      start: parseISO(cycle.start_date),
      end: parseISO(cycle.end_date),
    });
  }, [cycle]);

  // Load profiles + existing meals
  useEffect(() => {
    if (!selected || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const profilesQ = isAdmin
        ? supabase.from("profiles").select("id, name").order("name")
        : supabase.from("profiles").select("id, name").eq("id", user.id);
      const mealsQ = supabase
        .from("meals")
        .select("user_id, date, meal_count")
        .eq("cycle_id", selected);

      const [{ data: profs }, { data: mealRows }] = await Promise.all([profilesQ, mealsQ]);
      if (cancelled) return;

      const list = (profs ?? []) as Profile[];
      setUsers(list);

      const map: Record<string, string> = {};
      (mealRows ?? []).forEach((m: MealRow) => {
        map[`${m.user_id}|${m.date}`] = String(Number(m.meal_count));
      });
      setValues(map);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, user, isAdmin]);

  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const persist = (userId: string, date: string, raw: string) => {
    const key = `${userId}|${date}`;
    const num = Number(raw === "" ? 0 : raw);
    if (Number.isNaN(num) || num < 0) {
      toast.error("Invalid meal count");
      return;
    }
    setSaving((s) => ({ ...s, [key]: true }));
    supabase
      .from("meals")
      .upsert(
        {
          user_id: userId,
          cycle_id: selected!,
          date,
          meal_count: num,
        },
        { onConflict: "user_id,cycle_id,date" },
      )
      .then(({ error }) => {
        setSaving((s) => {
          const n = { ...s };
          delete n[key];
          return n;
        });
        if (error) toast.error(error.message);
      });
  };

  const onChange = (userId: string, date: string, raw: string) => {
    // Only digits + optional single dot (numbers)
    if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
    const key = `${userId}|${date}`;
    setValues((v) => ({ ...v, [key]: raw }));

    // Only the owner (or admin) can save (RLS will also enforce)
    if (!isAdmin && userId !== user?.id) return;

    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(() => persist(userId, date, raw), 500);
  };

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    users.forEach((u) => {
      let sum = 0;
      dates.forEach((d) => {
        const v = values[`${u.id}|${format(d, "yyyy-MM-dd")}`];
        if (v) sum += Number(v) || 0;
      });
      t[u.id] = sum;
    });
    return t;
  }, [values, users, dates]);

  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

  return (
    <div>
      <PageHeader
        title="Meals"
        description={
          isAdmin
            ? "Daily meal grid for all members. Click a cell to edit — autosaves."
            : "Your daily meal entries — autosaves on change."
        }
        actions={<CycleSelector />}
      />

      {!selected ? (
        <Card className="p-8 text-center text-muted-foreground">
          Select a billing cycle to enter meals.
        </Card>
      ) : loading ? (
        <Card className="p-8 text-center text-muted-foreground">Loading…</Card>
      ) : users.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No members found.</Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-20 bg-muted/80 backdrop-blur">
                <tr>
                  <th className="sticky left-0 z-30 bg-muted/95 px-3 py-2 text-left font-medium border-b border-r border-border min-w-[110px]">
                    Date
                  </th>
                  {users.map((u) => (
                    <th
                      key={u.id}
                      className="px-3 py-2 text-center font-medium border-b border-border min-w-[90px]"
                    >
                      {u.name}
                      {u.id === user?.id && (
                        <span className="ml-1 text-xs text-primary">(you)</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dates.map((d) => {
                  const ds = format(d, "yyyy-MM-dd");
                  return (
                    <tr key={ds} className="border-b border-border hover:bg-muted/30">
                      <td className="sticky left-0 z-10 bg-background px-3 py-1.5 font-medium border-r border-border whitespace-nowrap">
                        {format(d, "MMM d")}
                      </td>
                      {users.map((u) => {
                        const key = `${u.id}|${ds}`;
                        const editable = isAdmin || u.id === user?.id;
                        return (
                          <td key={u.id} className="p-1 text-center">
                            <input
                              type="text"
                              inputMode="decimal"
                              disabled={!editable}
                              value={values[key] ?? ""}
                              placeholder="0"
                              onChange={(e) => onChange(u.id, ds, e.target.value)}
                              onBlur={(e) => {
                                if (!editable) return;
                                const k = key;
                                if (debounceRef.current[k]) {
                                  clearTimeout(debounceRef.current[k]);
                                  delete debounceRef.current[k];
                                }
                                persist(u.id, ds, e.target.value);
                              }}
                              className={cn(
                                "w-16 h-8 rounded-md bg-transparent border border-input text-center tabular-nums",
                                "focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
                                "disabled:opacity-60 disabled:cursor-not-allowed",
                                saving[key] && "border-primary",
                              )}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="sticky bottom-0 z-20 bg-muted/90 backdrop-blur">
                <tr>
                  <td className="sticky left-0 z-30 bg-muted/95 px-3 py-2 font-semibold border-t border-r border-border">
                    Total {grandTotal > 0 && <span className="text-muted-foreground font-normal">({grandTotal.toFixed(2)})</span>}
                  </td>
                  {users.map((u) => (
                    <td
                      key={u.id}
                      className="px-3 py-2 text-center font-semibold tabular-nums border-t border-border"
                    >
                      {totals[u.id]?.toFixed(2) ?? "0.00"}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
