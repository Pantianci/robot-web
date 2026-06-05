import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DetailPanel({
  title,
  children,
  footer
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        {children}
        {footer}
      </CardContent>
    </Card>
  );
}
