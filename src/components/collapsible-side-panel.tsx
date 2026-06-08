import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function CollapsibleSidePanel({
  children,
  label = "详情",
  defaultCollapsed = true,
  widthClassName = "w-full xl:w-[360px]",
  className
}: {
  children: ReactNode;
  label?: string;
  defaultCollapsed?: boolean;
  widthClassName?: string;
  className?: string;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className={cn("flex min-h-0 h-full items-stretch gap-3", className)}>
      <Button
        type="button"
        variant="outline"
        className="flex h-full w-11 shrink-0 flex-col items-center justify-center gap-3 rounded-[1.25rem] border-border/70 bg-white px-2 py-4 text-surface-600 shadow-none hover:bg-surface-50"
        onClick={() => setCollapsed((current) => !current)}
      >
        {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span className="-rotate-90 whitespace-nowrap text-[11px] font-medium tracking-[0.2em] text-muted-foreground">
          {label}
        </span>
      </Button>

      {!collapsed ? <div className={cn("min-h-0 flex-1", widthClassName)}>{children}</div> : null}
    </div>
  );
}

export function CollapsibleSplitLayout({
  main,
  side,
  label = "详情",
  className,
  mainClassName,
  sideWidthClassName = "w-full xl:w-[360px]",
  defaultCollapsed = true
}: {
  main: ReactNode;
  side: ReactNode;
  label?: string;
  className?: string;
  mainClassName?: string;
  sideWidthClassName?: string;
  defaultCollapsed?: boolean;
}) {
  return (
    <div className={cn("grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_auto]", className)}>
      <div className={cn("min-h-0", mainClassName)}>{main}</div>
      <CollapsibleSidePanel
        label={label}
        widthClassName={sideWidthClassName}
        defaultCollapsed={defaultCollapsed}
      >
        {side}
      </CollapsibleSidePanel>
    </div>
  );
}
