import type { ErrorComponentProps } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DefaultCatchBoundary({ error, reset }: ErrorComponentProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            页面加载出现异常
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>{error instanceof Error ? error.message : "未知错误"}</p>
          <Button onClick={reset}>重试</Button>
        </CardContent>
      </Card>
    </div>
  );
}
