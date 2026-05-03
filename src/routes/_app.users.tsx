import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/users")({
  component: UsersPage,
});

type Row = { id: string; name: string; phone: string; role: string };

function UsersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    (async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, name, phone").order("name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const roleMap = new Map((roles ?? []).map(r => [r.user_id, r.role]));
      setRows((profiles ?? []).map(p => ({ ...p, role: roleMap.get(p.id) ?? "user" })));
    })();
  }, []);
  return (
    <div>
      <PageHeader title="Members" description="Everyone in your mess" />
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No members</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.phone}</td>
                <td className="px-4 py-3">
                  <Badge variant={r.role === "admin" ? "default" : "secondary"} className={r.role === "admin" ? "bg-primary text-primary-foreground" : ""}>
                    {r.role}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
