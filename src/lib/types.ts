export type RecordStatus = "生效" | "失效" | "草稿";
export type ReviewStatus = "待审核" | "已完成" | "已退回";
export type RobotStatus = "执行中" | "正常" | "预警" | "离线";
export type KnowledgeLibrary =
  | "knowledge"
  | "voice"
  | "motion"
  | "sequence";

export interface TagItem {
  id: string;
  library: KnowledgeLibrary;
  name: string;
  parent: string;
  description: string;
  status: "使用中" | "未使用";
   enabled?: boolean;
   createdAt?: string;
  updatedAt: string;
  operator: string;
  relatedCount: number;
}

export interface QaContext {
  id: string;
  library: KnowledgeLibrary;
  question: string;
  answer: string;
}

export interface KnowledgeItem {
  id: string;
  library: KnowledgeLibrary;
  title: string;
  category: string;
  format: string;
  size: string;
  tags: string[];
  status: RecordStatus;
  uploadedAt: string;
  updatedAt: string;
  operator: string;
  description: string;
  preview?: string;
  stage?: string;
  goal?: string;
  actionName?: string;
  part?: string;
  angle?: string;
  direction?: string;
  durationMinutes?: number;
  contraindication?: string;
  indication?: string;
  fileName?: string;
  fileUrl?: string;
  lastAction?: string;
  standardQuestion?: string;
  similarQuestions?: string[];
  replies?: string[];
  sequenceSteps?: string[];
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: "男" | "女";
  diagnosis: string;
  stage: string;
  robotId: string;
  bedNo: string;
  createdBy: string;
  createdAt: string;
  note: string;
}

export interface RehabPlan {
  id: string;
  patientId: string;
  patientName: string;
  type: string;
  goal: string;
  risk: string;
  description: string;
  doctor: string;
  nurse: string;
  deviceId: string;
  stage: string;
  updatedAt: string;
  aiReference: string;
  status: "已同步" | "待同步";
}

export interface CurrentAction {
  id: string;
  patientId: string;
  title: string;
  part: string;
  duration: string;
  intensity: string;
  note: string;
  updatedAt: string;
}

export interface PrescriptionMovement {
  id: string;
  name: string;
  angle: string;
  repetitions: string;
  duration: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  stage: string;
  goal: string;
  risk: string;
  sequenceName: string;
  doctor: string;
  issuedAt: string;
  status: ReviewStatus;
  note: string;
  aiReference: string;
  videoTitle: string;
  videoDuration: string;
  frequency: string;
  movements: PrescriptionMovement[];
}

export interface Report {
  id: string;
  patientId: string;
  patientName: string;
  completionRate: string;
  romChange: string;
  painScore: string;
  doctorComment: string;
  nurseComment: string;
  note: string;
  aiReference: string;
  reviewedAt: string;
  status: ReviewStatus;
}

export interface Robot {
  id: string;
  status: RobotStatus;
  patientName: string;
  battery: number;
  bedNo: string;
  trainingStatus: string;
  lastWorkAt: string;
  note: string;
}

export interface DashboardTodo {
  id: string;
  title: string;
  owner: string;
  dueAt: string;
  status: "进行中" | "待处理" | "已完成";
}

export interface DashboardTrendPoint {
  label: string;
  value: number;
}

export interface DashboardAnnouncement {
  id: string;
  title: string;
  body: string;
  level: "重点" | "提示" | "跟进";
}

export interface DashboardSeed {
  announcements: DashboardAnnouncement[];
  todos: DashboardTodo[];
  weeklyTrend: DashboardTrendPoint[];
}

export interface KnowledgeSeed {
  items: KnowledgeItem[];
  tags: TagItem[];
  qaContexts: QaContext[];
}

export interface PatientSeed {
  items: Patient[];
}

export interface CarePathSeed {
  plans: RehabPlan[];
  currentActions: CurrentAction[];
  prescriptions: Prescription[];
  reports: Report[];
}

export interface RobotSeed {
  items: Robot[];
}

export interface AppDatabase {
  knowledge: KnowledgeSeed;
  patients: PatientSeed;
  carePath: CarePathSeed;
  robots: RobotSeed;
}

export interface DashboardSummary {
  onlineRobots: number;
  patientCount: number;
  pendingPrescriptions: number;
  knowledgeAssets: number;
}

export interface ExportResult {
  fileName: string;
  exportedCount: number;
  generatedAt: string;
}
