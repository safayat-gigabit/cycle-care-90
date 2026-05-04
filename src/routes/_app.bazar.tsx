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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/bazar")({
  component: BazarPage,
});

type BazarRow = { id: string; date: string; amount: number; item_list: string | null; buyer_id: string; buyer?: { name: string } };
type Profile = { id: string; name: string };

function BazarPage() {
  const { user, role } = useAuth();
  const { cycles } = useCycles();
  const [selected] = useSelectedCycle();
  const [rows, setRows] = useState<BazarRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [amount, setAmount] = useState("");
  const [items, setItems] = useState("");
  const [buyer, setBuyer] = useState<string | undefined>(user?.id);
  const isAdmin = role === "admin";
  const cycle = cycles.find(c => c.id === selected);

  const reload = async () => {
    if (!selected) return;
    const { data } = await supabase.from("bazar")
      .select("id, date, amount, item_list, buyer_id, profiles!bazar_buyer_id_fkey(name)")
      .eq("cycle_id", selected).order("date", { ascending: false });
    setRows((data ?? []).map((r: any) => ({ ...r, buyer: r.profiles })));
  };

  useEffect(() => {
    reload();
    supabase.from("profiles").select("id, name").order("name").then(({ data }) => setProfiles(data ?? []));
  }, [selected]);

  useEffect(() => { if (!buyer && user) setBuyer(user.id); }, [user, buyer]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !buyer) return;
    const { error } = await supabase.from("bazar").insert({
      cycle_id: selected, date, amount: Number(amount), item_list: items || null, buyer_id: buyer,
    });
    if (error) toast.error(error.message);
    else { toast.success("Bazar added"); setOpen(false); setAmount(""); setItems(""); reload(); }
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("bazar").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); reload(); }
  };

  return (
    <div>
      <PageHeader
        title="Bazar"
        description="Daily market expenses"
        actions={
          <div className="flex flex-wrap gap-2 items-center">
            <CycleSelector />
            {selected && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add bazar entry</DialogTitle></DialogHeader>
                  <form onSubmit={add} className="space-y-4">
                    <div>
                      <Label>Date</Label>
                      <Input type="date" value={date} onChange={e=>setDate(e.target.value)}
                        min={cycle?.start_date} max={cycle?.end_date} required />
                    </div>
                    <div>
                      <Label>Amount (৳)</Label>
                      <Input type="number" step="0.01" min="0" value={amount} onChange={e=>setAmount(e.target.value)} required />
                    </div>
                    <div>
                      <Label>Buyer</Label>
                      <Select value={buyer} onValueChange={setBuyer}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Items (optional)</Label>
                      <Textarea value={items} onChange={e=>setItems(e.target.value)} placeholder="Rice, oil, vegetables…" />
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
              <th className="px-4 py-3 font-medium">Buyer</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No bazar entries</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3">{format(new Date(r.date), "MMM d, yyyy")}</td>
                <td className="px-4 py-3">{r.buyer?.name ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground max-w-[260px] truncate">{r.item_list ?? "—"}</td>
                <td className="px-4 py-3 font-medium tabular-nums text-right">৳{Number(r.amount).toFixed(2)}</td>
                <td className="px-4 py-3 text-right">
                  {isAdmin && <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
