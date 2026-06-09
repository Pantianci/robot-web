import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function FilterBar({
  children,
  actions,
  singleLine = false
}: {
  children: ReactNode;
  actions?: ReactNode;
  singleLine?: boolean;
}) {
  return (
    <Card>
      <CardContent
        className={cn(
          singleLine
            ? "flex items-end gap-3 p-4"
            : "flex flex-col gap-4 p-5 lg:flex-row lg:items-end lg:justify-between"
        )}
      >
        <div
          className={cn(
            singleLine
              ? "flex min-w-0 flex-1 items-end gap-3 overflow-x-auto pb-1 pr-1 [&>*]:min-w-[220px] [&>*]:shrink-0 [&>*]:gap-1.5"
              : "grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-4"
          )}
        >
          {children}
        </div>
        {actions ? (
          <div className={cn(singleLine ? "flex shrink-0 items-center gap-2" : "flex gap-2")}>
            {actions}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
