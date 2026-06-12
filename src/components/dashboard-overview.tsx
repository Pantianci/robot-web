import { useDashboardQuery, usePlansQuery, usePrescriptionsQuery, useReportsQuery, usePatientsQuery } from "@/lib/hooks";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import { FileText, Users, Clipboard, Calendar } from "lucide-react";

export function DashboardOverview() {
  const { data } = useDashboardQuery();
  const { data: plans = [] } = usePlansQuery();
  const { data: prescriptions = [] } = usePrescriptionsQuery();
  const { data: reports = [] } = useReportsQuery();
  const { data: patients = [] } = usePatientsQuery();

  const dashboard = data?.dashboard;

  return (
    <div className="space-y-3">
      <PageHeader
        eyebrow="首页概览"
        title="智慧康复机器人后台"
        description="快速访问患者档案、处方、评估报告和机器人任务排班等核心功能。"
        badge="管理总览"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link to="/patients/base" className="block">
          <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">患者档案</p>
                  <p className="text-3xl font-bold">{patients.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/patients/prescriptions" className="block">
          <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
                  <Clipboard className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">运动处方</p>
                  <p className="text-3xl font-bold">{prescriptions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/patients/reports" className="block">
          <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">评估报告</p>
                  <p className="text-3xl font-bold">{reports.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/robots/detail" className="block">
          <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">任务排班</p>
                  <p className="text-3xl font-bold">{plans.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>本周训练趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid h-[280px] grid-cols-6 items-end gap-4 rounded-[1.5rem] bg-gradient-to-b from-surface-100 to-white p-5">
              {dashboard?.weeklyTrend.map((point) => (
                <div key={point.label} className="flex h-full flex-col justify-end gap-3">
                  <div
                    className="rounded-t-2xl bg-gradient-to-t from-primary to-surface-200"
                    style={{ height: `${Math.max(20, point.value * 4)}px` }}
                  />
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">{point.label}</p>
                    <p className="mt-1 text-sm font-semibold text-surface-900">{point.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>重点通知</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard?.announcements.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border/70 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-surface-900">{item.title}</p>
                  <Badge>{item.level}</Badge>
                </div>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>工作待办</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dashboard?.todos.map((todo) => (
            <div key={todo.id} className="rounded-2xl border border-border/70 bg-surface-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="font-medium text-surface-900">{todo.title}</p>
                <Badge>{todo.status}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                负责人 {todo.owner} · 截止 {formatDateTime(todo.dueAt)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
