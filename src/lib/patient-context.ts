import type { CurrentAction, Patient, Prescription, RehabPlan } from "@/lib/types";

export type PatientWorkspaceContext = {
  patientId: string;
  patientName: string;
};

export type PlanWorkspaceContext = {
  planId: string;
};

export type PrescriptionWorkspaceContext = {
  prescriptionId: string;
};

export type CurrentActionWorkspaceContext = {
  currentActionId: string;
};

export type ReportWorkspaceContext = {
  reportId: string;
};

export const patientWorkspaceContextKey = "robot-web-prototype::patient-workspace";
export const planWorkspaceContextKey = "robot-web-prototype::plan-workspace";
export const prescriptionWorkspaceContextKey = "robot-web-prototype::prescription-workspace";
export const currentActionWorkspaceContextKey = "robot-web-prototype::current-action-workspace";
export const reportWorkspaceContextKey = "robot-web-prototype::report-workspace";

export const defaultPatientWorkspace: PatientWorkspaceContext = {
  patientId: "pat-001",
  patientName: "张三"
};

export function buildPatientSummary(
  patient: Patient | null,
  plan: RehabPlan | null,
  prescription: Prescription | null,
  currentAction: CurrentAction | null
) {
  return [
    { label: "患者姓名", value: patient?.name ?? defaultPatientWorkspace.patientName },
    { label: "当前动作", value: currentAction?.title ?? "肩外展训练" },
    { label: "患者ID", value: patient?.id ?? defaultPatientWorkspace.patientId },
    { label: "阶段", value: patient?.stage ?? plan?.stage ?? prescription?.stage ?? "术后早期" },
    { label: "病种", value: patient?.diagnosis ?? plan?.type ?? "肩袖损伤" },
    { label: "设备", value: patient?.robotId ?? plan?.deviceId ?? "设备012" },
    { label: "病床号", value: patient?.bedNo ?? "12床" },
    { label: "护士", value: plan?.nurse ?? "周宁" },
    { label: "医生", value: plan?.doctor ?? prescription?.doctor ?? "李明" }
  ];
}
