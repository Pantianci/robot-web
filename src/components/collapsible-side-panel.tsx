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
    <div className={cn("relative min-h-0", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={collapsed ? `展开${label}` : `折叠${label}`}
        className="absolute right-2 top-2 z-20 h-8 w-8 rounded-full border-border/70 bg-white text-surface-600 shadow-sm hover:bg-surface-50"
        onClick={() => setCollapsed((current) => !current)}
      >
        {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </Button>

      {!collapsed ? <div className={cn("min-h-0 [&>*]:h-full [&>*]:min-h-0", widthClassName)}>{children}</div> : null}
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
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (side == null) {
    return (
      <div className={cn("min-h-0 flex-1 [&>*]:h-full [&>*]:min-h-0", className, mainClassName)}>
        {main}
      </div>
    );
  }

  return (
    <div className={cn("relative min-h-0 flex-1", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={collapsed ? `展开${label}` : `折叠${label}`}
        className="absolute right-2 top-2 z-20 h-8 w-8 rounded-full border-border/70 bg-white text-surface-600 shadow-sm hover:bg-surface-50"
        onClick={() => setCollapsed((current) => !current)}
      >
        {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </Button>

      <div className="flex min-h-0 h-full flex-col gap-3 xl:flex-row">
        <div
          className={cn(
            "min-h-0 min-w-0 flex-1 [&>*]:h-full [&>*]:min-h-0",
            mainClassName
          )}
        >
          {main}
        </div>
        {!collapsed ? (
          <div
            className={cn(
              "min-h-0 shrink-0 [&>*]:h-full [&>*]:min-h-0",
              sideWidthClassName
            )}
          >
            {side}
          </div>
        ) : null}
      </div>
    </div>
  );
}
