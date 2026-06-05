import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useCreateRobotMutation, useRobotsQuery } from "@/lib/hooks";
import { formatDateTime } from "@/lib/utils";
import type { RobotStatus } from "@/lib/types";
import { DetailPanel } from "@/components/detail-panel";
import { DialogFormShell } from "@/components/dialog-form-shell";
import { EmptyState } from "@/components/empty-state";
import { Field } from "@/components/field";
import { FilterBar } from "@/components/filter-bar";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { PropertyList } from "@/components/property-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export function RobotManagement() {
  const { data: robots = [] } = useRobotsQuery();
  const createMutation = useCreateRobotMutation();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(robots[0]?.id ?? null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{
    id: string;
    status: RobotStatus;
    patientName: string;
    battery: number;
    bedNo: string;
    trainingStatus: string;
    note: string;
  }>({
    id: "",
    status: "正常",
    patientName: "",
    battery: 100,
    bedNo: "",
    trainingStatus: "",
    note: ""
  });

  const filtered = useMemo(
    () =>
      robots.filter((item) =>
        [item.id, item.patientName, item.status, item.bedNo]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [robots, query]
  );

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const onlineCount = robots.filter((item) => item.status === "执行中").length;
  const normalCount = robots.filter((item) => item.status === "正常").length;
  const warningCount = robots.filter((item) => item.status === "预警").length;

  const handleSubmit = async () => {
    if (!draft.id) {
      return;
    }
    await createMutation.mutateAsync(draft);
    setOpen(false);
    setDraft({
      id: "",
      status: "正常",
      patientName: "",
      battery: 100,
      bedNo: "",
      trainingStatus: "",
      note: ""
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="机器人管理 > 机器人列表"
        title="机器人列表"
        description="管理机器人设备检索、概况卡片、列表和详情页预览。"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            新增机器人
          </Button>
        }
      />

      <FilterBar
        actions={
          <>
            <Button variant="secondary" onClick={() => setQuery("")}>
              重置
            </Button>
            <Button>查询</Button>
          </>
        }
      >
        <Field label="关键字检索">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} />
        </Field>
        <Field label="电量区间">
          <select className="native-select">
            <option>全部</option>
            <option>80-100%</option>
            <option>50-79%</option>
            <option>0-49%</option>
          </select>
        </Field>
        <Field label="状态">
          <select className="native-select">
            <option>全部</option>
            <option>执行中</option>
            <option>正常</option>
            <option>预警</option>
            <option>离线</option>
          </select>
        </Field>
        <Field label="日期">
          <Input placeholder="最近工作日期" />
        </Field>
      </FilterBar>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="在线机器人" value={onlineCount} hint="正常运行" />
        <MetricCard label="正常机器人" value={normalCount} hint="需要继续排班" />
        <MetricCard label="预警机器人" value={warningCount} hint="建议优先处理" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_360px]">
        <Card>
          <CardHeader className="border-b border-border/60">
            <CardTitle>机器人列表</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>机器人ID</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>患者</TableHead>
                    <TableHead>电量</TableHead>
                    <TableHead>病床</TableHead>
                    <TableHead>训练状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow
                      key={item.id}
                      data-state={selected?.id === item.id ? "selected" : undefined}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(item.id)}
                    >
                      <TableCell className="font-medium">{item.id}</TableCell>
                      <TableCell>{item.status}</TableCell>
                      <TableCell>{item.patientName}</TableCell>
                      <TableCell>{item.battery}%</TableCell>
                      <TableCell>{item.bedNo}</TableCell>
                      <TableCell>{item.trainingStatus}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6">
                <EmptyState title="暂无机器人记录" />
              </div>
            )}
          </CardContent>
        </Card>

        <DetailPanel title="机器人概况">
          {selected ? (
            <>
              <PropertyList
                items={[
                  { label: "机器人ID", value: selected.id },
                  { label: "状态", value: selected.status },
                  { label: "患者", value: selected.patientName },
                  { label: "电量", value: `${selected.battery}%` },
                  { label: "病床", value: selected.bedNo },
                  { label: "最近工作", value: formatDateTime(selected.lastWorkAt) }
                ]}
              />
              <Card className="border-border/60 bg-surface-50 shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">处理记录</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm leading-7 text-muted-foreground">
                  {selected.note}
                </CardContent>
              </Card>
            </>
          ) : (
            <EmptyState title="请选择一台机器人" />
          )}
        </DetailPanel>
      </div>

      <DialogFormShell
        open={open}
        onOpenChange={setOpen}
        title="新增机器人"
        description="录入机器人编号、电量和绑定患者信息。"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="机器人ID" required>
            <Input value={draft.id} onChange={(event) => setDraft((current) => ({ ...current, id: event.target.value }))} />
          </Field>
          <Field label="状态" required>
            <select
              className="native-select"
              value={draft.status}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  status: event.target.value as "执行中" | "正常" | "预警" | "离线"
                }))
              }
            >
              <option value="执行中">执行中</option>
              <option value="正常">正常</option>
              <option value="预警">预警</option>
              <option value="离线">离线</option>
            </select>
          </Field>
          <Field label="患者">
            <Input
              value={draft.patientName}
              onChange={(event) =>
                setDraft((current) => ({ ...current, patientName: event.target.value }))
              }
            />
          </Field>
          <Field label="电量">
            <Input
              type="number"
              value={draft.battery}
              onChange={(event) =>
                setDraft((current) => ({ ...current, battery: Number(event.target.value) }))
              }
            />
          </Field>
          <Field label="病床">
            <Input
              value={draft.bedNo}
              onChange={(event) => setDraft((current) => ({ ...current, bedNo: event.target.value }))}
            />
          </Field>
          <Field label="训练状态">
            <Input
              value={draft.trainingStatus}
              onChange={(event) =>
                setDraft((current) => ({ ...current, trainingStatus: event.target.value }))
              }
            />
          </Field>
        </div>
        <Field label="备注">
          <Textarea
            value={draft.note}
            onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
          />
        </Field>
      </DialogFormShell>
    </div>
  );
}
