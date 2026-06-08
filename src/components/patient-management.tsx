import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useDeletePatientMutation, usePatientsQuery } from "@/lib/hooks";
import { defaultPatientWorkspace, patientWorkspaceContextKey } from "@/lib/patient-context";
import { readState, writeState } from "@/lib/storage";
import { formatDateTime } from "@/lib/utils";
import type { Patient } from "@/lib/types";
import { CollapsibleSplitLayout } from "@/components/collapsible-side-panel";
import { DetailPanel } from "@/components/detail-panel";
import { DialogFormShell } from "@/components/dialog-form-shell";
import { EmptyState } from "@/components/empty-state";
import { Field } from "@/components/field";
import { FilterBar } from "@/components/filter-bar";
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

type PatientDraft = Omit<Patient, "id" | "createdAt">;

const patientPageSize = 10;

export function PatientManagement() {
  const navigate = useNavigate();
  const { data: patients = [] } = usePatientsQuery();
  const deleteMutation = useDeletePatientMutation();

  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("全部");
  const [bedFilter, setBedFilter] = useState("");
  const [creatorFilter, setCreatorFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("全部");
  const [selectedId, setSelectedId] = useState<string | null>(
    readState<{ selectedId: string }>(patientWorkspaceContextKey)?.selectedId ??
      defaultPatientWorkspace.patientId
  );
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!patients.length) {
      return;
    }

    const current =
      patients.find((item) => item.id === selectedId) ??
      patients.find((item) => item.id === defaultPatientWorkspace.patientId) ??
      patients[0];

    if (current && current.id !== selectedId) {
      setSelectedId(current.id);
    }
  }, [patients, selectedId]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return [...patients]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter((item) => {
        const keywordMatch =
          !query ||
          [item.id, item.name, item.diagnosis, item.stage, item.bedNo, item.createdBy]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase());
        const stageMatch = stageFilter === "全部" || item.stage === stageFilter;
        const bedMatch = !bedFilter || item.bedNo.toLowerCase().includes(bedFilter.toLowerCase());
        const creatorMatch =
          !creatorFilter || item.createdBy.toLowerCase().includes(creatorFilter.toLowerCase());

        let dateMatch = true;
        if (dateFilter !== "全部") {
          const createdTime = new Date(item.createdAt).getTime();
          const diff = now - createdTime;
          const oneDay = 24 * 60 * 60 * 1000;
          if (dateFilter === "近7天") {
            dateMatch = diff <= oneDay * 7;
          } else if (dateFilter === "近30天") {
            dateMatch = diff <= oneDay * 30;
          } else if (dateFilter === "近90天") {
            dateMatch = diff <= oneDay * 90;
          }
        }

        return keywordMatch && stageMatch && bedMatch && creatorMatch && dateMatch;
      });
  }, [bedFilter, creatorFilter, dateFilter, patients, query, stageFilter]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const totalPages = Math.max(1, Math.ceil(filtered.length / patientPageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * patientPageSize, safePage * patientPageSize);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (!selected) {
      return;
    }

    writeState(patientWorkspaceContextKey, {
      selectedId: selected.id,
      patientId: selected.id,
      patientName: selected.name
    });
  }, [selected]);

  const openEditPage = (patient: Patient | null) => {
    if (!patient) {
      return;
    }
    writeState(patientWorkspaceContextKey, {
      selectedId: patient.id,
      patientId: patient.id,
      patientName: patient.name
    });
    navigate({ to: "/patients/base/edit" });
  };

  const resetFilters = () => {
    setQuery("");
    setStageFilter("全部");
    setBedFilter("");
    setCreatorFilter("");
    setDateFilter("全部");
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        eyebrow="患者档案管理 > 基础档案"
        title="基础档案"
        description="支持患者档案检索、右侧详情预览、新增档案与编辑删除操作。"
        className="mb-1"
        actions={
          <>
            <Button
              type="button"
              onClick={() => {
                navigate({ to: "/patients/base/create" });
              }}
            >
              <Plus className="h-4 w-4" />
              新增档案
            </Button>
            <Button asChild variant="outline">
              <Link to="/patients/base/export">导出</Link>
            </Button>
          </>
        }
      />

      <FilterBar
        singleLine
        actions={
          <>
            <Button variant="secondary" onClick={resetFilters}>
              重置
            </Button>
            <Button onClick={() => setPage(1)}>查询</Button>
          </>
        }
      >
        <Field label="关键字检索">
          <Input
            value={query}
            placeholder="患者ID / 姓名 / 病种 / 阶段"
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>
        <Field label="阶段">
          <select
            className="native-select"
            value={stageFilter}
            onChange={(event) => setStageFilter(event.target.value)}
          >
            <option value="全部">全部</option>
            {[...new Set(patients.map((item) => item.stage))].map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </Field>
        <Field label="病床号">
          <Input
            value={bedFilter}
            placeholder="12床"
            onChange={(event) => setBedFilter(event.target.value)}
          />
        </Field>
        <Field label="建档人">
          <Input
            value={creatorFilter}
            placeholder="王医生"
            onChange={(event) => setCreatorFilter(event.target.value)}
          />
        </Field>
        <Field label="建档时间">
          <select
            className="native-select"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
          >
            <option value="全部">全部</option>
            <option value="近7天">近7天</option>
            <option value="近30天">近30天</option>
            <option value="近90天">近90天</option>
          </select>
        </Field>
      </FilterBar>

      <CollapsibleSplitLayout
        label="档案"
        sideWidthClassName="w-full xl:w-[360px]"
        main={
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <CardHeader className="border-b border-border/60">
              <CardTitle>患者列表</CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              {filtered.length ? (
                <Table className="min-w-full">
                  <TableHeader className="sticky top-0 z-10 bg-white">
                    <TableRow>
                      <TableHead>患者ID</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead>病种</TableHead>
                      <TableHead>阶段</TableHead>
                      <TableHead>设备ID</TableHead>
                      <TableHead>病床号</TableHead>
                      <TableHead>建档人</TableHead>
                      <TableHead>建档时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((item) => (
                      <TableRow
                        key={item.id}
                        data-state={selected?.id === item.id ? "selected" : undefined}
                        className="cursor-pointer"
                        onClick={() => setSelectedId(item.id)}
                      >
                        <TableCell>{item.id}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.diagnosis}</TableCell>
                        <TableCell>{item.stage}</TableCell>
                        <TableCell>{item.robotId}</TableCell>
                        <TableCell>{item.bedNo}</TableCell>
                        <TableCell>{item.createdBy}</TableCell>
                        <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditPage(item);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                              编辑
                            </Button>
                            <Button
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
                  <EmptyState title="暂无患者档案" />
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
          <DetailPanel title="患者档案" className="h-full">
            {selected ? (
              <>
                <PropertyList
                  items={[
                    { label: "患者", value: selected.name },
                    { label: "患者ID", value: selected.id },
                    { label: "年龄", value: selected.age },
                    { label: "性别", value: selected.gender },
                    { label: "病种", value: selected.diagnosis },
                    { label: "设备ID", value: selected.robotId },
                    { label: "病床号", value: selected.bedNo },
                    { label: "建档人", value: selected.createdBy },
                    { label: "建档时间", value: formatDateTime(selected.createdAt) }
                  ]}
                />
                <Card className="border-border/60 bg-surface-50 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">患者备注</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm leading-7 text-muted-foreground">
                    {selected.note}
                  </CardContent>
                </Card>
                <Card className="border-border/60 bg-surface-50 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">最近操作</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm leading-7 text-muted-foreground">
                    {`${selected.createdBy} 于 ${formatDateTime(selected.createdAt)} 完成建档，当前患者已同步为后续康复方案与处方页上下文。`}
                  </CardContent>
                </Card>
              </>
            ) : (
              <EmptyState title="请选择一位患者" />
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
        title="删除患者档案"
        description={`确认删除“${deleteTarget?.name ?? ""}”后，列表会立即刷新，并记录最近处理日志。`}
        onSubmit={handleDelete}
        submitLabel="确认删除"
      >
        <div className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
          当前原型会直接从本地数据中删除该患者档案。若该患者已作为当前上下文，后续页面会自动回退到张三。
        </div>
      </DialogFormShell>
    </div>
  );
}
