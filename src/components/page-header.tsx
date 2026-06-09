import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type PageBreadcrumbItem = {
  label: ReactNode;
  to?: string;
  onClick?: () => void;
  active?: boolean;
};

export function PageBreadcrumbs({
  items,
  className
}: {
  items: PageBreadcrumbItem[];
  className?: string;
}) {
  return (
    <nav
      aria-label="页面路径"
      className={cn("flex flex-wrap items-center gap-2 text-sm font-medium text-surface-700", className)}
    >
      {items.map((item, index) => {
        const key = `${index}-${typeof item.label === "string" ? item.label : "breadcrumb"}`;
        const content = item.active ? (
          <span className="font-semibold text-primary">{item.label}</span>
        ) : item.onClick ? (
          <button
            type="button"
            className="transition hover:text-primary"
            onClick={item.onClick}
          >
            {item.label}
          </button>
        ) : item.to ? (
          <Link to={item.to as never} className="transition hover:text-primary">
            {item.label}
          </Link>
        ) : (
          <span>{item.label}</span>
        );

        return (
          <div key={key} className="flex items-center gap-2">
            {content}
            {index < items.length - 1 ? <span className="text-surface-400">&gt;</span> : null}
          </div>
        );
      })}
    </nav>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  badge,
  sticky = true,
  className
}: {
  eyebrow: ReactNode;
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
          <div className="text-sm font-medium text-surface-700">{eyebrow}</div>
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
