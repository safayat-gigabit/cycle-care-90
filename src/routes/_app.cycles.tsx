import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCycles } from "@/components/CycleSelector";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/cycles")({
  component: CyclesPage,
});

function CyclesPage() {
  const { role } = useAuth();
  const { cycles, reload } = useCycles();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const isAdmin = role === "admin";

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("billing_cycles").insert({ name, start_date: start, end_date: end });
    if (error) toast.error(error.message);
    else { toast.success("Cycle created"); setOpen(false); setName(""); setStart(""); setEnd(""); reload(); }
  };

  const setActive = async (id: string) => {
    await supabase.from("billing_cycles").update({ is_active: false }).neq("id", id);
    const { error } = await supabase.from("billing_cycles").update({ is_active: true }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Set as active"); reload(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this cycle and all its data?")) return;
    const { error } = await supabase.from("billing_cycles").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); reload(); }
  };

  return (
    <div>
      <PageHeader
        title="Billing Cycles"
        description="Each meal/bazar/deposit entry belongs to one cycle"
        actions={isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New cycle</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create billing cycle</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-4">
                <div><Label>Name</Label><Input value={name} onChange={e=>setName(e.target.value)} placeholder="May 2026 Mess" required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Start date</Label><Input type="date" value={start} onChange={e=>setStart(e.target.value)} required /></div>
                  <div><Label>End date</Label><Input type="date" value={end} onChange={e=>setEnd(e.target.value)} required /></div>
                </div>
                <DialogFooter><Button type="submit">Create</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />
      <div className="grid gap-3">
        {cycles.length === 0 && <Card className="p-8 text-center text-muted-foreground">No cycles yet</Card>}
        {cycles.map(c => (
          <Card key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">{c.name}</h3>
                {c.is_active && <Badge className="bg-success text-success-foreground">Active</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {format(new Date(c.start_date), "MMM d, yyyy")} → {format(new Date(c.end_date), "MMM d, yyyy")}
              </p>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                {!c.is_active && (
                  <Button variant="outline" size="sm" onClick={() => setActive(c.id)}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Set active
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => remove(c.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
