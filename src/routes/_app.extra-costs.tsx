import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedCycle } from "@/lib/cycle-store";
import { CycleSelector } from "@/components/CycleSelector";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/extra-costs")({
  component: ExtraCostsPage,
});

type Row = { id: string; title: string; amount: number };

function ExtraCostsPage() {
  const { role } = useAuth();
  const [selected] = useSelectedCycle();
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const isAdmin = role === "admin";

  const reload = async () => {
    if (!selected) return;
    const { data } = await supabase.from("extra_costs").select("id, title, amount").eq("cycle_id", selected).order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]);
  };
  useEffect(() => { reload(); }, [selected]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const { error } = await supabase.from("extra_costs").insert({ cycle_id: selected, title, amount: Number(amount) });
    if (error) toast.error(error.message);
    else { toast.success("Added"); setOpen(false); setTitle(""); setAmount(""); reload(); }
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("extra_costs").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); reload(); }
  };

  return (
    <div>
      <PageHeader
        title="Extra Costs"
        description="Shared expenses like room rent, bua bill, gas"
        actions={
          <div className="flex gap-2">
            <CycleSelector />
            {isAdmin && selected && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add extra cost</DialogTitle></DialogHeader>
                  <form onSubmit={add} className="space-y-4">
                    <div><Label>Title</Label><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Room rent" required /></div>
                    <div><Label>Amount (৳)</Label><Input type="number" step="0.01" min="0" value={amount} onChange={e=>setAmount(e.target.value)} required /></div>
                    <DialogFooter><Button type="submit">Add</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.length === 0 && <Card className="p-8 text-center text-muted-foreground sm:col-span-2 lg:col-span-3">No extra costs</Card>}
        {rows.map(r => (
          <Card key={r.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{r.title}</div>
              <div className="text-2xl font-bold tabular-nums mt-1">৳{Number(r.amount).toFixed(2)}</div>
            </div>
            {isAdmin && <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
          </Card>
        ))}
      </div>
    </div>
  );
}
