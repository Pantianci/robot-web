import { useDashboardQuery, usePlansQuery, usePrescriptionsQuery, useReportsQuery, useRobotsQuery } from "@/lib/hooks";
import { formatDateTime } from "@/lib/utils";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardOverview() {
  const { data } = useDashboardQuery();
  const { data: plans = [] } = usePlansQuery();
  const { data: prescriptions = [] } = usePrescriptionsQuery();
  const { data: reports = [] } = useReportsQuery();
  const { data: robots = [] } = useRobotsQuery();

  const dashboard = data?.dashboard;
  const summary = data?.summary;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="首页概览"
        title="智慧康复机器人后台"
        description="按管理端首页的结构组织信息卡、工作待办和重点提醒，用于展示管理端核心态势。"
        badge="P1 原型"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="在线机器人" value={summary?.onlineRobots ?? 0} hint="执行中与正常总数" />
        <MetricCard label="患者档案" value={summary?.patientCount ?? 0} hint="当前建档患者" />
        <MetricCard label="待审处方" value={summary?.pendingPrescriptions ?? 0} hint="等待医生审核" />
        <MetricCard label="知识资产" value={summary?.knowledgeAssets ?? 0} hint="康复知识库有效内容" />
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
          <CardContent className="space-y-4">
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

      <div className="grid gap-4 xl:grid-cols-3">
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

        <Card>
          <CardHeader>
            <CardTitle>业务快照</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-2xl bg-surface-50 p-4">
              <p className="stat-kicker">康复方案</p>
              <p className="mt-2 text-2xl font-semibold text-surface-900">{plans.length}</p>
            </div>
            <div className="rounded-2xl bg-surface-50 p-4">
              <p className="stat-kicker">运动处方</p>
              <p className="mt-2 text-2xl font-semibold text-surface-900">{prescriptions.length}</p>
            </div>
            <div className="rounded-2xl bg-surface-50 p-4">
              <p className="stat-kicker">评估报告</p>
              <p className="mt-2 text-2xl font-semibold text-surface-900">{reports.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>设备调度概况</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {robots.map((robot) => (
              <div key={robot.id} className="rounded-2xl border border-border/70 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-surface-900">{robot.id}</p>
                  <Badge>{robot.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  患者 {robot.patientName} · 电量 {robot.battery}% · {robot.trainingStatus}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
