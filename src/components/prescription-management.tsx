import { Link, useNavigate } from "@tanstack/react-router";
import { FileOutput, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  useDeleteCurrentActionMutation,
  useDeletePlanMutation,
  useDeletePrescriptionMutation,
  useCurrentActionsQuery,
  usePatientsQuery,
  usePlansQuery,
  usePrescriptionsQuery
} from "@/lib/hooks";
import {
  buildPatientSummary,
  currentActionWorkspaceContextKey,
  defaultPatientWorkspace,
  patientWorkspaceContextKey,
  planWorkspaceContextKey,
  prescriptionWorkspaceContextKey
} from "@/lib/patient-context";
import { readState, writeState } from "@/lib/storage";
import { formatDateTime } from "@/lib/utils";
import type { CurrentAction, Patient, Prescription, RehabPlan } from "@/lib/types";
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

type ViewMode = "plans" | "current" | "prescriptions";

type WorkspaceContext = {
  selectedId?: string;
  patientId: string;
  patientName: string;
};

const pageSize = 8;

function resolveWorkspacePatient(
  patients: Patient[],
  context: WorkspaceContext | null,
  view: ViewMode,
  plans: RehabPlan[],
  currentActions: CurrentAction[],
  prescriptions: Prescription[]
) {
  const hasViewData = (patientId: string) => {
    if (view === "plans") {
      return plans.some((item) => item.patientId === patientId);
    }

    if (view === "current") {
      return (
        currentActions.some((item) => item.patientId === patientId) ||
        prescriptions.some((item) => item.patientId === patientId)
      );
    }

    return prescriptions.some((item) => item.patientId === patientId);
  };

  const workspacePatient = patients.find((item) => item.id === context?.patientId) ?? null;
  const defaultPatient = patients.find((item) => item.id === defaultPatientWorkspace.patientId) ?? null;
  const firstPatientWithData = patients.find((item) => hasViewData(item.id)) ?? null;

  return (
    (workspacePatient && hasViewData(workspacePatient.id) ? workspacePatient : null) ??
    (defaultPatient && hasViewData(defaultPatient.id) ? defaultPatient : null) ??
    firstPatientWithData ??
    workspacePatient ??
    defaultPatient ??
    patients[0] ??
    null
  );
}

function buildExampleActionsFromPrescription(prescription: Prescription | null): CurrentAction[] {
  if (!prescription) {
    return [];
  }

  return prescription.movements.map((movement, index) => ({
    id: `example-${prescription.id}-${movement.id}`,
    patientId: prescription.patientId,
    title: movement.name,
    part: movement.name.includes("肩") ? "肩关节" : "训练部位",
    duration: movement.duration,
    intensity: index === 0 ? "中等" : "低",
    note: `示例动作：${movement.name}，角度 ${movement.angle}，次数 ${movement.repetitions}。`,
    updatedAt: prescription.issuedAt
  }));
}

function PatientSummaryCard({
  patient,
  plan,
  prescription,
  currentAction
}: {
  patient: Patient | null;
  plan: RehabPlan | null;
  prescription: Prescription | null;
  currentAction: CurrentAction | null;
}) {
  const summary = buildPatientSummary(patient, plan, prescription, currentAction);

  return (
    <Card className="border-border/70 bg-white shadow-none">
      <CardContent className="overflow-x-auto p-5">
        <div className="grid min-w-[1180px] grid-cols-[minmax(180px,1.5fr)_minmax(180px,1.35fr)_repeat(7,minmax(92px,1fr))] items-center gap-6 whitespace-nowrap">
          {summary.map((item, index) => (
            <div key={`${item.label}-${index}`} className="min-w-0">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p
                className={
                  index === 0
                    ? "mt-1 truncate text-2xl font-semibold text-surface-900"
                    : index === 1
                      ? "mt-1 truncate text-lg font-semibold text-primary"
                      : "mt-1 truncate text-sm font-medium text-surface-900"
                    }
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PaginationBar({
  total,
  page,
  totalPages,
  onPageChange
}: {
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (!total) {
    return null;
  }

  return (
    <div className="flex items-center justify-between border-t border-border/60 px-5 py-4 text-sm text-muted-foreground">
      <span>
        共 {total} 条，当前第 {page} / {totalPages} 页
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          上一页
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          下一页
        </Button>
      </div>
    </div>
  );
}

export function PrescriptionManagement({
  view
}: {
  view: ViewMode;
}) {
  const navigate = useNavigate();
  const { data: patients = [] } = usePatientsQuery();
  const { data: plans = [] } = usePlansQuery();
  const { data: currentActions = [] } = useCurrentActionsQuery();
  const { data: prescriptions = [] } = usePrescriptionsQuery();
  const deletePlanMutation = useDeletePlanMutation();
  const deleteCurrentActionMutation = useDeleteCurrentActionMutation();
  const deletePrescriptionMutation = useDeletePrescriptionMutation();

  const workspace = readState<WorkspaceContext>(patientWorkspaceContextKey);
  const patient = resolveWorkspacePatient(
    patients,
    workspace,
    view,
    plans,
    currentActions,
    prescriptions
  );
  const patientPlans = useMemo(
    () =>
      plans
        .filter((item) => item.patientId === patient?.id)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [patient?.id, plans]
  );
  const patientPrescriptions = useMemo(
    () =>
      prescriptions
        .filter((item) => item.patientId === patient?.id)
        .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()),
    [patient?.id, prescriptions]
  );
  const patientActions = useMemo(() => {
    const records = currentActions
      .filter((item) => item.patientId === patient?.id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    if (records.length) {
      return records;
    }

    return buildExampleActionsFromPrescription(patientPrescriptions[0] ?? null);
  }, [currentActions, patient?.id, patientPrescriptions]);

  const [keyword, setKeyword] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(patientPlans[0]?.id ?? null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(patientActions[0]?.id ?? null);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(
    patientPrescriptions[0]?.id ?? null
  );
  const [planPage, setPlanPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [prescriptionPage, setPrescriptionPage] = useState(1);
  const [deletePlanTarget, setDeletePlanTarget] = useState<RehabPlan | null>(null);
  const [deleteActionTarget, setDeleteActionTarget] = useState<CurrentAction | null>(null);
  const [deletePrescriptionTarget, setDeletePrescriptionTarget] = useState<Prescription | null>(null);

  useEffect(() => {
    if (patient) {
      writeState(patientWorkspaceContextKey, {
        selectedId: patient.id,
        patientId: patient.id,
        patientName: patient.name
      });
    }
  }, [patient]);

  useEffect(() => {
    if (!patientPlans.length) {
      setSelectedPlanId(null);
      return;
    }

    if (!selectedPlanId || !patientPlans.some((item) => item.id === selectedPlanId)) {
      setSelectedPlanId(patientPlans[0]?.id ?? null);
    }
  }, [patientPlans, selectedPlanId]);

  useEffect(() => {
    if (!patientActions.length) {
      setSelectedActionId(null);
      return;
    }

    if (!selectedActionId || !patientActions.some((item) => item.id === selectedActionId)) {
      setSelectedActionId(patientActions[0]?.id ?? null);
    }
  }, [patientActions, selectedActionId]);

  useEffect(() => {
    if (!patientPrescriptions.length) {
      setSelectedPrescriptionId(null);
      return;
    }

    if (
      !selectedPrescriptionId ||
      !patientPrescriptions.some((item) => item.id === selectedPrescriptionId)
    ) {
      setSelectedPrescriptionId(patientPrescriptions[0]?.id ?? null);
    }
  }, [patientPrescriptions, selectedPrescriptionId]);

  const filteredPlans = useMemo(
    () =>
      patientPlans.filter((item) =>
        [item.id, item.type, item.goal, item.risk, item.doctor]
          .join(" ")
          .toLowerCase()
          .includes(keyword.toLowerCase())
      ),
    [keyword, patientPlans]
  );
  const filteredActions = useMemo(
    () =>
      patientActions.filter((item) =>
        [item.title, item.part, item.note]
          .join(" ")
          .toLowerCase()
          .includes(keyword.toLowerCase())
      ),
    [keyword, patientActions]
  );
  const filteredPrescriptions = useMemo(
    () =>
      patientPrescriptions.filter((item) =>
        [item.id, item.sequenceName, item.goal, item.risk, item.doctor]
          .join(" ")
          .toLowerCase()
          .includes(keyword.toLowerCase())
      ),
    [keyword, patientPrescriptions]
  );

  const selectedPlan = filteredPlans.find((item) => item.id === selectedPlanId) ?? filteredPlans[0] ?? null;
  const selectedAction =
    filteredActions.find((item) => item.id === selectedActionId) ?? filteredActions[0] ?? null;
  const selectedPrescription =
    filteredPrescriptions.find((item) => item.id === selectedPrescriptionId) ??
    filteredPrescriptions[0] ??
    null;

  const planPages = Math.max(1, Math.ceil(filteredPlans.length / pageSize));
  const currentPages = Math.max(1, Math.ceil(filteredActions.length / pageSize));
  const prescriptionPages = Math.max(1, Math.ceil(filteredPrescriptions.length / pageSize));
  const safePlanPage = Math.min(planPage, planPages);
  const safeCurrentPage = Math.min(currentPage, currentPages);
  const safePrescriptionPage = Math.min(prescriptionPage, prescriptionPages);
  const pagedPlans = filteredPlans.slice((safePlanPage - 1) * pageSize, safePlanPage * pageSize);
  const pagedActions = filteredActions.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);
  const pagedPrescriptions = filteredPrescriptions.slice(
    (safePrescriptionPage - 1) * pageSize,
    safePrescriptionPage * pageSize
  );

  const resetFilter = () => {
    setKeyword("");
    setPlanPage(1);
    setCurrentPage(1);
    setPrescriptionPage(1);
  };

  const handleDeletePlan = async () => {
    if (!deletePlanTarget) {
      return;
    }

    await deletePlanMutation.mutateAsync(deletePlanTarget.id);
    setDeletePlanTarget(null);
  };

  const handleDeleteAction = async () => {
    if (!deleteActionTarget) {
      return;
    }

    await deleteCurrentActionMutation.mutateAsync(deleteActionTarget.id);
    setDeleteActionTarget(null);
  };

  const handleDeletePrescription = async () => {
    if (!deletePrescriptionTarget) {
      return;
    }

    await deletePrescriptionMutation.mutateAsync(deletePrescriptionTarget.id);
    setDeletePrescriptionTarget(null);
  };

  const summaryPlan = selectedPlan ?? patientPlans[0] ?? null;
  const summaryPrescription = selectedPrescription ?? patientPrescriptions[0] ?? null;
  const summaryAction = selectedAction ?? patientActions[0] ?? null;

  const planActions = (
    <>
      <Button variant="secondary">
        <Sparkles className="h-4 w-4" />
        AI生成方案
      </Button>
      <Button asChild>
        <Link to="/patients/plans/create">
          <Plus className="h-4 w-4" />
          新增方案
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link to="/patients/plans/export" className="flex items-center gap-2">
          <FileOutput className="h-4 w-4" />
          导出方案
        </Link>
      </Button>
    </>
  );

  const currentActionsButtons = (
    <>
      <Button asChild>
        <Link to="/patients/current/create">
          <Plus className="h-4 w-4" />
          新增单体动作
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link to="/patients/current/export">
          <FileOutput className="h-4 w-4" />
          导出单体动作
        </Link>
      </Button>
    </>
  );

  const prescriptionActions = (
    <>
      <Button variant="secondary">
        <Sparkles className="h-4 w-4" />
        AI生成处方
      </Button>
      <Button asChild>
        <Link to="/patients/prescriptions/create">
          <Plus className="h-4 w-4" />
          新增运动处方
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link to="/patients/prescriptions/export">
          <FileOutput className="h-4 w-4" />
          导出运动处方
        </Link>
      </Button>
    </>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        eyebrow={`患者档案管理 > ${view === "plans" ? "康复方案" : view === "current" ? "当前处方" : "处方列表"}`}
        title={view === "plans" ? "康复方案" : view === "current" ? "当前处方" : "运动处方列表"}
        description={
          view === "plans"
            ? "当前为基础档案中选中患者的专属康复方案页，默认展示张三。"
            : view === "current"
              ? "当前为基础档案中选中患者的专属单体动作处方页，默认展示张三。"
              : "当前为基础档案中选中患者的专属运动处方页，默认展示张三。"
        }
        className="mb-1"
        actions={view === "plans" ? planActions : view === "current" ? currentActionsButtons : prescriptionActions}
      />

      <PatientSummaryCard
        patient={patient}
        plan={summaryPlan}
        prescription={summaryPrescription}
        currentAction={summaryAction}
      />

      <FilterBar
        actions={
          <>
            <Button variant="secondary" onClick={resetFilter}>
              重置
            </Button>
            <Button onClick={() => {
              setPlanPage(1);
              setCurrentPage(1);
              setPrescriptionPage(1);
            }}>
              查询
            </Button>
          </>
        }
      >
        <Field label="关键字检索">
          <Input
            value={keyword}
            placeholder={
              view === "current" ? "动作名称 / 风险 / 说明" : "编号 / 类型 / 医生 / 风险"
            }
            onChange={(event) => setKeyword(event.target.value)}
          />
        </Field>
      </FilterBar>

      {view === "plans" ? (
        <CollapsibleSplitLayout
          label="方案"
          sideWidthClassName="w-full xl:w-[360px]"
          main={
            <Card className="flex min-h-0 flex-col overflow-hidden">
              <CardHeader className="border-b border-border/60">
                <CardTitle>方案列表</CardTitle>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                {filteredPlans.length ? (
                  <Table className="min-w-full">
                    <TableHeader className="sticky top-0 z-10 bg-white">
                      <TableRow>
                        <TableHead>方案编号</TableHead>
                        <TableHead>确认医生</TableHead>
                        <TableHead>处方数</TableHead>
                        <TableHead>采纳状态</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>创建时间</TableHead>
                        <TableHead>风险</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedPlans.map((item) => {
                        const prescriptionCount = patientPrescriptions.filter(
                          (prescription) => prescription.patientId === item.patientId
                        ).length;
                        return (
                          <TableRow
                            key={item.id}
                            className="cursor-pointer"
                            data-state={selectedPlan?.id === item.id ? "selected" : undefined}
                            onClick={() => setSelectedPlanId(item.id)}
                          >
                            <TableCell className="font-medium">{item.id}</TableCell>
                            <TableCell>{item.doctor}</TableCell>
                            <TableCell>{prescriptionCount}</TableCell>
                            <TableCell>
                              <Badge>{item.status === "已同步" ? "已采纳" : "待采纳"}</Badge>
                            </TableCell>
                            <TableCell>{item.type}</TableCell>
                            <TableCell>{formatDateTime(item.updatedAt)}</TableCell>
                            <TableCell>{item.risk}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    writeState(planWorkspaceContextKey, { planId: item.id });
                                    setSelectedPlanId(item.id);
                                    navigate({ to: "/patients/plans/edit" });
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                  编辑
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-rose-600 hover:text-rose-700"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setDeletePlanTarget(item);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  删除
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-6">
                    <EmptyState title="暂无康复方案" />
                  </div>
                )}
              </CardContent>
              <PaginationBar
                total={filteredPlans.length}
                page={safePlanPage}
                totalPages={planPages}
                onPageChange={setPlanPage}
              />
            </Card>
          }
          side={
            <DetailPanel title="智能推荐康复方案" className="h-full">
              {selectedPlan ? (
                <>
                  <PropertyList
                    items={[
                      { label: "方案编号", value: selectedPlan.id },
                      { label: "确认医生", value: selectedPlan.doctor },
                      { label: "方案类型", value: selectedPlan.type },
                      { label: "风险等级", value: selectedPlan.risk },
                      { label: "最近处理", value: formatDateTime(selectedPlan.updatedAt) }
                    ]}
                  />
                  <SectionCard title="康复方案">
                    <p className="text-sm leading-7 text-muted-foreground">{selectedPlan.aiReference}</p>
                  </SectionCard>
                  <SectionCard title="训练目标">
                    <div className="space-y-3">
                      {[
                        selectedPlan.goal,
                        "改善关节活动度和疼痛反馈，建立稳定训练节奏。",
                        "结合病区观察结果逐步调整强度和训练频率。"
                      ].map((item) => (
                        <div key={item} className="rounded-[1rem] border border-border/70 bg-surface-50 px-4 py-3 text-sm leading-7 text-surface-900">
                          {item}
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                  <SectionCard title="最近操作记录">
                    <p className="text-sm leading-7 text-muted-foreground">
                      {`${selectedPlan.doctor} 于 ${formatDateTime(selectedPlan.updatedAt)} 更新了方案类型、风险与说明。`}
                    </p>
                  </SectionCard>
                </>
              ) : (
                <EmptyState title="请选择方案" />
              )}
            </DetailPanel>
          }
        />
      ) : null}

      {view === "current" ? (
        <CollapsibleSplitLayout
          label="动作"
          sideWidthClassName="w-full xl:w-[360px]"
          main={
            <Card className="flex min-h-0 flex-col overflow-hidden">
              <CardHeader className="border-b border-border/60">
                <CardTitle>当前标准动作处方列表</CardTitle>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                {filteredActions.length ? (
                  <Table className="min-w-full">
                    <TableHeader className="sticky top-0 z-10 bg-white">
                      <TableRow>
                        <TableHead>顺序号</TableHead>
                        <TableHead>动作</TableHead>
                        <TableHead>时间</TableHead>
                        <TableHead>次数</TableHead>
                        <TableHead>方向</TableHead>
                        <TableHead>角度</TableHead>
                        <TableHead>风险</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedActions.map((item, index) => (
                        <TableRow
                          key={item.id}
                          className="cursor-pointer"
                          data-state={selectedAction?.id === item.id ? "selected" : undefined}
                          onClick={() => setSelectedActionId(item.id)}
                        >
                          <TableCell>{(safeCurrentPage - 1) * pageSize + index + 1}</TableCell>
                          <TableCell className="font-medium">{item.title}</TableCell>
                          <TableCell>{item.duration}</TableCell>
                          <TableCell>{item.intensity === "中等" ? "8 次" : "10 次"}</TableCell>
                          <TableCell>{item.part === "肩带" ? "稳定" : "外展"}</TableCell>
                          <TableCell>{item.title.includes("外展") ? "30-60 度" : "10-20 度"}</TableCell>
                          <TableCell>{item.intensity === "中等" ? "中风险" : "低风险"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  writeState(currentActionWorkspaceContextKey, { currentActionId: item.id });
                                  setSelectedActionId(item.id);
                                  navigate({ to: "/patients/current/edit" });
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
                                  setDeleteActionTarget(item);
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
                    <EmptyState title="暂无当前处方动作" />
                  </div>
                )}
              </CardContent>
              <PaginationBar
                total={filteredActions.length}
                page={safeCurrentPage}
                totalPages={currentPages}
                onPageChange={setCurrentPage}
              />
            </Card>
          }
          side={
            <DetailPanel title="动作详情与视频预览" className="h-full">
              {selectedAction ? (
                <>
                  <SectionCard title="康复训练教学视频">
                    <div className="rounded-[1.25rem] border border-border/70 bg-surface-950 px-4 py-5 text-white">
                      <p className="text-base font-semibold">
                        {selectedPrescription?.videoTitle ?? "核心稳定性训练 - 基础动作教学"}
                      </p>
                      <p className="mt-2 text-sm text-white/70">
                        时长：{selectedPrescription?.videoDuration ?? "15分30秒"} | 难度：初级
                      </p>
                      <div className="mt-5 rounded-full bg-white/10 px-4 py-2 text-xs text-white/80">
                        05:30 / {selectedPrescription?.videoDuration ?? "15:30"}
                      </div>
                    </div>
                  </SectionCard>
                  <PropertyList
                    items={[
                      { label: "动作说明", value: selectedAction.note },
                      { label: "动作部位", value: selectedAction.part },
                      { label: "执行时间", value: selectedAction.duration },
                      { label: "执行强度", value: selectedAction.intensity },
                      { label: "最近处理", value: formatDateTime(selectedAction.updatedAt) }
                    ]}
                  />
                  <SectionCard title="最近处理记录">
                    <p className="text-sm leading-7 text-muted-foreground">
                      {`护理侧于 ${formatDateTime(selectedAction.updatedAt)} 更新了动作参数与注意事项。`}
                    </p>
                  </SectionCard>
                </>
              ) : (
                <EmptyState title="请选择一个动作" />
              )}
            </DetailPanel>
          }
        />
      ) : null}

      {view === "prescriptions" ? (
        <CollapsibleSplitLayout
          label="处方"
          sideWidthClassName="w-full xl:w-[360px]"
          main={
            <Card className="flex min-h-0 flex-col overflow-hidden">
              <CardHeader className="border-b border-border/60">
                <CardTitle>处方列表</CardTitle>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                {filteredPrescriptions.length ? (
                  <Table className="min-w-full">
                    <TableHeader className="sticky top-0 z-10 bg-white">
                      <TableRow>
                        <TableHead>处方ID</TableHead>
                        <TableHead>确认医生</TableHead>
                        <TableHead>包含动作数</TableHead>
                        <TableHead>采纳状态</TableHead>
                        <TableHead>阶段</TableHead>
                        <TableHead>创建时间</TableHead>
                        <TableHead>训练数据查看</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedPrescriptions.map((item) => (
                        <TableRow
                          key={item.id}
                          className="cursor-pointer"
                          data-state={selectedPrescription?.id === item.id ? "selected" : undefined}
                          onClick={() => setSelectedPrescriptionId(item.id)}
                        >
                          <TableCell className="font-medium">{item.id}</TableCell>
                          <TableCell>{item.doctor}</TableCell>
                          <TableCell>{item.movements.length}</TableCell>
                          <TableCell>
                            <Badge>{item.status === "已完成" ? "已采纳" : "待采纳"}</Badge>
                          </TableCell>
                          <TableCell>{item.stage}</TableCell>
                          <TableCell>{formatDateTime(item.issuedAt)}</TableCell>
                          <TableCell>{item.goal}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  writeState(prescriptionWorkspaceContextKey, {
                                    prescriptionId: item.id
                                  });
                                  setSelectedPrescriptionId(item.id);
                                  navigate({ to: "/patients/prescriptions/edit" });
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                                编辑
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-rose-600 hover:text-rose-700"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setDeletePrescriptionTarget(item);
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
                    <EmptyState title="暂无运动处方" />
                  </div>
                )}
              </CardContent>
              <PaginationBar
                total={filteredPrescriptions.length}
                page={safePrescriptionPage}
                totalPages={prescriptionPages}
                onPageChange={setPrescriptionPage}
              />
            </Card>
          }
          side={
            <DetailPanel title="当前处方详情" className="h-full">
              {selectedPrescription ? (
                <>
                  <PropertyList
                    items={[
                      { label: "处方ID", value: selectedPrescription.id },
                      { label: "确认医生", value: selectedPrescription.doctor },
                      { label: "处方执行状态", value: selectedPrescription.status },
                      { label: "参数摘要", value: `${selectedPrescription.movements.length} 个动作 / ${selectedPrescription.frequency}` },
                      { label: "视频名称", value: selectedPrescription.videoTitle },
                      { label: "最近操作", value: formatDateTime(selectedPrescription.issuedAt) }
                    ]}
                  />
                  <SectionCard title="处方说明">
                    <p className="text-sm leading-7 text-muted-foreground">{selectedPrescription.note}</p>
                  </SectionCard>
                  <SectionCard title="动作视频与参数">
                    <div className="space-y-3">
                      {selectedPrescription.movements.map((movement) => (
                        <div
                          key={movement.id}
                          className="rounded-[1rem] border border-border/70 bg-surface-50 px-4 py-3"
                        >
                          <p className="text-sm font-medium text-surface-900">{movement.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            角度 {movement.angle} · 次数 {movement.repetitions} · 时长 {movement.duration}
                          </p>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                  <SectionCard title="执行状态与处理记录">
                    <p className="text-sm leading-7 text-muted-foreground">
                      {`${selectedPrescription.doctor} 于 ${formatDateTime(selectedPrescription.issuedAt)} 提交处方，当前状态为${selectedPrescription.status}。`}
                    </p>
                  </SectionCard>
                </>
              ) : (
                <EmptyState title="请选择一条处方" />
              )}
            </DetailPanel>
          }
        />
      ) : null}

      <DialogFormShell
        open={Boolean(deletePlanTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletePlanTarget(null);
          }
        }}
        title="删除康复方案"
        description={`确认删除“${deletePlanTarget?.id ?? ""}”后，列表会立即刷新。`}
        onSubmit={handleDeletePlan}
        submitLabel="确认删除"
      >
        <p className="text-sm leading-7 text-muted-foreground">当前原型会直接从本地列表中移除该康复方案。</p>
      </DialogFormShell>

      <DialogFormShell
        open={Boolean(deleteActionTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteActionTarget(null);
          }
        }}
        title="删除当前处方动作"
        description={`确认删除“${deleteActionTarget?.title ?? ""}”后，列表会立即刷新。`}
        onSubmit={handleDeleteAction}
        submitLabel="确认删除"
      >
        <p className="text-sm leading-7 text-muted-foreground">当前原型会直接从本地列表中移除该动作。</p>
      </DialogFormShell>

      <DialogFormShell
        open={Boolean(deletePrescriptionTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletePrescriptionTarget(null);
          }
        }}
        title="删除运动处方"
        description={`确认删除“${deletePrescriptionTarget?.id ?? ""}”后，列表会立即刷新。`}
        onSubmit={handleDeletePrescription}
        submitLabel="确认删除"
      >
        <p className="text-sm leading-7 text-muted-foreground">当前原型会直接从本地列表中移除该运动处方。</p>
      </DialogFormShell>

    </div>
  );
}
