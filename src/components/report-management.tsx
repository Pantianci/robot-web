import { useState } from "react";
import { FileOutput, Save } from "lucide-react";
import { api } from "@/lib/api";
import { useReportsQuery, useReviewReportMutation } from "@/lib/hooks";
import { formatDateTime } from "@/lib/utils";
import type { Report } from "@/lib/types";
import { DetailPanel } from "@/components/detail-panel";
import { DialogFormShell } from "@/components/dialog-form-shell";
import { EmptyState } from "@/components/empty-state";
import { Field } from "@/components/field";
import { PageHeader } from "@/components/page-header";
import { PropertyList } from "@/components/property-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export function ReportManagement() {
  const { data: reports = [] } = useReportsQuery();
  const reviewMutation = useReviewReportMutation();
  const [selectedId, setSelectedId] = useState<string | null>(reports[0]?.id ?? null);
  const [open, setOpen] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const selected = reports.find((item) => item.id === selectedId) ?? reports[0] ?? null;
  const [draft, setDraft] = useState<Partial<Report>>({});

  const openReview = () => {
    if (!selected) {
      return;
    }
    setDraft(selected);
    setOpen(true);
  };

  const handleReview = async () => {
    if (!selected) {
      return;
    }
    await reviewMutation.mutateAsync({
      id: selected.id,
      patch: {
        ...draft,
        status: "已完成"
      }
    });
    setOpen(false);
  };

  const handleExport = async () => {
    const result = await api.exportReports(reports.length);
    setExportMessage(
      `已生成 ${result.fileName}，包含 ${result.exportedCount} 份报告，生成时间 ${formatDateTime(
        result.generatedAt
      )}`
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        eyebrow="患者档案管理 > 评估报告管理"
        title="评估报告管理"
        description="评估报告独立于患者 ID 检索，支持审核、导出和 AI 参考信息展示。"
        className="mb-1"
        actions={
          <>
            <Button onClick={openReview}>审核评估报告</Button>
            <Button variant="outline" onClick={handleExport}>
              <FileOutput className="h-4 w-4" />
              导出评估报告
            </Button>
          </>
        }
      />

      {exportMessage ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-sm text-primary">{exportMessage}</CardContent>
        </Card>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1.8fr)_360px]">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CardHeader className="border-b border-border/60">
            <CardTitle>评估报告列表</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>患者</TableHead>
                  <TableHead>完成率</TableHead>
                  <TableHead>关节活动度变化</TableHead>
                  <TableHead>疼痛评分</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>最近审核</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((item) => (
                  <TableRow
                    key={item.id}
                    data-state={selected?.id === item.id ? "selected" : undefined}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(item.id)}
                  >
                    <TableCell className="font-medium">{item.patientName}</TableCell>
                    <TableCell>{item.completionRate}</TableCell>
                    <TableCell>{item.romChange}</TableCell>
                    <TableCell>{item.painScore}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          item.status === "已完成"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(item.reviewedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <DetailPanel title="评估报告详情" className="h-full pt-1">
          {selected ? (
            <>
              <PropertyList
                items={[
                  { label: "患者", value: selected.patientName },
                  { label: "完成率", value: selected.completionRate },
                  { label: "ROM变化", value: selected.romChange },
                  { label: "疼痛评分", value: selected.painScore },
                  { label: "医生评价", value: selected.doctorComment },
                  { label: "护士评价", value: selected.nurseComment }
                ]}
              />
              <Card className="border-border/60 bg-surface-50 shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">AI 评估参考</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm leading-7 text-muted-foreground">
                  {selected.aiReference}
                </CardContent>
              </Card>
            </>
          ) : (
            <EmptyState title="请选择一份评估报告" />
          )}
        </DetailPanel>
      </div>

      <DialogFormShell
        open={open}
        onOpenChange={setOpen}
        title="审核评估报告"
        description="可编辑 AI 自动加载的参考内容，并补充医生与护士评价。"
        onSubmit={handleReview}
        submitLabel="提交审核"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="完成率">
            <Textarea
              value={draft.completionRate ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, completionRate: event.target.value }))}
            />
          </Field>
          <Field label="关节活动度变化">
            <Textarea
              value={draft.romChange ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, romChange: event.target.value }))}
            />
          </Field>
          <Field label="疼痛评分">
            <Textarea
              value={draft.painScore ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, painScore: event.target.value }))}
            />
          </Field>
        </div>
        <Field label="医生评价">
          <Textarea
            value={draft.doctorComment ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, doctorComment: event.target.value }))}
          />
        </Field>
        <Field label="护士评价">
          <Textarea
            value={draft.nurseComment ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, nurseComment: event.target.value }))}
          />
        </Field>
        <Field label="评估报告备注">
          <Textarea
            value={draft.note ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
          />
        </Field>
        <Field label="AI 评估参考">
          <Textarea
            value={draft.aiReference ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, aiReference: event.target.value }))}
          />
        </Field>
        <div className="flex gap-2">
          <Button type="button" variant="secondary">
            <Save className="h-4 w-4" />
            草稿保存
          </Button>
        </div>
      </DialogFormShell>
    </div>
  );
}
