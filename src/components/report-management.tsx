import { Link } from "@tanstack/react-router";
import { FileOutput, PencilLine, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useDeleteReportMutation, useReportsQuery } from "@/lib/hooks";
import { reportWorkspaceContextKey } from "@/lib/patient-context";
import { readState, writeState } from "@/lib/storage";
import { formatDateTime } from "@/lib/utils";
import { CollapsibleSplitLayout } from "@/components/collapsible-side-panel";
import { DetailPanel } from "@/components/detail-panel";
import { DialogFormShell } from "@/components/dialog-form-shell";
import { EmptyState } from "@/components/empty-state";
import { Field } from "@/components/field";
import { FilterBar } from "@/components/filter-bar";
import { PageHeader } from "@/components/page-header";
import { PropertyList } from "@/components/property-list";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
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

const pageSize = 8;

export function ReportManagement() {
  const { data: reports = [] } = useReportsQuery();
  const deleteReportMutation = useDeleteReportMutation();
  const [selectedId, setSelectedId] = useState<string | null>(
    readState<{ reportId: string }>(reportWorkspaceContextKey)?.reportId ?? reports[0]?.id ?? null
  );
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [page, setPage] = useState(1);
  const [exportMessage, setExportMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<(typeof reports)[number] | null>(null);

  const filtered = useMemo(
    () =>
      [...reports]
        .sort((a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime())
        .filter((item) => {
          const keywordMatch =
            !keyword ||
            [item.id, item.patientName, item.completionRate, item.romChange, item.painScore]
              .join(" ")
              .toLowerCase()
              .includes(keyword.toLowerCase());
          const statusMatch = statusFilter === "全部" || item.status === statusFilter;
          return keywordMatch && statusMatch;
        }),
    [keyword, reports, statusFilter]
  );

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !filtered.some((item) => item.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
    }
  }, [filtered, selectedId]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleExport = async () => {
    const result = await api.exportReports(filtered.length);
    setExportMessage(
      `已生成 ${result.fileName}，包含 ${result.exportedCount} 份报告，生成时间 ${formatDateTime(
        result.generatedAt
      )}`
    );
  };

  const resetFilter = () => {
    setKeyword("");
    setStatusFilter("全部");
    setPage(1);
  };

  const handleDeleteReport = async () => {
    if (!deleteTarget) {
      return;
    }

    await deleteReportMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  useEffect(() => {
    if (!selected) {
      return;
    }

    writeState(reportWorkspaceContextKey, { reportId: selected.id });
  }, [selected]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeader
        eyebrow="患者档案管理 > 评估报告管理"
        title="评估报告管理"
        description="评估报告保持全局统一检索，不挂患者上下文；列表、详情和审核入口按 Figma 管理页结构组织。"
        actions={
          <>
            <Button asChild>
              <Link to="/patients/reports/review">
                <PencilLine className="h-4 w-4" />
                医生评价
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/patients/reports/export">
                <FileOutput className="h-4 w-4" />
                导出评估报告
              </Link>
            </Button>
          </>
        }
      />

      {exportMessage ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-sm text-primary">{exportMessage}</CardContent>
        </Card>
      ) : null}

      <FilterBar
        actions={
          <>
            <Button variant="secondary" onClick={resetFilter}>
              重置
            </Button>
            <Button onClick={() => setPage(1)}>查询</Button>
          </>
        }
      >
        <Field label="关键字检索">
          <Input
            value={keyword}
            placeholder="报告编号 / 患者 / 完成率 / 疼痛"
            onChange={(event) => setKeyword(event.target.value)}
          />
        </Field>
        <Field label="报告状态">
          <select
            className="native-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="全部">全部</option>
            <option value="待审核">待审核</option>
            <option value="已完成">已完成</option>
          </select>
        </Field>
      </FilterBar>

      <CollapsibleSplitLayout
        label="报告"
        sideWidthClassName="w-full xl:w-[360px]"
        main={
          <Card className="flex min-h-0 flex-col overflow-hidden">
            <CardHeader className="border-b border-border/60">
              <CardTitle>评估报告列表</CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              {filtered.length ? (
                <Table className="min-w-full">
                  <TableHeader className="sticky top-0 z-10 bg-white">
                    <TableRow>
                      <TableHead>报告编号</TableHead>
                      <TableHead>患者</TableHead>
                      <TableHead>完成率</TableHead>
                      <TableHead>异常</TableHead>
                      <TableHead>疼痛</TableHead>
                      <TableHead>更新时间</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((item) => (
                      <TableRow
                        key={item.id}
                        className="cursor-pointer"
                        data-state={selected?.id === item.id ? "selected" : undefined}
                        onClick={() => setSelectedId(item.id)}
                      >
                        <TableCell className="font-medium">{item.id}</TableCell>
                        <TableCell>{item.patientName}</TableCell>
                        <TableCell>{item.completionRate}</TableCell>
                        <TableCell>{item.romChange}</TableCell>
                        <TableCell>{item.painScore}</TableCell>
                        <TableCell>{formatDateTime(item.reviewedAt)}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              item.status === "已完成"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }
                          >
                            {item.status === "待审核" ? "医生待评价" : "护士已评价"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button asChild variant="ghost" size="sm">
                              <Link
                                to="/patients/reports/review"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  writeState(reportWorkspaceContextKey, { reportId: item.id });
                                  setSelectedId(item.id);
                                }}
                              >
                                <PencilLine className="h-4 w-4" />
                                编辑
                              </Link>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-rose-600 hover:text-rose-700"
                              onClick={(event) => {
                                event.stopPropagation();
                                setDeleteTarget(item);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              删除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-6">
                  <EmptyState title="暂无评估报告" />
                </div>
              )}
            </CardContent>
            {filtered.length ? (
              <div className="flex items-center justify-between border-t border-border/60 px-5 py-4 text-sm text-muted-foreground">
                <span>
                  共 {filtered.length} 条，当前第 {safePage} / {totalPages} 页
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>
        }
        side={
          <DetailPanel title="患者评估详情看板" className="h-full">
            {selected ? (
              <>
                <PropertyList
                  items={[
                    { label: "报告标题", value: `${selected.patientName} 评估报告` },
                    { label: "报告编号", value: selected.id },
                    { label: "生成时间", value: formatDateTime(selected.reviewedAt) },
                    { label: "患者", value: selected.patientName }
                  ]}
                />
                <SectionCard title="核心指标">
                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      { title: "完成率", value: selected.completionRate },
                      { title: "关节活动度", value: selected.romChange },
                      { title: "疼痛评分", value: selected.painScore }
                    ].map((item) => (
                      <div key={item.title} className="rounded-[1rem] border border-border/70 bg-surface-50 px-4 py-4">
                        <p className="text-xs text-muted-foreground">{item.title}</p>
                        <p className="mt-2 text-lg font-semibold text-surface-900">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
                <SectionCard title="医护反馈">
                  <div className="space-y-3">
                    <div className="rounded-[1rem] border border-border/70 bg-surface-50 px-4 py-3">
                      <p className="text-sm font-medium text-surface-900">医生反馈</p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{selected.doctorComment}</p>
                    </div>
                    <div className="rounded-[1rem] border border-border/70 bg-surface-50 px-4 py-3">
                      <p className="text-sm font-medium text-surface-900">护士反馈</p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{selected.nurseComment}</p>
                    </div>
                  </div>
                </SectionCard>
                <SectionCard title="AI 提醒与记录">
                  <p className="text-sm leading-7 text-muted-foreground">{selected.aiReference}</p>
                  <p className="mt-3 text-xs leading-6 text-muted-foreground">
                    最近处理记录：{`于 ${formatDateTime(selected.reviewedAt)} 完成状态更新，当前为${selected.status}。`}
                  </p>
                </SectionCard>
              </>
            ) : (
              <EmptyState title="请选择一份评估报告" />
            )}
          </DetailPanel>
        }
      />

      <DialogFormShell
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="删除评估报告"
        description={`确认删除“${deleteTarget?.id ?? ""}”后，列表会立即刷新。`}
        onSubmit={handleDeleteReport}
        submitLabel="确认删除"
      >
        <p className="text-sm leading-7 text-muted-foreground">
          确定删除“{deleteTarget?.patientName ?? ""}”的评估报告吗？此操作在当前原型中不可恢复。
        </p>
      </DialogFormShell>
    </div>
  );
}
