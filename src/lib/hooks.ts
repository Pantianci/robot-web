import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type {
  CreateKnowledgeInput,
  CreatePatientInput,
  CreatePlanInput,
  CreatePrescriptionInput,
  CreateRobotInput,
  CreateTagInput,
  ReviewReportInput,
  UpdateTagInput
} from "@/lib/api";
import type {
  KnowledgeItem,
  KnowledgeLibrary,
  Patient,
  Prescription,
  RehabPlan,
  Report,
  TagItem
} from "@/lib/types";

export function useDashboardQuery() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: api.getDashboard
  });
}

export function useKnowledgeQuery(library: KnowledgeLibrary) {
  return useQuery({
    queryKey: queryKeys.knowledge(library),
    queryFn: () => api.getKnowledgeItems(library)
  });
}

export function useKnowledgeTagsQuery(library: KnowledgeLibrary) {
  return useQuery({
    queryKey: queryKeys.knowledgeTags(library),
    queryFn: () => api.getKnowledgeTags(library)
  });
}

export function useKnowledgeQaQuery(library: KnowledgeLibrary) {
  return useQuery({
    queryKey: queryKeys.knowledgeQa(library),
    queryFn: () => api.getKnowledgeQa(library)
  });
}

export function useCreateKnowledgeMutation(library: KnowledgeLibrary) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateKnowledgeInput) => api.createKnowledgeItem(library, input),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.knowledge(library) });
      await client.invalidateQueries({ queryKey: queryKeys.dashboard });
    }
  });
}

export function useUpdateKnowledgeMutation(library: KnowledgeLibrary) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<KnowledgeItem> }) =>
      api.updateKnowledgeItem(id, patch),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.knowledge(library) });
    }
  });
}

export function useDeleteKnowledgeMutation(library: KnowledgeLibrary) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteKnowledgeItem(id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.knowledge(library) });
    }
  });
}

export function useCreateKnowledgeTagMutation(library: KnowledgeLibrary) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTagInput) => api.createKnowledgeTag(library, input),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.knowledgeTags(library) });
    }
  });
}

export function useUpdateKnowledgeTagMutation(library: KnowledgeLibrary) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateTagInput }) =>
      api.updateKnowledgeTag(id, patch),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.knowledgeTags(library) });
    }
  });
}

export function useDeleteKnowledgeTagMutation(library: KnowledgeLibrary) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteKnowledgeTag(id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.knowledgeTags(library) });
    }
  });
}

export function usePatientsQuery() {
  return useQuery({
    queryKey: queryKeys.patients,
    queryFn: api.getPatients
  });
}

export function useCreatePatientMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePatientInput) => api.createPatient(input),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.patients });
      await client.invalidateQueries({ queryKey: queryKeys.dashboard });
    }
  });
}

export function useUpdatePatientMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Patient> }) =>
      api.updatePatient(id, patch),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.patients });
    }
  });
}

export function useDeletePatientMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePatient(id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.patients });
    }
  });
}

export function usePlansQuery() {
  return useQuery({
    queryKey: queryKeys.plans,
    queryFn: api.getRehabPlans
  });
}

export function useCreatePlanMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePlanInput) => api.createRehabPlan(input),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.plans });
    }
  });
}

export function useUpdatePlanMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<RehabPlan> }) =>
      api.updateRehabPlan(id, patch),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.plans });
    }
  });
}

export function useCurrentActionsQuery() {
  return useQuery({
    queryKey: queryKeys.currentActions,
    queryFn: api.getCurrentActions
  });
}

export function usePrescriptionsQuery() {
  return useQuery({
    queryKey: queryKeys.prescriptions,
    queryFn: api.getPrescriptions
  });
}

export function useCreatePrescriptionMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePrescriptionInput) => api.createPrescription(input),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.prescriptions });
    }
  });
}

export function useUpdatePrescriptionMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Prescription> }) =>
      api.updatePrescription(id, patch),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.prescriptions });
    }
  });
}

export function useReportsQuery() {
  return useQuery({
    queryKey: queryKeys.reports,
    queryFn: api.getReports
  });
}

export function useReviewReportMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ReviewReportInput }) =>
      api.reviewReport(id, patch),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.reports });
    }
  });
}

export function useRobotsQuery() {
  return useQuery({
    queryKey: queryKeys.robots,
    queryFn: api.getRobots
  });
}

export function useCreateRobotMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRobotInput) => api.createRobot(input),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.robots });
      await client.invalidateQueries({ queryKey: queryKeys.dashboard });
    }
  });
}
