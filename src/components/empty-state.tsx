import { Box, SearchX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  className
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
        <Box className="h-10 w-10 text-surface-500" />
        <div className="space-y-1">
          <p className="font-semibold text-surface-900">{title}</p>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function NotFoundState({ title }: { title: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="space-y-3 text-center">
        <SearchX className="mx-auto h-10 w-10 text-surface-500" />
        <h1 className="text-2xl font-semibold text-surface-900">{title}</h1>
        <p className="text-sm text-muted-foreground">
          检查地址是否正确，或从左侧导航返回首页。
        </p>
      </div>
    </div>
  );
}
