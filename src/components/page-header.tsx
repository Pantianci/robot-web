import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  badge
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  badge?: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/80 bg-gradient-to-r from-surface-100 to-white px-6 py-6 shadow-soft">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-surface-700">{eyebrow}</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-surface-900">
              {title}
            </h1>
            {badge ? <Badge>{badge}</Badge> : null}
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
