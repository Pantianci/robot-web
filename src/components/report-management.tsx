import { Link } from "@tanstack/react-router";
import { Eye, FileOutput, PencilLine, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useDeleteReportMutation, useReportsQuery } from "@/lib/hooks";
import { reportWorkspaceContextKey } from "@/lib/patient-context";
import { readState, writeState } from "@/lib/storage";
import {
  isPageFullySelected,
  isPagePartiallySelected,
  togglePageSelection,
  toggleSelection
} from "@/lib/table-selection";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TableSelectionCheckbox } from "@/components/ui/table-selection-checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import type { Report } from "@/lib/types";

const pageSize = 8;

const reportStatusOptions = [
  "未审核",
  "审核中（护士已评价）",
  "审核中（医生已评价）",
  "已审核"
] as const;

function reportStatusBadgeClass(status: Report["status"]) {
  if (status === "已审核") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "未审核") {
    return "bg-surface-100 text-surface-700";
  }

  return "bg-amber-100 text-amber-700";
}

function ReportPreviewDialog({
  report,
  open,
  onOpenChange
}: {
  report: Report | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!report) {
    return null;
  }

  const actionRows = [
    { name: "主动屈伸热身", result: "达标，15次，85°", tone: "success" },
    { name: "0-90 被动向心", result: "达标，15次，88°", tone: "success" },
    { name: "左膝等长肌力", result: "欠佳，减阻保护", tone: "warning" },
    { name: "直腿抬高练习", result: "达标，12次", tone: "success" },
    { name: "动态关节松动", result: "达标，10次", tone: "success" }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[min(94vw,1080px)] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>评估报告预览</DialogTitle>
          <DialogDescription>预览患者总评估报告卡。</DialogDescription>
        </DialogHeader>
        <div className="bg-[#f8fbff] p-6 md:p-8">
          <div className="rounded-[1.75rem] bg-[#1f7fd0] px-6 py-7 text-white shadow-soft md:px-10">
            <p className="text-center text-2xl font-semibold md:text-4xl">智能康复管理系统</p>
            <p className="mt-3 text-center text-xl font-semibold md:text-2xl">患者总评估报告卡</p>
            <div className="mt-6 flex flex-col gap-3 text-sm text-white/80 md:flex-row md:justify-between">
              <span>报告编号：{report.id.toUpperCase()}</span>
              <span>生成时间：{formatDateTime(report.reviewedAt)}</span>
            </div>
          </div>

          <div className="mt-7 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <section className="rounded-[1.5rem] border border-sky-100 bg-white p-5 shadow-soft">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1f7fd0] text-white">♥</span>
                  <h3 className="text-xl font-semibold text-surface-900">患者基本信息</h3>
                </div>
                <div className="flex flex-col gap-5 md:flex-row md:items-center">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
                    <div className="h-14 w-14 rounded-full bg-slate-400" />
                  </div>
                  <div className="space-y-2 text-base font-medium text-surface-800">
                    <p>患者：{report.patientName}  |  {report.patientName === "张三" ? "男" : "女"}  |  45岁</p>
                    <p>病床：骨科302床</p>
                    <p>临床诊断：左膝前交叉韧带（ACL）术后第4周</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-sky-100 bg-white p-5 shadow-soft">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1f7fd0] text-white">★</span>
                  <h3 className="text-xl font-semibold text-surface-900">机器人训练核心数据</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { label: "训练时长", value: "22 / 20分钟", note: "完成110%" },
                    { label: "最大屈曲角度", value: "88°", note: "达成率 97.7%" },
                    { label: "动作完成度", value: report.completionRate, note: "满额完成（共3轮）" }
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4">
                      <p className="text-sm font-semibold text-surface-700">✓ {item.label}</p>
                      <p className="mt-2 text-3xl font-bold text-surface-900">{item.value}</p>
                      <p className="mt-2 text-sm font-semibold text-emerald-600">{item.note}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-sky-100 bg-white p-5 shadow-soft">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1f7fd0] text-white">★</span>
                  <h3 className="text-xl font-semibold text-surface-900">1-5 动作队列明细</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {actionRows.map((item, index) => (
                    <div key={item.name} className="grid gap-3 py-3 md:grid-cols-[1fr_1fr]">
                      <p className="font-semibold text-surface-800">✓ {index + 1}. {item.name}</p>
                      <p className={item.tone === "success" ? "font-semibold text-emerald-600" : "font-semibold text-amber-500"}>
                        {item.tone === "success" ? "✓" : "!"} {item.result}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-[1.5rem] border border-sky-100 bg-white p-5 shadow-soft">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1f7fd0] text-white">★</span>
                  <h3 className="text-xl font-semibold text-surface-900">实时运动轨迹对比</h3>
                </div>
                <div className="relative h-56 rounded-2xl bg-gradient-to-b from-white to-emerald-50 p-5">
                  <svg viewBox="0 0 420 180" className="h-full w-full">
                    <path d="M20 150 C70 50, 120 20, 170 88 S250 155, 310 76 S370 50, 400 38" fill="none" stroke="#1f7fd0" strokeDasharray="7 7" strokeWidth="4" />
                    <path d="M20 154 C70 78, 118 35, 168 95 S250 146, 308 86 S362 70, 400 48" fill="none" stroke="#36b37e" strokeWidth="5" />
                  </svg>
                  <div className="absolute right-6 top-5 text-sm font-semibold text-surface-900">方差 8.2% 良好</div>
                </div>
                <p className="mt-3 text-center text-sm text-muted-foreground">虚线：标准轨迹　实线：{report.patientName}实测轨迹</p>
                <div className="mx-auto mt-5 w-fit rounded-xl bg-sky-50 px-8 py-3 text-sm font-semibold text-surface-800">
                  AI 感知正向语音激励 6次
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-sky-100 bg-white p-5 shadow-soft">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1f7fd0] text-white">♥</span>
                  <h3 className="text-xl font-semibold text-surface-900">医护反馈与下一阶段</h3>
                </div>
                <div className="space-y-5 border-t border-sky-100 pt-5">
                  <div className="grid gap-3 md:grid-cols-[56px_1fr]">
                    <div className="h-12 w-12 rounded-full bg-slate-200" />
                    <div>
                      <p className="font-semibold text-surface-900">医生反馈</p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{report.doctorComment}</p>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[56px_1fr]">
                    <div className="h-12 w-12 rounded-full bg-slate-200" />
                    <div>
                      <p className="font-semibold text-surface-900">护士反馈</p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{report.nurseComment}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5">
                    <p className="text-lg font-bold text-surface-900">2026-05-29　09:00</p>
                    <p className="mt-4 text-sm text-muted-foreground">就诊地点：骨科门诊</p>
                    <p className="mt-2 text-sm font-semibold text-surface-800">就诊医生：王志远</p>
                    <Button className="mt-5 w-full md:w-auto">解锁下一阶段</Button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ReportManagement() {
  const { data: reports = [] } = useReportsQuery();
  const deleteReportMutation = useDeleteReportMutation();
  const [selectedId, setSelectedId] = useState<string | null>(
    readState<{ reportId: string }>(reportWorkspaceContextKey)?.reportId ?? reports[0]?.id ?? null
  );
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [createdDateFrom, setCreatedDateFrom] = useState("");
  const [createdDateTo, setCreatedDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exportMessage, setExportMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<(typeof reports)[number] | null>(null);
  const [previewTarget, setPreviewTarget] = useState<Report | null>(null);

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
          const createdAt = new Date(item.reviewedAt);
          const dateFromMatch =
            !createdDateFrom || createdAt >= new Date(`${createdDateFrom}T00:00:00`);
          const dateToMatch =
            !createdDateTo || createdAt <= new Date(`${createdDateTo}T23:59:59`);
          return keywordMatch && statusMatch && dateFromMatch && dateToMatch;
        }),
    [createdDateFrom, createdDateTo, keyword, reports, statusFilter]
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
  const filteredIds = useMemo(() => filtered.map((item) => item.id), [filtered]);
  const pagedIds = useMemo(() => paged.map((item) => item.id), [paged]);
  const selectedCount = useMemo(
    () => selectedIds.filter((id) => filteredIds.includes(id)).length,
    [filteredIds, selectedIds]
  );
  const allPagedSelected = isPageFullySelected(selectedIds, pagedIds);
  const somePagedSelected = isPagePartiallySelected(selectedIds, pagedIds);

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
    setCreatedDateFrom("");
    setCreatedDateTo("");
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

  useEffect(() => {
    const filteredIdSet = new Set(filteredIds);
    setSelectedIds((current) => current.filter((id) => filteredIdSet.has(id)));
  }, [filteredIds]);

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
                审核评价
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
            {reportStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </Field>
        <Field label="创建时间">
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={createdDateFrom}
              aria-label="创建开始时间"
              onChange={(event) => setCreatedDateFrom(event.target.value)}
            />
            <Input
              type="date"
              value={createdDateTo}
              aria-label="创建结束时间"
              onChange={(event) => setCreatedDateTo(event.target.value)}
            />
          </div>
        </Field>
      </FilterBar>

      <CollapsibleSplitLayout
        label="报告"
        sideWidthClassName="w-full xl:w-[360px]"
        main={
          <Card className="flex min-h-0 flex-col overflow-hidden">
            <CardHeader className="border-b border-border/60">
              <div>
                <CardTitle>评估报告列表</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  共 {filtered.length} 条记录，已勾选 {selectedCount} 条
                </p>
              </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              {filtered.length ? (
                <Table className="min-w-full">
                  <TableHeader className="sticky top-0 z-10 bg-white">
                    <TableRow>
                      <TableHead className="w-12">
                        <TableSelectionCheckbox
                          checked={allPagedSelected}
                          indeterminate={somePagedSelected}
                          onChange={(checked) =>
                            setSelectedIds((current) => togglePageSelection(current, pagedIds, checked))
                          }
                          ariaLabel={`全选评估报告列表第 ${safePage} 页`}
                        />
                      </TableHead>
                      <TableHead>报告编号</TableHead>
                      <TableHead>患者</TableHead>
                      <TableHead>完成率</TableHead>
                      <TableHead>异常</TableHead>
                      <TableHead>疼痛</TableHead>
                      <TableHead>创建时间</TableHead>
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
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <TableSelectionCheckbox
                            checked={selectedIds.includes(item.id)}
                            onChange={(checked) =>
                              setSelectedIds((current) => toggleSelection(current, item.id, checked))
                            }
                            ariaLabel={`选择报告 ${item.id}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.id}</TableCell>
                        <TableCell>{item.patientName}</TableCell>
                        <TableCell>{item.completionRate}</TableCell>
                        <TableCell>{item.romChange}</TableCell>
                        <TableCell>{item.painScore}</TableCell>
                        <TableCell>{formatDateTime(item.reviewedAt)}</TableCell>
                        <TableCell>
                          <Badge className={reportStatusBadgeClass(item.status)}>{item.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                setPreviewTarget(item);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                              预览
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
                  共 {filtered.length} 条，当前第 {safePage} / {totalPages} 页，已勾选 {selectedCount} 条
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
                    { label: "创建时间", value: formatDateTime(selected.reviewedAt) },
                    { label: "患者", value: selected.patientName },
                    { label: "状态", value: selected.status }
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

      <ReportPreviewDialog
        report={previewTarget}
        open={Boolean(previewTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewTarget(null);
          }
        }}
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
