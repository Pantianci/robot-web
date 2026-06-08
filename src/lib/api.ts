import {
  buildDashboard,
  createExportResult,
  createCurrentAction,
  createKnowledgeItem,
  createKnowledgeTag,
  createPatient,
  createPrescription,
  createRehabPlan,
  createRobot,
  deleteCurrentAction,
  deleteKnowledgeItem,
  deleteKnowledgeTag,
  deletePatient,
  deletePrescription,
  deleteRehabPlan,
  deleteReport,
  getCurrentActions,
  getKnowledgeItems,
  getKnowledgeQa,
  getKnowledgeTags,
  getPatients,
  getPrescriptions,
  getRehabPlans,
  getReports,
  getRobots,
  reviewReport,
  updateCurrentAction,
  updateKnowledgeItem,
  updateKnowledgeTag,
  updatePatient,
  updatePrescription,
  updateRehabPlan
} from "@/lib/repository";
import type {
  CurrentAction,
  KnowledgeItem,
  KnowledgeLibrary,
  Patient,
  Prescription,
  RehabPlan,
  Report,
  Robot,
  TagItem
} from "@/lib/types";

export const api = {
  getDashboard: buildDashboard,
  getKnowledgeItems,
  getKnowledgeTags,
  getKnowledgeQa,
  createKnowledgeItem,
  updateKnowledgeItem,
  deleteKnowledgeItem,
  createKnowledgeTag,
  updateKnowledgeTag,
  deleteKnowledgeTag,
  exportKnowledge: async (library: KnowledgeLibrary, count: number) =>
    createExportResult(`${library}-export-${Date.now()}.zip`, count),
  getPatients,
  createPatient,
  updatePatient,
  deletePatient,
  getRehabPlans,
  createRehabPlan,
  updateRehabPlan,
  deleteRehabPlan,
  getCurrentActions,
  createCurrentAction,
  updateCurrentAction,
  deleteCurrentAction,
  getPrescriptions,
  createPrescription,
  updatePrescription,
  deletePrescription,
  exportPrescriptions: async (count: number) =>
    createExportResult(`prescriptions-${Date.now()}.pdf`, count),
  getReports,
  reviewReport,
  deleteReport,
  exportReports: async (count: number) =>
    createExportResult(`reports-${Date.now()}.pdf`, count),
  getRobots,
  createRobot
};

export type CreateKnowledgeInput = Omit<
  KnowledgeItem,
  "id" | "library" | "uploadedAt" | "updatedAt"
>;
export type CreateTagInput = Omit<TagItem, "id" | "library" | "updatedAt">;
export type UpdateTagInput = Partial<TagItem>;
export type CreatePatientInput = Omit<Patient, "id" | "createdAt">;
export type CreatePlanInput = Omit<RehabPlan, "id" | "updatedAt">;
export type CreateCurrentActionInput = Omit<CurrentAction, "id" | "updatedAt">;
export type UpdateCurrentActionInput = Partial<CurrentAction>;
export type CreatePrescriptionInput = Omit<Prescription, "id" | "issuedAt">;
export type ReviewReportInput = Partial<Report>;
export type CreateRobotInput = Omit<Robot, "lastWorkAt">;
