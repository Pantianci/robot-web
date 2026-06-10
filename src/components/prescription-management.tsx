import { useNavigate } from "@tanstack/react-router";
import { Eye, FileOutput, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  useCreatePlanMutation,
  useCreatePrescriptionMutation,
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
import {
  isPageFullySelected,
  isPagePartiallySelected,
  togglePageSelection,
  toggleSelection
} from "@/lib/table-selection";
import { formatDateTime } from "@/lib/utils";
import type { CurrentAction, Patient, Prescription, RehabPlan } from "@/lib/types";
import { CollapsibleSplitLayout } from "@/components/collapsible-side-panel";
import { DetailPanel } from "@/components/detail-panel";
import { DialogFormShell } from "@/components/dialog-form-shell";
import { EmptyState } from "@/components/empty-state";
import { Field } from "@/components/field";
import { FilterBar } from "@/components/filter-bar";
import { PageBreadcrumbs, PageHeader } from "@/components/page-header";
import { PropertyList } from "@/components/property-list";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";

type ViewMode = "plans" | "current" | "prescriptions";
type ManagementScope = "all" | "patient";

type WorkspaceContext = {
  selectedId?: string;
  patientId: string;
  patientName: string;
};

type AiPlanDraft = {
  patientId: string;
  goal: string;
  risk: RehabPlan["risk"];
  focus: string;
  note: string;
};

type AiPrescriptionDraft = {
  planId: string;
  goal: string;
  frequency: string;
  focus: string;
  note: string;
};

type SimulatedGenerationStatus = "生成中" | "待生成";

type PlanGenerationSnapshot = {
  patient: Patient;
  plan: RehabPlan;
};

type PrescriptionGenerationSnapshot = {
  patient: Patient;
  plan: RehabPlan;
  prescription: Prescription;
};

const pageSize = 8;

function navigateTo(navigate: ReturnType<typeof useNavigate>, to: string) {
  navigate({ to: to as never });
}

function writePatientWorkspace(patient: Patient) {
  writeState(patientWorkspaceContextKey, {
    selectedId: patient.id,
    patientId: patient.id,
    patientName: patient.name
  });
}

function patientPlansPath(patientId: string) {
  return `/patients/${patientId}/plans`;
}

function patientPlanPrescriptionsPath(patientId: string, planId: string) {
  return `/patients/${patientId}/plans/${planId}/prescriptions`;
}

function patientPrescriptionCurrentPath(patientId: string, planId: string, prescriptionId: string) {
  return `/patients/${patientId}/plans/${planId}/prescriptions/${prescriptionId}/current`;
}

function ensureDoctorSuffix(name: string) {
  return name.endsWith("医生") ? name : `${name}医生`;
}

function inferAiPlanType(patient: Patient) {
  if (patient.diagnosis.includes("偏瘫")) {
    return "偏瘫协同恢复";
  }

  if (patient.diagnosis.includes("膝") || patient.diagnosis.includes("步态")) {
    return "步态稳定强化";
  }

  if (patient.diagnosis.includes("肩")) {
    return "肩关节功能恢复";
  }

  return "基础功能恢复";
}

function buildAiPlanDraft(patient: Patient | null, existingPlan: RehabPlan | null): AiPlanDraft {
  return {
    patientId: patient?.id ?? "",
    goal: existingPlan?.goal ?? `${patient?.stage ?? "当前阶段"}重点恢复训练`,
    risk: existingPlan?.risk ?? "中风险",
    focus: patient ? `${patient.diagnosis}相关功能提升与疼痛控制` : "",
    note: patient ? `结合${patient.bedNo}床当前观察情况，补充训练节奏和医护协同重点。` : ""
  };
}

function buildAiPlanPayload({
  patient,
  existingPlan,
  draft
}: {
  patient: Patient;
  existingPlan: RehabPlan | null;
  draft: AiPlanDraft;
}) {
  return {
    patientId: patient.id,
    patientName: patient.name,
    type: existingPlan?.type ?? inferAiPlanType(patient),
    goal: draft.goal.trim(),
    risk: draft.risk,
    description: `AI 根据 ${patient.diagnosis}、${patient.stage} 自动生成方案。训练重点：${draft.focus.trim()}。${draft.note.trim()}`,
    doctor: existingPlan?.doctor ?? (patient.createdBy.replace(/医生$/, "") || "李明"),
    nurse: existingPlan?.nurse ?? "周宁",
    deviceId: patient.robotId || existingPlan?.deviceId || "设备待分配",
    stage: patient.stage,
    aiReference: `AI 已结合基础档案、阶段信息和补充说明生成建议方案，当前关注：${draft.focus.trim()}。风险等级：${draft.risk}。`,
    status: "待同步" as const
  };
}

function buildAiPrescriptionDraft(plan: RehabPlan | null): AiPrescriptionDraft {
  return {
    planId: plan?.id ?? "",
    goal: plan?.goal ?? "围绕当前康复方案生成运动处方",
    frequency: "3-5 次/周",
    focus: plan ? `${plan.type}重点动作组合` : "",
    note: plan ? `围绕方案 ${plan.id} 自动生成，提交前可继续补充执行要点。` : ""
  };
}

function buildAiPrescriptionMovements(plan: RehabPlan) {
  if (plan.type.includes("步态") || plan.goal.includes("步")) {
    return [
      { id: `mv-ai-${plan.id}-1`, name: "踝泵训练", angle: "15-20 度", repetitions: "20 次", duration: "05:00" },
      { id: `mv-ai-${plan.id}-2`, name: "膝屈伸训练", angle: "20-45 度", repetitions: "12 次", duration: "06:00" },
      { id: `mv-ai-${plan.id}-3`, name: "负重步态训练", angle: "步态循环", repetitions: "8 次", duration: "08:00" }
    ];
  }

  if (plan.type.includes("偏瘫")) {
    return [
      { id: `mv-ai-${plan.id}-1`, name: "躯干稳定激活", angle: "中立位", repetitions: "10 次", duration: "05:30" },
      { id: `mv-ai-${plan.id}-2`, name: "坐站转换训练", angle: "前移重心", repetitions: "8 次", duration: "06:00" },
      { id: `mv-ai-${plan.id}-3`, name: "上肢前伸抓握", angle: "前伸 20-40 度", repetitions: "10 次", duration: "06:30" }
    ];
  }

  if (plan.type.includes("关节") || plan.goal.includes("活动度")) {
    return [
      { id: `mv-ai-${plan.id}-1`, name: "热疗前牵伸准备", angle: "小角度", repetitions: "8 次", duration: "04:30" },
      { id: `mv-ai-${plan.id}-2`, name: "肩关节被动活动", angle: "20-50 度", repetitions: "10 次", duration: "06:00" },
      { id: `mv-ai-${plan.id}-3`, name: "疼痛反馈监测训练", angle: "渐进角度", repetitions: "6 次", duration: "05:00" }
    ];
  }

  return [
    { id: `mv-ai-${plan.id}-1`, name: "肩胛稳定激活", angle: "10-20 度", repetitions: "10 次", duration: "05:00" },
    { id: `mv-ai-${plan.id}-2`, name: "肩外展训练", angle: "30-60 度", repetitions: "8 次", duration: "06:00" },
    { id: `mv-ai-${plan.id}-3`, name: "被动摆动", angle: "小角度", repetitions: "12 次", duration: "04:30" }
  ];
}

function openPatientBase(
  navigate: ReturnType<typeof useNavigate>,
  patient: Patient | null
) {
  if (patient) {
    writePatientWorkspace(patient);
  }
  navigateTo(navigate, "/patients/base");
}

function openPatientPlanList(
  navigate: ReturnType<typeof useNavigate>,
  patient: Patient,
  plan?: RehabPlan | null
) {
  writePatientWorkspace(patient);
  if (plan) {
    writeState(planWorkspaceContextKey, { planId: plan.id });
  }
  navigateTo(navigate, patientPlansPath(patient.id));
}

function openPatientPrescriptionList(
  navigate: ReturnType<typeof useNavigate>,
  patient: Patient,
  plan: RehabPlan,
  prescription?: Prescription | null
) {
  writePatientWorkspace(patient);
  writeState(planWorkspaceContextKey, { planId: plan.id });
  if (prescription) {
    writeState(prescriptionWorkspaceContextKey, { prescriptionId: prescription.id });
  }
  navigateTo(navigate, patientPlanPrescriptionsPath(patient.id, plan.id));
}

function openPatientCurrentActionList(
  navigate: ReturnType<typeof useNavigate>,
  patient: Patient,
  plan: RehabPlan,
  prescription: Prescription
) {
  writePatientWorkspace(patient);
  writeState(planWorkspaceContextKey, { planId: plan.id });
  writeState(prescriptionWorkspaceContextKey, { prescriptionId: prescription.id });
  navigateTo(navigate, patientPrescriptionCurrentPath(patient.id, plan.id, prescription.id));
}

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

function planRiskBadgeClass(risk: string) {
  if (risk.includes("高")) {
    return "bg-rose-100 text-rose-700";
  }

  if (risk.includes("中")) {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-emerald-100 text-emerald-700";
}

function resolvePlanAdoptionLabel(plan: RehabPlan, simulatedStatus?: SimulatedGenerationStatus) {
  return simulatedStatus ?? (plan.status === "已同步" ? "已采纳" : "待采纳");
}

function resolvePrescriptionAdoptionLabel(
  prescription: Prescription,
  simulatedStatus?: SimulatedGenerationStatus
) {
  return simulatedStatus ?? prescription.status;
}

function GenerationProgressDialog({
  open,
  title,
  description,
  onOpenChange,
  onCancel
}: {
  open: boolean;
  title: string;
  description: string;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,560px)]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-[1.25rem] border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between text-sm font-medium text-primary">
              <span>AI 正在生成</span>
              <span>约 5 秒</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
            </div>
          </div>
          <p className="text-sm leading-7 text-muted-foreground">
            关闭弹窗会保留当前条目并继续显示“生成中”。点击取消生成会把采纳状态改为“待生成”。
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭弹窗
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            取消生成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewConfirmDialog({
  open,
  title,
  description,
  items,
  confirmLabel,
  cancelLabel = "稍后处理",
  onOpenChange,
  onConfirm
}: {
  open: boolean;
  title: string;
  description: string;
  items: { label: string; value: string | number | string[] | undefined }[];
  confirmLabel: string;
  cancelLabel?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <PropertyList items={items} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RehabPlanPreviewDialog({
  plan,
  open,
  onOpenChange
}: {
  plan: RehabPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!plan) {
    return null;
  }

  const goals = [
    `围绕${plan.goal}，降低疼痛与疲劳反馈`,
    `改善${plan.stage}阶段活动度，逐步增加有效角度`,
    "增强核心肌群力量，提高关节稳定性",
    "改善平衡功能，降低跌倒风险",
    "恢复日常生活活动能力"
  ];
  const phases = [
    {
      title: "第一阶段（第1-2周）：疼痛控制与基础激活",
      items: ["呼吸训练与腹横肌激活", "无痛范围内的关节活动度训练", "仰卧位骨盆倾斜练习", "静态核心稳定性训练（平板支撑变式）"]
    },
    {
      title: "第二阶段（第3-4周）：力量建立与稳定性",
      items: ["动态核心训练（鸟狗式、死虫式）", "臀肌激活与力量训练", "渐进式抗阻训练", "平衡训练（单腿站立）"]
    },
    {
      title: "第三阶段（第5-6周）：功能整合与预防",
      items: ["功能性动作模式训练", "动态平衡与协调训练", "日常生活活动模拟", "自我管理教育"]
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[min(94vw,1040px)] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>康复方案预览</DialogTitle>
          <DialogDescription>预览智能引擎推荐康复方案。</DialogDescription>
        </DialogHeader>
        <div className="bg-white p-6 text-surface-800 md:p-8">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl">●</div>
              <div>
                <p className="text-2xl font-bold text-surface-900 md:text-3xl">智能引擎推荐康复方案</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  方案编号：{plan.id}　患者：{plan.patientName}
                </p>
              </div>
            </div>
            <div className="rounded-xl bg-emerald-50 px-5 py-3 text-lg font-bold text-emerald-600">
              匹配度：87%
            </div>
          </div>

          <div className="grid gap-7 py-7 xl:grid-cols-[1fr_0.95fr]">
            <div className="space-y-7">
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-2xl text-slate-700">▥</span>
                  <h3 className="text-xl font-bold text-surface-900">康复方案</h3>
                </div>
                <p className="text-base leading-8 text-muted-foreground">
                  基于患者{plan.stage}、{plan.type}与当前诊断信息，智能引擎推荐“{plan.goal}”综合方案。
                  该方案针对核心肌群力量减弱、平衡功能受损和疼痛控制问题，通过渐进式训练改善稳定性。
                </p>
              </section>

              <section>
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-2xl text-slate-700">◎</span>
                  <h3 className="text-xl font-bold text-surface-900">训练目标</h3>
                </div>
                <div className="space-y-4">
                  {goals.map((goal) => (
                    <div key={goal} className="flex gap-3 text-base leading-7 text-muted-foreground">
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">✓</span>
                      <span>{goal}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-2xl text-slate-700">▣</span>
                  <h3 className="text-xl font-bold text-surface-900">训练周期与频率</h3>
                </div>
                <div className="grid gap-4 rounded-2xl bg-slate-50 p-5 md:grid-cols-2">
                  {[
                    ["总周期", "6周"],
                    ["每周频率", "3-4次"],
                    ["每次时长", "30-45分钟"],
                    ["强度分级", plan.risk === "高风险" ? "初级" : "初级→中级"]
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">{label}：</span>
                      <span className="text-lg font-bold text-surface-900">{value}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-7">
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-2xl text-slate-700">▤</span>
                  <h3 className="text-xl font-bold text-surface-900">训练内容概要</h3>
                </div>
                <div className="space-y-4">
                  {phases.map((phase) => (
                    <div key={phase.title} className="rounded-2xl border-l-4 border-slate-600 bg-slate-50 p-5">
                      <p className="font-bold text-surface-900">{phase.title}</p>
                      <ul className="mt-4 space-y-2 text-sm leading-7 text-muted-foreground">
                        {phase.items.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-2xl text-slate-700">▲</span>
                  <h3 className="text-xl font-bold text-surface-900">注意事项与禁忌</h3>
                </div>
                <div className="rounded-2xl border-l-4 border-rose-500 bg-rose-50 p-5">
                  <ul className="space-y-2 text-sm leading-7 text-muted-foreground">
                    <li>• 避免腰椎过度前屈和旋转动作</li>
                    <li>• 训练中出现放射性疼痛应立即停止</li>
                    <li>• 根据疼痛反应调整训练强度</li>
                    <li>• 训练前后进行适当的拉伸和放松</li>
                  </ul>
                </div>
              </section>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PrescriptionPreviewDialog({
  prescription,
  open,
  onOpenChange
}: {
  prescription: Prescription | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!prescription) {
    return null;
  }

  const prescriptionDetails = [
    ["目的", prescription.goal],
    ["方式", prescription.sequenceName],
    ["强度", `抗阻运动：${prescription.risk === "高风险" ? "RPE 8-10 分" : "RPE 10-12 分"}`],
    ["时间", "每次 30-60min"],
    ["频率", prescription.frequency],
    ["运动量", "累计 150min/周"],
    ["运动进阶", "每 2 周调整 1 次运动量，先增加组数，再增加阻力"],
    ["周期", "8-12 周"]
  ];
  const contentText =
    prescription.note ||
    `热身：5 min（原地踏步、动态拉伸、关节活动度练习）；正式运动：${prescription.sequenceName}；整理运动：5 min 静态拉伸。`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[min(94vw,1080px)] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>处方预览</DialogTitle>
          <DialogDescription>预览当前运动处方详情。</DialogDescription>
        </DialogHeader>
        <div className="bg-white p-6 text-surface-800 md:p-8">
          <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="border-l-8 border-primary pl-5">
              <h2 className="text-3xl font-bold text-surface-900">当前处方详情：</h2>
            </div>
            <Badge className="w-fit rounded-full border border-emerald-500 bg-emerald-50 px-8 py-3 text-lg font-bold text-emerald-600">
              执行中
            </Badge>
          </div>

          <div className="grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-6">
              <div className="grid grid-cols-[120px_1fr] gap-y-5 text-lg">
                {[
                  ["患者姓名", prescription.patientName],
                  ["处方编号", prescription.id.toUpperCase()],
                  ["开具医生", prescription.doctor],
                  ["开具日期", formatDateTime(prescription.issuedAt).split(" ")[0]]
                ].map(([label, value]) => (
                  <div key={label} className="contents">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-bold text-surface-900">{value}</span>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                {prescriptionDetails.map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[120px_1fr] border-b border-slate-200 last:border-b-0">
                    <div className="bg-slate-50 px-5 py-4 text-center font-semibold text-muted-foreground">
                      {label}
                    </div>
                    <div className="px-5 py-4 font-semibold text-surface-900">{value}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                <p className="mb-2 text-lg font-bold text-muted-foreground">运动处方具体内容</p>
                <p className="text-base leading-8 text-surface-800">{contentText}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="overflow-hidden rounded-2xl bg-slate-200 shadow-soft">
                <div className="relative flex h-80 items-center justify-center bg-gradient-to-br from-slate-300 to-slate-500 text-white">
                  <div className="absolute inset-0 bg-black/10" />
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white/90 text-surface-900 shadow-panel">
                    <div className="ml-1 h-0 w-0 border-y-[18px] border-l-[28px] border-y-transparent border-l-surface-900" />
                  </div>
                  <div className="absolute bottom-8 left-8 right-8 text-center">
                    <p className="text-lg text-white/75">康复训练教学视频</p>
                    <p className="mt-3 text-3xl font-bold">{prescription.videoTitle}</p>
                    <p className="mt-4 text-lg">时长：{prescription.videoDuration} | 难度：初级</p>
                  </div>
                </div>
                <div className="flex flex-col gap-4 bg-white px-6 py-5 md:flex-row md:items-center">
                  <div className="flex gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">◀</div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">▶</div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">🔊</div>
                  </div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-[32%] rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-lg font-medium text-muted-foreground">05:30 / {prescription.videoDuration}</span>
                </div>
              </div>

              <div className="rounded-2xl border-2 border-primary bg-primary/5 p-5">
                <p className="text-xl font-bold text-primary">效果评估</p>
                <p className="mt-4 text-lg leading-8 text-surface-800">
                  12 周规律运动后：体重降低 6kg，平均睡眠时长增加 40min，动作完成度预计提升至 {prescription.movements.length >= 3 ? "90%" : "80%"} 以上。
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {prescription.movements.slice(0, 4).map((movement) => (
                  <div key={movement.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="font-semibold text-surface-900">{movement.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {movement.angle} · {movement.repetitions} · {movement.duration}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CurrentActionPreviewDialog({
  action,
  open,
  onOpenChange,
  prescription
}: {
  action: CurrentAction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescription?: Prescription | null;
}) {
  if (!action) {
    return null;
  }

  const actionDetails = [
    ["阶段", prescription?.stage ?? "术后一至六周"],
    ["时间", action.duration || "五分钟"],
    ["次数", action.intensity === "中等" ? "每日3轮 每轮10次" : "每日2轮 每轮10次"],
    ["方向", action.part === "肩带" ? "稳定" : "双侧"],
    ["角度", action.title.includes("外展") ? "30-60 度" : "自然"]
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[min(94vw,960px)] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>动作预览</DialogTitle>
          <DialogDescription>预览当前标准动作详情。</DialogDescription>
        </DialogHeader>
        <div className="bg-white p-6 text-surface-800 md:p-8">
          <div className="mb-8 border-l-8 border-primary pl-5">
            <h2 className="text-3xl font-bold text-surface-900 md:text-4xl">当前标准动作详情：{action.title}</h2>
          </div>

          <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-7">
              <div className="grid grid-cols-[120px_1fr] gap-y-8 text-xl">
                {actionDetails.map(([label, value]) => (
                  <div key={label} className="contents">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-bold text-surface-900">{value}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border-2 border-sky-100 bg-sky-50/60 p-6">
                <p className="text-2xl font-bold text-primary">处方记录</p>
                <p className="mt-6 text-lg leading-9 text-muted-foreground">
                  阶段 / 动作 / 时间 / 轮数 / 每轮次数 / 幅度 / 角度 / 方向
                </p>
                <p className="mt-4 text-base leading-8 text-surface-700">
                  {prescription?.sequenceName ?? "当前处方"} / {action.title} / {action.duration} / 3轮 / 10次 / {action.intensity} / {action.title.includes("外展") ? "30-60度" : "自然"} / {action.part}
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="overflow-hidden rounded-2xl bg-slate-200 shadow-soft">
                <div className="relative flex h-80 items-center justify-center bg-gradient-to-br from-slate-300 to-slate-500 text-white">
                  <div className="absolute inset-0 bg-black/10" />
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white/90 text-surface-900 shadow-panel">
                    <div className="ml-1 h-0 w-0 border-y-[18px] border-l-[28px] border-y-transparent border-l-surface-900" />
                  </div>
                  <div className="absolute bottom-8 left-8 right-8 text-center">
                    <p className="text-lg text-white/75">康复训练教学视频</p>
                    <p className="mt-3 text-3xl font-bold">核心稳定性训练 - 基础动作教学</p>
                    <p className="mt-4 text-lg">时长：15分30秒 | 难度：初级</p>
                  </div>
                </div>
                <div className="flex flex-col gap-4 bg-white px-6 py-5 md:flex-row md:items-center">
                  <div className="flex gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">◀</div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">▶</div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">🔊</div>
                  </div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-[32%] rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-lg font-medium text-muted-foreground">05:30 / 15:30</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <p className="text-lg font-bold text-surface-900">动作说明</p>
                <p className="mt-3 text-base leading-8 text-muted-foreground">{action.note}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RehabPlanManagement() {
  const navigate = useNavigate();
  const { data: patients = [] } = usePatientsQuery();
  const { data: plans = [] } = usePlansQuery();
  const { data: prescriptions = [] } = usePrescriptionsQuery();
  const createPlanMutation = useCreatePlanMutation();
  const createPrescriptionMutation = useCreatePrescriptionMutation();
  const deletePlanMutation = useDeletePlanMutation();
  const [keyword, setKeyword] = useState("");
  const [archiveDateFrom, setArchiveDateFrom] = useState("");
  const [archiveDateTo, setArchiveDateTo] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [aiPlanOpen, setAiPlanOpen] = useState(false);
  const [aiPlanDraft, setAiPlanDraft] = useState<AiPlanDraft>({
    patientId: "",
    goal: "",
    risk: "中风险",
    focus: "",
    note: ""
  });
  const [aiPrescriptionOpen, setAiPrescriptionOpen] = useState(false);
  const [aiPrescriptionDraft, setAiPrescriptionDraft] = useState<AiPrescriptionDraft>({
    planId: "",
    goal: "",
    frequency: "3-5 次/周",
    focus: "",
    note: ""
  });
  const [planGenerationStatus, setPlanGenerationStatus] = useState<Record<string, SimulatedGenerationStatus>>({});
  const [prescriptionGenerationStatus, setPrescriptionGenerationStatus] = useState<
    Record<string, SimulatedGenerationStatus>
  >({});
  const [planGeneration, setPlanGeneration] = useState<PlanGenerationSnapshot | null>(null);
  const [planPreview, setPlanPreview] = useState<PlanGenerationSnapshot | null>(null);
  const [prescriptionGeneration, setPrescriptionGeneration] =
    useState<PrescriptionGenerationSnapshot | null>(null);
  const [prescriptionPreview, setPrescriptionPreview] =
    useState<PrescriptionGenerationSnapshot | null>(null);
  const [chainPrescriptionPlan, setChainPrescriptionPlan] = useState<RehabPlan | null>(null);
  const [chainPrescriptionPatient, setChainPrescriptionPatient] = useState<Patient | null>(null);
  const [previewPlan, setPreviewPlan] = useState<RehabPlan | null>(null);
  const [deletePlanTarget, setDeletePlanTarget] = useState<RehabPlan | null>(null);

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [plans]
  );
  const stageOptions = useMemo(
    () => Array.from(new Set(sortedPlans.map((plan) => plan.stage))).filter(Boolean),
    [sortedPlans]
  );
  const filteredPlans = useMemo(
    () =>
      sortedPlans.filter((plan) => {
        const patient = patients.find((item) => item.id === plan.patientId) ?? null;
        const matchesKeyword =
          !keyword ||
          [
            plan.id,
            plan.patientName,
            patient?.id,
            plan.type,
            plan.goal,
            plan.risk,
            plan.doctor,
            plan.nurse
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(keyword.toLowerCase());
        const createdAt = patient ? new Date(patient.createdAt) : null;
        const matchesArchiveDateFrom =
          !archiveDateFrom || (createdAt && createdAt >= new Date(`${archiveDateFrom}T00:00:00`));
        const matchesArchiveDateTo =
          !archiveDateTo || (createdAt && createdAt <= new Date(`${archiveDateTo}T23:59:59`));
        const matchesStage = !stageFilter || plan.stage === stageFilter;
        const matchesRisk = !riskFilter || plan.risk === riskFilter;
        const matchesStatus = !statusFilter || plan.status === statusFilter;

        return (
          matchesKeyword &&
          matchesArchiveDateFrom &&
          matchesArchiveDateTo &&
          matchesStage &&
          matchesRisk &&
          matchesStatus
        );
      }),
    [archiveDateFrom, archiveDateTo, keyword, patients, riskFilter, sortedPlans, stageFilter, statusFilter]
  );

  useEffect(() => {
    if (!filteredPlans.length) {
      setSelectedPlanId(null);
      return;
    }

    if (!selectedPlanId || !filteredPlans.some((plan) => plan.id === selectedPlanId)) {
      setSelectedPlanId(filteredPlans[0]?.id ?? null);
    }
  }, [filteredPlans, selectedPlanId]);

  const selectedPlan = filteredPlans.find((plan) => plan.id === selectedPlanId) ?? filteredPlans[0] ?? null;
  const selectedPatient = patients.find((patient) => patient.id === selectedPlan?.patientId) ?? null;
  const aiPlanPatient = patients.find((patient) => patient.id === aiPlanDraft.patientId) ?? null;
  const aiPlanTemplate =
    sortedPlans.find((plan) => plan.patientId === aiPlanPatient?.id) ?? null;
  const aiPrescriptionPlan =
    chainPrescriptionPlan ??
    sortedPlans.find((plan) => plan.id === aiPrescriptionDraft.planId) ??
    selectedPlan ??
    null;
  const aiPrescriptionPatient =
    chainPrescriptionPatient ??
    patients.find((patient) => patient.id === aiPrescriptionPlan?.patientId) ??
    null;
  const selectedPatientPrescriptions = useMemo(
    () =>
      prescriptions
        .filter((item) => item.patientId === selectedPlan?.patientId)
        .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()),
    [prescriptions, selectedPlan?.patientId]
  );
  const totalPages = Math.max(1, Math.ceil(filteredPlans.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedPlans = filteredPlans.slice((safePage - 1) * pageSize, safePage * pageSize);
  const filteredPlanIds = useMemo(() => filteredPlans.map((plan) => plan.id), [filteredPlans]);
  const pagedPlanIds = useMemo(() => pagedPlans.map((plan) => plan.id), [pagedPlans]);
  const selectedPlanCount = useMemo(
    () => selectedPlanIds.filter((id) => filteredPlanIds.includes(id)).length,
    [filteredPlanIds, selectedPlanIds]
  );
  const allPagedPlansSelected = isPageFullySelected(selectedPlanIds, pagedPlanIds);
  const somePagedPlansSelected = isPagePartiallySelected(selectedPlanIds, pagedPlanIds);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    const filteredPlanIdSet = new Set(filteredPlanIds);
    setSelectedPlanIds((current) => current.filter((id) => filteredPlanIdSet.has(id)));
  }, [filteredPlanIds]);

  useEffect(() => {
    if (!planGeneration) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPlanGenerationStatus((current) => {
        const next = { ...current };
        delete next[planGeneration.plan.id];
        return next;
      });
      setPlanPreview(planGeneration);
      setPlanGeneration(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [planGeneration]);

  useEffect(() => {
    if (!prescriptionGeneration) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPrescriptionGenerationStatus((current) => {
        const next = { ...current };
        delete next[prescriptionGeneration.prescription.id];
        return next;
      });
      setPrescriptionPreview(prescriptionGeneration);
      setPrescriptionGeneration(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [prescriptionGeneration]);

  const resetFilters = () => {
    setKeyword("");
    setArchiveDateFrom("");
    setArchiveDateTo("");
    setStageFilter("");
    setRiskFilter("");
    setStatusFilter("");
    setPage(1);
  };

  const openAiPlanDialog = () => {
    const initialPatient = selectedPatient ?? patients[0] ?? null;
    const initialTemplate =
      sortedPlans.find((plan) => plan.patientId === initialPatient?.id) ?? null;
    setAiPlanDraft(buildAiPlanDraft(initialPatient, initialTemplate));
    setAiPlanOpen(true);
  };

  const handleAiPlanPatientChange = (patientId: string) => {
    const patient = patients.find((item) => item.id === patientId) ?? null;
    const template = sortedPlans.find((plan) => plan.patientId === patient?.id) ?? null;
    setAiPlanDraft(buildAiPlanDraft(patient, template));
  };

  const openPlanEdit = (plan: RehabPlan) => {
    const patient = patients.find((item) => item.id === plan.patientId) ?? null;
    if (patient) {
      writePatientWorkspace(patient);
    }
    writeState(planWorkspaceContextKey, { planId: plan.id });
    navigateTo(navigate, "/patients/plans/edit");
  };

  const openPlanPrescriptions = (plan: RehabPlan) => {
    const patient = patients.find((item) => item.id === plan.patientId) ?? null;
    if (!patient) {
      return;
    }

    writePatientWorkspace(patient);
    writeState(planWorkspaceContextKey, { planId: plan.id });
    navigateTo(navigate, patientPlanPrescriptionsPath(patient.id, plan.id));
  };

  const handleDeletePlan = async () => {
    if (!deletePlanTarget) {
      return;
    }

    await deletePlanMutation.mutateAsync(deletePlanTarget.id);
    setDeletePlanTarget(null);
  };

  const handleCreateAiPlan = async () => {
    if (!aiPlanPatient || !aiPlanDraft.goal.trim() || !aiPlanDraft.focus.trim()) {
      return;
    }

    const createdPlan = await createPlanMutation.mutateAsync(
      buildAiPlanPayload({
        patient: aiPlanPatient,
        existingPlan: aiPlanTemplate,
        draft: aiPlanDraft
      })
    );

    writePatientWorkspace(aiPlanPatient);
    writeState(planWorkspaceContextKey, { planId: createdPlan.id });
    setKeyword("");
    setArchiveDateFrom("");
    setArchiveDateTo("");
    setStageFilter("");
    setRiskFilter("");
    setStatusFilter("");
    setPage(1);
    setSelectedPlanId(createdPlan.id);
    setPlanGenerationStatus((current) => ({ ...current, [createdPlan.id]: "生成中" }));
    setPlanGeneration({ patient: aiPlanPatient, plan: createdPlan });
    setAiPlanOpen(false);
  };

  const cancelPlanGeneration = () => {
    if (!planGeneration) {
      return;
    }

    setPlanGenerationStatus((current) => ({
      ...current,
      [planGeneration.plan.id]: "待生成"
    }));
    setPlanGeneration(null);
  };

  const continueToPrescriptionGeneration = () => {
    if (!planPreview) {
      return;
    }

    setChainPrescriptionPlan(planPreview.plan);
    setChainPrescriptionPatient(planPreview.patient);
    setAiPrescriptionDraft(buildAiPrescriptionDraft(planPreview.plan));
    setPlanPreview(null);
    setAiPrescriptionOpen(true);
  };

  const handleCreateAiPrescription = async () => {
    if (!aiPrescriptionPlan || !aiPrescriptionPatient || !aiPrescriptionDraft.goal.trim() || !aiPrescriptionDraft.focus.trim()) {
      return;
    }

    const createdPrescription = await createPrescriptionMutation.mutateAsync({
      patientId: aiPrescriptionPatient.id,
      patientName: aiPrescriptionPatient.name,
      stage: aiPrescriptionPlan.stage,
      goal: aiPrescriptionDraft.goal.trim(),
      risk: aiPrescriptionPlan.risk,
      sequenceName: `${aiPrescriptionPlan.type} AI处方`,
      doctor: ensureDoctorSuffix(aiPrescriptionPlan.doctor),
      status: "待审核",
      note: `AI 已围绕方案 ${aiPrescriptionPlan.id} 生成处方。训练重点：${aiPrescriptionDraft.focus.trim()}。${aiPrescriptionDraft.note.trim()}`,
      aiReference: `${aiPrescriptionPlan.aiReference} 处方聚焦：${aiPrescriptionDraft.focus.trim()}。`,
      videoTitle: `${aiPrescriptionPlan.type} - AI推荐教学视频`,
      videoDuration: "15分30秒",
      frequency: aiPrescriptionDraft.frequency.trim() || "3-5 次/周",
      movements: buildAiPrescriptionMovements(aiPrescriptionPlan)
    });

    writePatientWorkspace(aiPrescriptionPatient);
    writeState(planWorkspaceContextKey, { planId: aiPrescriptionPlan.id });
    writeState(prescriptionWorkspaceContextKey, { prescriptionId: createdPrescription.id });
    setPrescriptionGenerationStatus((current) => ({ ...current, [createdPrescription.id]: "生成中" }));
    setPrescriptionGeneration({
      patient: aiPrescriptionPatient,
      plan: aiPrescriptionPlan,
      prescription: createdPrescription
    });
    setAiPrescriptionOpen(false);
    setChainPrescriptionPlan(null);
    setChainPrescriptionPatient(null);
  };

  const cancelPrescriptionGeneration = () => {
    if (!prescriptionGeneration) {
      return;
    }

    setPrescriptionGenerationStatus((current) => ({
      ...current,
      [prescriptionGeneration.prescription.id]: "待生成"
    }));
    setPrescriptionGeneration(null);
  };

  const enterPrescriptionEditPage = () => {
    if (!prescriptionPreview) {
      return;
    }

    writePatientWorkspace(prescriptionPreview.patient);
    writeState(planWorkspaceContextKey, { planId: prescriptionPreview.plan.id });
    writeState(prescriptionWorkspaceContextKey, { prescriptionId: prescriptionPreview.prescription.id });
    navigateTo(
      navigate,
      `${patientPlanPrescriptionsPath(prescriptionPreview.patient.id, prescriptionPreview.plan.id)}/edit`
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeader
        eyebrow={
          <PageBreadcrumbs
            items={[
              { label: "患者档案管理", to: "/patients/base" },
              { label: "康复方案", active: true }
            ]}
          />
        }
        title="康复方案"
        description="面向全部患者的康复方案管理页，支持按患者、阶段、风险和同步状态统一管理。"
        actions={
          <>
            <Button variant="secondary" disabled={!patients.length} onClick={openAiPlanDialog}>
              <Sparkles className="h-4 w-4" />
              AI生成方案
            </Button>
            <Button onClick={() => navigateTo(navigate, "/patients/plans/create")}>
              <Plus className="h-4 w-4" />
              新增方案
            </Button>
            <Button variant="outline" onClick={() => navigateTo(navigate, "/patients/plans/export")}>
              <FileOutput className="h-4 w-4" />
              导出方案
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
            value={keyword}
            placeholder="方案编号 / 患者 / 类型 / 医护"
            onChange={(event) => setKeyword(event.target.value)}
          />
        </Field>
        <Field label="阶段">
          <select
            className="native-select"
            value={stageFilter}
            onChange={(event) => setStageFilter(event.target.value)}
          >
            <option value="">全部阶段</option>
            {stageOptions.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </Field>
        <Field label="风险">
          <select
            className="native-select"
            value={riskFilter}
            onChange={(event) => setRiskFilter(event.target.value)}
          >
            <option value="">全部风险</option>
            <option value="低风险">低风险</option>
            <option value="中风险">中风险</option>
            <option value="高风险">高风险</option>
          </select>
        </Field>
        <Field label="同步状态">
          <select
            className="native-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">全部状态</option>
            <option value="已同步">已同步</option>
            <option value="待同步">待同步</option>
          </select>
        </Field>
        <Field label="建档时间">
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={archiveDateFrom}
              aria-label="建档开始时间"
              onChange={(event) => setArchiveDateFrom(event.target.value)}
            />
            <Input
              type="date"
              value={archiveDateTo}
              aria-label="建档结束时间"
              onChange={(event) => setArchiveDateTo(event.target.value)}
            />
          </div>
        </Field>
      </FilterBar>

      <CollapsibleSplitLayout
        label="方案详情"
        sideWidthClassName="w-full xl:w-[380px]"
        main={
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <CardHeader className="border-b border-border/60">
              <div>
                <CardTitle>全员方案列表</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  共 {filteredPlans.length} 条方案，覆盖 {new Set(filteredPlans.map((plan) => plan.patientId)).size} 位患者，已勾选 {selectedPlanCount} 条
                </p>
              </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              {filteredPlans.length ? (
                <Table className="min-w-full">
                  <TableHeader className="sticky top-0 z-10 bg-white">
                    <TableRow>
                      <TableHead className="w-12">
                        <TableSelectionCheckbox
                          checked={allPagedPlansSelected}
                          indeterminate={somePagedPlansSelected}
                          onChange={(checked) =>
                            setSelectedPlanIds((current) => togglePageSelection(current, pagedPlanIds, checked))
                          }
                          ariaLabel={`全选全员方案列表第 ${safePage} 页`}
                        />
                      </TableHead>
                      <TableHead>方案编号</TableHead>
                      <TableHead>患者ID</TableHead>
                      <TableHead>患者</TableHead>
                      <TableHead>确认医生</TableHead>
                      <TableHead>处方数</TableHead>
                      <TableHead>采纳状态</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>阶段</TableHead>
                      <TableHead>训练目标</TableHead>
                      <TableHead>风险</TableHead>
                      <TableHead>更新时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedPlans.map((plan) => {
                      const prescriptionCount = prescriptions.filter(
                        (prescription) => prescription.patientId === plan.patientId
                      ).length;

                      return (
                        <TableRow
                          key={plan.id}
                          className="cursor-pointer"
                          data-state={selectedPlan?.id === plan.id ? "selected" : undefined}
                          onClick={() => setSelectedPlanId(plan.id)}
                        >
                          <TableCell onClick={(event) => event.stopPropagation()}>
                            <TableSelectionCheckbox
                              checked={selectedPlanIds.includes(plan.id)}
                              onChange={(checked) =>
                                setSelectedPlanIds((current) => toggleSelection(current, plan.id, checked))
                              }
                              ariaLabel={`选择方案 ${plan.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <button
                              type="button"
                              className="text-left text-primary transition hover:text-primary/80 hover:underline"
                              onClick={(event) => {
                                event.stopPropagation();
                                openPlanPrescriptions(plan);
                              }}
                            >
                              {plan.id}
                            </button>
                          </TableCell>
                          <TableCell>{plan.patientId}</TableCell>
                          <TableCell>{plan.patientName}</TableCell>
                          <TableCell>{plan.doctor}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{prescriptionCount}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-primary hover:text-primary/80"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openPlanPrescriptions(plan);
                                }}
                              >
                                查看
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge>{resolvePlanAdoptionLabel(plan, planGenerationStatus[plan.id])}</Badge>
                          </TableCell>
                          <TableCell>{plan.type}</TableCell>
                          <TableCell>{plan.stage}</TableCell>
                          <TableCell className="max-w-[220px] truncate">{plan.goal}</TableCell>
                          <TableCell>
                            <Badge className={planRiskBadgeClass(plan.risk)}>{plan.risk}</Badge>
                          </TableCell>
                          <TableCell>{formatDateTime(plan.updatedAt)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setPreviewPlan(plan);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                                方案预览
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openPlanEdit(plan);
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
                                  setDeletePlanTarget(plan);
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
                  <EmptyState title="暂无康复方案" description="调整筛选条件后重试，或直接新增方案。" />
                </div>
              )}
            </CardContent>
            <PaginationBar
              total={filteredPlans.length}
              page={safePage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </Card>
        }
        side={
          <DetailPanel title="方案详情" className="h-full">
            {selectedPlan ? (
              <>
                <PropertyList
                  items={[
                    { label: "患者姓名", value: selectedPlan.patientName },
                    { label: "患者ID", value: selectedPatient?.id ?? selectedPlan.patientId },
                    { label: "方案编号", value: selectedPlan.id },
                    { label: "方案类型", value: selectedPlan.type },
                    { label: "阶段", value: selectedPlan.stage },
                    { label: "确认医生", value: selectedPlan.doctor },
                    { label: "责任护士", value: selectedPlan.nurse },
                    { label: "设备", value: selectedPlan.deviceId },
                    {
                      label: "采纳状态",
                      value: resolvePlanAdoptionLabel(selectedPlan, planGenerationStatus[selectedPlan.id])
                    },
                    { label: "最近更新", value: formatDateTime(selectedPlan.updatedAt) }
                  ]}
                />
                <SectionCard title="训练目标">
                  <div className="rounded-[1rem] border border-border/70 bg-surface-50 px-4 py-3 text-sm leading-7 text-surface-900">
                    {selectedPlan.goal}
                  </div>
                </SectionCard>
                <SectionCard title="方案说明">
                  <p className="text-sm leading-7 text-muted-foreground">{selectedPlan.description}</p>
                </SectionCard>
                <SectionCard title="AI 推荐依据">
                  <p className="text-sm leading-7 text-muted-foreground">{selectedPlan.aiReference}</p>
                </SectionCard>
                <SectionCard title="相关处方">
                  <div className="space-y-3">
                    {selectedPatientPrescriptions.length ? (
                      selectedPatientPrescriptions.slice(0, 3).map((prescription) => (
                        <div
                          key={prescription.id}
                          className="rounded-[1rem] border border-border/70 bg-surface-50 px-4 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-surface-900">{prescription.id}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {prescription.sequenceName} · {prescription.frequency}
                              </p>
                            </div>
                            <Badge>
                              {resolvePrescriptionAdoptionLabel(
                                prescription,
                                prescriptionGenerationStatus[prescription.id]
                              )}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1rem] border border-dashed border-border/70 bg-surface-50 px-4 py-3 text-sm text-muted-foreground">
                        当前患者还没有关联处方，点击上方方案编号或处方数列中的“查看”可进入该方案的处方页继续配置。
                      </div>
                    )}
                  </div>
                </SectionCard>
                <div className="flex gap-2">
                  <Button onClick={() => openPlanPrescriptions(selectedPlan)}>查看处方</Button>
                  <Button variant="outline" onClick={() => openPlanEdit(selectedPlan)}>
                    编辑方案
                  </Button>
                </div>
              </>
            ) : (
              <EmptyState title="请选择方案" description="从左侧列表选择一条方案后查看详情。" />
            )}
          </DetailPanel>
        }
      />

      <DialogFormShell
        open={aiPlanOpen}
        onOpenChange={setAiPlanOpen}
        title="AI生成方案"
        description="先选择基础档案中的患者，再补充训练重点和说明，确认后会自动生成一条待采纳方案。"
        onSubmit={handleCreateAiPlan}
        submitLabel="确认生成"
      >
        <Field label="选择患者" required>
          <select
            className="native-select"
            value={aiPlanDraft.patientId}
            onChange={(event) => handleAiPlanPatientChange(event.target.value)}
          >
            <option value="">请选择患者</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name} / {patient.id}
              </option>
            ))}
          </select>
        </Field>
        {aiPlanPatient ? (
          <PropertyList
            items={[
              { label: "患者姓名", value: aiPlanPatient.name },
              { label: "患者ID", value: aiPlanPatient.id },
              { label: "病种", value: aiPlanPatient.diagnosis },
              { label: "阶段", value: aiPlanPatient.stage },
              { label: "病床号", value: aiPlanPatient.bedNo }
            ]}
          />
        ) : null}
        <Field label="AI训练目标" required>
          <Input
            value={aiPlanDraft.goal}
            onChange={(event) =>
              setAiPlanDraft((current) => ({ ...current, goal: event.target.value }))
            }
          />
        </Field>
        <Field label="风险等级">
          <select
            className="native-select"
            value={aiPlanDraft.risk}
            onChange={(event) =>
              setAiPlanDraft((current) => ({
                ...current,
                risk: event.target.value as RehabPlan["risk"]
              }))
            }
          >
            <option value="低风险">低风险</option>
            <option value="中风险">中风险</option>
            <option value="高风险">高风险</option>
          </select>
        </Field>
        <Field label="训练重点" required>
          <Textarea
            value={aiPlanDraft.focus}
            onChange={(event) =>
              setAiPlanDraft((current) => ({ ...current, focus: event.target.value }))
            }
          />
        </Field>
        <Field label="补充说明">
          <Textarea
            value={aiPlanDraft.note}
            onChange={(event) =>
              setAiPlanDraft((current) => ({ ...current, note: event.target.value }))
            }
          />
        </Field>
      </DialogFormShell>

      <RehabPlanPreviewDialog
        plan={previewPlan}
        open={Boolean(previewPlan)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewPlan(null);
          }
        }}
      />

      <GenerationProgressDialog
        open={Boolean(planGeneration)}
        title="AI 方案生成中"
        description="系统已在方案列表中保留当前方案，生成完成后会自动进入结果预览。"
        onOpenChange={(open) => {
          if (!open) {
            setPlanGeneration(null);
          }
        }}
        onCancel={cancelPlanGeneration}
      />

      <PreviewConfirmDialog
        open={Boolean(planPreview)}
        title="AI 方案生成成功"
        description="请预览方案信息。确认后会继续生成该方案内的第一条处方。"
        items={[
          { label: "方案编号", value: planPreview?.plan.id ?? "待生成" },
          { label: "患者姓名", value: planPreview?.patient.name ?? "待生成" },
          { label: "方案类型", value: planPreview?.plan.type ?? "待生成" },
          { label: "训练目标", value: planPreview?.plan.goal ?? "待生成" },
          { label: "风险等级", value: planPreview?.plan.risk ?? "待生成" },
          { label: "AI 推荐依据", value: planPreview?.plan.aiReference ?? "待生成" }
        ]}
        confirmLabel="继续生成处方"
        onOpenChange={(open) => {
          if (!open) {
            setPlanPreview(null);
          }
        }}
        onConfirm={continueToPrescriptionGeneration}
      />

      <DialogFormShell
        open={aiPrescriptionOpen}
        onOpenChange={(open) => {
          setAiPrescriptionOpen(open);
          if (!open) {
            setChainPrescriptionPlan(null);
            setChainPrescriptionPatient(null);
          }
        }}
        title="AI生成处方"
        description="已基于刚生成的方案带入处方目标，可继续补充处方重点和执行说明。"
        onSubmit={handleCreateAiPrescription}
        submitLabel="确认生成"
      >
        {aiPrescriptionPlan ? (
          <PropertyList
            items={[
              { label: "方案编号", value: aiPrescriptionPlan.id },
              { label: "患者姓名", value: aiPrescriptionPlan.patientName },
              { label: "方案类型", value: aiPrescriptionPlan.type },
              { label: "训练目标", value: aiPrescriptionPlan.goal },
              { label: "风险等级", value: aiPrescriptionPlan.risk },
              { label: "确认医生", value: aiPrescriptionPlan.doctor }
            ]}
          />
        ) : null}
        <Field label="AI处方目标" required>
          <Input
            value={aiPrescriptionDraft.goal}
            onChange={(event) =>
              setAiPrescriptionDraft((current) => ({ ...current, goal: event.target.value }))
            }
          />
        </Field>
        <Field label="执行频率">
          <Input
            value={aiPrescriptionDraft.frequency}
            onChange={(event) =>
              setAiPrescriptionDraft((current) => ({ ...current, frequency: event.target.value }))
            }
          />
        </Field>
        <Field label="处方重点" required>
          <Textarea
            value={aiPrescriptionDraft.focus}
            onChange={(event) =>
              setAiPrescriptionDraft((current) => ({ ...current, focus: event.target.value }))
            }
          />
        </Field>
        <Field label="补充说明">
          <Textarea
            value={aiPrescriptionDraft.note}
            onChange={(event) =>
              setAiPrescriptionDraft((current) => ({ ...current, note: event.target.value }))
            }
          />
        </Field>
      </DialogFormShell>

      <GenerationProgressDialog
        open={Boolean(prescriptionGeneration)}
        title="AI 处方生成中"
        description="系统已在处方中保留当前记录，生成完成后会自动进入处方结果预览。"
        onOpenChange={(open) => {
          if (!open) {
            setPrescriptionGeneration(null);
          }
        }}
        onCancel={cancelPrescriptionGeneration}
      />

      <PreviewConfirmDialog
        open={Boolean(prescriptionPreview)}
        title="AI 处方生成成功"
        description="请预览处方信息。确认后会直接进入该处方的编辑子页面。"
        items={[
          { label: "处方编号", value: prescriptionPreview?.prescription.id ?? "待生成" },
          { label: "患者姓名", value: prescriptionPreview?.patient.name ?? "待生成" },
          { label: "关联方案", value: prescriptionPreview?.plan.id ?? "待生成" },
          { label: "动作序列", value: prescriptionPreview?.prescription.sequenceName ?? "待生成" },
          { label: "执行频率", value: prescriptionPreview?.prescription.frequency ?? "待生成" },
          { label: "处方说明", value: prescriptionPreview?.prescription.note ?? "待生成" }
        ]}
        confirmLabel="进入编辑子页面"
        onOpenChange={(open) => {
          if (!open) {
            setPrescriptionPreview(null);
          }
        }}
        onConfirm={enterPrescriptionEditPage}
      />

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
    </div>
  );
}

export function PrescriptionManagement({
  view,
  scope = "patient",
  patientId,
  planId,
  prescriptionId
}: {
  view: ViewMode;
  scope?: ManagementScope;
  patientId?: string;
  planId?: string;
  prescriptionId?: string;
}) {
  const navigate = useNavigate();
  const { data: patients = [] } = usePatientsQuery();
  const { data: plans = [] } = usePlansQuery();
  const { data: currentActions = [] } = useCurrentActionsQuery();
  const { data: prescriptions = [] } = usePrescriptionsQuery();
  const createPlanMutation = useCreatePlanMutation();
  const createPrescriptionMutation = useCreatePrescriptionMutation();
  const deletePlanMutation = useDeletePlanMutation();
  const deleteCurrentActionMutation = useDeleteCurrentActionMutation();
  const deletePrescriptionMutation = useDeletePrescriptionMutation();

  const workspace = readState<WorkspaceContext>(patientWorkspaceContextKey);
  const routePatient = patients.find((item) => item.id === patientId) ?? null;
  const fallbackPatient = resolveWorkspacePatient(
    patients,
    workspace,
    view,
    plans,
    currentActions,
    prescriptions
  );
  const activePatient = routePatient ?? fallbackPatient;
  const allPlans = useMemo(
    () => [...plans].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [plans]
  );
  const patientPlans = useMemo(
    () =>
      plans
        .filter((item) => item.patientId === activePatient?.id)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [activePatient?.id, plans]
  );
  const planRecords = scope === "all" && view === "plans" ? allPlans : patientPlans;
  const patientPrescriptions = useMemo(
    () =>
      prescriptions
        .filter((item) => item.patientId === activePatient?.id)
        .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()),
    [activePatient?.id, prescriptions]
  );
  const patientActions = useMemo(() => {
    const records = currentActions
      .filter((item) => item.patientId === activePatient?.id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    if (records.length) {
      return records;
    }

    return buildExampleActionsFromPrescription(patientPrescriptions[0] ?? null);
  }, [activePatient?.id, currentActions, patientPrescriptions]);

  const [keyword, setKeyword] = useState("");
  const [aiPlanOpen, setAiPlanOpen] = useState(false);
  const [aiPlanDraft, setAiPlanDraft] = useState<AiPlanDraft>({
    patientId: "",
    goal: "",
    risk: "中风险",
    focus: "",
    note: ""
  });
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(planId ?? null);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(patientActions[0]?.id ?? null);
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(
    prescriptionId ?? null
  );
  const [selectedPrescriptionIds, setSelectedPrescriptionIds] = useState<string[]>([]);
  const [aiPrescriptionOpen, setAiPrescriptionOpen] = useState(false);
  const [aiPrescriptionDraft, setAiPrescriptionDraft] = useState<AiPrescriptionDraft>({
    planId: "",
    goal: "",
    frequency: "3-5 次/周",
    focus: "",
    note: ""
  });
  const [planPage, setPlanPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [prescriptionPage, setPrescriptionPage] = useState(1);
  const [previewPlan, setPreviewPlan] = useState<RehabPlan | null>(null);
  const [previewPrescription, setPreviewPrescription] = useState<Prescription | null>(null);
  const [previewAction, setPreviewAction] = useState<CurrentAction | null>(null);
  const [deletePlanTarget, setDeletePlanTarget] = useState<RehabPlan | null>(null);
  const [deleteActionTarget, setDeleteActionTarget] = useState<CurrentAction | null>(null);
  const [deletePrescriptionTarget, setDeletePrescriptionTarget] = useState<Prescription | null>(null);

  useEffect(() => {
    if (activePatient) {
      writePatientWorkspace(activePatient);
    }
  }, [activePatient]);

  useEffect(() => {
    if (!planRecords.length) {
      setSelectedPlanId(null);
      return;
    }

    if (planId && planRecords.some((item) => item.id === planId) && selectedPlanId !== planId) {
      setSelectedPlanId(planId);
      return;
    }

    if (!selectedPlanId || !planRecords.some((item) => item.id === selectedPlanId)) {
      setSelectedPlanId(planRecords[0]?.id ?? null);
    }
  }, [planId, planRecords, selectedPlanId]);

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

    if (prescriptionId && patientPrescriptions.some((item) => item.id === prescriptionId) && selectedPrescriptionId !== prescriptionId) {
      setSelectedPrescriptionId(prescriptionId);
      return;
    }

    if (!selectedPrescriptionId || !patientPrescriptions.some((item) => item.id === selectedPrescriptionId)) {
      setSelectedPrescriptionId(patientPrescriptions[0]?.id ?? null);
    }
  }, [patientPrescriptions, prescriptionId, selectedPrescriptionId]);

  const filteredPlans = useMemo(
    () =>
      planRecords.filter((item) =>
        [item.id, item.patientName, item.type, item.goal, item.risk, item.doctor]
          .join(" ")
          .toLowerCase()
          .includes(keyword.toLowerCase())
      ),
    [keyword, planRecords]
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
  const filteredPlanIds = useMemo(() => filteredPlans.map((item) => item.id), [filteredPlans]);
  const filteredActionIds = useMemo(() => filteredActions.map((item) => item.id), [filteredActions]);
  const filteredPrescriptionIds = useMemo(
    () => filteredPrescriptions.map((item) => item.id),
    [filteredPrescriptions]
  );
  const pagedPlanIds = useMemo(() => pagedPlans.map((item) => item.id), [pagedPlans]);
  const pagedActionIds = useMemo(() => pagedActions.map((item) => item.id), [pagedActions]);
  const pagedPrescriptionIds = useMemo(
    () => pagedPrescriptions.map((item) => item.id),
    [pagedPrescriptions]
  );
  const selectedPlanCount = useMemo(
    () => selectedPlanIds.filter((id) => filteredPlanIds.includes(id)).length,
    [filteredPlanIds, selectedPlanIds]
  );
  const selectedActionCount = useMemo(
    () => selectedActionIds.filter((id) => filteredActionIds.includes(id)).length,
    [filteredActionIds, selectedActionIds]
  );
  const selectedPrescriptionCount = useMemo(
    () => selectedPrescriptionIds.filter((id) => filteredPrescriptionIds.includes(id)).length,
    [filteredPrescriptionIds, selectedPrescriptionIds]
  );
  const allPagedPlansSelected = isPageFullySelected(selectedPlanIds, pagedPlanIds);
  const somePagedPlansSelected = isPagePartiallySelected(selectedPlanIds, pagedPlanIds);
  const allPagedActionsSelected = isPageFullySelected(selectedActionIds, pagedActionIds);
  const somePagedActionsSelected = isPagePartiallySelected(selectedActionIds, pagedActionIds);
  const allPagedPrescriptionsSelected = isPageFullySelected(
    selectedPrescriptionIds,
    pagedPrescriptionIds
  );
  const somePagedPrescriptionsSelected = isPagePartiallySelected(
    selectedPrescriptionIds,
    pagedPrescriptionIds
  );

  useEffect(() => {
    const filteredPlanIdSet = new Set(filteredPlanIds);
    setSelectedPlanIds((current) => current.filter((id) => filteredPlanIdSet.has(id)));
  }, [filteredPlanIds]);

  useEffect(() => {
    const filteredActionIdSet = new Set(filteredActionIds);
    setSelectedActionIds((current) => current.filter((id) => filteredActionIdSet.has(id)));
  }, [filteredActionIds]);

  useEffect(() => {
    const filteredPrescriptionIdSet = new Set(filteredPrescriptionIds);
    setSelectedPrescriptionIds((current) => current.filter((id) => filteredPrescriptionIdSet.has(id)));
  }, [filteredPrescriptionIds]);

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

  const handleCreateAiPrescription = async () => {
    if (!aiPrescriptionPlan || !aiPrescriptionDraft.goal.trim() || !aiPrescriptionDraft.focus.trim()) {
      return;
    }

    const planPatient =
      patients.find((patient) => patient.id === aiPrescriptionPlan.patientId) ?? activePatient;

    if (!planPatient) {
      return;
    }

    const createdPrescription = await createPrescriptionMutation.mutateAsync({
      patientId: planPatient.id,
      patientName: planPatient.name,
      stage: aiPrescriptionPlan.stage,
      goal: aiPrescriptionDraft.goal.trim(),
      risk: aiPrescriptionPlan.risk,
      sequenceName: `${aiPrescriptionPlan.type} AI处方`,
      doctor: ensureDoctorSuffix(aiPrescriptionPlan.doctor),
      status: "待审核",
      note: `AI 已围绕方案 ${aiPrescriptionPlan.id} 生成处方。训练重点：${aiPrescriptionDraft.focus.trim()}。${aiPrescriptionDraft.note.trim()}`,
      aiReference: `${aiPrescriptionPlan.aiReference} 处方聚焦：${aiPrescriptionDraft.focus.trim()}。`,
      videoTitle: `${aiPrescriptionPlan.type} - AI推荐教学视频`,
      videoDuration: "15分30秒",
      frequency: aiPrescriptionDraft.frequency.trim() || "3-5 次/周",
      movements: buildAiPrescriptionMovements(aiPrescriptionPlan)
    });

    writePatientWorkspace(planPatient);
    writeState(planWorkspaceContextKey, { planId: aiPrescriptionPlan.id });
    writeState(prescriptionWorkspaceContextKey, { prescriptionId: createdPrescription.id });
    setKeyword("");
    setPrescriptionPage(1);
    setSelectedPlanId(aiPrescriptionPlan.id);
    setSelectedPrescriptionId(createdPrescription.id);
    setAiPrescriptionOpen(false);

    if (scope === "patient") {
      navigateTo(navigate, patientPlanPrescriptionsPath(planPatient.id, aiPrescriptionPlan.id));
    }
  };

  const selectedPlanPatient =
    patients.find((item) => item.id === selectedPlan?.patientId) ??
    activePatient;
  const summaryPatient = scope === "all" && view === "plans" ? selectedPlanPatient : activePatient;
  const summaryPlan = selectedPlan ?? patientPlans[0] ?? null;
  const summaryPrescription = selectedPrescription ?? patientPrescriptions[0] ?? null;
  const summaryAction = selectedAction ?? patientActions[0] ?? null;
  const aiPlanTemplate =
    patientPlans.find((item) => item.id === selectedPlan?.id) ??
    patientPlans[0] ??
    null;
  const availableAiPrescriptionPlans =
    scope === "patient" && activePatient
      ? allPlans.filter((plan) => plan.patientId === activePatient.id)
      : allPlans;
  const aiPrescriptionPlan =
    availableAiPrescriptionPlans.find((plan) => plan.id === aiPrescriptionDraft.planId) ??
    summaryPlan ??
    null;
  const patientPlanRoot = activePatient ? patientPlansPath(activePatient.id) : "/patients/plans";
  const planCreatePath = scope === "patient" ? `${patientPlanRoot}/create` : "/patients/plans/create";
  const planExportPath = scope === "patient" ? `${patientPlanRoot}/export` : "/patients/plans/export";
  const prescriptionRoot =
    activePatient && summaryPlan
      ? patientPlanPrescriptionsPath(activePatient.id, summaryPlan.id)
      : "/patients/prescriptions";
  const prescriptionCreatePath = `${prescriptionRoot}/create`;
  const prescriptionEditPath = `${prescriptionRoot}/edit`;
  const prescriptionExportPath = `${prescriptionRoot}/export`;
  const currentRoot =
    activePatient && summaryPlan && summaryPrescription
      ? patientPrescriptionCurrentPath(activePatient.id, summaryPlan.id, summaryPrescription.id)
      : "/patients/current";
  const currentCreatePath = `${currentRoot}/create`;
  const currentEditPath = `${currentRoot}/edit`;

  const openAiPlanDialog = () => {
    if (!activePatient) {
      return;
    }

    setAiPlanDraft(buildAiPlanDraft(activePatient, aiPlanTemplate));
    setAiPlanOpen(true);
  };

  const handleCreateAiPlan = async () => {
    if (!activePatient || !aiPlanDraft.goal.trim() || !aiPlanDraft.focus.trim()) {
      return;
    }

    const createdPlan = await createPlanMutation.mutateAsync(
      buildAiPlanPayload({
        patient: activePatient,
        existingPlan: aiPlanTemplate,
        draft: aiPlanDraft
      })
    );

    writePatientWorkspace(activePatient);
    writeState(planWorkspaceContextKey, { planId: createdPlan.id });
    setKeyword("");
    setPlanPage(1);
    setSelectedPlanId(createdPlan.id);
    setAiPlanOpen(false);
  };

  const planActions = (
    <>
      <Button variant="secondary" disabled={!activePatient} onClick={openAiPlanDialog}>
        <Sparkles className="h-4 w-4" />
        AI生成方案
      </Button>
      <Button onClick={() => navigateTo(navigate, planCreatePath)}>
        <Plus className="h-4 w-4" />
        新增方案
      </Button>
      <Button variant="outline" onClick={() => navigateTo(navigate, planExportPath)}>
        <FileOutput className="h-4 w-4" />
        导出方案
      </Button>
    </>
  );

  const currentActionsButtons = (
    <>
      <Button onClick={() => navigateTo(navigate, currentCreatePath)}>
        <Plus className="h-4 w-4" />
        新增单体动作
      </Button>
    </>
  );

  const prescriptionActions = (
    <>
      <Button
        variant="secondary"
        disabled={!availableAiPrescriptionPlans.length}
        onClick={() => {
          const initialPlan = summaryPlan ?? availableAiPrescriptionPlans[0] ?? null;
          setAiPrescriptionDraft(buildAiPrescriptionDraft(initialPlan));
          setAiPrescriptionOpen(true);
        }}
      >
        <Sparkles className="h-4 w-4" />
        AI生成处方
      </Button>
      <Button onClick={() => navigateTo(navigate, prescriptionCreatePath)}>
        <Plus className="h-4 w-4" />
        新增运动处方
      </Button>
      <Button variant="outline" onClick={() => navigateTo(navigate, prescriptionExportPath)}>
        <FileOutput className="h-4 w-4" />
        导出运动处方
      </Button>
    </>
  );
  const headerTitle =
    scope === "all" && view === "plans"
      ? "康复方案"
      : view === "plans"
        ? `${activePatient?.name ?? "患者"}的康复方案`
        : view === "prescriptions"
          ? `${activePatient?.name ?? "患者"}的运动处方列表`
          : `${activePatient?.name ?? "患者"}的当前处方`;
  const headerDescription =
    scope === "all" && view === "plans"
      ? "展示所有患者的康复方案，支持新增、编辑、删除、导出和全局检索。"
      : view === "plans"
        ? "从患者档案进入的专属康复方案页，点击某一条方案进入该方案的处方列表。"
        : view === "prescriptions"
          ? "从患者方案进入的运动处方列表，点击某一条处方进入当前处方动作页。"
          : "从运动处方进入的当前处方动作页，用于查看、编辑和维护单体动作。";
  const headerEyebrow = (
    <PageBreadcrumbs
      items={
        scope === "all" && view === "plans"
          ? [
              { label: "患者档案管理", to: "/patients/base" },
              { label: "康复方案", active: true }
            ]
          : view === "plans"
            ? [
                { label: "患者档案管理", to: "/patients/base" },
                { label: "基础档案", onClick: () => openPatientBase(navigate, activePatient) },
                { label: activePatient?.name ?? "患者", onClick: () => openPatientBase(navigate, activePatient) },
                { label: "康复方案", active: true }
              ]
            : view === "prescriptions"
              ? [
                  { label: "患者档案管理", to: "/patients/base" },
                  { label: "基础档案", onClick: () => openPatientBase(navigate, activePatient) },
                  { label: activePatient?.name ?? "患者", onClick: () => activePatient && summaryPlan && openPatientPlanList(navigate, activePatient, summaryPlan) },
                  { label: "康复方案", onClick: () => activePatient && summaryPlan && openPatientPlanList(navigate, activePatient, summaryPlan) },
                  { label: summaryPlan?.id ?? "方案", onClick: () => activePatient && summaryPlan && openPatientPlanList(navigate, activePatient, summaryPlan) },
                  { label: "处方列表", active: true }
                ]
              : [
                  { label: "患者档案管理", to: "/patients/base" },
                  { label: "基础档案", onClick: () => openPatientBase(navigate, activePatient) },
                  { label: activePatient?.name ?? "患者", onClick: () => activePatient && summaryPlan && openPatientPlanList(navigate, activePatient, summaryPlan) },
                  { label: "康复方案", onClick: () => activePatient && summaryPlan && openPatientPlanList(navigate, activePatient, summaryPlan) },
                  { label: summaryPlan?.id ?? "方案", onClick: () => activePatient && summaryPlan && openPatientPlanList(navigate, activePatient, summaryPlan) },
                  { label: "处方列表", onClick: () => activePatient && summaryPlan && openPatientPrescriptionList(navigate, activePatient, summaryPlan, selectedPrescription) },
                  { label: summaryPrescription?.id ?? "处方", onClick: () => activePatient && summaryPlan && selectedPrescription && openPatientPrescriptionList(navigate, activePatient, summaryPlan, selectedPrescription) },
                  { label: "当前处方", active: true }
                ]
      }
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeader
        eyebrow={headerEyebrow}
        title={headerTitle}
        description={headerDescription}
        actions={view === "plans" ? planActions : view === "current" ? currentActionsButtons : prescriptionActions}
      />

      <PatientSummaryCard
        patient={summaryPatient}
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
              <div>
                <CardTitle>方案列表</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  共 {filteredPlans.length} 条记录，已勾选 {selectedPlanCount} 条
                </p>
              </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              {filteredPlans.length ? (
                <Table className="min-w-full">
                  <TableHeader className="sticky top-0 z-10 bg-white">
                    <TableRow>
                        <TableHead className="w-12">
                          <TableSelectionCheckbox
                            checked={allPagedPlansSelected}
                            indeterminate={somePagedPlansSelected}
                            onChange={(checked) =>
                              setSelectedPlanIds((current) => togglePageSelection(current, pagedPlanIds, checked))
                            }
                            ariaLabel={`全选方案列表第 ${safePlanPage} 页`}
                          />
                        </TableHead>
                        <TableHead>方案编号</TableHead>
                        {scope === "all" ? <TableHead>患者</TableHead> : null}
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
                        const planPatient =
                          patients.find((patientItem) => patientItem.id === item.patientId) ??
                          activePatient;
                        const prescriptionCount = patientPrescriptions.filter(
                          (prescription) => prescription.patientId === item.patientId
                        ).length;
                        const totalPrescriptionCount =
                          scope === "all"
                            ? prescriptions.filter((prescription) => prescription.patientId === item.patientId).length
                            : prescriptionCount;
                        return (
                          <TableRow
                            key={item.id}
                          className="cursor-pointer"
                          data-state={selectedPlan?.id === item.id ? "selected" : undefined}
                          onClick={() => {
                              setSelectedPlanId(item.id);
                              writeState(planWorkspaceContextKey, { planId: item.id });
                              if (planPatient) {
                                writePatientWorkspace(planPatient);
                              }
                              if (scope === "patient" && planPatient) {
                                openPatientPrescriptionList(navigate, planPatient, item);
                              }
                            }}
                          >
                            <TableCell onClick={(event) => event.stopPropagation()}>
                              <TableSelectionCheckbox
                                checked={selectedPlanIds.includes(item.id)}
                                onChange={(checked) =>
                                  setSelectedPlanIds((current) => toggleSelection(current, item.id, checked))
                                }
                                ariaLabel={`选择方案 ${item.id}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{item.id}</TableCell>
                            {scope === "all" ? <TableCell>{item.patientName}</TableCell> : null}
                            <TableCell>{item.doctor}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>{totalPrescriptionCount}</span>
                                {planPatient ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-primary hover:text-primary/80"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openPatientPrescriptionList(navigate, planPatient, item);
                                    }}
                                  >
                                    查看
                                  </Button>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge>{resolvePlanAdoptionLabel(item)}</Badge>
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
                                    setPreviewPlan(item);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                  方案预览
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    writeState(planWorkspaceContextKey, { planId: item.id });
                                    setSelectedPlanId(item.id);
                                    if (planPatient) {
                                      writePatientWorkspace(planPatient);
                                    }
                                    navigateTo(
                                      navigate,
                                      scope === "patient" && planPatient
                                        ? `${patientPlansPath(planPatient.id)}/edit`
                                        : "/patients/plans/edit"
                                    );
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
              <div>
                <CardTitle>当前标准动作处方列表</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  共 {filteredActions.length} 条记录，已勾选 {selectedActionCount} 条
                </p>
              </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              {filteredActions.length ? (
                <Table className="min-w-full">
                  <TableHeader className="sticky top-0 z-10 bg-white">
                    <TableRow>
                        <TableHead className="w-12">
                          <TableSelectionCheckbox
                            checked={allPagedActionsSelected}
                            indeterminate={somePagedActionsSelected}
                            onChange={(checked) =>
                              setSelectedActionIds((current) => togglePageSelection(current, pagedActionIds, checked))
                            }
                            ariaLabel={`全选动作列表第 ${safeCurrentPage} 页`}
                          />
                        </TableHead>
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
                          <TableCell onClick={(event) => event.stopPropagation()}>
                            <TableSelectionCheckbox
                              checked={selectedActionIds.includes(item.id)}
                              onChange={(checked) =>
                                setSelectedActionIds((current) => toggleSelection(current, item.id, checked))
                              }
                              ariaLabel={`选择动作 ${item.title}`}
                            />
                          </TableCell>
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
                                  setPreviewAction(item);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                                动作预览
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  writeState(currentActionWorkspaceContextKey, { currentActionId: item.id });
                                  setSelectedActionId(item.id);
                                  navigateTo(navigate, currentEditPath);
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
              <div>
                <CardTitle>处方列表</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  共 {filteredPrescriptions.length} 条记录，已勾选 {selectedPrescriptionCount} 条
                </p>
              </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              {filteredPrescriptions.length ? (
                <Table className="min-w-full">
                  <TableHeader className="sticky top-0 z-10 bg-white">
                    <TableRow>
                        <TableHead className="w-12">
                          <TableSelectionCheckbox
                            checked={allPagedPrescriptionsSelected}
                            indeterminate={somePagedPrescriptionsSelected}
                            onChange={(checked) =>
                              setSelectedPrescriptionIds((current) =>
                                togglePageSelection(current, pagedPrescriptionIds, checked)
                              )
                            }
                            ariaLabel={`全选处方列表第 ${safePrescriptionPage} 页`}
                          />
                        </TableHead>
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
                          onClick={() => {
                            setSelectedPrescriptionId(item.id);
                            writeState(prescriptionWorkspaceContextKey, { prescriptionId: item.id });
                            if (activePatient && summaryPlan) {
                              openPatientCurrentActionList(navigate, activePatient, summaryPlan, item);
                            }
                          }}
                        >
                          <TableCell onClick={(event) => event.stopPropagation()}>
                            <TableSelectionCheckbox
                              checked={selectedPrescriptionIds.includes(item.id)}
                              onChange={(checked) =>
                                setSelectedPrescriptionIds((current) =>
                                  toggleSelection(current, item.id, checked)
                                )
                              }
                              ariaLabel={`选择处方 ${item.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{item.id}</TableCell>
                          <TableCell>{item.doctor}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{item.movements.length}</span>
                              {activePatient && summaryPlan ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-primary hover:text-primary/80"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openPatientCurrentActionList(navigate, activePatient, summaryPlan, item);
                                  }}
                                >
                                  查看
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
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
                                  setPreviewPrescription(item);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                                处方预览
                              </Button>
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
                                  navigateTo(navigate, prescriptionEditPath);
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

      <RehabPlanPreviewDialog
        plan={previewPlan}
        open={Boolean(previewPlan)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewPlan(null);
          }
        }}
      />

      <PrescriptionPreviewDialog
        prescription={previewPrescription}
        open={Boolean(previewPrescription)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewPrescription(null);
          }
        }}
      />

      <CurrentActionPreviewDialog
        action={previewAction}
        prescription={summaryPrescription}
        open={Boolean(previewAction)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewAction(null);
          }
        }}
      />

      <DialogFormShell
        open={aiPlanOpen}
        onOpenChange={setAiPlanOpen}
        title="AI生成方案"
        description={
          activePatient
            ? `当前患者已固定为${activePatient.name}，补充训练重点和说明后会自动生成一条待采纳方案。`
            : "请先确认当前患者后再生成方案。"
        }
        onSubmit={handleCreateAiPlan}
        submitLabel="确认生成"
      >
        {activePatient ? (
          <PropertyList
            items={[
              { label: "患者姓名", value: activePatient.name },
              { label: "患者ID", value: activePatient.id },
              { label: "病种", value: activePatient.diagnosis },
              { label: "阶段", value: activePatient.stage },
              { label: "病床号", value: activePatient.bedNo }
            ]}
          />
        ) : null}
        <Field label="AI训练目标" required>
          <Input
            value={aiPlanDraft.goal}
            onChange={(event) =>
              setAiPlanDraft((current) => ({ ...current, goal: event.target.value }))
            }
          />
        </Field>
        <Field label="风险等级">
          <select
            className="native-select"
            value={aiPlanDraft.risk}
            onChange={(event) =>
              setAiPlanDraft((current) => ({
                ...current,
                risk: event.target.value as RehabPlan["risk"]
              }))
            }
          >
            <option value="低风险">低风险</option>
            <option value="中风险">中风险</option>
            <option value="高风险">高风险</option>
          </select>
        </Field>
        <Field label="训练重点" required>
          <Textarea
            value={aiPlanDraft.focus}
            onChange={(event) =>
              setAiPlanDraft((current) => ({ ...current, focus: event.target.value }))
            }
          />
        </Field>
        <Field label="补充说明">
          <Textarea
            value={aiPlanDraft.note}
            onChange={(event) =>
              setAiPlanDraft((current) => ({ ...current, note: event.target.value }))
            }
          />
        </Field>
      </DialogFormShell>

      <DialogFormShell
        open={aiPrescriptionOpen}
        onOpenChange={setAiPrescriptionOpen}
        title="AI生成处方"
        description="先选择关联方案，再补充处方重点和执行说明，确认后会自动生成一条待采纳处方。"
        onSubmit={handleCreateAiPrescription}
        submitLabel="确认生成"
      >
        <Field label="选择方案" required>
          <select
            className="native-select"
            value={aiPrescriptionDraft.planId}
            onChange={(event) =>
              setAiPrescriptionDraft(
                buildAiPrescriptionDraft(
                  availableAiPrescriptionPlans.find((plan) => plan.id === event.target.value) ?? null
                )
              )
            }
          >
            <option value="">请选择方案</option>
            {availableAiPrescriptionPlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.id} / {plan.patientName} / {plan.type}
              </option>
            ))}
          </select>
        </Field>
        {aiPrescriptionPlan ? (
          <PropertyList
            items={[
              { label: "方案编号", value: aiPrescriptionPlan.id },
              { label: "患者姓名", value: aiPrescriptionPlan.patientName },
              { label: "方案类型", value: aiPrescriptionPlan.type },
              { label: "训练目标", value: aiPrescriptionPlan.goal },
              { label: "风险等级", value: aiPrescriptionPlan.risk },
              { label: "确认医生", value: aiPrescriptionPlan.doctor }
            ]}
          />
        ) : null}
        <Field label="AI处方目标" required>
          <Input
            value={aiPrescriptionDraft.goal}
            onChange={(event) =>
              setAiPrescriptionDraft((current) => ({ ...current, goal: event.target.value }))
            }
          />
        </Field>
        <Field label="执行频率">
          <Input
            value={aiPrescriptionDraft.frequency}
            onChange={(event) =>
              setAiPrescriptionDraft((current) => ({ ...current, frequency: event.target.value }))
            }
          />
        </Field>
        <Field label="处方重点" required>
          <Textarea
            value={aiPrescriptionDraft.focus}
            onChange={(event) =>
              setAiPrescriptionDraft((current) => ({ ...current, focus: event.target.value }))
            }
          />
        </Field>
        <Field label="补充说明">
          <Textarea
            value={aiPrescriptionDraft.note}
            onChange={(event) =>
              setAiPrescriptionDraft((current) => ({ ...current, note: event.target.value }))
            }
          />
        </Field>
      </DialogFormShell>

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
