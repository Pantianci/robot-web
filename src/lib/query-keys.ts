import type { KnowledgeLibrary } from "@/lib/types";

export const queryKeys = {
  dashboard: ["dashboard"] as const,
  knowledge: (library: KnowledgeLibrary) => ["knowledge", library] as const,
  knowledgeTags: ["knowledge", "tags"] as const,
  patients: ["patients"] as const,
  plans: ["plans"] as const,
  currentActions: ["current-actions"] as const,
  prescriptions: ["prescriptions"] as const,
  reports: ["reports"] as const,
  robots: ["robots"] as const
};
