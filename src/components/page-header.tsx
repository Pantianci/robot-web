import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  badge,
  sticky = true,
  className
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  badge?: string;
  sticky?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.75rem] border border-white/85 bg-[linear-gradient(90deg,rgba(241,247,255,0.96),rgba(255,255,255,0.96))] px-6 py-6 shadow-soft backdrop-blur",
        sticky && "sticky top-0 z-20 shrink-0",
        className
      )}
    >
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
