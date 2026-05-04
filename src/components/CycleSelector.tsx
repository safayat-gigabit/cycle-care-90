import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedCycle } from "@/lib/cycle-store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarRange } from "lucide-react";

export type Cycle = { id: string; name: string; start_date: string; end_date: string; is_active: boolean };

export function useCycles() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = async () => {
    setLoading(true);
    const { data } = await supabase.from("billing_cycles").select("*").order("start_date", { ascending: false });
    setCycles((data ?? []) as Cycle[]);
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);
  return { cycles, loading, reload };
}

export function CycleSelector() {
  const { cycles } = useCycles();
  const [selected, setSelected] = useSelectedCycle();

  useEffect(() => {
    if (!selected && cycles.length) {
      const active = cycles.find(c => c.is_active) ?? cycles[0];
      setSelected(active.id);
    }
  }, [cycles, selected, setSelected]);

  if (!cycles.length) return (
    <div className="text-sm text-muted-foreground flex items-center gap-2">
      <CalendarRange className="h-4 w-4" /> No billing cycle yet
    </div>
  );

  return (
    <div className="flex items-center gap-2 min-w-0">
      <CalendarRange className="h-4 w-4 text-muted-foreground shrink-0" />
      <Select value={selected ?? undefined} onValueChange={(v) => setSelected(v)}>
        <SelectTrigger className="w-full sm:w-[220px] max-w-[220px]"><SelectValue placeholder="Select cycle" /></SelectTrigger>
        <SelectContent>
          {cycles.map(c => (
            <SelectItem key={c.id} value={c.id}>
              {c.name} {c.is_active && "•"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
