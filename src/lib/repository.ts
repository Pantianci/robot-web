import carePathSeed from "@/mocks/data/care-path.json";
import dashboardSeed from "@/mocks/data/dashboard.json";
import knowledgeSeed from "@/mocks/data/knowledge.json";
import patientsSeed from "@/mocks/data/patients.json";
import robotsSeed from "@/mocks/data/robots.json";
import { isDevelopment } from "@/lib/runtime";
import { queryKeys } from "@/lib/query-keys";
import { generateId } from "@/lib/utils";
import { readAppState, writeAppState } from "@/lib/storage";
import type {
  AppDatabase,
  CarePathSeed,
  DashboardSeed,
  DashboardSummary,
  ExportResult,
  KnowledgeItem,
  KnowledgeLibrary,
  KnowledgeSeed,
  Patient,
  PatientSeed,
  Prescription,
  RehabPlan,
  Report,
  Robot,
  RobotSeed,
  TagItem
} from "@/lib/types";

const fallbackDatabase: AppDatabase = {
  knowledge: knowledgeSeed as KnowledgeSeed,
  patients: patientsSeed as PatientSeed,
  carePath: carePathSeed as CarePathSeed,
  robots: robotsSeed as RobotSeed
};

const fallbackDashboard = dashboardSeed as DashboardSeed;

async function loadSeedFromApi<T>(endpoint: string, fallback: T) {
  if (!isDevelopment || typeof window === "undefined") {
    return fallback;
  }

  const response = await fetch(endpoint);
  if (!response.ok) {
    return fallback;
  }

  return (await response.json()) as T;
}

async function ensureDatabase() {
  const stored = readAppState();
  if (stored) {
    return stored;
  }

  const [knowledge, patients, carePath, robots] = await Promise.all([
    loadSeedFromApi<KnowledgeSeed>("/api/knowledge/seed", fallbackDatabase.knowledge),
    loadSeedFromApi<PatientSeed>("/api/patients/seed", fallbackDatabase.patients),
    loadSeedFromApi<CarePathSeed>("/api/care-path/seed", fallbackDatabase.carePath),
    loadSeedFromApi<RobotSeed>("/api/robots/seed", fallbackDatabase.robots)
  ]);

  const seededDatabase: AppDatabase = {
    knowledge,
    patients,
    carePath,
    robots
  };

  writeAppState(seededDatabase);
  return seededDatabase;
}

async function updateDatabase(mutator: (database: AppDatabase) => AppDatabase) {
  const current = await ensureDatabase();
  const next = mutator(structuredClone(current));
  writeAppState(next);
  return next;
}

export async function getDashboardSeed() {
  return loadSeedFromApi<DashboardSeed>("/api/dashboard/seed", fallbackDashboard);
}

export async function getKnowledgeItems(library: KnowledgeLibrary) {
  const database = await ensureDatabase();
  return database.knowledge.items.filter((item) => item.library === library);
}

export async function getKnowledgeTags(library: KnowledgeLibrary) {
  const database = await ensureDatabase();
  return database.knowledge.tags.filter((tag) => tag.library === library);
}

export async function getKnowledgeQa(library: KnowledgeLibrary) {
  const database = await ensureDatabase();
  return database.knowledge.qaContexts.filter((item) => item.library === library);
}

export async function createKnowledgeItem(
  library: KnowledgeLibrary,
  input: Omit<KnowledgeItem, "id" | "library" | "uploadedAt" | "updatedAt">
) {
  const next = await updateDatabase((database) => {
    database.knowledge.items.unshift({
      ...input,
      id: generateId("knowledge"),
      library,
      uploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAction: "刚刚创建"
    });
    return database;
  });

  return next.knowledge.items.find((item) => item.title === input.title && item.library === library)!;
}

export async function updateKnowledgeItem(
  id: string,
  patch: Partial<KnowledgeItem>
) {
  const next = await updateDatabase((database) => {
    database.knowledge.items = database.knowledge.items.map((item) =>
      item.id === id
        ? {
            ...item,
            ...patch,
            updatedAt: new Date().toISOString(),
            lastAction: "刚刚更新"
          }
        : item
    );
    return database;
  });

  return next.knowledge.items.find((item) => item.id === id) ?? null;
}

export async function deleteKnowledgeItem(id: string) {
  await updateDatabase((database) => {
    const item = database.knowledge.items.find((record) => record.id === id);
    database.knowledge.items = database.knowledge.items.filter((item) => item.id !== id);
    if (item) {
      database.knowledge.qaContexts = database.knowledge.qaContexts.filter(
        (context) => context.library !== item.library || !context.question.includes(item.title)
      );
    }
    return database;
  });
}

export async function createKnowledgeTag(
  library: KnowledgeLibrary,
  input: Omit<TagItem, "id" | "library" | "updatedAt">
) {
  const next = await updateDatabase((database) => {
    database.knowledge.tags.unshift({
      ...input,
      id: generateId("tag"),
      library,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return database;
  });

  return next.knowledge.tags[0];
}

export async function updateKnowledgeTag(
  id: string,
  patch: Partial<TagItem>
) {
  const next = await updateDatabase((database) => {
    database.knowledge.tags = database.knowledge.tags.map((tag) =>
      tag.id === id
        ? {
            ...tag,
            ...patch,
            updatedAt: new Date().toISOString()
          }
        : tag
    );
    return database;
  });

  return next.knowledge.tags.find((tag) => tag.id === id) ?? null;
}

export async function deleteKnowledgeTag(id: string) {
  await updateDatabase((database) => {
    database.knowledge.tags = database.knowledge.tags.filter((tag) => tag.id !== id);
    return database;
  });
}

export async function getPatients() {
  const database = await ensureDatabase();
  return database.patients.items;
}

export async function createPatient(input: Omit<Patient, "id" | "createdAt">) {
  const next = await updateDatabase((database) => {
    database.patients.items.unshift({
      ...input,
      id: generateId("patient"),
      createdAt: new Date().toISOString()
    });
    return database;
  });

  return next.patients.items[0];
}

export async function updatePatient(id: string, patch: Partial<Patient>) {
  const next = await updateDatabase((database) => {
    database.patients.items = database.patients.items.map((item) =>
      item.id === id ? { ...item, ...patch } : item
    );
    return database;
  });

  return next.patients.items.find((item) => item.id === id) ?? null;
}

export async function deletePatient(id: string) {
  await updateDatabase((database) => {
    database.patients.items = database.patients.items.filter((item) => item.id !== id);
    return database;
  });
}

export async function getRehabPlans() {
  const database = await ensureDatabase();
  return database.carePath.plans;
}

export async function createRehabPlan(input: Omit<RehabPlan, "id" | "updatedAt">) {
  const next = await updateDatabase((database) => {
    database.carePath.plans.unshift({
      ...input,
      id: generateId("plan"),
      updatedAt: new Date().toISOString()
    });
    return database;
  });

  return next.carePath.plans[0];
}

export async function updateRehabPlan(id: string, patch: Partial<RehabPlan>) {
  const next = await updateDatabase((database) => {
    database.carePath.plans = database.carePath.plans.map((item) =>
      item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item
    );
    return database;
  });

  return next.carePath.plans.find((item) => item.id === id) ?? null;
}

export async function getCurrentActions() {
  const database = await ensureDatabase();
  return database.carePath.currentActions;
}

export async function getPrescriptions() {
  const database = await ensureDatabase();
  return database.carePath.prescriptions;
}

export async function createPrescription(
  input: Omit<Prescription, "id" | "issuedAt">
) {
  const next = await updateDatabase((database) => {
    database.carePath.prescriptions.unshift({
      ...input,
      id: generateId("prescription"),
      issuedAt: new Date().toISOString()
    });
    return database;
  });

  return next.carePath.prescriptions[0];
}

export async function updatePrescription(
  id: string,
  patch: Partial<Prescription>
) {
  const next = await updateDatabase((database) => {
    database.carePath.prescriptions = database.carePath.prescriptions.map((item) =>
      item.id === id ? { ...item, ...patch } : item
    );
    return database;
  });

  return next.carePath.prescriptions.find((item) => item.id === id) ?? null;
}

export async function getReports() {
  const database = await ensureDatabase();
  return database.carePath.reports;
}

export async function reviewReport(id: string, patch: Partial<Report>) {
  const next = await updateDatabase((database) => {
    database.carePath.reports = database.carePath.reports.map((item) =>
      item.id === id ? { ...item, ...patch, reviewedAt: new Date().toISOString() } : item
    );
    return database;
  });

  return next.carePath.reports.find((item) => item.id === id) ?? null;
}

export async function getRobots() {
  const database = await ensureDatabase();
  return database.robots.items;
}

export async function createRobot(input: Omit<Robot, "lastWorkAt">) {
  const next = await updateDatabase((database) => {
    database.robots.items.unshift({
      ...input,
      lastWorkAt: new Date().toISOString()
    });
    return database;
  });

  return next.robots.items[0];
}

export async function buildDashboard() {
  const [dashboard, knowledgeItems, patients, prescriptions, robots] =
    await Promise.all([
      getDashboardSeed(),
      getKnowledgeItems("knowledge"),
      getPatients(),
      getPrescriptions(),
      getRobots()
    ]);

  const summary: DashboardSummary = {
    onlineRobots: robots.filter((item) => item.status === "执行中" || item.status === "正常").length,
    patientCount: patients.length,
    pendingPrescriptions: prescriptions.filter((item) => item.status === "待审核").length,
    knowledgeAssets: knowledgeItems.length
  };

  return { dashboard, summary };
}

export function createExportResult(fileName: string, exportedCount: number): ExportResult {
  return {
    fileName,
    exportedCount,
    generatedAt: new Date().toISOString()
  };
}

export const invalidateTargets = {
  knowledge: [queryKeys.knowledge("knowledge"), queryKeys.knowledgeTags] as const,
  patients: [queryKeys.patients] as const,
  plans: [queryKeys.plans, queryKeys.currentActions] as const,
  prescriptions: [queryKeys.prescriptions] as const,
  reports: [queryKeys.reports] as const,
  robots: [queryKeys.robots, queryKeys.dashboard] as const
};
