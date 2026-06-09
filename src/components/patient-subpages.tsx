import { useNavigate } from "@tanstack/react-router";
import { FileOutput, PlayCircle, Save, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  useCreateCurrentActionMutation,
  useCreatePatientMutation,
  useCreatePlanMutation,
  useCreatePrescriptionMutation,
  useCurrentActionsQuery,
  useUpdateCurrentActionMutation,
  usePatientsQuery,
  usePlansQuery,
  usePrescriptionsQuery,
  useReportsQuery,
  useReviewReportMutation,
  useUpdatePatientMutation,
  useUpdatePlanMutation,
  useUpdatePrescriptionMutation
} from "@/lib/hooks";
import {
  buildPatientSummary,
  currentActionWorkspaceContextKey,
  defaultPatientWorkspace,
  patientWorkspaceContextKey,
  planWorkspaceContextKey,
  prescriptionWorkspaceContextKey,
  reportWorkspaceContextKey
} from "@/lib/patient-context";
import { clearDraft, readDraft, readState, writeDraft, writeState } from "@/lib/storage";
import { formatDateTime, generateId } from "@/lib/utils";
import type {
  CurrentAction,
  Patient,
  Prescription,
  PrescriptionMovement,
  RehabPlan,
  Report
} from "@/lib/types";
import { CollapsibleSplitLayout } from "@/components/collapsible-side-panel";
import { Field } from "@/components/field";
import { PageBreadcrumbs, PageHeader } from "@/components/page-header";
import { PropertyList } from "@/components/property-list";
import { SectionCard } from "@/components/section-card";
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
import { Textarea } from "@/components/ui/textarea";

type PatientCreateDraft = {
  name: string;
  age: string;
  gender: "男" | "女";
  diagnosis: string;
  stage: string;
  robotId: string;
  bedNo: string;
  createdBy: string;
  note: string;
};

type PlanCreateDraft = {
  type: string;
  goal: string;
  risk: string;
  description: string;
  aiReference: string;
};

type PrescriptionCreateDraft = {
  stage: string;
  goal: string;
  risk: string;
  sequenceName: string;
  frequency: string;
  note: string;
  aiReference: string;
  movements: PrescriptionMovement[];
};

type CurrentActionCreateDraft = {
  title: string;
  part: string;
  duration: string;
  intensity: string;
  note: string;
};

type ReportReviewDraft = {
  completionRate: string;
  romChange: string;
  painScore: string;
  nurseComment: string;
  doctorComment: string;
  note: string;
  aiReference: string;
};

type ExportDraft = {
  exportScope: string;
  dateRange: string;
  exportObject: string;
  exportCondition: string;
  format: string;
};

type ExportReturnTo = string;

type CarePathScope = "all" | "patient";

type CarePathSubPageProps = {
  scope?: CarePathScope;
  patientId?: string;
  planId?: string;
  prescriptionId?: string;
  returnTo?: string;
};

const patientCreateDraftKey = "patients:create-page";
const planCreateDraftKey = "patients:plan-create-page";
const prescriptionCreateDraftKey = "patients:prescription-create-page";
const reviewDraftKey = "patients:report-review-page";
const prescriptionExportDraftKey = "patients:prescription-export-page";
const reportExportDraftKey = "patients:report-export-page";
const currentActionCreateDraftKey = "patients:current-action-create-page";
const currentActionEditDraftKey = "patients:current-action-edit-page";
const currentActionExportDraftKey = "patients:current-action-export-page";
const planExportDraftKey = "patients:plan-export-page";
const patientEditDraftKey = "patients:edit-page";
const patientExportDraftKey = "patients:base-export-page";
const planEditDraftKey = "patients:plan-edit-page";
const prescriptionEditDraftKey = "patients:prescription-edit-page";

function resolveWorkspacePatient(
  patients: Patient[],
  plans: RehabPlan[] = [],
  prescriptions: Prescription[] = [],
  patientId?: string
) {
  const workspace = readState<{ patientId: string }>(patientWorkspaceContextKey);
  return (
    patients.find((item) => item.id === patientId) ??
    patients.find((item) => item.id === workspace?.patientId) ??
    patients.find((item) => item.id === defaultPatientWorkspace.patientId) ??
    plans.find((item) => item.patientId === defaultPatientWorkspace.patientId)
      ? patients.find((item) => item.id === defaultPatientWorkspace.patientId) ?? patients[0] ?? null
      : prescriptions.find((item) => item.patientId === defaultPatientWorkspace.patientId)
        ? patients.find((item) => item.id === defaultPatientWorkspace.patientId) ?? patients[0] ?? null
        : patients[0] ?? null
  );
}

function navigateTo(navigate: ReturnType<typeof useNavigate>, to: string) {
  navigate({ to: to as never });
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

function openPatientBase(
  navigate: ReturnType<typeof useNavigate>,
  patient: Patient | null
) {
  if (patient) {
    writeState(patientWorkspaceContextKey, {
      selectedId: patient.id,
      patientId: patient.id,
      patientName: patient.name
    });
  }

  navigateTo(navigate, "/patients/base");
}

function openPatientPlanList(
  navigate: ReturnType<typeof useNavigate>,
  patient: Patient,
  plan?: RehabPlan | null
) {
  writeState(patientWorkspaceContextKey, {
    selectedId: patient.id,
    patientId: patient.id,
    patientName: patient.name
  });

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
  writeState(patientWorkspaceContextKey, {
    selectedId: patient.id,
    patientId: patient.id,
    patientName: patient.name
  });
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
  writeState(patientWorkspaceContextKey, {
    selectedId: patient.id,
    patientId: patient.id,
    patientName: patient.name
  });
  writeState(planWorkspaceContextKey, { planId: plan.id });
  writeState(prescriptionWorkspaceContextKey, { prescriptionId: prescription.id });
  navigateTo(navigate, patientPrescriptionCurrentPath(patient.id, plan.id, prescription.id));
}

function buildPlanBreadcrumb({
  navigate,
  patient,
  plan,
  currentLabel,
  scope
}: {
  navigate: ReturnType<typeof useNavigate>;
  patient: Patient | null;
  plan?: RehabPlan | null;
  currentLabel: string;
  scope: CarePathScope;
}) {
  return (
    <PageBreadcrumbs
      items={
        scope === "all"
          ? [
              { label: "患者档案管理", to: "/patients/base" },
              { label: "康复方案", to: "/patients/plans" },
              { label: currentLabel, active: true }
            ]
          : [
              { label: "患者档案管理", to: "/patients/base" },
              { label: "基础档案", onClick: () => openPatientBase(navigate, patient) },
              { label: patient?.name ?? "患者", onClick: () => openPatientBase(navigate, patient) },
              { label: "康复方案", onClick: () => patient && openPatientPlanList(navigate, patient, plan) },
              { label: currentLabel, active: true }
            ]
      }
    />
  );
}

function buildPrescriptionBreadcrumb({
  navigate,
  patient,
  plan,
  currentLabel
}: {
  navigate: ReturnType<typeof useNavigate>;
  patient: Patient | null;
  plan: RehabPlan | null;
  currentLabel: string;
}) {
  return (
    <PageBreadcrumbs
      items={[
        { label: "患者档案管理", to: "/patients/base" },
        { label: "基础档案", onClick: () => openPatientBase(navigate, patient) },
        { label: patient?.name ?? "患者", onClick: () => patient && plan && openPatientPlanList(navigate, patient, plan) },
        { label: "康复方案", onClick: () => patient && plan && openPatientPlanList(navigate, patient, plan) },
        { label: plan?.id ?? "方案", onClick: () => patient && plan && openPatientPlanList(navigate, patient, plan) },
        { label: "处方列表", onClick: () => patient && plan && openPatientPrescriptionList(navigate, patient, plan) },
        { label: currentLabel, active: true }
      ]}
    />
  );
}

function buildCurrentBreadcrumb({
  navigate,
  patient,
  plan,
  prescription,
  currentLabel
}: {
  navigate: ReturnType<typeof useNavigate>;
  patient: Patient | null;
  plan: RehabPlan | null;
  prescription: Prescription | null;
  currentLabel: string;
}) {
  return (
    <PageBreadcrumbs
      items={[
        { label: "患者档案管理", to: "/patients/base" },
        { label: "基础档案", onClick: () => openPatientBase(navigate, patient) },
        { label: patient?.name ?? "患者", onClick: () => patient && plan && openPatientPlanList(navigate, patient, plan) },
        { label: "康复方案", onClick: () => patient && plan && openPatientPlanList(navigate, patient, plan) },
        { label: plan?.id ?? "方案", onClick: () => patient && plan && openPatientPlanList(navigate, patient, plan) },
        { label: "处方列表", onClick: () => patient && plan && openPatientPrescriptionList(navigate, patient, plan, prescription) },
        { label: prescription?.id ?? "处方", onClick: () => patient && plan && prescription && openPatientPrescriptionList(navigate, patient, plan, prescription) },
        { label: "当前处方", onClick: () => patient && plan && prescription && openPatientCurrentActionList(navigate, patient, plan, prescription) },
        { label: currentLabel, active: true }
      ]}
    />
  );
}

function SubPageLayout({
  eyebrow,
  title,
  description,
  actions,
  left,
  right,
  bottom,
  fixedBottom = false
}: {
  eyebrow: React.ReactNode;
  title: string;
  description: string;
  actions?: React.ReactNode;
  left: React.ReactNode;
  right: React.ReactNode;
  bottom: React.ReactNode;
  fixedBottom?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        badge="子页面"
        className="mb-1"
        actions={actions}
      />
      <CollapsibleSplitLayout
        label="摘要"
        sideWidthClassName="w-full xl:w-[360px]"
        main={
          fixedBottom ? (
            <div className="flex min-h-0 flex-col gap-4">
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="space-y-4">{left}</div>
              </div>
              <Card className="shrink-0 border-primary/15 bg-primary/5">
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  {bottom}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
              <div className="space-y-4">{left}</div>
              <Card className="shrink-0 border-primary/15 bg-primary/5">
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  {bottom}
                </CardContent>
              </Card>
            </div>
          )
        }
        side={right}
      />
    </div>
  );
}

function CarePathVideoPreviewDialog({
  open,
  onOpenChange,
  title,
  description,
  subtitle,
  durationLabel,
  details,
  sequenceSteps,
  noteText
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  subtitle: string;
  durationLabel: string;
  details: Array<{ label: string; value: string | number | string[] | undefined }>;
  sequenceSteps?: string[];
  noteText: string;
}) {
  const previewSteps = sequenceSteps?.filter(Boolean) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(94vw,1100px)] p-5">
        <DialogHeader className="pr-8">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          <div className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-white">
            <div className="relative aspect-video bg-surface-900 text-white">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_25%,rgba(96,165,250,0.42),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.92))]" />
              <div className="absolute left-5 top-5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                视频预览
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 shadow-soft backdrop-blur">
                  <PlayCircle className="h-10 w-10" />
                </div>
              </div>
              <div className="absolute bottom-5 left-5 right-5 space-y-3">
                <div>
                  <p className="text-base font-semibold">{title}</p>
                  <p className="mt-1 text-sm text-white/75">{subtitle}</p>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full w-[44%] rounded-full bg-white" />
                </div>
                <div className="flex items-center justify-between text-xs text-white/80">
                  <span>00:18</span>
                  <span>{durationLabel}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <SectionCard title="预览信息">
              <PropertyList items={details} />
            </SectionCard>

            {previewSteps.length ? (
              <SectionCard title="动作顺序">
                <div className="flex flex-wrap gap-2">
                  {previewSteps.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-border/70 bg-surface-50 px-3 py-1 text-xs font-medium text-surface-700"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </SectionCard>
            ) : null}

            <SectionCard title="预览说明">
              <p className="text-sm leading-7 text-muted-foreground">{noteText}</p>
            </SectionCard>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PatientCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreatePatientMutation();
  const [draft, setDraft] = useState<PatientCreateDraft>(
    readDraft<PatientCreateDraft>(patientCreateDraftKey) ?? {
      name: "",
      age: "41",
      gender: "男",
      diagnosis: "",
      stage: "",
      robotId: "",
      bedNo: "",
      createdBy: "王医生",
      note: ""
    }
  );
  const [errorMessage, setErrorMessage] = useState("");

  const notePreview = useMemo(
    () =>
      [
        draft.name ? `患者姓名：${draft.name}` : "",
        draft.diagnosis ? `病种：${draft.diagnosis}` : "",
        draft.stage ? `阶段：${draft.stage}` : "",
        draft.note ? `档案备注：${draft.note}` : "档案备注："
      ]
        .filter(Boolean)
        .join("\n"),
    [draft]
  );

  const persist = (patch: Partial<PatientCreateDraft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    writeDraft(patientCreateDraftKey, next);
  };

  const submit = async () => {
    if (!draft.name || !draft.age || !draft.diagnosis) {
      setErrorMessage("无法上传，请补全姓名、年龄和病种。");
      return;
    }

    await createMutation.mutateAsync({
      name: draft.name,
      age: Number(draft.age),
      gender: draft.gender,
      diagnosis: draft.diagnosis,
      stage: draft.stage,
      robotId: "",
      bedNo: draft.bedNo,
      createdBy: draft.createdBy,
      note: draft.note
    });
    clearDraft(patientCreateDraftKey);
    navigate({ to: "/patients/base" });
  };

  const cancel = () => {
    clearDraft(patientCreateDraftKey);
    navigate({ to: "/patients/base" });
  };

  return (
    <SubPageLayout
      eyebrow="患者档案管理 > 基础档案 > 新增档案"
      title="新增档案"
      description="用于录入患者基础信息和备注，提交前会校验必填项，并支持草稿恢复。"
      left={
        <>
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <CardHeader className="border-b border-border/60">
              <CardTitle>基础表单字段</CardTitle>
            </CardHeader>
            <CardContent className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 md:grid-cols-2">
              <Field label="姓名" required>
                <Input value={draft.name} onChange={(event) => persist({ name: event.target.value })} />
              </Field>
              <Field label="年龄" required>
                <Input value={draft.age} onChange={(event) => persist({ age: event.target.value })} />
              </Field>
              <Field label="性别" required>
                <select
                  className="native-select"
                  value={draft.gender}
                  onChange={(event) => persist({ gender: event.target.value as "男" | "女" })}
                >
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </Field>
              <Field label="病种" required>
                <Input
                  value={draft.diagnosis}
                  onChange={(event) => persist({ diagnosis: event.target.value })}
                />
              </Field>
              <Field label="阶段">
                <Input value={draft.stage} onChange={(event) => persist({ stage: event.target.value })} />
              </Field>
              <Field label="病床号">
                <Input value={draft.bedNo} onChange={(event) => persist({ bedNo: event.target.value })} />
              </Field>
              <Field label="建档人">
                <Input value={draft.createdBy} onChange={(event) => persist({ createdBy: event.target.value })} />
              </Field>
              <div className="md:col-span-2">
                <Field label="备注说明">
                  <Textarea value={draft.note} onChange={(event) => persist({ note: event.target.value })} />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="富文本自动回填">
                  <Textarea value={notePreview} onChange={(event) => persist({ note: event.target.value })} />
                </Field>
              </div>
            </CardContent>
          </Card>
        </>
      }
      right={
        <Card className="flex h-full min-h-0 flex-col overflow-hidden">
          <CardHeader className="border-b border-border/60">
            <CardTitle>页面摘要</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 space-y-5 overflow-y-auto p-5">
            <PropertyList
              items={[
                { label: "页面模式", value: "新增档案" },
                { label: "姓名", value: draft.name || "待填写" },
                { label: "病种", value: draft.diagnosis || "待填写" },
                { label: "阶段", value: draft.stage || "待填写" },
                { label: "建档人", value: draft.createdBy || "待填写" }
              ]}
            />
            <SectionCard title="录入提示">
              <div className="space-y-3">
                {[
                  "富文本区域会自动加载表单内容，允许继续编辑。",
                  "再次进入新增档案页时会恢复最近草稿。",
                  "取消会清空当前页面信息并返回患者档案列表。"
                ].map((item) => (
                  <div key={item} className="rounded-[1rem] border border-border/70 bg-surface-50 px-4 py-3 text-sm leading-7 text-muted-foreground">
                    {item}
                  </div>
                ))}
              </div>
            </SectionCard>
          </CardContent>
        </Card>
      }
      bottom={
        <>
          <div>
            {errorMessage ? (
              <p className="text-sm text-rose-700">{errorMessage}</p>
            ) : (
              <p className="text-sm text-primary">提交前会校验必填项，失败时在此提示。</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => writeDraft(patientCreateDraftKey, draft)}>
              <Save className="h-4 w-4" />
              草稿保存
            </Button>
            <Button variant="outline" onClick={cancel}>
              取消
            </Button>
            <Button onClick={submit}>提交</Button>
          </div>
        </>
      }
    />
  );
}

export function PatientEditPage() {
  const navigate = useNavigate();
  const { data: patients = [] } = usePatientsQuery();
  const updateMutation = useUpdatePatientMutation();
  const workspace = readState<{ patientId: string }>(patientWorkspaceContextKey);
  const patient =
    patients.find((item) => item.id === workspace?.patientId) ??
    patients.find((item) => item.id === defaultPatientWorkspace.patientId) ??
    patients[0] ??
    null;
  const [draft, setDraft] = useState<PatientCreateDraft>(
    readDraft<PatientCreateDraft>(patientEditDraftKey) ?? {
      name: patient?.name ?? "",
      age: patient ? String(patient.age) : "41",
      gender: patient?.gender ?? "男",
      diagnosis: patient?.diagnosis ?? "",
      stage: patient?.stage ?? "",
      robotId: patient?.robotId ?? "",
      bedNo: patient?.bedNo ?? "",
      createdBy: patient?.createdBy ?? "王医生",
      note: patient?.note ?? ""
    }
  );
  const [errorMessage, setErrorMessage] = useState("");

  const notePreview = useMemo(
    () =>
      [
        draft.name ? `患者姓名：${draft.name}` : "",
        draft.diagnosis ? `病种：${draft.diagnosis}` : "",
        draft.stage ? `阶段：${draft.stage}` : "",
        draft.note ? `档案备注：${draft.note}` : "档案备注："
      ]
        .filter(Boolean)
        .join("\n"),
    [draft]
  );

  const persist = (patch: Partial<PatientCreateDraft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    writeDraft(patientEditDraftKey, next);
  };

  const submit = async () => {
    if (!patient) {
      setErrorMessage("未找到需要修改的患者档案。");
      return;
    }
    if (!draft.name || !draft.age || !draft.diagnosis) {
      setErrorMessage("无法提交，请补全姓名、年龄和病种。");
      return;
    }

    await updateMutation.mutateAsync({
      id: patient.id,
      patch: {
        name: draft.name,
        age: Number(draft.age),
        gender: draft.gender,
        diagnosis: draft.diagnosis,
        stage: draft.stage,
        bedNo: draft.bedNo,
        createdBy: draft.createdBy,
        note: draft.note
      }
    });
    clearDraft(patientEditDraftKey);
    navigate({ to: "/patients/base" });
  };

  const cancel = () => {
    clearDraft(patientEditDraftKey);
    navigate({ to: "/patients/base" });
  };

  return (
    <SubPageLayout
      eyebrow="患者档案管理 > 基础档案 > 修改档案"
      title="修改档案"
      description="用于修改当前选中患者的基础信息与备注，保留表单与富文本联动结构。"
      left={
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CardHeader className="border-b border-border/60">
            <CardTitle>基础表单字段</CardTitle>
          </CardHeader>
          <CardContent className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 md:grid-cols-2">
            <Field label="姓名" required>
              <Input value={draft.name} onChange={(event) => persist({ name: event.target.value })} />
            </Field>
            <Field label="年龄" required>
              <Input value={draft.age} onChange={(event) => persist({ age: event.target.value })} />
            </Field>
            <Field label="性别" required>
              <select
                className="native-select"
                value={draft.gender}
                onChange={(event) => persist({ gender: event.target.value as "男" | "女" })}
              >
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </Field>
            <Field label="病种" required>
              <Input value={draft.diagnosis} onChange={(event) => persist({ diagnosis: event.target.value })} />
            </Field>
            <Field label="阶段">
              <Input value={draft.stage} onChange={(event) => persist({ stage: event.target.value })} />
            </Field>
            <Field label="病床号">
              <Input value={draft.bedNo} onChange={(event) => persist({ bedNo: event.target.value })} />
            </Field>
            <Field label="建档人">
              <Input value={draft.createdBy} onChange={(event) => persist({ createdBy: event.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <Field label="备注说明">
                <Textarea value={draft.note} onChange={(event) => persist({ note: event.target.value })} />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="富文本自动回填">
                <Textarea value={notePreview} onChange={(event) => persist({ note: event.target.value })} />
              </Field>
            </div>
          </CardContent>
        </Card>
      }
      right={
        <Card className="flex h-full min-h-0 flex-col overflow-hidden">
          <CardHeader className="border-b border-border/60">
            <CardTitle>页面摘要</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 space-y-5 overflow-y-auto p-5">
            <PropertyList
              items={[
                { label: "页面模式", value: "修改档案" },
                { label: "患者ID", value: patient?.id ?? defaultPatientWorkspace.patientId },
                { label: "姓名", value: draft.name || "待填写" },
                { label: "病种", value: draft.diagnosis || "待填写" },
                { label: "阶段", value: draft.stage || "待填写" }
              ]}
            />
            <SectionCard title="修改提示">
              <div className="space-y-3">
                {[
                  "默认加载当前选中患者档案内容。",
                  "富文本区域继续跟随表单已填内容更新。",
                  "取消会放弃本次修改并返回基础档案列表。"
                ].map((item) => (
                  <div key={item} className="rounded-[1rem] border border-border/70 bg-surface-50 px-4 py-3 text-sm leading-7 text-muted-foreground">
                    {item}
                  </div>
                ))}
              </div>
            </SectionCard>
          </CardContent>
        </Card>
      }
      bottom={
        <>
          <div>
            {errorMessage ? <p className="text-sm text-rose-700">{errorMessage}</p> : <p className="text-sm text-primary">修改完成后会返回基础档案列表，并刷新右侧详情。</p>}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => writeDraft(patientEditDraftKey, draft)}>
              <Save className="h-4 w-4" />
              草稿保存
            </Button>
            <Button variant="outline" onClick={cancel}>
              取消
            </Button>
            <Button onClick={submit}>提交修改</Button>
          </div>
        </>
      }
    />
  );
}

export function PatientExportPage() {
  return (
    <ExportSubPage
      eyebrow="患者档案管理 > 基础档案 > 导出档案"
      title="导出档案"
      description="支持按当前筛选结果或选中患者导出基础档案，并配置导出范围、时间和格式。"
      draftKey={patientExportDraftKey}
      returnTo="/patients/base"
      detailTitle="导出任务摘要"
      initialDraft={{
        exportScope: "当前筛选结果",
        dateRange: "近30天",
        exportObject: "患者基础档案",
        exportCondition: "按建档时间倒序",
        format: "PDF / XLSX / DOCX"
      }}
      exportHint="适合病区建档同步、会诊资料准备和患者信息归档。"
      onGenerate={async () => {
        const result = await api.exportPrescriptions(1);
        return `已生成 ${result.fileName.replace("prescriptions", "patients")}，生成时间 ${formatDateTime(result.generatedAt)}`;
      }}
    />
  );
}

export function PlanCreatePage({
  scope = "all",
  patientId,
  returnTo
}: CarePathSubPageProps = {}) {
  const navigate = useNavigate();
  const { data: patients = [] } = usePatientsQuery();
  const { data: plans = [] } = usePlansQuery();
  const initialPatient = resolveWorkspacePatient(patients, plans, [], patientId) ?? patients[0] ?? null;
  const [selectedPatientId, setSelectedPatientId] = useState(patientId ?? initialPatient?.id ?? "");
  const patient =
    scope === "all"
      ? patients.find((item) => item.id === selectedPatientId) ?? initialPatient
      : initialPatient;
  const createMutation = useCreatePlanMutation();
  const summaryPlan = plans.find((item) => item.patientId === patient?.id) ?? null;
  const targetReturnTo = returnTo ?? (scope === "patient" && patient ? patientPlansPath(patient.id) : "/patients/plans");
  const [draft, setDraft] = useState<PlanCreateDraft>(
    readDraft<PlanCreateDraft>(planCreateDraftKey) ?? {
      type: "基础功能恢复",
      goal: "",
      risk: "",
      description: "",
      aiReference: "AI 将根据患者阶段、评估结果和历史训练情况推荐康复方案。"
    }
  );
  const [errorMessage, setErrorMessage] = useState("");

  const persist = (patch: Partial<PlanCreateDraft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    writeDraft(planCreateDraftKey, next);
  };

  const submit = async () => {
    if (!patient || !draft.type || !draft.goal || !draft.risk) {
      setErrorMessage("无法提交，请补全方案类型、目标和风险。");
      return;
    }

    await createMutation.mutateAsync({
      patientId: patient.id,
      patientName: patient.name,
      type: draft.type,
      goal: draft.goal,
      risk: draft.risk,
      description: draft.description || `${draft.goal}\n方案备注：${draft.description}`,
      doctor: summaryPlan?.doctor ?? "李明",
      nurse: summaryPlan?.nurse ?? "周宁",
      deviceId: patient.robotId,
      stage: patient.stage,
      aiReference: draft.aiReference,
      status: "待同步"
    });
    writeState(patientWorkspaceContextKey, {
      selectedId: patient.id,
      patientId: patient.id,
      patientName: patient.name
    });
    clearDraft(planCreateDraftKey);
    navigateTo(navigate, targetReturnTo);
  };

  const cancel = () => {
    clearDraft(planCreateDraftKey);
    navigateTo(navigate, targetReturnTo);
  };

  return (
    <SubPageLayout
      eyebrow={buildPlanBreadcrumb({ navigate, patient, plan: summaryPlan, currentLabel: "新增方案", scope })}
      title="新增方案"
      description={scope === "all" ? "从全员康复方案页新增方案，可选择目标患者后提交。" : "从患者档案进入的专属新增方案页，默认绑定当前患者。"}
      left={
        <>
          <PatientSummaryCard
            patient={patient}
            plan={summaryPlan}
            prescription={null}
            currentAction={null}
          />
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <CardHeader className="border-b border-border/60">
              <CardTitle>方案表单字段</CardTitle>
            </CardHeader>
            <CardContent className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 md:grid-cols-2">
              <Field label="患者姓名">
                {scope === "all" ? (
                  <select
                    className="native-select"
                    value={patient?.id ?? ""}
                    onChange={(event) => setSelectedPatientId(event.target.value)}
                  >
                    {patients.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input value={patient?.name ?? defaultPatientWorkspace.patientName} disabled />
                )}
              </Field>
              <Field label="方案类型" required>
                <Input value={draft.type} onChange={(event) => persist({ type: event.target.value })} />
              </Field>
              <Field label="目标" required>
                <Input value={draft.goal} onChange={(event) => persist({ goal: event.target.value })} />
              </Field>
              <Field label="风险" required>
                <Input value={draft.risk} onChange={(event) => persist({ risk: event.target.value })} />
              </Field>
              <div className="md:col-span-2">
                <Field label="处方说明">
                  <Textarea
                    value={draft.description}
                    onChange={(event) => persist({ description: event.target.value })}
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="富文本自动回填">
                  <Textarea
                    value={`${draft.goal ? `目标：${draft.goal}` : ""}\n${draft.description ? `方案备注：${draft.description}` : "方案备注："}`}
                    onChange={(event) => persist({ description: event.target.value })}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>
        </>
      }
      right={
        <Card className="flex h-full min-h-0 flex-col overflow-hidden">
          <CardHeader className="border-b border-border/60">
            <CardTitle>AI 参考侧栏</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 space-y-5 overflow-y-auto p-5">
            <SectionCard title="AI加载的方案参考">
              <Textarea
                value={draft.aiReference}
                onChange={(event) => persist({ aiReference: event.target.value })}
                className="min-h-[220px]"
              />
            </SectionCard>
            <SectionCard title="页面说明">
              <div className="space-y-3">
                {[
                  "右侧展示 AI 加载的方案参考，供医生编辑时参考。",
                  "支持提交、草稿保存、再次进入时恢复草稿。",
                  "取消会清空页面信息并返回康复方案列表。"
                ].map((item) => (
                  <div key={item} className="rounded-[1rem] border border-border/70 bg-surface-50 px-4 py-3 text-sm leading-7 text-muted-foreground">
                    {item}
                  </div>
                ))}
              </div>
            </SectionCard>
          </CardContent>
        </Card>
      }
      bottom={
        <>
          <div>
            {errorMessage ? <p className="text-sm text-rose-700">{errorMessage}</p> : <p className="text-sm text-primary">方案提交后会回流到对应康复方案列表。</p>}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => writeDraft(planCreateDraftKey, draft)}>
              <Save className="h-4 w-4" />
              草稿保存
            </Button>
            <Button variant="outline" onClick={cancel}>
              取消
            </Button>
            <Button onClick={submit}>提交</Button>
          </div>
        </>
      }
    />
  );
}

export function PlanEditPage({
  scope = "all",
  patientId,
  planId,
  returnTo
}: CarePathSubPageProps = {}) {
  const navigate = useNavigate();
  const { data: patients = [] } = usePatientsQuery();
  const { data: plans = [] } = usePlansQuery();
  const summaryPlan =
    plans.find((item) => item.id === planId) ??
    plans.find((item) => item.id === readState<{ planId: string }>(planWorkspaceContextKey)?.planId) ??
    null;
  const patient = resolveWorkspacePatient(patients, plans, [], patientId ?? summaryPlan?.patientId) ?? patients[0] ?? null;
  const targetReturnTo = returnTo ?? (scope === "patient" && patient ? patientPlansPath(patient.id) : "/patients/plans");
  const updateMutation = useUpdatePlanMutation();
  const [draft, setDraft] = useState<PlanCreateDraft>(
    readDraft<PlanCreateDraft>(planEditDraftKey) ?? {
      type: summaryPlan?.type ?? "基础功能恢复",
      goal: summaryPlan?.goal ?? "",
      risk: summaryPlan?.risk ?? "",
      description: summaryPlan?.description ?? "",
      aiReference: summaryPlan?.aiReference ?? "AI 将根据患者阶段、评估结果和历史训练情况推荐康复方案。"
    }
  );
  const [errorMessage, setErrorMessage] = useState("");

  const persist = (patch: Partial<PlanCreateDraft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    writeDraft(planEditDraftKey, next);
  };

  const submit = async () => {
    if (!summaryPlan || !draft.type || !draft.goal || !draft.risk) {
      setErrorMessage("无法提交，请补全方案类型、目标和风险。");
      return;
    }

    await updateMutation.mutateAsync({
      id: summaryPlan.id,
      patch: {
        type: draft.type,
        goal: draft.goal,
        risk: draft.risk,
        description: draft.description,
        aiReference: draft.aiReference
      }
    });
    clearDraft(planEditDraftKey);
    navigateTo(navigate, targetReturnTo);
  };

  const cancel = () => {
    clearDraft(planEditDraftKey);
    navigateTo(navigate, targetReturnTo);
  };

  return (
    <SubPageLayout
      eyebrow={buildPlanBreadcrumb({ navigate, patient, plan: summaryPlan, currentLabel: "修改方案", scope })}
      title="修改方案"
      description={scope === "all" ? "从全员康复方案页编辑选中的方案。" : "从患者专属康复方案页编辑当前方案。"}
      left={
        <>
          <PatientSummaryCard patient={patient} plan={summaryPlan} prescription={null} currentAction={null} />
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <CardHeader className="border-b border-border/60">
              <CardTitle>方案表单字段</CardTitle>
            </CardHeader>
            <CardContent className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 md:grid-cols-2">
              <Field label="患者姓名">
                <Input value={patient?.name ?? defaultPatientWorkspace.patientName} disabled />
              </Field>
              <Field label="方案类型" required>
                <Input value={draft.type} onChange={(event) => persist({ type: event.target.value })} />
              </Field>
              <Field label="目标" required>
                <Input value={draft.goal} onChange={(event) => persist({ goal: event.target.value })} />
              </Field>
              <Field label="风险" required>
                <Input value={draft.risk} onChange={(event) => persist({ risk: event.target.value })} />
              </Field>
              <div className="md:col-span-2">
                <Field label="处方说明">
                  <Textarea value={draft.description} onChange={(event) => persist({ description: event.target.value })} />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="富文本自动回填">
                  <Textarea
                    value={`${draft.goal ? `目标：${draft.goal}` : ""}\n${draft.description ? `方案备注：${draft.description}` : "方案备注："}`}
                    onChange={(event) => persist({ description: event.target.value })}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>
        </>
      }
      right={
        <Card className="flex h-full min-h-0 flex-col overflow-hidden">
          <CardHeader className="border-b border-border/60">
            <CardTitle>AI 参考侧栏</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 space-y-5 overflow-y-auto p-5">
            <SectionCard title="AI加载的方案参考">
              <Textarea
                value={draft.aiReference}
                onChange={(event) => persist({ aiReference: event.target.value })}
                className="min-h-[220px]"
              />
            </SectionCard>
          </CardContent>
        </Card>
      }
      bottom={
        <>
          <div>
            {errorMessage ? <p className="text-sm text-rose-700">{errorMessage}</p> : <p className="text-sm text-primary">修改完成后会返回康复方案列表，并更新右侧详情。</p>}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => writeDraft(planEditDraftKey, draft)}>
              <Save className="h-4 w-4" />
              草稿保存
            </Button>
            <Button variant="outline" onClick={cancel}>
              取消
            </Button>
            <Button onClick={submit}>提交修改</Button>
          </div>
        </>
      }
    />
  );
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

export function PrescriptionCreatePage({
  patientId,
  planId,
  returnTo
}: CarePathSubPageProps = {}) {
  const navigate = useNavigate();
  const { data: patients = [] } = usePatientsQuery();
  const { data: plans = [] } = usePlansQuery();
  const { data: prescriptions = [] } = usePrescriptionsQuery();
  const summaryPlan =
    plans.find((item) => item.id === planId) ??
    plans.find((item) => item.id === readState<{ planId: string }>(planWorkspaceContextKey)?.planId) ??
    null;
  const patient = resolveWorkspacePatient(patients, plans, prescriptions, patientId ?? summaryPlan?.patientId) ?? patients[0] ?? null;
  const targetReturnTo =
    returnTo ?? (patient && summaryPlan ? patientPlanPrescriptionsPath(patient.id, summaryPlan.id) : "/patients/prescriptions");
  const createMutation = useCreatePrescriptionMutation();
  const [draft, setDraft] = useState<PrescriptionCreateDraft>(
    readDraft<PrescriptionCreateDraft>(prescriptionCreateDraftKey) ?? {
      stage: patient?.stage ?? "术后早期",
      goal: "",
      risk: "",
      sequenceName: "肩袖术后第 1 周序列",
      frequency: "3-5 次/周",
      note: "",
      aiReference: "AI 将输出运动处方参考及处方记录区。",
      movements: [
        { id: generateId("mv"), name: "肩胛稳定激活", angle: "10-20 度", repetitions: "10 次", duration: "05:00" },
        { id: generateId("mv"), name: "肩外展训练", angle: "30-60 度", repetitions: "8 次", duration: "06:00" }
      ]
    }
  );
  const [errorMessage, setErrorMessage] = useState("");

  const persist = (patch: Partial<PrescriptionCreateDraft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    writeDraft(prescriptionCreateDraftKey, next);
  };

  const updateMovement = (index: number, patch: Partial<PrescriptionMovement>) => {
    const next = draft.movements.map((movement, currentIndex) =>
      currentIndex === index ? { ...movement, ...patch } : movement
    );
    persist({ movements: next });
  };

  const submit = async () => {
    if (!patient || !draft.stage || !draft.goal || !draft.risk || !draft.sequenceName) {
      setErrorMessage("无法提交，请补全阶段、目标、风险和动作序列。");
      return;
    }

    await createMutation.mutateAsync({
      patientId: patient.id,
      patientName: patient.name,
      stage: draft.stage,
      goal: draft.goal,
      risk: draft.risk,
      sequenceName: draft.sequenceName,
      doctor: `${summaryPlan?.doctor ?? "李明"}医生`,
      status: "待审核",
      note: draft.note,
      aiReference: draft.aiReference,
      videoTitle: "核心稳定训练 - 基础动作教学",
      videoDuration: "15分30秒",
      frequency: draft.frequency,
      movements: draft.movements
    });
    writeState(patientWorkspaceContextKey, {
      selectedId: patient.id,
      patientId: patient.id,
      patientName: patient.name
    });
    if (summaryPlan) {
      writeState(planWorkspaceContextKey, { planId: summaryPlan.id });
    }
    clearDraft(prescriptionCreateDraftKey);
    navigateTo(navigate, targetReturnTo);
  };

  const cancel = () => {
    clearDraft(prescriptionCreateDraftKey);
    navigateTo(navigate, targetReturnTo);
  };

  return (
    <SubPageLayout
      eyebrow={buildPrescriptionBreadcrumb({ navigate, patient, plan: summaryPlan, currentLabel: "新增运动处方" })}
      title="新增动作处方"
      description="默认加载当前患者和当前方案，支持对动作序列中的各动作参数进行二次编辑。"
      fixedBottom
      left={
        <>
          <PatientSummaryCard
            patient={patient}
            plan={summaryPlan}
            prescription={null}
            currentAction={null}
          />
          <Card className="shrink-0 overflow-hidden">
            <CardHeader className="border-b border-border/60">
              <CardTitle>处方表单字段</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="患者姓名">
                <Input value={patient?.name ?? defaultPatientWorkspace.patientName} disabled />
              </Field>
              <Field label="阶段" required>
                <Input value={draft.stage} onChange={(event) => persist({ stage: event.target.value })} />
              </Field>
              <Field label="目标" required>
                <Input value={draft.goal} onChange={(event) => persist({ goal: event.target.value })} />
              </Field>
              <Field label="风险" required>
                <Input value={draft.risk} onChange={(event) => persist({ risk: event.target.value })} />
              </Field>
              <Field label="动作序列" required>
                <Input
                  value={draft.sequenceName}
                  onChange={(event) => persist({ sequenceName: event.target.value })}
                />
              </Field>
              <Field label="频率">
                <Input
                  value={draft.frequency}
                  onChange={(event) => persist({ frequency: event.target.value })}
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="方案备注">
                  <Textarea value={draft.note} onChange={(event) => persist({ note: event.target.value })} />
                </Field>
              </div>
            </CardContent>
          </Card>
          <Card className="shrink-0 overflow-hidden border-border/70 shadow-none">
            <CardHeader className="border-b border-border/60">
              <CardTitle>各动作详情编辑</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              {draft.movements.map((movement, index) => (
                <div key={movement.id} className="grid gap-4 rounded-[1rem] border border-border/70 bg-surface-50 p-4 md:grid-cols-4">
                  <Field label="动作名称">
                    <Input value={movement.name} onChange={(event) => updateMovement(index, { name: event.target.value })} />
                  </Field>
                  <Field label="角度">
                    <Input value={movement.angle} onChange={(event) => updateMovement(index, { angle: event.target.value })} />
                  </Field>
                  <Field label="次数">
                    <Input value={movement.repetitions} onChange={(event) => updateMovement(index, { repetitions: event.target.value })} />
                  </Field>
                  <Field label="时长">
                    <Input value={movement.duration} onChange={(event) => updateMovement(index, { duration: event.target.value })} />
                  </Field>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      }
      right={
        <Card className="flex h-full min-h-0 flex-col overflow-hidden">
          <CardHeader className="border-b border-border/60">
            <CardTitle>AI参考侧栏</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 space-y-5 overflow-y-auto p-5">
            <SectionCard title="AI加载的运动处方参考">
              <Textarea
                value={draft.aiReference}
                onChange={(event) => persist({ aiReference: event.target.value })}
                className="min-h-[220px]"
              />
            </SectionCard>
            <SectionCard title="处方记录区">
              <div className="space-y-3">
                {draft.movements.map((movement) => (
                  <div key={movement.id} className="rounded-[1rem] border border-border/70 bg-surface-50 px-4 py-3 text-sm text-muted-foreground">
                    {`${movement.name}｜${movement.angle}｜${movement.repetitions}｜${movement.duration}`}
                  </div>
                ))}
              </div>
            </SectionCard>
          </CardContent>
        </Card>
      }
      bottom={
        <>
          <div>
            {errorMessage ? <p className="text-sm text-rose-700">{errorMessage}</p> : <p className="text-sm text-primary">提交后会返回当前方案的运动处方列表页。</p>}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => writeDraft(prescriptionCreateDraftKey, draft)}>
              <Save className="h-4 w-4" />
              草稿保存
            </Button>
            <Button variant="outline" onClick={cancel}>
              取消
            </Button>
            <Button onClick={submit}>提交</Button>
          </div>
        </>
      }
    />
  );
}

export function PrescriptionEditPage({
  patientId,
  planId,
  prescriptionId,
  returnTo
}: CarePathSubPageProps = {}) {
  const navigate = useNavigate();
  const { data: patients = [] } = usePatientsQuery();
  const { data: plans = [] } = usePlansQuery();
  const { data: prescriptions = [] } = usePrescriptionsQuery();
  const summaryPlan =
    plans.find((item) => item.id === planId) ??
    plans.find((item) => item.id === readState<{ planId: string }>(planWorkspaceContextKey)?.planId) ??
    null;
  const summaryPrescription =
    prescriptions.find((item) => item.id === prescriptionId) ??
    prescriptions.find(
      (item) => item.id === readState<{ prescriptionId: string }>(prescriptionWorkspaceContextKey)?.prescriptionId
    ) ??
    null;
  const patient = resolveWorkspacePatient(patients, plans, prescriptions, patientId ?? summaryPrescription?.patientId ?? summaryPlan?.patientId) ?? patients[0] ?? null;
  const targetReturnTo =
    returnTo ?? (patient && summaryPlan ? patientPlanPrescriptionsPath(patient.id, summaryPlan.id) : "/patients/prescriptions");
  const updateMutation = useUpdatePrescriptionMutation();
  const [draft, setDraft] = useState<PrescriptionCreateDraft>(
    readDraft<PrescriptionCreateDraft>(prescriptionEditDraftKey) ?? {
      stage: summaryPrescription?.stage ?? patient?.stage ?? "术后早期",
      goal: summaryPrescription?.goal ?? "",
      risk: summaryPrescription?.risk ?? "",
      sequenceName: summaryPrescription?.sequenceName ?? "肩袖术后第 1 周序列",
      frequency: summaryPrescription?.frequency ?? "3-5 次/周",
      note: summaryPrescription?.note ?? "",
      aiReference: summaryPrescription?.aiReference ?? "AI 将输出运动处方参考及处方记录区。",
      movements: summaryPrescription?.movements ?? []
    }
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [sequencePreviewOpen, setSequencePreviewOpen] = useState(false);

  const persist = (patch: Partial<PrescriptionCreateDraft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    writeDraft(prescriptionEditDraftKey, next);
  };

  const updateMovement = (index: number, patch: Partial<PrescriptionMovement>) => {
    const next = draft.movements.map((movement, currentIndex) =>
      currentIndex === index ? { ...movement, ...patch } : movement
    );
    persist({ movements: next });
  };

  const submit = async () => {
    if (!summaryPrescription || !draft.stage || !draft.goal || !draft.risk || !draft.sequenceName) {
      setErrorMessage("无法提交，请补全阶段、目标、风险和动作序列。");
      return;
    }

    await updateMutation.mutateAsync({
      id: summaryPrescription.id,
      patch: {
        stage: draft.stage,
        goal: draft.goal,
        risk: draft.risk,
        sequenceName: draft.sequenceName,
        note: draft.note,
        aiReference: draft.aiReference,
        frequency: draft.frequency,
        movements: draft.movements
      }
    });
    clearDraft(prescriptionEditDraftKey);
    navigateTo(navigate, targetReturnTo);
  };

  const cancel = () => {
    clearDraft(prescriptionEditDraftKey);
    navigateTo(navigate, targetReturnTo);
  };

  return (
    <>
      <SubPageLayout
        eyebrow={buildPrescriptionBreadcrumb({ navigate, patient, plan: summaryPlan, currentLabel: "修改运动处方" })}
        title="修改运动处方"
        description="默认加载当前选中的运动处方，支持修改主字段和各动作参数。"
        actions={
          <Button variant="secondary" onClick={() => setSequencePreviewOpen(true)}>
            <PlayCircle className="h-4 w-4" />
            动作序列视频预览
          </Button>
        }
        left={
          <>
            <PatientSummaryCard patient={patient} plan={summaryPlan} prescription={summaryPrescription} currentAction={null} />
            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <CardHeader className="border-b border-border/60">
                <CardTitle>处方表单字段</CardTitle>
              </CardHeader>
              <CardContent className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 md:grid-cols-2">
                <Field label="患者姓名">
                  <Input value={patient?.name ?? defaultPatientWorkspace.patientName} disabled />
                </Field>
                <Field label="阶段" required>
                  <Input value={draft.stage} onChange={(event) => persist({ stage: event.target.value })} />
                </Field>
                <Field label="目标" required>
                  <Input value={draft.goal} onChange={(event) => persist({ goal: event.target.value })} />
                </Field>
                <Field label="风险" required>
                  <Input value={draft.risk} onChange={(event) => persist({ risk: event.target.value })} />
                </Field>
                <Field label="动作序列" required>
                  <Input value={draft.sequenceName} onChange={(event) => persist({ sequenceName: event.target.value })} />
                </Field>
                <Field label="频率">
                  <Input value={draft.frequency} onChange={(event) => persist({ frequency: event.target.value })} />
                </Field>
                <div className="md:col-span-2">
                  <Field label="方案备注">
                    <Textarea value={draft.note} onChange={(event) => persist({ note: event.target.value })} />
                  </Field>
                </div>
              </CardContent>
            </Card>
            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-border/70 shadow-none">
              <CardHeader className="border-b border-border/60">
                <CardTitle>各动作详情编辑</CardTitle>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                {draft.movements.map((movement, index) => (
                  <div key={movement.id} className="grid gap-4 rounded-[1rem] border border-border/70 bg-surface-50 p-4 md:grid-cols-4">
                    <Field label="动作名称">
                      <Input value={movement.name} onChange={(event) => updateMovement(index, { name: event.target.value })} />
                    </Field>
                    <Field label="角度">
                      <Input value={movement.angle} onChange={(event) => updateMovement(index, { angle: event.target.value })} />
                    </Field>
                    <Field label="次数">
                      <Input value={movement.repetitions} onChange={(event) => updateMovement(index, { repetitions: event.target.value })} />
                    </Field>
                    <Field label="时长">
                      <Input value={movement.duration} onChange={(event) => updateMovement(index, { duration: event.target.value })} />
                    </Field>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        }
        right={
          <Card className="flex h-full min-h-0 flex-col overflow-hidden">
            <CardHeader className="border-b border-border/60">
              <CardTitle>AI参考侧栏</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 space-y-5 overflow-y-auto p-5">
              <SectionCard title="AI加载的运动处方参考">
                <Textarea
                  value={draft.aiReference}
                  onChange={(event) => persist({ aiReference: event.target.value })}
                  className="min-h-[220px]"
                />
              </SectionCard>
            </CardContent>
          </Card>
        }
        bottom={
          <>
            <div>
              {errorMessage ? <p className="text-sm text-rose-700">{errorMessage}</p> : <p className="text-sm text-primary">修改完成后会返回运动处方列表，并更新详情侧栏。</p>}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => writeDraft(prescriptionEditDraftKey, draft)}>
                <Save className="h-4 w-4" />
                草稿保存
              </Button>
              <Button variant="outline" onClick={cancel}>
                取消
              </Button>
              <Button onClick={submit}>提交修改</Button>
            </div>
          </>
        }
      />
      <CarePathVideoPreviewDialog
        open={sequencePreviewOpen}
        onOpenChange={setSequencePreviewOpen}
        title={draft.sequenceName || summaryPrescription?.sequenceName || "动作序列视频预览"}
        description="通过弹窗预览当前运动处方对应的动作序列视频，用于核对序列顺序、阶段和节奏。"
        subtitle={`${draft.stage || patient?.stage || "阶段待补充"} · ${draft.frequency || "频率待补充"} · 共 ${draft.movements.length} 个动作`}
        durationLabel={summaryPrescription?.videoDuration || "01:08"}
        details={[
          { label: "患者姓名", value: patient?.name ?? defaultPatientWorkspace.patientName },
          { label: "动作序列", value: draft.sequenceName },
          { label: "训练目标", value: draft.goal },
          { label: "训练风险", value: draft.risk }
        ]}
        sequenceSteps={draft.movements.map((movement) => movement.name)}
        noteText={draft.note || "当前预览用于在编辑页快速核对动作序列视频与处方字段是否一致。"}
      />
    </>
  );
}

export function CurrentActionCreatePage({
  patientId,
  planId,
  prescriptionId,
  returnTo
}: CarePathSubPageProps = {}) {
  const navigate = useNavigate();
  const { data: patients = [] } = usePatientsQuery();
  const { data: plans = [] } = usePlansQuery();
  const { data: prescriptions = [] } = usePrescriptionsQuery();
  const summaryPlan =
    plans.find((item) => item.id === planId) ??
    plans.find((item) => item.id === readState<{ planId: string }>(planWorkspaceContextKey)?.planId) ??
    null;
  const summaryPrescription =
    prescriptions.find((item) => item.id === prescriptionId) ??
    prescriptions.find((item) => item.id === readState<{ prescriptionId: string }>(prescriptionWorkspaceContextKey)?.prescriptionId) ??
    null;
  const patient = resolveWorkspacePatient(patients, plans, prescriptions, patientId ?? summaryPrescription?.patientId ?? summaryPlan?.patientId) ?? patients[0] ?? null;
  const targetReturnTo =
    returnTo ??
    (patient && summaryPlan && summaryPrescription
      ? patientPrescriptionCurrentPath(patient.id, summaryPlan.id, summaryPrescription.id)
      : "/patients/current");
  const createMutation = useCreateCurrentActionMutation();
  const [draft, setDraft] = useState<CurrentActionCreateDraft>(
    readDraft<CurrentActionCreateDraft>(currentActionCreateDraftKey) ?? {
      title: "肩外展训练",
      part: "肩关节",
      duration: "06:00",
      intensity: "中等",
      note: "动作幅度控制 30-60 度，避免代偿"
    }
  );
  const [errorMessage, setErrorMessage] = useState("");

  const persist = (patch: Partial<CurrentActionCreateDraft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    writeDraft(currentActionCreateDraftKey, next);
  };

  const cancel = () => {
    clearDraft(currentActionCreateDraftKey);
    navigateTo(navigate, targetReturnTo);
  };

  const submit = async () => {
    if (!patient || !draft.title || !draft.part || !draft.duration || !draft.intensity) {
      setErrorMessage("无法提交，请补全动作名称、部位、时间和强度。");
      return;
    }

    await createMutation.mutateAsync({
      patientId: patient.id,
      title: draft.title,
      part: draft.part,
      duration: draft.duration,
      intensity: draft.intensity,
      note: draft.note
    });
    writeState(patientWorkspaceContextKey, {
      selectedId: patient.id,
      patientId: patient.id,
      patientName: patient.name
    });
    if (summaryPlan) {
      writeState(planWorkspaceContextKey, { planId: summaryPlan.id });
    }
    if (summaryPrescription) {
      writeState(prescriptionWorkspaceContextKey, { prescriptionId: summaryPrescription.id });
    }
    clearDraft(currentActionCreateDraftKey);
    navigateTo(navigate, targetReturnTo);
  };

  const previewAction: CurrentAction | null = patient
    ? {
        id: "action-preview",
        patientId: patient.id,
        title: draft.title || "肩外展训练",
        part: draft.part || "肩关节",
        duration: draft.duration || "06:00",
        intensity: draft.intensity || "中等",
        note: draft.note || "动作幅度控制 30-60 度，避免代偿",
        updatedAt: new Date().toISOString()
      }
    : null;

  return (
    <SubPageLayout
      eyebrow={buildCurrentBreadcrumb({ navigate, patient, plan: summaryPlan, prescription: summaryPrescription, currentLabel: "新增单体动作" })}
      title="新增单体动作"
      description="当前原型页用于补充单体动作信息与视频预览位，提交后返回当前处方动作页。"
      left={
        <>
          <PatientSummaryCard
            patient={patient}
            plan={summaryPlan}
            prescription={null}
            currentAction={previewAction}
          />
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <CardHeader className="border-b border-border/60">
              <CardTitle>单体动作字段</CardTitle>
            </CardHeader>
            <CardContent className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 md:grid-cols-2">
              <Field label="动作名称">
                <Input value={draft.title} onChange={(event) => persist({ title: event.target.value })} />
              </Field>
              <Field label="部位">
                <Input value={draft.part} onChange={(event) => persist({ part: event.target.value })} />
              </Field>
              <Field label="时间">
                <Input value={draft.duration} onChange={(event) => persist({ duration: event.target.value })} />
              </Field>
              <Field label="强度">
                <Input value={draft.intensity} onChange={(event) => persist({ intensity: event.target.value })} />
              </Field>
              <div className="md:col-span-2">
                <Field label="动作说明">
                  <Textarea value={draft.note} onChange={(event) => persist({ note: event.target.value })} />
                </Field>
              </div>
            </CardContent>
          </Card>
        </>
      }
      right={
        <Card className="flex h-full min-h-0 flex-col overflow-hidden">
          <CardHeader className="border-b border-border/60">
            <CardTitle>视频与说明侧栏</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 space-y-5 overflow-y-auto p-5">
            <SectionCard title="视频预览位">
              <div className="rounded-[1.25rem] border border-border/70 bg-surface-950 px-4 py-5 text-white">
                <p className="text-base font-semibold">康复训练教学视频</p>
                <p className="mt-2 text-sm text-white/70">核心稳定性训练 - 基础动作教学</p>
                <p className="mt-2 text-xs text-white/60">时长：15分30秒 | 难度：初级</p>
              </div>
            </SectionCard>
            <PropertyList
              items={[
                { label: "动作名称", value: draft.title },
                { label: "动作部位", value: draft.part },
                { label: "执行时间", value: draft.duration },
                { label: "执行强度", value: draft.intensity }
              ]}
            />
          </CardContent>
        </Card>
      }
      bottom={
        <>
          <div>
            {errorMessage ? (
              <p className="text-sm text-rose-700">{errorMessage}</p>
            ) : (
              <p className="text-sm text-primary">提交后会回到当前处方列表，并展示刚新增的动作。</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => writeDraft(currentActionCreateDraftKey, draft)}>
              <Save className="h-4 w-4" />
              草稿保存
            </Button>
            <Button variant="outline" onClick={cancel}>
              取消
            </Button>
            <Button onClick={submit}>提交</Button>
          </div>
        </>
      }
    />
  );
}

export function CurrentActionEditPage({
  patientId,
  planId,
  prescriptionId,
  returnTo
}: CarePathSubPageProps = {}) {
  const navigate = useNavigate();
  const { data: patients = [] } = usePatientsQuery();
  const { data: plans = [] } = usePlansQuery();
  const { data: prescriptions = [] } = usePrescriptionsQuery();
  const { data: currentActions = [] } = useCurrentActionsQuery();
  const summaryPlan =
    plans.find((item) => item.id === planId) ??
    plans.find((item) => item.id === readState<{ planId: string }>(planWorkspaceContextKey)?.planId) ??
    null;
  const summaryPrescription =
    prescriptions.find((item) => item.id === prescriptionId) ??
    prescriptions.find(
      (item) => item.id === readState<{ prescriptionId: string }>(prescriptionWorkspaceContextKey)?.prescriptionId
    ) ??
    null;
  const patient = resolveWorkspacePatient(patients, plans, prescriptions, patientId ?? summaryPrescription?.patientId ?? summaryPlan?.patientId) ?? patients[0] ?? null;
  const targetReturnTo =
    returnTo ??
    (patient && summaryPlan && summaryPrescription
      ? patientPrescriptionCurrentPath(patient.id, summaryPlan.id, summaryPrescription.id)
      : "/patients/current");
  const actionWorkspace = readState<{ currentActionId: string }>(currentActionWorkspaceContextKey);
  const persistedAction =
    currentActions.find((item) => item.id === actionWorkspace?.currentActionId) ??
    currentActions.find((item) => item.patientId === patient?.id) ??
    null;
  const exampleMovement =
    actionWorkspace?.currentActionId && actionWorkspace.currentActionId.startsWith("example-")
      ? summaryPrescription?.movements.find((item) =>
          actionWorkspace.currentActionId.includes(item.id)
        ) ?? summaryPrescription?.movements[0]
      : summaryPrescription?.movements[0];
  const fallbackAction: CurrentAction | null =
    !persistedAction && patient && exampleMovement
      ? {
          id: actionWorkspace?.currentActionId ?? "action-preview",
          patientId: patient.id,
          title: exampleMovement.name,
          part: exampleMovement.name.includes("肩") ? "肩关节" : "训练部位",
          duration: exampleMovement.duration,
          intensity: "中等",
          note: `示例动作：${exampleMovement.name}，角度 ${exampleMovement.angle}，次数 ${exampleMovement.repetitions}。`,
          updatedAt: summaryPrescription?.issuedAt ?? new Date().toISOString()
        }
      : null;
  const summaryAction = persistedAction ?? fallbackAction;
  const createMutation = useCreateCurrentActionMutation();
  const updateMutation = useUpdateCurrentActionMutation();
  const initialDraft = useMemo<CurrentActionCreateDraft>(
    () =>
      readDraft<CurrentActionCreateDraft>(currentActionEditDraftKey) ?? {
        title: summaryAction?.title ?? "肩外展训练",
        part: summaryAction?.part ?? "肩关节",
        duration: summaryAction?.duration ?? "06:00",
        intensity: summaryAction?.intensity ?? "中等",
        note: summaryAction?.note ?? "动作幅度控制 30-60 度，避免代偿"
      },
    [summaryAction]
  );
  const [draft, setDraft] = useState<CurrentActionCreateDraft>(initialDraft);
  const [errorMessage, setErrorMessage] = useState("");
  const [motionPreviewOpen, setMotionPreviewOpen] = useState(false);

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  const persist = (patch: Partial<CurrentActionCreateDraft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    writeDraft(currentActionEditDraftKey, next);
  };

  const cancel = () => {
    clearDraft(currentActionEditDraftKey);
    navigateTo(navigate, targetReturnTo);
  };

  const submit = async () => {
    if (!patient || !draft.title || !draft.part || !draft.duration || !draft.intensity) {
      setErrorMessage("无法提交，请补全动作名称、部位、时间和强度。");
      return;
    }

    if (persistedAction) {
      await updateMutation.mutateAsync({
        id: persistedAction.id,
        patch: {
          title: draft.title,
          part: draft.part,
          duration: draft.duration,
          intensity: draft.intensity,
          note: draft.note
        }
      });
      writeState(currentActionWorkspaceContextKey, { currentActionId: persistedAction.id });
    } else {
      const created = await createMutation.mutateAsync({
        patientId: patient.id,
        title: draft.title,
        part: draft.part,
        duration: draft.duration,
        intensity: draft.intensity,
        note: draft.note
      });
      writeState(currentActionWorkspaceContextKey, { currentActionId: created.id });
    }

    writeState(patientWorkspaceContextKey, {
      selectedId: patient.id,
      patientId: patient.id,
      patientName: patient.name
    });
    if (summaryPlan) {
      writeState(planWorkspaceContextKey, { planId: summaryPlan.id });
    }
    if (summaryPrescription) {
      writeState(prescriptionWorkspaceContextKey, { prescriptionId: summaryPrescription.id });
    }
    clearDraft(currentActionEditDraftKey);
    navigateTo(navigate, targetReturnTo);
  };

  const previewAction: CurrentAction | null = patient
    ? {
        id: summaryAction?.id ?? "action-preview",
        patientId: patient.id,
        title: draft.title || "肩外展训练",
        part: draft.part || "肩关节",
        duration: draft.duration || "06:00",
        intensity: draft.intensity || "中等",
        note: draft.note || "动作幅度控制 30-60 度，避免代偿",
        updatedAt: summaryAction?.updatedAt ?? new Date().toISOString()
      }
    : null;

  return (
    <>
      <SubPageLayout
        eyebrow={buildCurrentBreadcrumb({ navigate, patient, plan: summaryPlan, prescription: summaryPrescription, currentLabel: "修改单体动作" })}
        title="修改单体动作"
        description="默认加载当前选中的单体动作，支持修改动作字段并保持右侧视频预览。"
        actions={
          <Button variant="secondary" onClick={() => setMotionPreviewOpen(true)}>
            <PlayCircle className="h-4 w-4" />
            标准动作视频预览
          </Button>
        }
        left={
          <>
            <PatientSummaryCard
              patient={patient}
              plan={summaryPlan}
              prescription={summaryPrescription}
              currentAction={previewAction}
            />
            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <CardHeader className="border-b border-border/60">
                <CardTitle>单体动作字段</CardTitle>
              </CardHeader>
              <CardContent className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 md:grid-cols-2">
                <Field label="动作名称">
                  <Input value={draft.title} onChange={(event) => persist({ title: event.target.value })} />
                </Field>
                <Field label="部位">
                  <Input value={draft.part} onChange={(event) => persist({ part: event.target.value })} />
                </Field>
                <Field label="时间">
                  <Input value={draft.duration} onChange={(event) => persist({ duration: event.target.value })} />
                </Field>
                <Field label="强度">
                  <Input value={draft.intensity} onChange={(event) => persist({ intensity: event.target.value })} />
                </Field>
                <div className="md:col-span-2">
                  <Field label="动作说明">
                    <Textarea value={draft.note} onChange={(event) => persist({ note: event.target.value })} />
                  </Field>
                </div>
              </CardContent>
            </Card>
          </>
        }
        right={
          <Card className="flex h-full min-h-0 flex-col overflow-hidden">
            <CardHeader className="border-b border-border/60">
              <CardTitle>视频与说明侧栏</CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
              <SectionCard title="视频预览位">
                <div className="rounded-[1.25rem] border border-border/70 bg-surface-950 px-4 py-5 text-white">
                  <p className="text-base font-semibold">
                    {summaryPrescription?.videoTitle ?? "康复训练教学视频"}
                  </p>
                  <p className="mt-2 text-sm text-white/70">
                    {summaryPrescription?.videoTitle
                      ? `时长：${summaryPrescription.videoDuration} | 难度：初级`
                      : "核心稳定性训练 - 基础动作教学"}
                  </p>
                </div>
              </SectionCard>
              <PropertyList
                items={[
                  { label: "动作名称", value: draft.title },
                  { label: "动作部位", value: draft.part },
                  { label: "执行时间", value: draft.duration },
                  { label: "执行强度", value: draft.intensity }
                ]}
              />
            </CardContent>
          </Card>
        }
        bottom={
          <>
            <div>
              {errorMessage ? (
                <p className="text-sm text-rose-700">{errorMessage}</p>
              ) : (
                <p className="text-sm text-primary">修改完成后会返回当前处方列表，并更新右侧详情。</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => writeDraft(currentActionEditDraftKey, draft)}>
                <Save className="h-4 w-4" />
                草稿保存
              </Button>
              <Button variant="outline" onClick={cancel}>
                取消
              </Button>
              <Button onClick={submit}>提交修改</Button>
            </div>
          </>
        }
      />
      <CarePathVideoPreviewDialog
        open={motionPreviewOpen}
        onOpenChange={setMotionPreviewOpen}
        title={draft.title || summaryPrescription?.videoTitle || "标准动作视频预览"}
        description="通过弹窗预览当前单体动作对应的标准动作视频，用于核对动作部位、时长和执行强度。"
        subtitle={`${draft.part || "部位待补充"} · ${draft.duration || "时长待补充"} · ${draft.intensity || "强度待补充"}`}
        durationLabel={summaryPrescription?.videoDuration || "00:42"}
        details={[
          { label: "患者姓名", value: patient?.name ?? defaultPatientWorkspace.patientName },
          { label: "动作名称", value: draft.title },
          { label: "动作部位", value: draft.part },
          { label: "执行强度", value: draft.intensity }
        ]}
        noteText={draft.note || "当前预览用于在编辑页快速核对单体动作与标准动作视频说明是否一致。"}
      />
    </>
  );
}

function ExportSubPage({
  eyebrow,
  title,
  description,
  draftKey,
  returnTo,
  detailTitle,
  initialDraft,
  exportHint,
  onGenerate
}: {
  eyebrow: React.ReactNode;
  title: string;
  description: string;
  draftKey: string;
  returnTo: ExportReturnTo;
  detailTitle: string;
  initialDraft: ExportDraft;
  exportHint: string;
  onGenerate: (draft: ExportDraft) => Promise<string>;
}) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ExportDraft>(readDraft<ExportDraft>(draftKey) ?? initialDraft);
  const [message, setMessage] = useState("");

  const persist = (patch: Partial<ExportDraft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    writeDraft(draftKey, next);
  };

  const submit = async () => {
    const next = await onGenerate(draft);
    setMessage(next);
  };

  const cancel = () => {
    clearDraft(draftKey);
    navigateTo(navigate, returnTo);
  };

  return (
    <SubPageLayout
      eyebrow={eyebrow}
      title={title}
      description={description}
      left={
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CardHeader className="border-b border-border/60">
            <CardTitle>导出配置</CardTitle>
          </CardHeader>
          <CardContent className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 md:grid-cols-2">
            <Field label="导出对象">
              <Input value={draft.exportScope} onChange={(event) => persist({ exportScope: event.target.value })} />
            </Field>
            <Field label="导出时间范围">
              <Input value={draft.dateRange} onChange={(event) => persist({ dateRange: event.target.value })} />
            </Field>
            <Field label="导出对象说明">
              <Input value={draft.exportObject} onChange={(event) => persist({ exportObject: event.target.value })} />
            </Field>
            <Field label="导出条件">
              <Input value={draft.exportCondition} onChange={(event) => persist({ exportCondition: event.target.value })} />
            </Field>
            <Field label="导出格式">
              <Input value={draft.format} onChange={(event) => persist({ format: event.target.value })} />
            </Field>
          </CardContent>
        </Card>
      }
      right={
        <Card className="flex h-full min-h-0 flex-col overflow-hidden">
          <CardHeader className="border-b border-border/60">
            <CardTitle>{detailTitle}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 space-y-5 overflow-y-auto p-5">
            <PropertyList
              items={[
                { label: "导出对象", value: draft.exportScope },
                { label: "时间范围", value: draft.dateRange },
                { label: "导出条件", value: draft.exportCondition },
                { label: "导出格式", value: draft.format }
              ]}
            />
            <SectionCard title="导出说明">
              <p className="text-sm leading-7 text-muted-foreground">{exportHint}</p>
            </SectionCard>
            {message ? (
              <SectionCard title="任务结果">
                <p className="text-sm leading-7 text-primary">{message}</p>
              </SectionCard>
            ) : null}
          </CardContent>
        </Card>
      }
      bottom={
        <>
          <div>
            <p className="text-sm text-primary">支持开始导出、草稿保存；导出历史本期先预留。</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => writeDraft(draftKey, draft)}>
              <Save className="h-4 w-4" />
              草稿保存
            </Button>
            <Button variant="outline" onClick={cancel}>
              取消
            </Button>
            <Button onClick={submit}>
              <FileOutput className="h-4 w-4" />
              开始导出
            </Button>
          </div>
        </>
      }
    />
  );
}

export function PrescriptionExportPage({
  patientId,
  planId,
  returnTo
}: CarePathSubPageProps = {}) {
  const navigate = useNavigate();
  const { data: patients = [] } = usePatientsQuery();
  const { data: plans = [] } = usePlansQuery();
  const summaryPlan =
    plans.find((item) => item.id === planId) ??
    plans.find((item) => item.id === readState<{ planId: string }>(planWorkspaceContextKey)?.planId) ??
    null;
  const patient =
    resolveWorkspacePatient(patients, plans, [], patientId ?? summaryPlan?.patientId) ?? patients[0] ?? null;
  const targetReturnTo =
    returnTo ?? (patientId && planId ? patientPlanPrescriptionsPath(patientId, planId) : "/patients/prescriptions");

  return (
    <ExportSubPage
      eyebrow={buildPrescriptionBreadcrumb({ navigate, patient, plan: summaryPlan, currentLabel: "导出运动处方" })}
      title="导出运动处方"
      description="支持按当前筛选结果或选中记录导出，并配置导出时间范围、对象和条件。"
      draftKey={prescriptionExportDraftKey}
      returnTo={targetReturnTo}
      detailTitle="导出任务摘要"
      initialDraft={{
        exportScope: "当前筛选结果",
        dateRange: "近30天",
        exportObject: "张三运动处方",
        exportCondition: "已完成 + 待审核",
        format: "PDF / XLSX / DOCX"
      }}
      exportHint="适合用于查房资料、病区同步和康复方案备案。"
      onGenerate={async () => {
        const result = await api.exportPrescriptions(1);
        return `已生成 ${result.fileName}，生成时间 ${formatDateTime(result.generatedAt)}`;
      }}
    />
  );
}

export function PlanExportPage({
  scope = "all",
  patientId,
  returnTo
}: CarePathSubPageProps = {}) {
  const navigate = useNavigate();
  const { data: patients = [] } = usePatientsQuery();
  const { data: plans = [] } = usePlansQuery();
  const patient = resolveWorkspacePatient(patients, plans, [], patientId) ?? patients[0] ?? null;
  const summaryPlan = plans.find((item) => item.patientId === patient?.id) ?? null;
  const targetReturnTo = returnTo ?? (scope === "patient" && patientId ? patientPlansPath(patientId) : "/patients/plans");

  return (
    <ExportSubPage
      eyebrow={buildPlanBreadcrumb({ navigate, patient, plan: summaryPlan, currentLabel: "导出方案", scope })}
      title="导出方案"
      description="支持当前筛选结果或当前方案导出，并配置时间范围、导出对象和条件。"
      draftKey={planExportDraftKey}
      returnTo={targetReturnTo}
      detailTitle="导出任务摘要"
      initialDraft={{
        exportScope: "当前筛选结果",
        dateRange: "近30天",
        exportObject: "康复方案",
        exportCondition: "已同步 + 待同步",
        format: "PDF / XLSX / DOCX"
      }}
      exportHint="适合用于医生查房记录、护理同步和康复方案备案。"
      onGenerate={async () => {
        const result = await api.exportPrescriptions(1);
        return `已生成 ${result.fileName.replace("prescriptions", "plans")}，生成时间 ${formatDateTime(result.generatedAt)}`;
      }}
    />
  );
}

export function CurrentActionExportPage({
  patientId,
  planId,
  prescriptionId,
  returnTo
}: CarePathSubPageProps = {}) {
  const navigate = useNavigate();
  const { data: patients = [] } = usePatientsQuery();
  const { data: plans = [] } = usePlansQuery();
  const { data: prescriptions = [] } = usePrescriptionsQuery();
  const summaryPlan =
    plans.find((item) => item.id === planId) ??
    plans.find((item) => item.id === readState<{ planId: string }>(planWorkspaceContextKey)?.planId) ??
    null;
  const summaryPrescription =
    prescriptions.find((item) => item.id === prescriptionId) ??
    prescriptions.find((item) => item.id === readState<{ prescriptionId: string }>(prescriptionWorkspaceContextKey)?.prescriptionId) ??
    null;
  const patient =
    resolveWorkspacePatient(
      patients,
      plans,
      prescriptions,
      patientId ?? summaryPrescription?.patientId ?? summaryPlan?.patientId
    ) ?? patients[0] ?? null;
  const targetReturnTo =
    returnTo ??
    (patientId && planId && prescriptionId
      ? patientPrescriptionCurrentPath(patientId, planId, prescriptionId)
      : "/patients/current");

  return (
    <ExportSubPage
      eyebrow={buildCurrentBreadcrumb({ navigate, patient, plan: summaryPlan, prescription: summaryPrescription, currentLabel: "导出单体动作" })}
      title="导出单体动作"
      description="支持导出当前单体动作列表，并配置导出时间范围、对象和条件。"
      draftKey={currentActionExportDraftKey}
      returnTo={targetReturnTo}
      detailTitle="导出任务摘要"
      initialDraft={{
        exportScope: "当前单体动作",
        dateRange: "近30天",
        exportObject: "当前标准动作处方列表",
        exportCondition: "按最近操作时间排序",
        format: "PDF / XLSX / DOCX"
      }}
      exportHint="适合用于病区床旁演示、动作单页打印和教学视频同步。"
      onGenerate={async () => {
        const result = await api.exportPrescriptions(1);
        return `已生成 ${result.fileName.replace("prescriptions", "current-actions")}，生成时间 ${formatDateTime(result.generatedAt)}`;
      }}
    />
  );
}

export function ReportReviewPage() {
  const navigate = useNavigate();
  const { data: reports = [] } = useReportsQuery();
  const reviewMutation = useReviewReportMutation();
  const reportWorkspace = readState<{ reportId: string }>(reportWorkspaceContextKey);
  const report =
    reports.find((item) => item.id === reportWorkspace?.reportId) ??
    reports.find((item) => item.patientId === defaultPatientWorkspace.patientId) ??
    reports[0] ??
    null;
  const [draft, setDraft] = useState<ReportReviewDraft>(
    readDraft<ReportReviewDraft>(reviewDraftKey) ?? {
      completionRate: report?.completionRate ?? "92%",
      romChange: report?.romChange ?? "肩外展 +18°",
      painScore: report?.painScore ?? "3/10",
      nurseComment: report?.nurseComment ?? "",
      doctorComment: report?.doctorComment ?? "",
      note: report?.note ?? "",
      aiReference: report?.aiReference ?? "AI 已根据训练数据和历史评估结果自动生成评估摘要。"
    }
  );
  const [errorMessage, setErrorMessage] = useState("");

  const persist = (patch: Partial<ReportReviewDraft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    writeDraft(reviewDraftKey, next);
  };

  const submit = async () => {
    if (!report) {
      setErrorMessage("无法提交，当前没有可审核的评估报告。");
      return;
    }

    await reviewMutation.mutateAsync({
      id: report.id,
      patch: {
        ...draft,
        status: "已完成"
      }
    });
    clearDraft(reviewDraftKey);
    navigate({ to: "/patients/reports" });
  };

  const cancel = () => {
    clearDraft(reviewDraftKey);
    navigate({ to: "/patients/reports" });
  };

  return (
    <SubPageLayout
      eyebrow="患者档案管理 > 评估报告 > 审核评估报告"
      title="审核评估报告"
      description="默认加载姓名、完成率、关节活动度变化、疼痛评分、护士评价、医生评价。"
      actions={
        <Button variant="secondary">
          <Sparkles className="h-4 w-4" />
          AI辅助校验
        </Button>
      }
      left={
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CardHeader className="border-b border-border/60">
            <CardTitle>审核表单字段</CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="姓名">
                <Input value={report?.patientName ?? defaultPatientWorkspace.patientName} disabled />
              </Field>
              <Field label="完成率">
                <Input value={draft.completionRate} onChange={(event) => persist({ completionRate: event.target.value })} />
              </Field>
              <Field label="关节活动度变化">
                <Input value={draft.romChange} onChange={(event) => persist({ romChange: event.target.value })} />
              </Field>
            </div>
            <Field label="疼痛评分">
              <Input value={draft.painScore} onChange={(event) => persist({ painScore: event.target.value })} />
            </Field>
            <Field label="护士评价">
              <Textarea value={draft.nurseComment} onChange={(event) => persist({ nurseComment: event.target.value })} />
            </Field>
            <Field label="医生评价">
              <Textarea value={draft.doctorComment} onChange={(event) => persist({ doctorComment: event.target.value })} />
            </Field>
            <Field label="评估报告备注">
              <Textarea value={draft.note} onChange={(event) => persist({ note: event.target.value })} />
            </Field>
            <Field label="富文本编辑区">
              <Textarea
                value={`完成率：${draft.completionRate}\n关节活动度变化：${draft.romChange}\n疼痛评分：${draft.painScore}\n评估报告备注：${draft.note}`}
                onChange={(event) => persist({ note: event.target.value })}
              />
            </Field>
          </CardContent>
        </Card>
      }
      right={
        <Card className="flex h-full min-h-0 flex-col overflow-hidden">
          <CardHeader className="border-b border-border/60">
            <CardTitle>AI参考侧栏</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 space-y-5 overflow-y-auto p-5">
            <PropertyList
              items={[
                { label: "患者", value: report?.patientName ?? defaultPatientWorkspace.patientName },
                { label: "完成率", value: draft.completionRate },
                { label: "ROM变化", value: draft.romChange },
                { label: "疼痛评分", value: draft.painScore }
              ]}
            />
            <SectionCard title="AI参考评估结果">
              <Textarea
                value={draft.aiReference}
                onChange={(event) => persist({ aiReference: event.target.value })}
                className="min-h-[220px]"
              />
            </SectionCard>
          </CardContent>
        </Card>
      }
      bottom={
        <>
          <div>
            {errorMessage ? <p className="text-sm text-rose-700">{errorMessage}</p> : <p className="text-sm text-primary">支持提交、草稿保存、再次进入时恢复草稿。</p>}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => writeDraft(reviewDraftKey, draft)}>
              <Save className="h-4 w-4" />
              草稿保存
            </Button>
            <Button variant="outline" onClick={cancel}>
              取消
            </Button>
            <Button onClick={submit}>提交审核</Button>
          </div>
        </>
      }
    />
  );
}

export function ReportExportPage() {
  return (
    <ExportSubPage
      eyebrow="患者档案管理 > 评估报告 > 导出评估报告"
      title="导出评估报告"
      description="支持当前筛选结果或选中记录导出，并配置时间范围、导出对象和条件。"
      draftKey={reportExportDraftKey}
      returnTo="/patients/reports"
      detailTitle="导出任务摘要"
      initialDraft={{
        exportScope: "当前筛选结果",
        dateRange: "近30天",
        exportObject: "全局评估报告",
        exportCondition: "医生待评价 + 已完成",
        format: "PDF / XLSX / DOCX"
      }}
      exportHint="当前原型保留导出项配置和结果反馈，适合演示查房归档流程。"
      onGenerate={async () => {
        const result = await api.exportReports(2);
        return `已生成 ${result.fileName}，生成时间 ${formatDateTime(result.generatedAt)}`;
      }}
    />
  );
}
