import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  FileUp,
  GripVertical,
  ImageIcon,
  MessageSquareDashed,
  PlayCircle,
  Plus,
  Send,
  ThumbsDown,
  ThumbsUp,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  useCreateKnowledgeMutation,
  useKnowledgeQuery,
  useKnowledgeQaQuery,
  useKnowledgeTagsQuery,
  useUpdateKnowledgeMutation
} from "@/lib/hooks";
import {
  createMultiModalEditorDraftKey,
  createMultiModalExportDraftKey,
  createMultiModalExportHistoryKey,
  createMultiModalListContextKey,
  createMultiModalQaStateKey,
  defaultMultiModalListFilters,
  formatBytesToText,
  getKnowledgeStatusLabel,
  knowledgeLibraryMeta,
  voiceCategoryOptions,
  type MultiModalExportDraft,
  type MultiModalExportHistoryItem,
  type MultiModalListContext,
  type MultiModalQaMessage
} from "@/lib/multimodal";
import { clearDraft, readDraft, readState, writeDraft, writeState } from "@/lib/storage";
import type { KnowledgeItem, KnowledgeLibrary, QaContext, TagItem } from "@/lib/types";
import { formatDateTime, generateId } from "@/lib/utils";
import { CollapsibleSidePanel, CollapsibleSplitLayout } from "@/components/collapsible-side-panel";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type MultiModalEditorDraft = {
  fileName: string;
  title: string;
  category: string;
  tags: string;
  description: string;
  format: string;
  size: string;
  status: "生效" | "失效" | "草稿";
  actionName: string;
  part: string;
  angle: string;
  direction: string;
  durationMinutes: string;
  indication: string;
  contraindication: string;
  stage: string;
  goal: string;
  sequenceSteps: string[];
  standardQuestion: string;
  similarQuestions: string[];
  replies: string[];
  selectedKnowledgeSources: KnowledgeLibrary[];
};

type MultiModalEditorProps = {
  library: KnowledgeLibrary;
  mode: "create" | "edit";
  navigate: (options: { to: string }) => void;
};

type MultiModalExportProps = {
  library: KnowledgeLibrary;
  navigate: (options: { to: string }) => void;
};

type MultiModalQaProps = {
  navigate: (options: { to: string }) => void;
};

const defaultEditorDraft: MultiModalEditorDraft = {
  fileName: "",
  title: "",
  category: "",
  tags: "",
  description: "",
  format: "",
  size: "",
  status: "生效",
  actionName: "",
  part: "",
  angle: "",
  direction: "",
  durationMinutes: "",
  indication: "",
  contraindication: "",
  stage: "",
  goal: "",
  sequenceSteps: [],
  standardQuestion: "",
  similarQuestions: [],
  replies: [],
  selectedKnowledgeSources: []
};

const defaultExportDraft: MultiModalExportDraft = {
  exportScope: "filtered",
  format: "PDF",
  dateFrom: "",
  dateTo: "",
  includeDetails: true,
  includeStats: false
};

const qaLibraryOptions: Array<{ label: string; value: KnowledgeLibrary }> = [
  { label: "康复知识库", value: "knowledge" },
  { label: "问答对管理", value: "voice" },
  { label: "标准动作库", value: "motion" },
  { label: "动作序列库", value: "sequence" }
];
const qaLibraries = qaLibraryOptions.map((item) => item.value);

type QaTagSelection = Record<KnowledgeLibrary, string[]>;

type QaMediaItem = NonNullable<MultiModalQaMessage["media"]>[number];

function createDefaultQaTagSelection(): QaTagSelection {
  return {
    knowledge: [],
    voice: [],
    motion: [],
    sequence: []
  };
}

function hasSelectedQaTags(value: QaTagSelection) {
  return qaLibraries.some((library) => value[library].length > 0);
}

function getSelectedQaLibraries(value: QaTagSelection) {
  return qaLibraries.filter((library) => value[library].length > 0);
}

function getQaTagNames(tags: TagItem[], items: KnowledgeItem[]) {
  return Array.from(new Set([...tags.map((tag) => tag.name), ...items.flatMap((item) => item.tags)])).filter(Boolean);
}

function normalizeQaSearchText(value: string) {
  return value.trim().toLowerCase();
}

function createQaContextFromItem(item: KnowledgeItem): QaContext {
  if (item.library === "voice") {
    return {
      id: `qa-item-${item.id}`,
      library: item.library,
      question: item.standardQuestion ?? item.title,
      answer: item.replies?.length ? `可返回：${item.replies.join("；")}` : item.description
    };
  }

  if (item.library === "motion") {
    return {
      id: `qa-item-${item.id}`,
      library: item.library,
      question: `${item.actionName ?? item.title}怎么执行？`,
      answer: [
        item.description,
        item.preview,
        item.angle ? `角度：${item.angle}` : "",
        item.durationMinutes ? `建议时长：${item.durationMinutes} 分钟` : "",
        item.indication ? `适应症：${item.indication}` : "",
        item.contraindication ? `禁忌症：${item.contraindication}` : ""
      ]
        .filter(Boolean)
        .join("；")
    };
  }

  if (item.library === "sequence") {
    return {
      id: `qa-item-${item.id}`,
      library: item.library,
      question: `${item.title}如何安排？`,
      answer: [
        item.goal,
        item.sequenceSteps?.length ? `动作顺序：${item.sequenceSteps.join(" → ")}` : "",
        item.durationMinutes ? `总时长：${item.durationMinutes} 分钟` : "",
        item.description
      ]
        .filter(Boolean)
        .join("；")
    };
  }

  return {
    id: `qa-item-${item.id}`,
    library: item.library,
    question: `${item.title}的康复建议是什么？`,
    answer: item.preview ?? item.description
  };
}

function qaContextMatchesItem(context: QaContext, item: KnowledgeItem) {
  const contextText = normalizeQaSearchText(`${context.question} ${context.answer}`);
  const tokens = [
    item.title,
    item.fileName,
    item.actionName,
    item.stage,
    item.goal,
    item.part,
    item.standardQuestion,
    ...(item.similarQuestions ?? []),
    ...(item.sequenceSteps ?? []),
    ...item.tags
  ]
    .filter(Boolean)
    .map((token) => normalizeQaSearchText(String(token)))
    .filter((token) => token.length >= 2);

  return tokens.some((token) => contextText.includes(token) || token.includes(contextText.slice(0, 6)));
}

function buildQaCandidates({
  library,
  contexts,
  items,
  selectedTags
}: {
  library: KnowledgeLibrary;
  contexts: QaContext[];
  items: KnowledgeItem[];
  selectedTags: string[];
}) {
  const scopedItems = selectedTags.length
    ? items.filter((item) => selectedTags.some((tag) => item.tags.includes(tag)))
    : items;
  const scopedContexts = selectedTags.length
    ? contexts.filter((context) => scopedItems.some((item) => qaContextMatchesItem(context, item)))
    : contexts;
  const merged = [...scopedContexts, ...scopedItems.map(createQaContextFromItem)];
  const seen = new Set<string>();

  return merged.filter((item) => {
    const key = `${library}:${item.question}:${item.answer}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function QaLibraryTagPicker({
  label,
  tags,
  value,
  onChange
}: {
  label: string;
  tags: string[];
  value: string[];
  onChange: (nextValue: string[]) => void;
}) {
  const selectedTitle = value.length ? value.join("、") : "全部标签";

  return (
    <Field label={label}>
      <select
        className="native-select"
        value=""
        title={selectedTitle}
        onChange={(event) => {
          const tag = event.target.value;
          if (!tag) {
            return;
          }

          onChange(value.includes(tag) ? value.filter((item) => item !== tag) : [...value, tag]);
        }}
      >
        <option value="">{tags.length ? (value.length ? `已选 ${value.length} 个标签` : "全部标签") : "暂无标签"}</option>
        {tags.map((tag) => (
          <option key={tag} value={tag}>
            {value.includes(tag) ? `取消 ${tag}` : `选择 ${tag}`}
          </option>
        ))}
      </select>
    </Field>
  );
}

const qaImageMediaExample: QaMediaItem = {
  id: "qa-media-image-shoulder",
  type: "image",
  title: "张三肩外展训练骨骼关键点图",
  description: "AI 根据张三当前处方生成的人物运动图片，叠加肩、肘、腕、躯干和下肢关键点标注。",
  source: "ai-generated",
  assetUrl: "/qa-ai-generated-shoulder-keypoints.png",
  prompt: "基于患者张三当前处方，生成肩外展训练的人物运动图片，并叠加骨骼关键点、腕部锁定点和肩外展角度标注。",
  meta: "AI 单独生成 · 图片 · 1280 x 720"
};

const qaVideoMediaExample: QaMediaItem = {
  id: "qa-media-video-shoulder",
  type: "video",
  title: "张三肩外展训练教学视频预览",
  description: "AI 根据同一处方生成的视频回复预览，用于展示动作节奏、次数、停顿和安全提示。",
  source: "ai-generated",
  prompt: "基于患者张三当前处方，生成肩外展训练 42 秒教学视频，包含准备姿势、外展节奏、保持时间和安全提醒。",
  meta: "AI 单独生成 · 视频预览 · 00:42"
};

const qaMediaExampleItems: NonNullable<MultiModalQaMessage["media"]> = [
  qaImageMediaExample,
  qaVideoMediaExample
];

const defaultQaMessages: MultiModalQaMessage[] = [
  {
    id: "qa-example-user-zs-current",
    role: "user",
    text: "张三当前处方是肩外展训练，请先生成一张带骨骼关键点的动作图片，再生成一个视频回复预览。",
    sources: [],
    createdAt: "2026-06-09T09:00:00.000+08:00"
  },
  {
    id: "qa-example-assistant-image",
    role: "assistant",
    text: "已按张三当前处方单独生成图片回复：肩外展训练人物运动图，已叠加骨骼关键点和肩外展角度标注。",
    sources: [],
    createdAt: "2026-06-09T09:00:04.000+08:00",
    summary: "这张图是 AI 生成结果，不是从知识库检索素材。它用于展示肩外展时肩、肘、腕和躯干稳定性的关键观察点。",
    suggestion: "可用于给患者说明起始姿势、抬臂角度和躯干不要代偿。点击图片卡片可放大预览。",
    expertOpinion: "骨骼关键点用于辅助观察动作质量，正式训练强度仍以医生处方和患者疼痛反馈为准。",
    media: [qaImageMediaExample],
    feedback: null
  },
  {
    id: "qa-example-assistant-video",
    role: "assistant",
    text: "已继续生成视频回复预览：当前不接入真实视频文件，用视频窗口样式模拟 AI 生成的视频结果。",
    sources: [],
    createdAt: "2026-06-09T09:00:09.000+08:00",
    summary: "这个视频预览同样是 AI 单独生成的回复附件，用于表达训练节奏和关键提示，不来自知识库素材库。",
    suggestion: "视频适合展示抬臂节奏、保持时间、放下速度和中途停止条件。点击视频卡片可放大预览。",
    expertOpinion: "视频生成结果可作为宣教辅助，不能替代治疗师现场评估和处方审核。",
    media: [qaVideoMediaExample],
    feedback: null
  }
];

function normalizeQaMessagesWithMediaExample(messages: MultiModalQaMessage[] | null) {
  if (!messages?.length) {
    return defaultQaMessages;
  }

  if (messages.some((message) => message.media?.some((item) => item.source === "ai-generated"))) {
    return messages;
  }

  const previousGenericExamples = new Set(["qa-example-user-media", "qa-example-assistant-media"]);
  return [...defaultQaMessages, ...messages.filter((message) => !previousGenericExamples.has(message.id))];
}

function getRequestedQaMedia(question: string, matchedAnswers: Array<{ library: KnowledgeLibrary }>) {
  const wantsImage = /图片|图像|照片|关键点|骨骼/.test(question);
  const wantsVideo = /视频|影像|演示|教学/.test(question);
  const wantsMotionMedia =
    /张三|肩外展|动作|训练|处方/.test(question) || matchedAnswers.some((item) => item.library === "motion");

  if (wantsImage && !wantsVideo) {
    return [qaImageMediaExample];
  }

  if (wantsVideo && !wantsImage) {
    return [qaVideoMediaExample];
  }

  if (wantsImage || wantsVideo || wantsMotionMedia) {
    return qaMediaExampleItems;
  }

  return [];
}

function createGeneratedQaMediaMessage(item: QaMediaItem, sources: KnowledgeLibrary[]): MultiModalQaMessage {
  const isVideo = item.type === "video";

  return {
    id: generateId(isVideo ? "qa-assistant-video" : "qa-assistant-image"),
    role: "assistant",
    text: isVideo
      ? "已生成视频回复预览：当前原型不接入真实视频文件，用视频窗口样式模拟 AI 生成结果。"
      : "已生成图片回复：张三肩外展训练人物运动图，已叠加骨骼关键点和肩外展角度标注。",
    sources,
    createdAt: new Date().toISOString(),
    summary: isVideo
      ? "该视频预览是 AI 单独生成的回复附件，用于表达抬臂节奏、保持时间和中途停止提示，不来自知识库素材库。"
      : "该图片是 AI 单独生成的回复附件，用于展示肩、肘、腕、躯干和下肢关键点，不是从知识库检索素材。",
    suggestion: isVideo
      ? "点击视频卡片可放大预览，适合给患者说明动作节奏、次数和安全边界。"
      : "点击图片卡片可放大预览，适合给患者说明起始姿势、抬臂角度和躯干不要代偿。",
    expertOpinion: isVideo
      ? "视频生成结果可作为宣教辅助，不能替代治疗师现场评估和处方审核。"
      : "骨骼关键点用于辅助观察动作质量，正式训练强度仍以医生处方和患者疼痛反馈为准。",
    media: [item],
    feedback: null
  };
}

function QaMediaVisual({ item, expanded = false }: { item: QaMediaItem; expanded?: boolean }) {
  const isVideo = item.type === "video";

  return (
    <div className={expanded ? "overflow-hidden rounded-[1.25rem] border border-border/70 bg-white" : ""}>
      <div
        className={
          isVideo
            ? "relative aspect-video bg-surface-900 text-white"
            : "relative aspect-video bg-surface-50"
        }
      >
        {isVideo ? (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_25%,rgba(96,165,250,0.42),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.92))]" />
            <div className="absolute left-5 top-5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
              标准动作演示
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 shadow-soft backdrop-blur">
                <PlayCircle className="h-10 w-10" />
              </div>
            </div>
            <div className="absolute bottom-4 left-5 right-5">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                <div className="h-full w-[42%] rounded-full bg-white" />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-white/80">
                <span>00:18</span>
                <span>00:42</span>
              </div>
            </div>
          </>
        ) : (
          item.assetUrl ? (
            <>
              <img src={item.assetUrl} alt={item.title} className="h-full w-full object-cover" />
              <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-primary shadow-sm">
                AI 生成图片
              </div>
            </>
          ) : (
            <>
              <div className="absolute left-[12%] top-[18%] rounded-full border border-primary/25 bg-white/85 px-3 py-1 text-xs font-medium text-primary">
                角度 90°
              </div>
              <div className="absolute left-[22%] top-[38%] h-14 w-14 rounded-full border-4 border-primary/60 bg-primary/10" />
              <div className="absolute left-[35%] top-[46%] h-3 w-[34%] rotate-[-15deg] rounded-full bg-primary/70" />
              <div className="absolute left-[52%] top-[36%] h-3 w-[24%] rotate-[22deg] rounded-full bg-emerald-500/70" />
              <div className="absolute bottom-[20%] left-[18%] right-[18%] h-2 rounded-full bg-surface-300" />
              <div className="absolute bottom-[28%] right-[14%] rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-xs font-medium text-emerald-700">
                发力方向
              </div>
              <ImageIcon className="absolute right-5 top-5 h-6 w-6 text-surface-400" />
            </>
          )
        )}
      </div>
    </div>
  );
}

function QaMediaAttachment({ item, onPreview }: { item: QaMediaItem; onPreview: (item: QaMediaItem) => void }) {
  const isVideo = item.type === "video";

  return (
    <button
      type="button"
      className="overflow-hidden rounded-[1rem] border border-border/70 bg-white text-left transition hover:-translate-y-0.5 hover:shadow-panel"
      onClick={() => onPreview(item)}
      aria-label={`预览${item.title}`}
    >
      <QaMediaVisual item={item} />
      <div className="px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-sm font-semibold text-surface-900">{item.title}</p>
          <Badge className="bg-surface-50 text-surface-700">{isVideo ? "视频" : "图片"}</Badge>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge className="bg-secondary text-secondary-foreground">AI 独立生成</Badge>
          <Badge className="bg-white text-surface-700">点击放大</Badge>
        </div>
        <p className="mt-2 text-xs text-surface-500">{item.meta}</p>
      </div>
    </button>
  );
}

function QaMediaPreviewDialog({
  item,
  onOpenChange
}: {
  item: QaMediaItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(94vw,1120px)] p-5">
        {item ? (
          <>
            <DialogHeader className="pr-8">
              <DialogTitle>{item.title}</DialogTitle>
              <DialogDescription>{item.description}</DialogDescription>
            </DialogHeader>
            <QaMediaVisual item={item} expanded />
            <div className="grid gap-3 rounded-[1rem] bg-surface-50 px-4 py-3 text-sm text-muted-foreground md:grid-cols-[1fr_auto]">
              <div>
                <p className="font-medium text-surface-900">生成提示词</p>
                <p className="mt-2 leading-7">{item.prompt}</p>
              </div>
              <div className="flex items-start justify-end gap-2">
                <Badge className="bg-white text-surface-700">AI 独立生成</Badge>
                <Badge>{item.type === "video" ? "视频" : "图片"}</Badge>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function KnowledgeVideoPreviewDialog({
  open,
  onOpenChange,
  library,
  draft
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  library: "motion" | "sequence";
  draft: MultiModalEditorDraft;
}) {
  const previewTitle =
    library === "motion"
      ? draft.actionName || draft.title || "标准动作视频预览"
      : draft.title || "动作序列视频预览";
  const previewDescription =
    library === "motion"
      ? "当前原型通过模拟播放器预览标准动作视频，便于编辑时快速核对动作信息。"
      : "当前原型通过模拟播放器预览动作序列播放窗口，便于编辑时核对顺序和节奏。";
  const sequenceSteps = draft.sequenceSteps.filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(94vw,1100px)] p-5">
        <DialogHeader className="pr-8">
          <DialogTitle>{previewTitle}</DialogTitle>
          <DialogDescription>{previewDescription}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
          <div className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-white">
            <div className="relative aspect-video bg-surface-900 text-white">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_25%,rgba(96,165,250,0.42),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.92))]" />
              <div className="absolute left-5 top-5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                {library === "motion" ? "标准动作视频预览" : "动作序列视频预览"}
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 shadow-soft backdrop-blur">
                  <PlayCircle className="h-10 w-10" />
                </div>
              </div>
              <div className="absolute bottom-5 left-5 right-5 space-y-3">
                <div>
                  <p className="text-base font-semibold">{previewTitle}</p>
                  <p className="mt-1 text-sm text-white/75">
                    {library === "motion"
                      ? `${draft.part || "部位待补充"} · ${draft.angle || "角度待补充"} · ${draft.direction || "方向待补充"}`
                      : `${draft.stage || "阶段待补充"} · 共 ${sequenceSteps.length || 0} 个动作`}
                  </p>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full w-[46%] rounded-full bg-white" />
                </div>
                <div className="flex items-center justify-between text-xs text-white/80">
                  <span>00:18</span>
                  <span>{library === "motion" ? "00:42" : "01:08"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <SectionCard title={library === "motion" ? "动作信息" : "序列信息"}>
              <PropertyList
                items={
                  library === "motion"
                    ? [
                        { label: "视频名称", value: draft.title || "-" },
                        { label: "动作名称", value: draft.actionName || "-" },
                        { label: "适用部位", value: draft.part || "-" },
                        { label: "角度", value: draft.angle || "-" },
                        { label: "方向", value: draft.direction || "-" },
                        { label: "持续时间", value: draft.durationMinutes ? `${draft.durationMinutes} 分钟` : "-" }
                      ]
                    : [
                        { label: "序列名称", value: draft.title || "-" },
                        { label: "阶段", value: draft.stage || "-" },
                        { label: "总时长", value: draft.durationMinutes ? `${draft.durationMinutes} 分钟` : "-" },
                        { label: "目标", value: draft.goal || "-" }
                      ]
                }
              />
            </SectionCard>

            {library === "sequence" ? (
              <SectionCard title="动作顺序">
                <div className="flex flex-wrap gap-2">
                  {sequenceSteps.length ? (
                    sequenceSteps.map((item) => (
                      <Badge key={item} className="bg-surface-50 text-surface-700">
                        {item}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">当前还没有可预览的动作顺序。</p>
                  )}
                </div>
              </SectionCard>
            ) : (
              <SectionCard title="预览说明">
                <p className="text-sm leading-7 text-muted-foreground">
                  当前为原型预览播放器，用于在编辑页核对标准动作视频的标题、参数和说明信息。
                </p>
              </SectionCard>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function parseTagText(value: string) {
  return value
    .split(/[\n,，、;；]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function draftFromItem(item: KnowledgeItem): MultiModalEditorDraft {
  return {
    fileName: item.fileName ?? "",
    title: item.title,
    category: item.category,
    tags: item.tags.join("、"),
    description: item.description,
    format: item.format,
    size: item.size,
    status: item.status,
    actionName: item.actionName ?? "",
    part: item.part ?? "",
    angle: item.angle ?? "",
    direction: item.direction ?? "",
    durationMinutes: item.durationMinutes ? String(item.durationMinutes) : "",
    indication: item.indication ?? "",
    contraindication: item.contraindication ?? "",
    stage: item.stage ?? "",
    goal: item.goal ?? "",
    sequenceSteps: item.sequenceSteps ?? [],
    standardQuestion: item.standardQuestion ?? "",
    similarQuestions: item.similarQuestions ?? [],
    replies: item.replies ?? [],
    selectedKnowledgeSources: []
  };
}

function buildKnowledgePatch(
  library: KnowledgeLibrary,
  draft: MultiModalEditorDraft
): Omit<KnowledgeItem, "id" | "library" | "uploadedAt" | "updatedAt"> {
  return {
    title: library === "voice" ? draft.standardQuestion || draft.title : draft.title,
    fileName: draft.fileName || undefined,
    category:
      library === "voice"
        ? draft.category || voiceCategoryOptions[0]
        : "",
    format: draft.format || (knowledgeLibraryMeta[library].defaultFormat ?? "TXT"),
    size: draft.size || "0.20 MB",
    tags: parseTagText(draft.tags),
    status: draft.status,
    operator: "当前用户",
    description: draft.description,
    preview:
      library === "voice"
        ? draft.replies[0]
        : library === "sequence"
          ? draft.sequenceSteps.join(" → ")
          : draft.description.slice(0, 80),
    stage: draft.stage || undefined,
    goal: draft.goal || undefined,
    actionName: draft.actionName || undefined,
    part: draft.part || undefined,
    angle: draft.angle || undefined,
    direction: draft.direction || undefined,
    durationMinutes: draft.durationMinutes ? Number(draft.durationMinutes) : undefined,
    indication: draft.indication || undefined,
    contraindication: draft.contraindication || undefined,
    standardQuestion: draft.standardQuestion || undefined,
    similarQuestions: draft.similarQuestions.length ? draft.similarQuestions : undefined,
    replies: draft.replies.length ? draft.replies : undefined,
    sequenceSteps: draft.sequenceSteps.length ? draft.sequenceSteps : undefined,
    lastAction: library === "voice" ? "刚刚更新问答内容" : "刚刚保存"
  };
}

function Checklist({
  items
}: {
  items: Array<{ label: string; done: boolean }>;
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-3 rounded-[1rem] border border-border/70 bg-surface-50 px-4 py-3 text-sm"
        >
          <CheckCircle2 className={item.done ? "h-4 w-4 text-emerald-600" : "h-4 w-4 text-surface-400"} />
          <span className={item.done ? "text-surface-900" : "text-muted-foreground"}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function MultiValueEditor({
  title,
  values,
  placeholder,
  addLabel,
  onChange
}: {
  title: string;
  values: string[];
  placeholder: string;
  addLabel: string;
  onChange: (values: string[]) => void;
}) {
  return (
    <SectionCard title={title}>
      <div className="space-y-3">
        {values.length ? (
          values.map((value, index) => (
            <div key={`${title}-${index}`} className="flex items-start gap-2">
              <div className="mt-3 text-surface-400">
                <GripVertical className="h-4 w-4" />
              </div>
              <Textarea
                value={value}
                placeholder={placeholder}
                onChange={(event) =>
                  onChange(values.map((item, currentIndex) => (currentIndex === index ? event.target.value : item)))
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onChange(values.filter((_, currentIndex) => currentIndex !== index))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))
        ) : (
          <div className="rounded-[1rem] border border-dashed border-border/70 bg-surface-50 px-4 py-6 text-sm text-muted-foreground">
            暂无内容，点击下方按钮新增。
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange([...values, ""])}
        >
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      </div>
    </SectionCard>
  );
}

export function MultiModalEditorPage({
  library,
  mode,
  navigate
}: MultiModalEditorProps) {
  const meta = knowledgeLibraryMeta[library];
  const contextKey = createMultiModalListContextKey(library);
  const context = readState<MultiModalListContext>(contextKey);
  const editId = context?.editId ?? context?.selectedId ?? null;
  const draftKey = createMultiModalEditorDraftKey(
    library,
    mode,
    mode === "edit" ? editId ?? "selected" : "new"
  );
  const { data: items = [] } = useKnowledgeQuery(library);
  const { data: tags = [] } = useKnowledgeTagsQuery(library);
  const createMutation = useCreateKnowledgeMutation(library);
  const updateMutation = useUpdateKnowledgeMutation(library);
  const currentItem = mode === "edit" ? items.find((item) => item.id === editId) ?? null : null;

  const initialDraft = useMemo(() => {
    const stored = readDraft<MultiModalEditorDraft>(draftKey);
    if (stored) {
      return stored;
    }

    if (currentItem) {
      return draftFromItem(currentItem);
    }

    return {
      ...defaultEditorDraft,
      format: meta.defaultFormat
    };
  }, [currentItem, draftKey, meta.defaultFormat]);

  const [draft, setDraft] = useState<MultiModalEditorDraft>(initialDraft);
  const [errorMessage, setErrorMessage] = useState("");
  const [videoPreviewOpen, setVideoPreviewOpen] = useState(false);

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  const persist = (patch: Partial<MultiModalEditorDraft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    writeDraft(draftKey, next);
  };

  const saveDraft = () => {
    writeDraft(draftKey, draft);
  };

  const resetAndBack = () => {
    clearDraft(draftKey);
    navigate({ to: meta.listPath });
  };

  const validate = () => {
    if (library === "voice") {
      if (!draft.standardQuestion || !draft.category || !draft.tags || !draft.replies.filter(Boolean).length) {
        return "无法提交，请补全标准问题、分类、标签和至少一条回复内容。";
      }

      return "";
    }

    if (!draft.title || !draft.tags) {
      return mode === "edit"
        ? "无法更新，请补全标题和标签。"
        : "无法上传，请补全标题和标签。";
    }

    if (library === "sequence" && !draft.sequenceSteps.filter(Boolean).length) {
      return "无法提交，请至少选择一个组成动作。";
    }

    return "";
  };

  const handleMockUpload = () => {
    const defaultName =
      library === "motion"
        ? "肩外展训练视频.mp4"
        : library === "knowledge"
          ? "肩袖损伤术后指南.pdf"
          : "";

    const nextFileName = draft.fileName || defaultName;
    const nextTitle =
      library === "motion"
        ? draft.title || nextFileName.replace(/\.[^/.]+$/, "")
        : draft.title || nextFileName.replace(/\.[^/.]+$/, "");

    persist({
      fileName: nextFileName,
      title: nextTitle,
      size: draft.size || formatBytesToText(library === "motion" ? 14.8 * 1024 * 1024 : 1.01 * 1024 * 1024)
    });
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage("");
    const payload = buildKnowledgePatch(library, draft);
    const shouldActivateAiDraft =
      mode === "edit" &&
      currentItem &&
      (library === "motion" || library === "sequence") &&
      currentItem.status === "草稿" &&
      draft.status === "草稿";

    if (mode === "edit" && currentItem) {
      await updateMutation.mutateAsync({
        id: currentItem.id,
        patch: shouldActivateAiDraft ? { ...payload, status: "生效" } : payload
      });
    } else {
      await createMutation.mutateAsync(payload);
    }

    clearDraft(draftKey);
    writeState(contextKey, {
      ...(context ?? {
        filters: defaultMultiModalListFilters,
        selectedId: null,
        selectedIds: [],
        page: 1,
        pageSize: 10,
        editId: null
      }),
      editId: null
    });
    navigate({ to: meta.listPath });
  };

  const checklist = [
    { label: library === "voice" ? "录入标准问题" : "填写标题或文件名称", done: Boolean(draft.title || draft.standardQuestion) },
    ...(library === "voice" ? [{ label: "完成分类配置", done: Boolean(draft.category) }] : []),
    { label: "配置标签信息", done: Boolean(draft.tags) },
    {
      label: library === "sequence" ? "编排动作序列" : library === "motion" ? "补全动作参数" : "补充说明",
      done:
        library === "sequence"
          ? draft.sequenceSteps.filter(Boolean).length > 0
          : library === "motion"
            ? Boolean(draft.part && draft.angle)
            : Boolean(draft.description)
    }
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        eyebrow={`${meta.eyebrow} > ${mode === "edit" ? meta.editTitle : meta.createTitle}`}
        title={mode === "edit" ? meta.editTitle : meta.createTitle}
        description={meta.createDescription}
        badge={mode === "edit" ? "编辑页" : "新增页"}
        className="mb-1"
        actions={
          <div className="flex flex-wrap gap-2">
            {mode === "edit" && (library === "motion" || library === "sequence") ? (
              <Button variant="secondary" onClick={() => setVideoPreviewOpen(true)}>
                <PlayCircle className="h-4 w-4" />
                {library === "motion" ? "标准动作视频预览" : "动作序列视频预览"}
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => navigate({ to: meta.listPath })}>
              <ArrowLeft className="h-4 w-4" />
              返回列表
            </Button>
          </div>
        }
      />

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-h-0 flex-col gap-4">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {meta.uploadSpec ? (
            <SectionCard title={`${meta.uploadTitle}上传`} description="当前原型用页面内交互模拟上传和文件名回填。">
              <div className="rounded-[1.5rem] border border-dashed border-primary/30 bg-primary/5 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-surface-900">点击上传或拖拽上传</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {meta.uploadSpec.tips.map((tip) => (
                        <Badge key={tip} className="bg-white text-surface-700">
                          {tip}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button type="button" onClick={handleMockUpload}>
                    <FileUp className="h-4 w-4" />
                    模拟上传
                  </Button>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Field label="文件名称">
                    <Input
                      value={draft.fileName}
                      placeholder="上传后自动回填"
                      onChange={(event) => persist({ fileName: event.target.value })}
                    />
                  </Field>
                  <Field label="文件大小">
                    <Input
                      value={draft.size}
                      placeholder="例如：1.01 MB"
                      onChange={(event) => persist({ size: event.target.value })}
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>
          ) : null}

          <SectionCard title="基础信息">
            <div className="grid gap-4 md:grid-cols-2">
              {library === "voice" ? (
                <Field label="标准问题" required>
                  <Input
                    value={draft.standardQuestion}
                    placeholder="例如：训练完成后给出鼓励"
                    onChange={(event) =>
                      persist({
                        standardQuestion: event.target.value,
                        title: event.target.value
                      })
                    }
                  />
                </Field>
              ) : (
                <>
                  <Field label={library === "motion" ? "视频名称" : library === "sequence" ? "序列名称" : "标题"} required>
                    <Input
                      value={draft.title}
                      placeholder="请输入标题"
                      onChange={(event) => persist({ title: event.target.value })}
                    />
                  </Field>
                  {library === "motion" ? (
                    <Field label="动作名称" required>
                      <Input
                        value={draft.actionName}
                        placeholder="例如：肩外展训练"
                        onChange={(event) => persist({ actionName: event.target.value })}
                      />
                    </Field>
                  ) : null}
                </>
              )}

              {library === "voice" ? (
                <Field label="分类" required>
                  <select
                    className="native-select"
                    value={draft.category}
                    onChange={(event) => persist({ category: event.target.value })}
                  >
                    <option value="">请选择分类</option>
                    {voiceCategoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <Field label="标签" required>
                <Input
                  value={draft.tags}
                  placeholder="可选择已有标签或手动输入"
                  onChange={(event) => persist({ tags: event.target.value })}
                />
              </Field>
              <Field label="状态">
                <select
                  className="native-select"
                  value={draft.status}
                  onChange={(event) =>
                    persist({
                      status: event.target.value as MultiModalEditorDraft["status"]
                    })
                  }
                >
                  <option value="生效">生效</option>
                  <option value="失效">失效</option>
                  <option value="草稿">{getKnowledgeStatusLabel(library, "草稿")}</option>
                </select>
              </Field>
            </div>
          </SectionCard>

          {library === "motion" ? (
            <SectionCard title="动作参数">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="适用部位">
                  <Input value={draft.part} onChange={(event) => persist({ part: event.target.value })} />
                </Field>
                <Field label="角度">
                  <Input value={draft.angle} onChange={(event) => persist({ angle: event.target.value })} />
                </Field>
                <Field label="方向">
                  <Input value={draft.direction} onChange={(event) => persist({ direction: event.target.value })} />
                </Field>
                <Field label="持续时间">
                  <Input
                    value={draft.durationMinutes}
                    placeholder="分钟"
                    onChange={(event) => persist({ durationMinutes: event.target.value })}
                  />
                </Field>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="适应症">
                  <Textarea
                    value={draft.indication}
                    onChange={(event) => persist({ indication: event.target.value })}
                  />
                </Field>
                <Field label="禁忌症">
                  <Textarea
                    value={draft.contraindication}
                    onChange={(event) => persist({ contraindication: event.target.value })}
                  />
                </Field>
              </div>
            </SectionCard>
          ) : null}

          {library === "sequence" ? (
            <>
              <SectionCard title="阶段与目标">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="阶段">
                    <Input value={draft.stage} onChange={(event) => persist({ stage: event.target.value })} />
                  </Field>
                  <Field label="总时长">
                    <Input
                      value={draft.durationMinutes}
                      placeholder="分钟"
                      onChange={(event) => persist({ durationMinutes: event.target.value })}
                    />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="目标">
                      <Textarea value={draft.goal} onChange={(event) => persist({ goal: event.target.value })} />
                    </Field>
                  </div>
                </div>
              </SectionCard>
              <MultiValueEditor
                title="组成动作编排"
                values={draft.sequenceSteps}
                placeholder="输入标准动作名称"
                addLabel="新增动作"
                onChange={(values) => persist({ sequenceSteps: values })}
              />
            </>
          ) : null}

          {library === "voice" ? (
            <>
              <MultiValueEditor
                title="相似问题管理"
                values={draft.similarQuestions}
                placeholder="请输入相似问题"
                addLabel="新增相似问题"
                onChange={(values) => persist({ similarQuestions: values })}
              />
              <MultiValueEditor
                title="回复内容管理"
                values={draft.replies}
                placeholder="请输入回复内容"
                addLabel="新增回复内容"
                onChange={(values) => persist({ replies: values })}
              />
            </>
          ) : null}

          <SectionCard title="说明">
            <Field label="说明">
              <Textarea
                value={draft.description}
                placeholder="补充适用范围、使用边界或摘要信息"
                onChange={(event) => persist({ description: event.target.value })}
              />
            </Field>
          </SectionCard>

          {errorMessage ? (
            <Card className="border-rose-200 bg-rose-50">
              <CardContent className="p-4 text-sm text-rose-700">{errorMessage}</CardContent>
            </Card>
          ) : null}
          {mode === "edit" &&
          currentItem &&
          (library === "motion" || library === "sequence") &&
          currentItem.status === "草稿" ? (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4 text-sm text-amber-800">
                当前记录为 AI 生成的未生效内容，点击“提交更新”后会自动转为生效。
              </CardContent>
            </Card>
          ) : null}
          </div>

          <Card className="shrink-0 border-primary/15 bg-primary/5">
            <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-primary">当前页面支持草稿恢复</p>
                <p className="mt-1 line-clamp-2 text-xs text-primary/80">
                  草稿保存在本地浏览器 LocalStorage 中，再次进入页面可继续编辑。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSubmit}>{mode === "edit" ? "提交更新" : "提交"}</Button>
                <Button variant="secondary" onClick={saveDraft}>
                  保存草稿
                </Button>
                <Button variant="outline" onClick={resetAndBack}>
                  取消返回
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <CollapsibleSidePanel label="辅助" widthClassName="w-full xl:w-[360px]">
          <Card className="flex h-full min-h-0 flex-col overflow-hidden">
            <CardHeader className="border-b border-border/60">
              <CardTitle>录入辅助</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 space-y-4 overflow-y-auto p-5">
              <SectionCard title="录入检查">
                <Checklist items={checklist} />
              </SectionCard>

              <SectionCard title="可选标签">
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      className="rounded-full border border-border/70 bg-white px-3 py-1 text-xs font-medium text-surface-700"
                      onClick={() => {
                        const current = parseTagText(draft.tags);
                        if (current.includes(tag.name)) {
                          return;
                        }
                        persist({ tags: [...current, tag.name].join("、") });
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="页面说明">
                <div className="space-y-3">
                  {meta.uploadSpec?.tips?.map((tip) => (
                    <div
                      key={tip}
                      className="rounded-[1rem] border border-border/70 bg-surface-50 px-4 py-3 text-sm text-muted-foreground"
                    >
                      {tip}
                    </div>
                  )) ?? (
                    <div className="rounded-[1rem] border border-border/70 bg-surface-50 px-4 py-3 text-sm text-muted-foreground">
                      当前页内容会在提交后回流到对应列表页。
                    </div>
                  )}
                </div>
              </SectionCard>
            </CardContent>
          </Card>
        </CollapsibleSidePanel>
      </div>
      {mode === "edit" && (library === "motion" || library === "sequence") ? (
        <KnowledgeVideoPreviewDialog
          open={videoPreviewOpen}
          onOpenChange={setVideoPreviewOpen}
          library={library}
          draft={draft}
        />
      ) : null}
    </div>
  );
}

export function MultiModalExportPage({ library, navigate }: MultiModalExportProps) {
  const meta = knowledgeLibraryMeta[library];
  const contextKey = createMultiModalListContextKey(library);
  const exportDraftKey = createMultiModalExportDraftKey(library);
  const exportHistoryKey = createMultiModalExportHistoryKey(library);
  const context = readState<MultiModalListContext>(contextKey);
  const { data: items = [] } = useKnowledgeQuery(library);

  const initialDraft = readDraft<MultiModalExportDraft>(exportDraftKey) ?? {
    ...defaultExportDraft,
    format: meta.exportFormats[0] ?? meta.defaultFormat
  };

  const [draft, setDraft] = useState<MultiModalExportDraft>(initialDraft);
  const [history, setHistory] = useState<MultiModalExportHistoryItem[]>(
    () => readState<MultiModalExportHistoryItem[]>(exportHistoryKey) ?? []
  );
  const [message, setMessage] = useState("");

  const filteredItems = useMemo(() => {
    const keyword = context?.filters.keyword?.toLowerCase() ?? "";
    return items.filter((item) => {
      const keywordMatch =
        !keyword ||
        [
          item.title,
          item.category,
          item.description,
          item.tags.join(" ")
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      const tagMatch = !context?.filters.tag || item.tags.includes(context.filters.tag);
      const categoryMatch =
        !context?.filters.category || item.category === context.filters.category;
      const statusMatch =
        !context?.filters.status || item.status === context.filters.status;

      return keywordMatch && tagMatch && categoryMatch && statusMatch;
    });
  }, [context?.filters.category, context?.filters.keyword, context?.filters.status, context?.filters.tag, items]);

  const selectedItems = items.filter((item) => context?.selectedIds.includes(item.id));
  const exportCount =
    draft.exportScope === "selected" && selectedItems.length ? selectedItems.length : filteredItems.length;

  const persistDraft = (patch: Partial<MultiModalExportDraft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    writeDraft(exportDraftKey, next);
  };

  const handleExport = async () => {
    if (!draft.format) {
      setMessage("无法导出，请先选择导出格式。");
      return;
    }

    const result = await api.exportKnowledge(library, exportCount);
    const historyItem: MultiModalExportHistoryItem = {
      id: generateId("export"),
      fileName: result.fileName.replace(".zip", `.${draft.format.toLowerCase()}`),
      format: draft.format,
      exportScope: draft.exportScope,
      exportedCount: exportCount,
      createdAt: result.generatedAt
    };
    const nextHistory = [historyItem, ...history].slice(0, 6);
    setHistory(nextHistory);
    writeState(exportHistoryKey, nextHistory);
    setMessage(
      `已生成 ${historyItem.fileName}，包含 ${historyItem.exportedCount} 条记录，生成时间 ${formatDateTime(
        historyItem.createdAt
      )}`
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        eyebrow={`${meta.eyebrow} > ${meta.exportTitle}`}
        title={meta.exportTitle}
        description={meta.exportDescription}
        badge="导出页"
        className="mb-1"
        actions={
          <Button variant="outline" onClick={() => navigate({ to: meta.listPath })}>
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </Button>
        }
      />

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-h-0 flex-col gap-4">
          <SectionCard title="导出配置">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="导出对象">
                <select
                  className="native-select"
                  value={draft.exportScope}
                  onChange={(event) =>
                    persistDraft({
                      exportScope: event.target.value as MultiModalExportDraft["exportScope"]
                    })
                  }
                >
                  <option value="filtered">当前筛选结果全部文件</option>
                  <option value="selected">用户勾选的单条/多条文件</option>
                </select>
              </Field>
              <Field label="导出格式">
                <select
                  className="native-select"
                  value={draft.format}
                  onChange={(event) => persistDraft({ format: event.target.value })}
                >
                  {meta.exportFormats.map((format) => (
                    <option key={format} value={format}>
                      {format}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="开始日期">
                <Input
                  type="date"
                  value={draft.dateFrom}
                  onChange={(event) => persistDraft({ dateFrom: event.target.value })}
                />
              </Field>
              <Field label="结束日期">
                <Input
                  type="date"
                  value={draft.dateTo}
                  onChange={(event) => persistDraft({ dateTo: event.target.value })}
                />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-surface-900">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.includeDetails}
                  onChange={(event) => persistDraft({ includeDetails: event.target.checked })}
                />
                包含明细信息
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.includeStats}
                  onChange={(event) => persistDraft({ includeStats: event.target.checked })}
                />
                包含统计信息
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <Button onClick={handleExport}>开始导出</Button>
              <Button variant="secondary" onClick={() => writeDraft(exportDraftKey, draft)}>
                保存草稿
              </Button>
              <Button variant="outline" onClick={() => navigate({ to: meta.listPath })}>
                取消返回
              </Button>
            </div>
          </SectionCard>

          {message ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 text-sm text-primary">{message}</CardContent>
            </Card>
          ) : null}

          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <CardHeader className="border-b border-border/60">
              <CardTitle>导出结果预览</CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>导出来源</TableHead>
                  <TableHead>数量</TableHead>
                  <TableHead>格式</TableHead>
                  <TableHead>附加项</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    {draft.exportScope === "selected" && selectedItems.length
                      ? "勾选记录"
                      : "当前筛选结果"}
                  </TableCell>
                  <TableCell>{exportCount} 条</TableCell>
                  <TableCell>{draft.format}</TableCell>
                  <TableCell>
                    {draft.includeDetails ? "明细" : "无"} / {draft.includeStats ? "统计" : "无"}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            </CardContent>
          </Card>
        </div>

        <CollapsibleSidePanel label="历史" widthClassName="w-full xl:w-[360px]">
          <Card className="flex h-full min-h-0 flex-col overflow-hidden">
            <CardHeader className="border-b border-border/60">
              <CardTitle>导出上下文与历史</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 space-y-4 overflow-y-auto p-5">
              <SectionCard title="上下文摘要">
                <div className="space-y-3 text-sm">
                  <div className="rounded-[1rem] border border-border/70 bg-surface-50 px-4 py-3">
                    当前筛选结果：{filteredItems.length} 条
                  </div>
                  <div className="rounded-[1rem] border border-border/70 bg-surface-50 px-4 py-3">
                    当前勾选结果：{selectedItems.length} 条
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="导出历史与下载记录">
                <div className="space-y-3">
                  {history.length ? (
                    history.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-[1rem] border border-border/70 bg-surface-50 px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-surface-900">{item.fileName}</p>
                          <Badge>{item.format}</Badge>
                        </div>
                        <p className="mt-2 text-xs leading-6 text-muted-foreground">
                          {item.exportedCount} 条 · {formatDateTime(item.createdAt)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1rem] border border-dashed border-border/70 bg-surface-50 px-4 py-6 text-sm text-muted-foreground">
                      当前阶段先预留 UI，首次导出后会写入本地历史记录。
                    </div>
                  )}
                </div>
              </SectionCard>
            </CardContent>
          </Card>
        </CollapsibleSidePanel>
      </div>
    </div>
  );
}

export function MultiModalQaPage({ navigate }: MultiModalQaProps) {
  const qaStateKey = createMultiModalQaStateKey();
  const { data: knowledgeQa = [] } = useKnowledgeQaQuery("knowledge");
  const { data: voiceQa = [] } = useKnowledgeQaQuery("voice");
  const { data: motionQa = [] } = useKnowledgeQaQuery("motion");
  const { data: sequenceQa = [] } = useKnowledgeQaQuery("sequence");
  const { data: knowledgeItems = [] } = useKnowledgeQuery("knowledge");
  const { data: voiceItems = [] } = useKnowledgeQuery("voice");
  const { data: motionItems = [] } = useKnowledgeQuery("motion");
  const { data: sequenceItems = [] } = useKnowledgeQuery("sequence");
  const { data: knowledgeTags = [] } = useKnowledgeTagsQuery("knowledge");
  const { data: voiceTags = [] } = useKnowledgeTagsQuery("voice");
  const { data: motionTags = [] } = useKnowledgeTagsQuery("motion");
  const { data: sequenceTags = [] } = useKnowledgeTagsQuery("sequence");
  const [messages, setMessages] = useState<MultiModalQaMessage[]>(
    () => normalizeQaMessagesWithMediaExample(readState<MultiModalQaMessage[]>(qaStateKey))
  );
  const [question, setQuestion] = useState("");
  const [selectedQaTags, setSelectedQaTags] = useState<QaTagSelection>(() => createDefaultQaTagSelection());
  const [previewMedia, setPreviewMedia] = useState<QaMediaItem | null>(null);

  const qaTagOptionsByLibrary = useMemo(
    () => ({
      knowledge: getQaTagNames(knowledgeTags, knowledgeItems),
      voice: getQaTagNames(voiceTags, voiceItems),
      motion: getQaTagNames(motionTags, motionItems),
      sequence: getQaTagNames(sequenceTags, sequenceItems)
    }),
    [knowledgeItems, knowledgeTags, motionItems, motionTags, sequenceItems, sequenceTags, voiceItems, voiceTags]
  );

  const qaCandidatesByLibrary = useMemo(
    () => ({
      knowledge: buildQaCandidates({
        library: "knowledge",
        contexts: knowledgeQa,
        items: knowledgeItems,
        selectedTags: selectedQaTags.knowledge
      }),
      voice: buildQaCandidates({
        library: "voice",
        contexts: voiceQa,
        items: voiceItems,
        selectedTags: selectedQaTags.voice
      }),
      motion: buildQaCandidates({
        library: "motion",
        contexts: motionQa,
        items: motionItems,
        selectedTags: selectedQaTags.motion
      }),
      sequence: buildQaCandidates({
        library: "sequence",
        contexts: sequenceQa,
        items: sequenceItems,
        selectedTags: selectedQaTags.sequence
      })
    }),
    [knowledgeItems, knowledgeQa, motionItems, motionQa, selectedQaTags, sequenceItems, sequenceQa, voiceItems, voiceQa]
  );

  const hasTagFilters = hasSelectedQaTags(selectedQaTags);
  const selectedTagCount = qaLibraries.reduce((count, library) => count + selectedQaTags[library].length, 0);
  const selectedLibraries = hasTagFilters ? getSelectedQaLibraries(selectedQaTags) : [];

  const promptPool = useMemo(() => {
    return qaLibraries
      .flatMap((library) =>
        hasTagFilters && selectedQaTags[library].length === 0 ? [] : qaCandidatesByLibrary[library]
      )
      .slice(0, 8);
  }, [hasTagFilters, qaCandidatesByLibrary, selectedQaTags]);

  useEffect(() => {
    writeState(qaStateKey, messages);
  }, [messages]);

  const sendQuestion = () => {
    const trimmed = question.trim();
    if (!trimmed) {
      return;
    }

    const activeLibraries = hasTagFilters ? selectedLibraries : qaLibraries;
    const sources = hasTagFilters ? selectedLibraries : [];
    const matchedAnswers = activeLibraries
      .flatMap((library) => qaCandidatesByLibrary[library])
      .filter((item) => trimmed.includes(item.question.slice(0, 6)) || item.question.includes(trimmed.slice(0, 4)));

    const generatedMedia = getRequestedQaMedia(trimmed, matchedAnswers);
    const answerText =
      matchedAnswers[0]?.answer ??
      (generatedMedia.length
        ? "已根据当前项目里的患者处方场景理解生成需求，下面将按图片、视频分别返回 AI 生成结果。"
        : "当前为自由问答模式，建议进一步限定库内标签或补充患者阶段、动作名称等上下文信息。");

    const assistantMessages: MultiModalQaMessage[] = generatedMedia.length
      ? [
          {
            id: generateId("qa-assistant-context"),
            role: "assistant",
            text: answerText,
            sources,
            createdAt: new Date().toISOString(),
            summary: "本次回复按 AI 生成流程处理，图片和视频会作为独立回复附件返回。",
            suggestion: "点击生成的图片或视频卡片可以打开放大预览窗口。",
            expertOpinion: "生成内容用于原型演示和训练宣教辅助，实际执行仍需结合处方审核。",
            feedback: null
          },
          ...generatedMedia.map((item) => createGeneratedQaMediaMessage(item, sources))
        ]
      : [
          {
            id: generateId("qa-assistant"),
            role: "assistant",
            text: answerText,
            sources,
            createdAt: new Date().toISOString(),
            summary: matchedAnswers[0]?.answer ?? "基于当前问法给出摘要结论。",
            suggestion:
              selectedTagCount > 0
                ? "已按所选库标签限定数据范围，可继续追问执行细节。"
                : "当前未限定标签，建议先选择库内标签提高准确性。",
            expertOpinion: "专家意见区用于沉淀标准建议和临床边界。",
            relatedResources: matchedAnswers.map((item) => item.question).slice(0, 3),
            feedback: null
          }
        ];

    const nextMessages: MultiModalQaMessage[] = [
      ...messages,
      {
        id: generateId("qa-user"),
        role: "user",
        text: trimmed,
        sources,
        createdAt: new Date().toISOString()
      },
      ...assistantMessages
    ];

    setMessages(nextMessages);
    setQuestion("");
  };

  const resetConversation = () => {
    setMessages(defaultQaMessages);
    setQuestion("");
    writeState(qaStateKey, defaultQaMessages);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        eyebrow="多模态知识库 > 知识库问答"
        title="知识库问答"
        description="支持自由问答、定向问答、多轮对话和结构化答案卡片。"
        badge="问答页"
        className="mb-1"
        actions={
          <Button variant="outline" onClick={() => navigate({ to: "/knowledge/library" })}>
            <ArrowLeft className="h-4 w-4" />
            返回知识库
          </Button>
        }
      />

      <CollapsibleSplitLayout
        label="推荐"
        sideWidthClassName="w-full xl:w-[360px]"
        main={
          <div className="relative flex min-h-0 flex-col gap-2 pb-2">
            <FilterBar
              singleLine
              actions={
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedQaTags(createDefaultQaTagSelection())}
                  >
                    重置
                  </Button>
                  <Button>查询</Button>
                </>
              }
            >
              {qaLibraryOptions.map((item) => (
                <QaLibraryTagPicker
                  key={item.value}
                  label={item.label}
                  tags={qaTagOptionsByLibrary[item.value]}
                  value={selectedQaTags[item.value]}
                  onChange={(nextValue) =>
                    setSelectedQaTags((current) => ({
                      ...current,
                      [item.value]: nextValue
                    }))
                  }
                />
              ))}
            </FilterBar>

            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <CardHeader className="shrink-0 border-b border-border/60 px-4 py-3">
                <CardTitle>我要提问</CardTitle>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-y-auto px-3 pb-[10.5rem] pt-3">
                <div className="flex min-h-full flex-col justify-end gap-4">
                  {messages.length ? (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={
                          message.role === "user"
                            ? "ml-auto max-w-[78%] rounded-[1.5rem] bg-primary px-5 py-4 text-sm text-white"
                            : "max-w-[88%] rounded-[1.5rem] border border-border/70 bg-white px-5 py-4"
                        }
                      >
                        <p className={message.role === "user" ? "leading-7" : "text-sm leading-7 text-surface-900"}>
                          {message.text}
                        </p>
                        {message.role === "assistant" ? (
                          <div className="mt-4 space-y-3">
                            <div className="rounded-[1rem] bg-surface-50 px-4 py-3 text-sm text-muted-foreground">
                              <p className="font-medium text-surface-900">
                                {message.media?.length ? "AI 生成说明" : "关联资源摘要"}
                              </p>
                              <p className="mt-2 leading-7">{message.summary}</p>
                            </div>
                            {message.media?.length ? (
                              <div className="grid gap-3 md:grid-cols-2">
                                {message.media.map((item) => (
                                  <QaMediaAttachment key={item.id} item={item} onPreview={setPreviewMedia} />
                                ))}
                              </div>
                            ) : null}
                            <div className="rounded-[1rem] bg-surface-50 px-4 py-3 text-sm text-muted-foreground">
                              <p className="font-medium text-surface-900">建议方案</p>
                              <p className="mt-2 leading-7">{message.suggestion}</p>
                            </div>
                            <div className="rounded-[1rem] bg-surface-50 px-4 py-3 text-sm text-muted-foreground">
                              <p className="font-medium text-surface-900">专家意见</p>
                              <p className="mt-2 leading-7">{message.expertOpinion}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {message.relatedResources?.map((item) => (
                                <Badge key={item} className="bg-white text-surface-700">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant={message.feedback === "up" ? "default" : "outline"}
                                size="sm"
                                onClick={() =>
                                  setMessages((current) =>
                                    current.map((record) =>
                                      record.id === message.id ? { ...record, feedback: "up" } : record
                                    )
                                  )
                                }
                              >
                                <ThumbsUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant={message.feedback === "down" ? "default" : "outline"}
                                size="sm"
                                onClick={() =>
                                  setMessages((current) =>
                                    current.map((record) =>
                                      record.id === message.id ? { ...record, feedback: "down" } : record
                                    )
                                  )
                                }
                              >
                                <ThumbsDown className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-1 items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-surface-50 px-5 py-10 text-center text-sm text-muted-foreground">
                      <div>
                        <MessageSquareDashed className="mx-auto h-8 w-8 text-surface-400" />
                        <p className="mt-3">还没有对话内容，输入问题后开始多轮问答。</p>
                      </div>
                    </div>
                  )}
                  <div className="h-6 shrink-0" />
                </div>
              </CardContent>
            </Card>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-background via-background/94 to-transparent px-2 pb-2 pt-10">
              <Card className="pointer-events-auto mx-auto w-full overflow-hidden border-border/70 shadow-panel">
                <CardContent className="p-2.5">
                  <div className="relative">
                    <Textarea
                      value={question}
                      placeholder="请输入问题，支持连续追问和上下文承接"
                      className="min-h-[68px] resize-none rounded-[1.15rem] border-border/70 bg-white pb-12 pr-[14rem] pt-3"
                      onChange={(event) => setQuestion(event.target.value)}
                    />
                    <div className="absolute bottom-2.5 right-2.5 flex flex-wrap items-center justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setQuestion("")}>
                        清空
                      </Button>
                      <Button size="sm" variant="secondary" onClick={resetConversation}>
                        重置
                      </Button>
                      <Button size="sm" onClick={sendQuestion}>
                        <Send className="h-4 w-4" />
                        发送
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        }
        side={
          <Card className="flex h-full min-h-0 flex-col overflow-hidden">
            <CardHeader className="border-b border-border/60">
              <CardTitle>推荐与技巧</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 space-y-4 overflow-y-auto p-5">
              <SectionCard title="热门与推荐问题">
                <div className="space-y-3">
                  {promptPool.slice(0, 6).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full rounded-[1rem] border border-border/70 bg-white px-4 py-3 text-left text-sm text-surface-900"
                      onClick={() => setQuestion(item.question)}
                    >
                      {item.question}
                    </button>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="提问技巧">
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="rounded-[1rem] border border-border/70 bg-surface-50 px-4 py-3">
                    尽量包含患者阶段、动作名称、疼痛变化或训练目标。
                  </div>
                  <div className="rounded-[1rem] border border-border/70 bg-surface-50 px-4 py-3">
                    选择一个或多个库内标签后，可获得更定向的回答结果。
                  </div>
                  <div className="rounded-[1rem] border border-border/70 bg-surface-50 px-4 py-3">
                    支持连续追问，系统会保留当前会话上下文。
                  </div>
                </div>
              </SectionCard>
            </CardContent>
          </Card>
        }
      />
      <QaMediaPreviewDialog item={previewMedia} onOpenChange={(open) => !open && setPreviewMedia(null)} />
    </div>
  );
}
