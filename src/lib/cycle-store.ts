// Lightweight global selected-cycle store (localStorage backed) shared across pages.
import { useEffect, useState } from "react";

const KEY = "mm_selected_cycle";
const listeners = new Set<(v: string | null) => void>();

export function getSelectedCycle(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}
export function setSelectedCycle(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(KEY, id);
  else localStorage.removeItem(KEY);
  listeners.forEach((l) => l(id));
}
export function useSelectedCycle() {
  const [id, setId] = useState<string | null>(() => getSelectedCycle());
  useEffect(() => {
    const fn = (v: string | null) => setId(v);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return [id, setSelectedCycle] as const;
}
