import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useSelectedCycle } from "@/lib/cycle-store";
import { CycleSelector, useCycles } from "@/components/CycleSelector";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/meals")({
  component: MealsPage,
});

type MealRow = { id: string; date: string; meal_count: number; user_id: string; profile?: { name: string } };

function MealsPage() {
  const { user, role } = useAuth();
  const { cycles } = useCycles();
  const [selected] = useSelectedCycle();
  const [meals, setMeals] = useState<MealRow[]>([]);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [count, setCount] = useState("1");
  const isAdmin = role === "admin";

  const cycle = cycles.find(c => c.id === selected);

  const reload = async () => {
    if (!selected) return;
    const q = supabase.from("meals")
      .select("id, date, meal_count, user_id, profiles(name)")
      .eq("cycle_id", selected)
      .order("date", { ascending: false });
    const { data } = isAdmin ? await q : await q.eq("user_id", user!.id);
    setMeals((data ?? []).map((r: any) => ({ ...r, profile: r.profiles })));
  };
  useEffect(() => { reload(); }, [selected, user, isAdmin]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !user) return;
    const { error } = await supabase.from("meals").insert({
      user_id: user.id, cycle_id: selected, date, meal_count: Number(count),
    });
    if (error) toast.error(error.message.includes("duplicate") ? "You already have an entry for this date" : error.message);
    else { toast.success("Meal added"); setOpen(false); setCount("1"); reload(); }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("meals").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); reload(); }
  };

  return (
    <div>
      <PageHeader
        title="Meals"
        description={isAdmin ? "All members' daily meal entries" : "Your daily meal entries"}
        actions={
          <div className="flex gap-2">
            <CycleSelector />
            {selected && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add meal entry</DialogTitle></DialogHeader>
                  <form onSubmit={add} className="space-y-4">
                    <div>
                      <Label>Date</Label>
                      <Input type="date" value={date} onChange={e=>setDate(e.target.value)}
                        min={cycle?.start_date} max={cycle?.end_date} required />
                    </div>
                    <div>
                      <Label>Meal count</Label>
                      <Input type="number" step="0.5" min="0" value={count} onChange={e=>setCount(e.target.value)} required />
                    </div>
                    <DialogFooter><Button type="submit">Add</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Date</th>
              {isAdmin && <th className="px-4 py-3 font-medium">Member</th>}
              <th className="px-4 py-3 font-medium">Meals</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {meals.length === 0 && (
              <tr><td colSpan={isAdmin ? 4 : 3} className="px-4 py-8 text-center text-muted-foreground">No meal entries</td></tr>
            )}
            {meals.map(m => (
              <tr key={m.id} className="border-t border-border">
                <td className="px-4 py-3">{format(new Date(m.date), "MMM d, yyyy")}</td>
                {isAdmin && <td className="px-4 py-3">{m.profile?.name ?? "—"}</td>}
                <td className="px-4 py-3 font-medium tabular-nums">{Number(m.meal_count).toFixed(2)}</td>
                <td className="px-4 py-3 text-right">
                  {(isAdmin || m.user_id === user?.id) && (
                    <Button variant="ghost" size="icon" onClick={() => remove(m.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
