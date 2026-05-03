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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/deposits")({
  component: DepositsPage,
});

type DepRow = { id: string; date: string; amount: number; user_id: string; profile?: { name: string } };
type Profile = { id: string; name: string };

function DepositsPage() {
  const { user, role } = useAuth();
  const { cycles } = useCycles();
  const [selected] = useSelectedCycle();
  const [rows, setRows] = useState<DepRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [amount, setAmount] = useState("");
  const [forUser, setForUser] = useState<string | undefined>(user?.id);
  const isAdmin = role === "admin";
  const cycle = cycles.find(c => c.id === selected);

  const reload = async () => {
    if (!selected) return;
    const { data } = await supabase.from("deposits")
      .select("id, date, amount, user_id, profiles(name)")
      .eq("cycle_id", selected).order("date", { ascending: false });
    setRows((data ?? []).map((r: any) => ({ ...r, profile: r.profiles })));
  };
  useEffect(() => {
    reload();
    supabase.from("profiles").select("id, name").order("name").then(({ data }) => setProfiles(data ?? []));
  }, [selected]);
  useEffect(() => { if (!forUser && user) setForUser(user.id); }, [user, forUser]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const target = isAdmin ? forUser : user!.id;
    const { error } = await supabase.from("deposits").insert({
      cycle_id: selected, user_id: target!, date, amount: Number(amount),
    });
    if (error) toast.error(error.message);
    else { toast.success("Deposit added"); setOpen(false); setAmount(""); reload(); }
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("deposits").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); reload(); }
  };

  return (
    <div>
      <PageHeader
        title="Deposits"
        description="Money deposited by members"
        actions={
          <div className="flex gap-2">
            <CycleSelector />
            {selected && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add deposit</DialogTitle></DialogHeader>
                  <form onSubmit={add} className="space-y-4">
                    {isAdmin && (
                      <div>
                        <Label>Member</Label>
                        <Select value={forUser} onValueChange={setForUser}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )}
                    <div>
                      <Label>Date</Label>
                      <Input type="date" value={date} onChange={e=>setDate(e.target.value)}
                        min={cycle?.start_date} max={cycle?.end_date} required />
                    </div>
                    <div>
                      <Label>Amount (৳)</Label>
                      <Input type="number" step="0.01" min="0" value={amount} onChange={e=>setAmount(e.target.value)} required />
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
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No deposits</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3">{format(new Date(r.date), "MMM d, yyyy")}</td>
                <td className="px-4 py-3">{r.profile?.name ?? "—"}</td>
                <td className="px-4 py-3 font-medium tabular-nums text-right text-success">৳{Number(r.amount).toFixed(2)}</td>
                <td className="px-4 py-3 text-right">
                  {(isAdmin || r.user_id === user?.id) && (
                    <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
