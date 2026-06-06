import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { DetailPanel } from "@/components/detail-panel";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PropertyList } from "@/components/property-list";
import { SectionCard } from "@/components/section-card";
import { useRobotsQuery } from "@/lib/hooks";
import { formatDateTime } from "@/lib/utils";

export const Route = createFileRoute("/robots/detail")({
  component: RobotDetailPage
});

function RobotDetailPage() {
  const { data: robots = [] } = useRobotsQuery();
  const robot = useMemo(() => robots[0] ?? null, [robots]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="机器人管理 > 机器人详情"
        title="机器人详情"
        description="用于查看机器人完整详情、训练数据、异常记录和历史训练。"
        badge="详情页"
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <div className="space-y-6">
          <SectionCard title="设备概览">
            {robot ? (
              <PropertyList
                items={[
                  { label: "机器人ID", value: robot.id },
                  { label: "状态", value: robot.status },
                  { label: "患者", value: robot.patientName },
                  { label: "电量", value: `${robot.battery}%` },
                  { label: "病床", value: robot.bedNo },
                  { label: "最近工作", value: formatDateTime(robot.lastWorkAt) }
                ]}
              />
            ) : (
              <EmptyState title="暂无机器人数据" />
            )}
          </SectionCard>

          <SectionCard title="训练数据">
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-border/70 bg-surface-50 px-4 py-3">
                今日执行时长：46 分钟，完成 3 轮标准训练。
              </div>
              <div className="rounded-2xl border border-border/70 bg-surface-50 px-4 py-3">
                历史训练 7 日平均完成率：83%，患者配合度稳定。
              </div>
            </div>
          </SectionCard>
        </div>

        <DetailPanel title="异常与备注">
          {robot ? (
            <>
              <SectionCard title="异常记录">
                <p className="text-sm leading-7 text-muted-foreground">
                  当前设备暂无严重异常，低电量和动作阻塞将会显示在此区域。
                </p>
              </SectionCard>
              <SectionCard title="处理备注">
                <p className="text-sm leading-7 text-muted-foreground">{robot.note}</p>
              </SectionCard>
            </>
          ) : (
            <EmptyState title="暂无机器人详情" />
          )}
        </DetailPanel>
      </div>
    </div>
  );
}
