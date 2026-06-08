import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DetailPanel({
  title,
  children,
  footer,
  className,
  contentClassName
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className={cn("flex-1 min-h-0 space-y-4 overflow-y-auto p-4", contentClassName)}>
        {children}
        {footer}
      </CardContent>
    </Card>
  );
}
