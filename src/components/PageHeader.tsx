import type { ReactNode } from "react";

export function PageHeader({
  title, description, actions,
}: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h1 className="text-xl md:text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground text-xs sm:text-sm mt-1">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 items-center">{actions}</div>}
    </div>
  );
}
