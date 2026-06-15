import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/users")({
  component: UsersPage,
});

type Row = { id: string; name: string; phone: string; role: string; is_active: boolean };

function UsersPage() {
  const { role: myRole, user } = useAuth();
  const isAdmin = myRole === "admin";
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [editRole, setEditRole] = useState("user");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, name, phone, is_active").order("name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const roleMap = new Map((roles ?? []).map(r => [r.user_id, r.role]));
    setRows((profiles ?? []).map(p => ({ ...p, role: roleMap.get(p.id) ?? "user" })) as Row[]);
  };

  useEffect(() => { load(); }, []);

  const openEdit = (r: Row) => {
    setEditing(r);
    setName(r.name);
    setPhone(r.phone);
    setEditRole(r.role);
    setActive(r.is_active);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const { error: pErr } = await supabase
      .from("profiles")
      .update({ name, phone, is_active: active })
      .eq("id", editing.id);
    if (pErr) { toast.error(pErr.message); setSaving(false); return; }

    if (editRole !== editing.role) {
      await supabase.from("user_roles").delete().eq("user_id", editing.id);
      const { error: rErr } = await supabase
        .from("user_roles")
        .insert({ user_id: editing.id, role: editRole as "admin" | "user" });
      if (rErr) { toast.error(rErr.message); setSaving(false); return; }
    }
    setSaving(false);
    toast.success("Member updated");
    setEditing(null);
    load();
  };

  const toggleActive = async (r: Row) => {
    const { error } = await supabase.from("profiles").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) toast.error(error.message);
    else { toast.success(r.is_active ? "Marked inactive" : "Marked active"); load(); }
  };

  return (
    <div>
      <PageHeader title="Members" description="Everyone in your mess" />
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Phone</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {isAdmin && <th className="px-4 py-3 font-medium text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No members</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className={cn("border-t border-border", !r.is_active && "opacity-60")}>
                <td className="px-4 py-3 font-medium">
                  {r.name}
                  <div className="text-xs text-muted-foreground sm:hidden">{r.phone}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{r.phone}</td>
                <td className="px-4 py-3">
                  <Badge variant={r.role === "admin" ? "default" : "secondary"} className={r.role === "admin" ? "bg-primary text-primary-foreground" : ""}>
                    {r.role}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={r.is_active ? "border-success text-success" : "border-muted-foreground text-muted-foreground"}>
                    {r.is_active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={r.id === user?.id}
                        onClick={() => toggleActive(r)}
                      >
                        {r.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit member</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
            <div><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} required /></div>
            <div>
              <Label>Role</Label>
              <Select value={editRole} onValueChange={setEditRole} disabled={editing?.id === user?.id}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Inactive members are kept but flagged</p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} disabled={editing?.id === user?.id} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
