import { ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function MetricCard({
  label,
  value,
  hint
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-start justify-between p-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-surface-700">{label}</p>
          <p className="text-3xl font-semibold tracking-tight text-surface-900">{value}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="rounded-2xl bg-surface-100 p-3 text-surface-700">
          <ArrowUpRight className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
