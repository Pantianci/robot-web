import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCreatePatientMutation, useDeletePatientMutation, usePatientsQuery, useUpdatePatientMutation } from "@/lib/hooks";
import { clearDraft, readDraft, writeDraft } from "@/lib/storage";
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
  const [selectedId, setSelectedId] = useState<string | null>(patients[0]?.id ?? null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [draft, setDraft] = useState<PatientDraft>(readDraft<PatientDraft>(patientDraftKey) ?? emptyDraft);

  const filtered = useMemo(
    () =>
      patients.filter((item) =>
        [item.name, item.diagnosis, item.stage, item.bedNo, item.createdBy]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [patients, query]
  );

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        eyebrow="患者档案管理 > 基础档案"
        title="基础档案"
        description="支持患者档案检索、右侧详情预览、新增档案与编辑删除操作。"
        className="mb-1"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            新增档案
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
        <Field label="阶段">
          <select className="native-select">
            <option>全部</option>
            {[...new Set(patients.map((item) => item.stage))].map((stage) => (
              <option key={stage}>{stage}</option>
            ))}
          </select>
        </Field>
        <Field label="病床号">
          <Input placeholder="12床" />
        </Field>
        <Field label="建档人">
          <Input placeholder="王医生" />
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
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(selected.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            {filtered.length ? (
              <Table className="min-w-full">
                <TableHeader>
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
                  {filtered.map((item) => (
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
                  { label: "建档时间", value: formatDateTime(selected.createdAt) }
                ]}
              />
              <Card className="border-border/60 bg-surface-50 shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">评估备注</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm leading-7 text-muted-foreground">
                  {selected.note}
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
    </div>
  );
}
