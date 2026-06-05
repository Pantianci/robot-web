import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function FilterBar({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>
        {actions ? <div className="flex gap-2">{actions}</div> : null}
      </CardContent>
    </Card>
  );
}
