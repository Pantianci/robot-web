import type { KnowledgeLibrary } from "@/lib/types";

export type MultiModalListFilters = {
  keyword: string;
  category: string;
  tag: string;
  status: "" | "生效" | "失效" | "草稿";
  dateFrom: string;
  dateTo: string;
};

export type MultiModalListContext = {
  filters: MultiModalListFilters;
  selectedId: string | null;
  selectedIds: string[];
  page: number;
  pageSize: number;
  editId?: string | null;
};

export type MultiModalEditorMode = "create" | "edit";
export type MultiModalExportScope = "filtered" | "selected";

export type MultiModalExportDraft = {
  exportScope: MultiModalExportScope;
  format: string;
  dateFrom: string;
  dateTo: string;
  includeDetails: boolean;
  includeStats: boolean;
};

export type MultiModalExportHistoryItem = {
  id: string;
  fileName: string;
  format: string;
  exportScope: MultiModalExportScope;
  exportedCount: number;
  createdAt: string;
};

export type MultiModalQaMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources: KnowledgeLibrary[];
  createdAt: string;
  summary?: string;
  suggestion?: string;
  expertOpinion?: string;
  relatedResources?: string[];
  feedback?: "up" | "down" | null;
};

export const defaultMultiModalListFilters: MultiModalListFilters = {
  keyword: "",
  category: "",
  tag: "",
  status: "",
  dateFrom: "",
  dateTo: ""
};

export const multiModalPageSizeOptions = [5, 10, 20];

export const knowledgeLibraryMeta: Record<
  KnowledgeLibrary,
  {
    title: string;
    eyebrow: string;
    listPath: string;
    createPath: string;
    editPath: string;
    exportPath: string;
    tagPath: string;
    tagCreatePath: string;
    tagTitle: string;
    createTitle: string;
    editTitle: string;
    exportTitle: string;
    uploadTitle: string;
    listDescription: string;
    createDescription: string;
    exportDescription: string;
    defaultFormat: string;
    exportFormats: string[];
    uploadSpec?: {
      accept: string;
      maxSizeMb: number;
      tips: string[];
    };
    aiActionLabel?: string;
  }
> = {
  knowledge: {
    title: "康复知识库",
    eyebrow: "多模态知识库 > 康复知识库",
    listPath: "/knowledge/library",
    createPath: "/knowledge/library/create",
    editPath: "/knowledge/library/edit",
    exportPath: "/knowledge/library/export",
    tagPath: "/tags/knowledge",
    tagCreatePath: "/tags/knowledge/create",
    tagTitle: "康复知识标签库",
    createTitle: "新增康复知识",
    editTitle: "修改康复知识",
    exportTitle: "导出康复知识",
    uploadTitle: "知识文件",
    listDescription: "维护康复知识文件、标签与说明，支持筛选、分页、详情查看和操作记录展示。",
    createDescription: "支持上传康复知识文件并录入标题、分类、标签、说明，提交后进入康复知识库。",
    exportDescription: "支持基于当前筛选结果或勾选结果生成导出任务，并保留导出历史记录。",
    defaultFormat: "PDF",
    exportFormats: ["PDF", "XLSX", "DOCX"],
    uploadSpec: {
      accept: ".pdf,.txt,.png",
      maxSizeMb: 10,
      tips: ["支持 PDF、TXT、PNG", "单文件大小不超过 10MB"]
    }
  },
  voice: {
    title: "语音交互库",
    eyebrow: "多模态知识库 > 语音交互库",
    listPath: "/knowledge/voice",
    createPath: "/knowledge/voice/create",
    editPath: "/knowledge/voice/edit",
    exportPath: "/knowledge/voice/export",
    tagPath: "/tags/voice",
    tagCreatePath: "/tags/voice/create",
    tagTitle: "语音交互标签库",
    createTitle: "新增语音数据",
    editTitle: "修改语音数据",
    exportTitle: "导出语音数据",
    uploadTitle: "语音问答内容",
    listDescription: "维护标准问题、相似问题、回复内容和标签，用于语音交互与知识问答。",
    createDescription: "支持管理多组相似问题和回复内容，形成可复用的语音交互数据。",
    exportDescription: "支持导出语音问答数据、标签和筛选结果，方便同步语音服务。",
    defaultFormat: "JSON",
    exportFormats: ["JSON", "XLSX", "DOCX"]
  },
  motion: {
    title: "标准动作库",
    eyebrow: "多模态知识库 > 标准动作库",
    listPath: "/knowledge/motion",
    createPath: "/knowledge/motion/create",
    editPath: "/knowledge/motion/edit",
    exportPath: "/knowledge/motion/export",
    tagPath: "/tags/motion",
    tagCreatePath: "/tags/motion/create",
    tagTitle: "标准动作标签库",
    createTitle: "新增标准动作视频",
    editTitle: "修改标准动作视频",
    exportTitle: "导出标准动作视频",
    uploadTitle: "动作视频文件",
    listDescription: "维护标准动作视频、动作参数和适应症信息，支持详情预览和后续动作编排。",
    createDescription: "支持上传动作视频，录入动作名称、角度、方向、持续时间和适应症信息。",
    exportDescription: "支持导出当前筛选动作或勾选动作的视频数据与元数据。",
    defaultFormat: "ZIP",
    exportFormats: ["ZIP", "MP4", "XLSX"],
    uploadSpec: {
      accept: ".mp4,.avi,.mov",
      maxSizeMb: 100,
      tips: ["支持 MP4、AVI、MOV", "单文件大小不超过 100MB"]
    },
    aiActionLabel: "AI 生成标准动作视频"
  },
  sequence: {
    title: "动作序列库",
    eyebrow: "多模态知识库 > 动作序列库",
    listPath: "/knowledge/sequence",
    createPath: "/knowledge/sequence/create",
    editPath: "/knowledge/sequence/edit",
    exportPath: "/knowledge/sequence/export",
    tagPath: "/tags/sequence",
    tagCreatePath: "/tags/sequence/create",
    tagTitle: "动作序列标签库",
    createTitle: "新增动作序列",
    editTitle: "修改动作序列",
    exportTitle: "导出动作序列",
    uploadTitle: "动作序列配置",
    listDescription: "维护阶段化动作序列、目标和时长，支持按标准动作进行编排和导出。",
    createDescription: "支持从标准动作库中选择动作并进行排序预览，生成可复用的动作序列。",
    exportDescription: "支持导出动作序列配置、排序结果和元数据，方便下发处方和训练终端。",
    defaultFormat: "JSON",
    exportFormats: ["JSON", "ZIP", "XLSX"],
    aiActionLabel: "AI 生成动作序列"
  }
};

export function createMultiModalListContextKey(library: KnowledgeLibrary) {
  return `multimodal:list:${library}`;
}

export function createMultiModalEditorDraftKey(
  library: KnowledgeLibrary,
  mode: MultiModalEditorMode,
  recordId = "new"
) {
  return `multimodal:editor:${library}:${mode}:${recordId}`;
}

export function createMultiModalExportDraftKey(library: KnowledgeLibrary) {
  return `multimodal:export:${library}`;
}

export function createMultiModalExportHistoryKey(library: KnowledgeLibrary) {
  return `multimodal:export-history:${library}`;
}

export function createMultiModalTagDraftKey(library: KnowledgeLibrary) {
  return `multimodal:tag:${library}`;
}

export function createMultiModalQaStateKey() {
  return "multimodal:qa";
}

export function normalizeTagNames(value: string) {
  return value
    .split(/[\n,，、;；]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatBytesToText(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function isInDateRange(value: string, dateFrom: string, dateTo: string) {
  if (!dateFrom && !dateTo) {
    return true;
  }

  const target = new Date(value);
  if (Number.isNaN(target.getTime())) {
    return false;
  }

  if (dateFrom) {
    const start = new Date(`${dateFrom}T00:00:00`);
    if (target < start) {
      return false;
    }
  }

  if (dateTo) {
    const end = new Date(`${dateTo}T23:59:59`);
    if (target > end) {
      return false;
    }
  }

  return true;
}
