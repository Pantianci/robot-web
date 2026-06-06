import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useCreatePatientMutation, useDeletePatientMutation, usePatientsQuery, useUpdatePatientMutation } from "@/lib/hooks";
import { defaultPatientWorkspace, patientWorkspaceContextKey } from "@/lib/patient-context";
import { clearDraft, readDraft, readState, writeDraft, writeState } from "@/lib/storage";
import { formatDateTime } from "@/lib/utils";
import type { Patient } from "@/lib/types";
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
import { Textarea } from "@/components/ui/textarea";

type PatientDraft = Omit<Patient, "id" | "createdAt">;

const patientDraftKey = "patients:new";
const patientPageSize = 10;

const emptyDraft: PatientDraft = {
  name: "",
  age: 30,
  gender: "男",
  diagnosis: "",
  stage: "",
  robotId: "",
  bedNo: "",
  createdBy: "",
  note: ""
};

export function PatientManagement() {
  const { data: patients = [] } = usePatientsQuery();
  const createMutation = useCreatePatientMutation();
  const updateMutation = useUpdatePatientMutation();
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
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<PatientDraft>(readDraft<PatientDraft>(patientDraftKey) ?? emptyDraft);

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

  const persistDraft = (patch: Partial<PatientDraft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    writeDraft(patientDraftKey, next);
  };

  const resetDraft = () => {
    setDraft(emptyDraft);
    clearDraft(patientDraftKey);
  };

  const openCreate = () => {
    setMode("create");
    setOpen(true);
    const saved = readDraft<PatientDraft>(patientDraftKey) ?? emptyDraft;
    setDraft(saved);
  };

  const openEdit = () => {
    if (!selected) {
      return;
    }
    setMode("edit");
    setDraft({
      name: selected.name,
      age: selected.age,
      gender: selected.gender,
      diagnosis: selected.diagnosis,
      stage: selected.stage,
      robotId: selected.robotId,
      bedNo: selected.bedNo,
      createdBy: selected.createdBy,
      note: selected.note
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!draft.name || !draft.diagnosis) {
      return;
    }

    if (mode === "create") {
      await createMutation.mutateAsync(draft);
      resetDraft();
    } else if (selected) {
      await updateMutation.mutateAsync({ id: selected.id, patch: draft });
    }
    setOpen(false);
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
    if (!selected) {
      return;
    }

    await deleteMutation.mutateAsync(selected.id);
    setDeleteOpen(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        eyebrow="患者档案管理 > 基础档案"
        title="基础档案"
        description="支持患者档案检索、右侧详情预览、新增档案与编辑删除操作。"
        className="mb-1"
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/patients/base/create">
                <ArrowRight className="h-4 w-4" />
                进入新建页
              </Link>
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              新增档案
            </Button>
          </>
        }
      />

      <FilterBar
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

      <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1.8fr)_360px]">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60">
            <CardTitle>患者列表</CardTitle>
            {selected ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={openEdit}>
                  <Pencil className="h-4 w-4" />
                  编辑
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
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

        <DetailPanel title="患者档案" className="h-full pt-1">
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
      </div>

      <DialogFormShell
        open={open}
        onOpenChange={setOpen}
        title={mode === "create" ? "新增档案" : "编辑档案"}
        description="表单支持草稿保存，下次进入会恢复已保留内容。"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="姓名" required>
            <Input value={draft.name} onChange={(event) => persistDraft({ name: event.target.value })} />
          </Field>
          <Field label="年龄" required>
            <Input
              type="number"
              value={draft.age}
              onChange={(event) => persistDraft({ age: Number(event.target.value) })}
            />
          </Field>
          <Field label="性别" required>
            <select
              className="native-select"
              value={draft.gender}
              onChange={(event) => persistDraft({ gender: event.target.value as "男" | "女" })}
            >
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </Field>
          <Field label="病种" required>
            <Input
              value={draft.diagnosis}
              onChange={(event) => persistDraft({ diagnosis: event.target.value })}
            />
          </Field>
          <Field label="阶段">
            <Input value={draft.stage} onChange={(event) => persistDraft({ stage: event.target.value })} />
          </Field>
          <Field label="设备机器人ID">
            <Input value={draft.robotId} onChange={(event) => persistDraft({ robotId: event.target.value })} />
          </Field>
          <Field label="病床号">
            <Input value={draft.bedNo} onChange={(event) => persistDraft({ bedNo: event.target.value })} />
          </Field>
          <Field label="建档人">
            <Input value={draft.createdBy} onChange={(event) => persistDraft({ createdBy: event.target.value })} />
          </Field>
        </div>
        <Field label="备注说明">
          <Textarea value={draft.note} onChange={(event) => persistDraft({ note: event.target.value })} />
        </Field>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => writeDraft(patientDraftKey, draft)}>
            草稿保存
          </Button>
          <Button type="button" variant="outline" onClick={resetDraft}>
            清空
          </Button>
        </div>
      </DialogFormShell>

      <DialogFormShell
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="删除患者档案"
        description={`确认删除“${selected?.name ?? ""}”后，列表会立即刷新，并记录最近处理日志。`}
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
