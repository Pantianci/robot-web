import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  FileOutput,
  PencilLine,
  PlayCircle,
  Plus,
  Sparkles,
  Trash2
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  useCreateKnowledgeMutation,
  useDeleteKnowledgeMutation,
  useKnowledgeQaQuery,
  useKnowledgeQuery,
  useKnowledgeTagsQuery
} from "@/lib/hooks";
import {
  createMultiModalListContextKey,
  defaultMultiModalListFilters,
  getKnowledgeStatusLabel,
  isInDateRange,
  knowledgeLibraryMeta,
  multiModalPageSizeOptions,
  type MultiModalListContext,
  type MultiModalListFilters,
  voiceCategoryOptions,
} from "@/lib/multimodal";
import { readState, writeState } from "@/lib/storage";
import {
  isPageFullySelected,
  isPagePartiallySelected,
  togglePageSelection,
  toggleSelection
} from "@/lib/table-selection";
import type { KnowledgeItem, KnowledgeLibrary } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { CollapsibleSplitLayout } from "@/components/collapsible-side-panel";
import { DetailPanel } from "@/components/detail-panel";
import { DialogFormShell } from "@/components/dialog-form-shell";
import { EmptyState } from "@/components/empty-state";
import { Field } from "@/components/field";
import { FilterBar } from "@/components/filter-bar";
import {
  KnowledgeVideoPreviewDialog,
  type KnowledgeVideoPreviewDraft
} from "@/components/knowledge-video-preview-dialog";
import { PageHeader } from "@/components/page-header";
import { PropertyList } from "@/components/property-list";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TableSelectionCheckbox } from "@/components/ui/table-selection-checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

function statusBadgeClass(status: string) {
  if (status === "生效") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "失效") {
    return "bg-rose-100 text-rose-700";
  }

  if (status === "使用中") {
    return "bg-primary/10 text-primary";
  }

  if (status === "未使用") {
    return "bg-surface-100 text-surface-700";
  }

  return "bg-amber-100 text-amber-700";
}

function createDefaultListContext(): MultiModalListContext {
  return {
    filters: defaultMultiModalListFilters,
    selectedId: null,
    selectedIds: [],
    page: 1,
    pageSize: 10,
    editId: null
  };
}

type AiKnowledgeDraft = {
  knowledgeTags: string[];
  motionTags: string[];
  uploadName: string;
  prompt: string;
};

function createDefaultAiKnowledgeDraft(): AiKnowledgeDraft {
  return {
    knowledgeTags: [],
    motionTags: [],
    uploadName: "",
    prompt: ""
  };
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function toggleTagSelection(values: string[], nextValue: string) {
  return values.includes(nextValue)
    ? values.filter((item) => item !== nextValue)
    : [...values, nextValue];
}

function createTagOptionNames(
  tags: Array<{ name: string }>,
  items: KnowledgeItem[]
) {
  return uniqueStrings([...tags.map((tag) => tag.name), ...items.flatMap((item) => item.tags)]);
}

function inferMotionPart(text: string) {
  if (/踝|膝|髋|下肢|腿|步态/.test(text)) {
    return "下肢";
  }

  return "上肢";
}

function inferMotionDirection(text: string) {
  if (/踝泵|跖屈|背屈/.test(text)) {
    return "跖屈/背屈";
  }

  if (/内收/.test(text)) {
    return "内收";
  }

  if (/外展|抬臂/.test(text)) {
    return "外展";
  }

  return "屈伸";
}

function inferMotionAngle(text: string) {
  if (/踝|跖屈|背屈/.test(text)) {
    return "15-20 度";
  }

  if (/肘/.test(text)) {
    return "45-90 度";
  }

  if (/肩|外展|抬臂/.test(text)) {
    return "30-60 度";
  }

  return "10-30 度";
}

function inferMotionBaseName(text: string, fallbackTag: string) {
  if (/踝|跖屈|背屈|下肢/.test(text)) {
    return "踝泵训练";
  }

  if (/肘|屈伸/.test(text)) {
    return "肘屈伸训练";
  }

  if (/肩|外展|抬臂|肩关节/.test(text)) {
    return "肩外展训练";
  }

  return fallbackTag ? `${fallbackTag}训练` : "AI生成标准动作";
}

function inferSequenceStage(prompt: string, knowledgeTags: string[]) {
  const knowledgeStage = knowledgeTags.find((tag) => /术后|阶段|周|月/.test(tag));
  if (knowledgeStage) {
    return knowledgeStage;
  }

  const matched = prompt.match(/术后\d+周|术后第?\d+周|术后\d+月|术后第?\d+月|早期|中期|后期/);
  return matched?.[0] ?? "阶段待确认";
}

function buildAiMotionPayload({
  prompt,
  knowledgeTags,
  uploadName,
  knowledgeMatches,
  motionTagOptions
}: {
  prompt: string;
  knowledgeTags: string[];
  uploadName: string;
  knowledgeMatches: KnowledgeItem[];
  motionTagOptions: string[];
}): Omit<KnowledgeItem, "id" | "library" | "uploadedAt" | "updatedAt"> {
  const summaryText = `${prompt} ${knowledgeTags.join(" ")} ${knowledgeMatches
    .map((item) => `${item.title} ${item.description}`)
    .join(" ")}`;
  const part = inferMotionPart(summaryText);
  const actionName = inferMotionBaseName(summaryText, knowledgeTags[0] ?? "");
  const matchedMotionTags = motionTagOptions.filter((tag) => summaryText.includes(tag));
  const finalTags = uniqueStrings([
    ...matchedMotionTags,
    ...knowledgeTags.slice(0, 3),
    part,
    "AI生成"
  ]);
  const referenceSummary = knowledgeMatches.length
    ? `参考知识：${knowledgeMatches
        .slice(0, 2)
        .map((item) => item.title)
        .join("、")}`
    : "未限定康复知识标签";
  const uploadSummary = uploadName ? `；参考上传：${uploadName}` : "";

  return {
    title: `${actionName}视频`,
    fileName: `AI-${actionName}.mp4`,
    category: "标准动作",
    format: "MP4",
    size: "18.60 MB",
    tags: finalTags,
    status: "草稿",
    operator: "AI生成助手",
    description: `AI 根据康复知识标签与补充说明生成标准动作视频。${referenceSummary}；补充说明：${prompt}${uploadSummary}`,
    preview: `${actionName}建议按 8-10 次/组执行，组间休息 30 秒，先慢后稳，重点观察动作代偿。`,
    actionName,
    part,
    angle: inferMotionAngle(summaryText),
    direction: inferMotionDirection(summaryText),
    durationMinutes: part === "下肢" ? 5 : 6,
    indication:
      knowledgeMatches[0]?.description ?? `${part}康复训练场景下的标准动作演示与宣教。`,
    contraindication: "急性疼痛明显、局部肿胀或医生明确禁止时暂停执行。"
  };
}

function buildAiSequencePayload({
  prompt,
  knowledgeTags,
  motionTags,
  uploadName,
  knowledgeMatches,
  motionMatches
}: {
  prompt: string;
  knowledgeTags: string[];
  motionTags: string[];
  uploadName: string;
  knowledgeMatches: KnowledgeItem[];
  motionMatches: KnowledgeItem[];
}): Omit<KnowledgeItem, "id" | "library" | "uploadedAt" | "updatedAt"> {
  const steps = uniqueStrings(
    motionMatches.map((item) => item.actionName ?? item.title)
  ).slice(0, 6);
  const totalDuration =
    motionMatches
      .slice(0, 6)
      .reduce((sum, item) => sum + (item.durationMinutes ?? 4), 0) || 12;
  const stage = inferSequenceStage(prompt, knowledgeTags);
  const title = `${stage === "阶段待确认" ? motionTags[0] ?? "标准动作" : stage}动作序列`;
  const knowledgeSummary = knowledgeMatches.length
    ? `参考知识：${knowledgeMatches
        .slice(0, 2)
        .map((item) => item.title)
        .join("、")}`
    : "未限定康复知识标签";
  const uploadSummary = uploadName ? `；参考上传：${uploadName}` : "";

  return {
    title,
    fileName: `AI-${title}.json`,
    category: "动作序列",
    format: "JSON",
    size: "0.32 MB",
    tags: uniqueStrings([...motionTags, ...knowledgeTags, "AI生成"]),
    status: "草稿",
    operator: "AI生成助手",
    description: `AI 根据标准动作库标签生成动作序列。${knowledgeSummary}；补充说明：${prompt}${uploadSummary}`,
    preview: steps.join(" → "),
    stage,
    goal: prompt,
    sequenceSteps: steps,
    durationMinutes: totalDuration
  };
}

function TagSelectionField({
  label,
  required,
  tags,
  value,
  emptyText,
  onChange
}: {
  label: string;
  required?: boolean;
  tags: string[];
  value: string[];
  emptyText: string;
  onChange: (nextValue: string[]) => void;
}) {
  return (
    <Field label={label} required={required}>
      <div className="space-y-2">
        <select
          className="native-select"
          value=""
          onChange={(event) => {
            const nextTag = event.target.value;
            if (!nextTag) {
              return;
            }

            onChange(toggleTagSelection(value, nextTag));
          }}
        >
          <option value="">{tags.length ? (value.length ? `已选 ${value.length} 个标签` : "请选择标签") : "暂无标签"}</option>
          {tags.map((tag) => (
            <option key={tag} value={tag}>
              {value.includes(tag) ? `取消 ${tag}` : `选择 ${tag}`}
            </option>
          ))}
        </select>
        <div className="flex min-h-[44px] flex-wrap gap-2 rounded-[1rem] border border-border/70 bg-surface-50 px-3 py-2">
          {value.length ? (
            value.map((tag) => (
              <button
                key={tag}
                type="button"
                className="rounded-full border border-primary/20 bg-white px-3 py-1 text-xs font-medium text-primary"
                onClick={() => onChange(value.filter((item) => item !== tag))}
              >
                {tag}
              </button>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">{emptyText}</span>
          )}
        </div>
      </div>
    </Field>
  );
}

function normalizeKeywordFields(item: KnowledgeItem) {
  return [
    item.id,
    item.title,
    item.fileName,
    item.category,
    item.description,
    item.preview,
    item.tags.join(" "),
    item.actionName,
    item.goal,
    item.stage,
    item.part,
    item.indication,
    item.contraindication,
    item.standardQuestion,
    item.similarQuestions?.join(" "),
    item.replies?.join(" "),
    item.sequenceSteps?.join(" ")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function sortKnowledgeItems(items: KnowledgeItem[]) {
  return [...items].sort(
    (left, right) =>
      new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime()
  );
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function listColumnsForLibrary(library: KnowledgeLibrary) {
  if (library === "voice") {
    return ["标准问题", "分类", "标签", "状态", "时间", "操作"] as const;
  }

  if (library === "motion") {
    return ["动作ID", "视频名称", "动作名称", "持续时间", "适用部位", "角度", "方向", "适应症", "禁忌症", "标签", "状态", "操作"] as const;
  }

  if (library === "sequence") {
    return ["序列ID", "序列名称", "阶段", "目标", "动作顺序", "总时长", "状态", "操作"] as const;
  }

  return ["标题", "格式", "文件大小", "标签", "状态", "时间", "操作"] as const;
}

function libraryTableRow(
  library: KnowledgeLibrary,
  item: KnowledgeItem
) {
  if (library === "voice") {
    return [
      item.standardQuestion ?? item.title,
      item.category,
      item.tags.join("、"),
      getKnowledgeStatusLabel(library, item.status),
      formatDateTime(item.updatedAt)
    ];
  }

  if (library === "motion") {
    return [
      item.id,
      item.fileName ?? item.title,
      item.actionName ?? item.title,
      item.durationMinutes ? `${item.durationMinutes} 分钟` : "-",
      item.part ?? "-",
      item.angle ?? "-",
      item.direction ?? "-",
      item.indication ?? "-",
      item.contraindication ?? "-",
      item.tags.join("、"),
      getKnowledgeStatusLabel(library, item.status)
    ];
  }

  if (library === "sequence") {
    return [
      item.id,
      item.title,
      item.stage ?? "-",
      item.goal ?? "-",
      item.sequenceSteps?.join(" → ") ?? "-",
      item.durationMinutes ? `${item.durationMinutes} 分钟` : "-",
      getKnowledgeStatusLabel(library, item.status)
    ];
  }

  return [
    item.title,
    item.format,
    item.size,
    item.tags.join("、"),
    getKnowledgeStatusLabel(library, item.status),
    formatDateTime(item.updatedAt)
  ];
}

function statusColumnIndexForLibrary(library: KnowledgeLibrary) {
  if (library === "voice") {
    return 3;
  }

  if (library === "motion") {
    return 10;
  }

  if (library === "sequence") {
    return 6;
  }

  return 4;
}

function createVideoPreviewDraft(item: KnowledgeItem): KnowledgeVideoPreviewDraft {
  if (item.library === "sequence") {
    return {
      title: item.title,
      stage: item.stage,
      goal: item.goal,
      durationMinutes: item.durationMinutes,
      sequenceSteps: item.sequenceSteps
    };
  }

  return {
    title: item.title,
    actionName: item.actionName,
    part: item.part,
    angle: item.angle,
    direction: item.direction,
    durationMinutes: item.durationMinutes
  };
}

export function KnowledgeWorkspace({ library }: { library: KnowledgeLibrary }) {
  const meta = knowledgeLibraryMeta[library];
  const contextKey = createMultiModalListContextKey(library);
  const [context, setContext] = useState<MultiModalListContext>(
    () => readState<MultiModalListContext>(contextKey) ?? createDefaultListContext()
  );
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiDraft, setAiDraft] = useState<AiKnowledgeDraft>(createDefaultAiKnowledgeDraft);
  const [aiErrorMessage, setAiErrorMessage] = useState("");
  const [videoPreviewTarget, setVideoPreviewTarget] = useState<KnowledgeItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeItem | null>(null);

  const { data: items = [] } = useKnowledgeQuery(library);
  const { data: tags = [] } = useKnowledgeTagsQuery(library);
  const { data: qaContexts = [] } = useKnowledgeQaQuery(library);
  const { data: knowledgeReferenceItems = [] } = useKnowledgeQuery("knowledge");
  const { data: knowledgeReferenceTags = [] } = useKnowledgeTagsQuery("knowledge");
  const { data: motionReferenceItems = [] } = useKnowledgeQuery("motion");
  const { data: motionReferenceTags = [] } = useKnowledgeTagsQuery("motion");
  const createKnowledgeMutation = useCreateKnowledgeMutation(library);
  const deleteKnowledgeMutation = useDeleteKnowledgeMutation(library);

  useEffect(() => {
    writeState(contextKey, context);
  }, [context, contextKey]);

  const sortedItems = useMemo(() => sortKnowledgeItems(items), [items]);
  const categories = useMemo(
    () =>
      library === "voice"
        ? Array.from(new Set([...voiceCategoryOptions, ...sortedItems.map((item) => item.category)])).filter(Boolean)
        : [],
    [library, sortedItems]
  );
  const tagNames = useMemo(() => createTagOptionNames(tags, sortedItems), [sortedItems, tags]);
  const knowledgeReferenceTagNames = useMemo(
    () => createTagOptionNames(knowledgeReferenceTags, knowledgeReferenceItems),
    [knowledgeReferenceItems, knowledgeReferenceTags]
  );
  const motionReferenceTagNames = useMemo(
    () => createTagOptionNames(motionReferenceTags, motionReferenceItems),
    [motionReferenceItems, motionReferenceTags]
  );
  const statusColumnIndex = statusColumnIndexForLibrary(library);
  const matchedKnowledgeReferenceItems = useMemo(
    () =>
      aiDraft.knowledgeTags.length
        ? knowledgeReferenceItems.filter((item) =>
            aiDraft.knowledgeTags.some((tag) => item.tags.includes(tag))
          )
        : [],
    [aiDraft.knowledgeTags, knowledgeReferenceItems]
  );
  const matchedMotionReferenceItems = useMemo(
    () =>
      aiDraft.motionTags.length
        ? motionReferenceItems.filter((item) =>
            aiDraft.motionTags.some((tag) => item.tags.includes(tag))
          )
        : [],
    [aiDraft.motionTags, motionReferenceItems]
  );

  const filteredItems = useMemo(() => {
    return sortedItems.filter((item) => {
      const matchesKeyword =
        !context.filters.keyword ||
        normalizeKeywordFields(item).includes(context.filters.keyword.toLowerCase());
      const matchesCategory =
        library !== "voice" ||
        !context.filters.category ||
        item.category === context.filters.category;
      const matchesTag =
        !context.filters.tag || item.tags.includes(context.filters.tag);
      const matchesStatus =
        !context.filters.status || item.status === context.filters.status;
      const matchesDate = isInDateRange(
        item.updatedAt,
        context.filters.dateFrom,
        context.filters.dateTo
      );

      return (
        matchesKeyword &&
        matchesCategory &&
        matchesTag &&
        matchesStatus &&
        matchesDate
      );
    });
  }, [context.filters, library, sortedItems]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / context.pageSize));
  const safePage = Math.min(context.page, totalPages);
  const pagedItems = useMemo(
    () => paginate(filteredItems, safePage, context.pageSize),
    [context.pageSize, filteredItems, safePage]
  );
  const pagedIds = useMemo(() => pagedItems.map((item) => item.id), [pagedItems]);
  const allPagedSelected = isPageFullySelected(context.selectedIds, pagedIds);
  const somePagedSelected = isPagePartiallySelected(context.selectedIds, pagedIds);

  const selectedItem =
    filteredItems.find((item) => item.id === context.selectedId) ??
    pagedItems[0] ??
    null;

  useEffect(() => {
    if (selectedItem && selectedItem.id !== context.selectedId) {
      setContext((current) => ({ ...current, selectedId: selectedItem.id }));
      return;
    }

    if (!selectedItem && context.selectedId) {
      setContext((current) => ({ ...current, selectedId: null }));
    }
  }, [context.selectedId, selectedItem]);

  const handleDeleteKnowledge = async () => {
    if (!deleteTarget) {
      return;
    }

    await deleteKnowledgeMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const openAiDialog = () => {
    setAiDraft(createDefaultAiKnowledgeDraft());
    setAiErrorMessage("");
    setAiDialogOpen(true);
  };

  const handleCreateAiKnowledge = async () => {
    const trimmedPrompt = aiDraft.prompt.trim();

    if (!trimmedPrompt) {
      setAiErrorMessage("请先补充生成说明后再确认。");
      return;
    }

    if (library === "sequence" && !aiDraft.motionTags.length) {
      setAiErrorMessage("请至少选择一个标准动作库标签。");
      return;
    }

    if (library === "sequence" && !matchedMotionReferenceItems.length) {
      setAiErrorMessage("所选标准动作库标签下暂无可编排动作，请调整标签后重试。");
      return;
    }

    if (library !== "motion" && library !== "sequence") {
      return;
    }

    setAiErrorMessage("");

    const payload =
      library === "motion"
        ? buildAiMotionPayload({
            prompt: trimmedPrompt,
            knowledgeTags: aiDraft.knowledgeTags,
            uploadName: aiDraft.uploadName,
            knowledgeMatches: matchedKnowledgeReferenceItems,
            motionTagOptions: motionReferenceTagNames
          })
        : buildAiSequencePayload({
            prompt: trimmedPrompt,
            knowledgeTags: aiDraft.knowledgeTags,
            motionTags: aiDraft.motionTags,
            uploadName: aiDraft.uploadName,
            knowledgeMatches: matchedKnowledgeReferenceItems,
            motionMatches: matchedMotionReferenceItems
          });

    const created = await createKnowledgeMutation.mutateAsync(payload);

    setContext((current) => ({
      ...current,
      filters: defaultMultiModalListFilters,
      selectedId: created.id,
      page: 1
    }));
    setAiDialogOpen(false);
    setAiDraft(createDefaultAiKnowledgeDraft());
  };

  const toggleSelected = (id: string) => {
    setContext((current) => ({
      ...current,
      selectedIds: toggleSelection(current.selectedIds, id, !current.selectedIds.includes(id))
    }));
  };

  const selectedCount = context.selectedIds.filter((id) =>
    filteredItems.some((item) => item.id === id)
  ).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeader
        eyebrow={meta.eyebrow}
        title={meta.title}
        description={meta.listDescription}
        actions={
          <>
            {meta.aiActionLabel ? (
              <Button variant="secondary" onClick={openAiDialog}>
                <Sparkles className="h-4 w-4" />
                {meta.aiActionLabel}
              </Button>
            ) : null}
            <Button asChild>
              <Link to={meta.createPath}>
                <Plus className="h-4 w-4" />
                {meta.createTitle}
              </Link>
            </Button>
            <Button
              variant="outline"
              asChild
              onClick={() =>
                writeState(contextKey, {
                  ...context,
                  selectedIds: context.selectedIds
                })
              }
            >
              <Link to={meta.exportPath}>
                <FileOutput className="h-4 w-4" />
                {meta.exportTitle}
              </Link>
            </Button>
          </>
        }
      />

      <FilterBar
        singleLine
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                setContext((current) => ({
                  ...current,
                  filters: defaultMultiModalListFilters,
                  page: 1
                }))
              }
            >
              重置
            </Button>
            <Button>查询</Button>
          </>
        }
      >
        <Field label="关键词">
          <Input
            placeholder="输入关键词检索"
            value={context.filters.keyword}
            onChange={(event) =>
              setContext((current) => ({
                ...current,
                filters: { ...current.filters, keyword: event.target.value },
                page: 1
              }))
            }
          />
        </Field>
        {library === "voice" ? (
          <Field label="分类">
            <select
              className="native-select"
              value={context.filters.category}
              onChange={(event) =>
                setContext((current) => ({
                  ...current,
                  filters: { ...current.filters, category: event.target.value },
                  page: 1
                }))
              }
            >
              <option value="">全部</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        <Field label="标签">
          <select
            className="native-select"
            value={context.filters.tag}
            onChange={(event) =>
              setContext((current) => ({
                ...current,
                filters: { ...current.filters, tag: event.target.value },
                page: 1
              }))
            }
          >
            <option value="">全部</option>
            {tagNames.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </Field>
        <Field label="状态">
          <select
            className="native-select"
            value={context.filters.status}
            onChange={(event) =>
              setContext((current) => ({
                ...current,
                filters: {
                  ...current.filters,
                  status: event.target.value as MultiModalListFilters["status"]
                },
                page: 1
              }))
            }
          >
            <option value="">全部</option>
            <option value="生效">生效</option>
            <option value="失效">失效</option>
            <option value="草稿">{getKnowledgeStatusLabel(library, "草稿")}</option>
          </select>
        </Field>
        <Field label="开始日期">
          <Input
            type="date"
            value={context.filters.dateFrom}
            onChange={(event) =>
              setContext((current) => ({
                ...current,
                filters: { ...current.filters, dateFrom: event.target.value },
                page: 1
              }))
            }
          />
        </Field>
        <Field label="结束日期">
          <Input
            type="date"
            value={context.filters.dateTo}
            onChange={(event) =>
              setContext((current) => ({
                ...current,
                filters: { ...current.filters, dateTo: event.target.value },
                page: 1
              }))
            }
          />
        </Field>
      </FilterBar>

      <CollapsibleSplitLayout
        label="详情"
        sideWidthClassName="w-full xl:w-[400px]"
        main={
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <CardHeader className="border-b border-border/60">
              <div>
                <CardTitle>内容列表</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  共 {filteredItems.length} 条结果，已勾选 {selectedCount} 条
                </p>
              </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              {pagedItems.length ? (
                <>
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <TableSelectionCheckbox
                            checked={allPagedSelected}
                            indeterminate={somePagedSelected}
                            onChange={(checked) =>
                              setContext((current) => ({
                                ...current,
                                selectedIds: togglePageSelection(current.selectedIds, pagedIds, checked)
                              }))
                            }
                            ariaLabel={`全选内容列表第 ${safePage} 页`}
                          />
                        </TableHead>
                        {listColumnsForLibrary(library).map((column) => (
                          <TableHead key={column}>{column}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedItems.map((item) => {
                        const rowValues = libraryTableRow(library, item);

                        return (
                          <TableRow
                            key={item.id}
                            data-state={selectedItem?.id === item.id ? "selected" : undefined}
                            className="cursor-pointer"
                            onClick={() =>
                              setContext((current) => ({
                                ...current,
                                selectedId: item.id
                              }))
                            }
                          >
                            <TableCell onClick={(event) => event.stopPropagation()}>
                              <TableSelectionCheckbox
                                checked={context.selectedIds.includes(item.id)}
                                onChange={() => toggleSelected(item.id)}
                                ariaLabel={`选择内容 ${item.title}`}
                              />
                            </TableCell>
                            {rowValues.map((value, index) => (
                              <TableCell key={`${item.id}-${index}`} className={index === 0 ? "font-medium" : ""}>
                                {index === statusColumnIndex ? (
                                  <Badge className={statusBadgeClass(String(value))}>{value}</Badge>
                                ) : (
                                  value
                                )}
                              </TableCell>
                            ))}
                            <TableCell onClick={(event) => event.stopPropagation()}>
                              <div className="flex gap-2">
                                {library === "motion" || library === "sequence" ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setVideoPreviewTarget(item);
                                    }}
                                    aria-label={`视频预览 ${item.title}`}
                                  >
                                    <PlayCircle className="h-4 w-4" />
                                  </Button>
                                ) : null}
                                <Button
                                  asChild
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setContext((current) => ({
                                      ...current,
                                      editId: item.id
                                    }))
                                  }
                                >
                                  <Link to={meta.editPath}>
                                    <PencilLine className="h-4 w-4" />
                                  </Link>
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  <div className="shrink-0 flex flex-col gap-3 border-t border-border/60 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="text-sm text-muted-foreground">第 {safePage} / {totalPages} 页</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        className="native-select h-9 w-[110px]"
                        value={context.pageSize}
                        onChange={(event) =>
                          setContext((current) => ({
                            ...current,
                            pageSize: Number(event.target.value),
                            page: 1
                          }))
                        }
                      >
                        {multiModalPageSizeOptions.map((size) => (
                          <option key={size} value={size}>
                            {size} 条/页
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={safePage <= 1}
                        onClick={() =>
                          setContext((current) => ({
                            ...current,
                            page: Math.max(1, current.page - 1)
                          }))
                        }
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={safePage >= totalPages}
                        onClick={() =>
                          setContext((current) => ({
                            ...current,
                            page: Math.min(totalPages, current.page + 1)
                          }))
                        }
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-6">
                  <EmptyState title="暂无匹配内容" description="调整筛选条件后重试。" />
                </div>
              )}
            </CardContent>
          </Card>
        }
        side={
          <DetailPanel title={`${meta.title}详情`} className="h-full">
            {selectedItem ? (
              <>
                <PropertyList
                  items={[
                    ...(library === "motion"
                      ? [{ label: "动作ID", value: selectedItem.id }]
                      : library === "sequence"
                        ? [{ label: "序列ID", value: selectedItem.id }]
                        : []),
                    {
                      label: library === "voice" ? "标准问题" : "标题",
                      value: library === "voice" ? selectedItem.standardQuestion ?? selectedItem.title : selectedItem.title
                    },
                    ...(library === "voice"
                      ? [{ label: "分类", value: selectedItem.category }]
                      : []),
                    { label: "格式", value: selectedItem.format },
                    { label: "文件大小", value: selectedItem.size },
                    { label: "标签", value: selectedItem.tags },
                    { label: "状态", value: getKnowledgeStatusLabel(library, selectedItem.status) },
                    { label: "上传时间", value: formatDateTime(selectedItem.uploadedAt) },
                    { label: "最近操作", value: formatDateTime(selectedItem.updatedAt) }
                  ]}
                />
                <SectionCard title="文件说明">
                  <p className="text-sm leading-7 text-muted-foreground">{selectedItem.description}</p>
                </SectionCard>
                {library === "motion" ? (
                  <SectionCard title="动作详情">
                    <PropertyList
                      items={[
                        { label: "动作名称", value: selectedItem.actionName ?? selectedItem.title },
                        { label: "适用部位", value: selectedItem.part },
                        { label: "角度", value: selectedItem.angle },
                        { label: "方向", value: selectedItem.direction },
                        {
                          label: "持续时间",
                          value: selectedItem.durationMinutes
                            ? `${selectedItem.durationMinutes} 分钟`
                            : "-"
                        },
                        { label: "适应症", value: selectedItem.indication },
                        { label: "禁忌症", value: selectedItem.contraindication }
                      ]}
                    />
                  </SectionCard>
                ) : null}
                {library === "sequence" ? (
                  <SectionCard title="序列详情">
                    <PropertyList
                      items={[
                        { label: "阶段", value: selectedItem.stage },
                        { label: "目标", value: selectedItem.goal },
                        { label: "动作顺序", value: selectedItem.sequenceSteps }
                      ]}
                    />
                  </SectionCard>
                ) : null}
                {library === "voice" ? (
                  <SectionCard title="问答对详情">
                    <PropertyList
                      items={[
                        { label: "标准问题", value: selectedItem.standardQuestion },
                        { label: "相似问题", value: selectedItem.similarQuestions },
                        { label: "回复内容", value: selectedItem.replies }
                      ]}
                    />
                  </SectionCard>
                ) : null}

                <SectionCard title="最近操作">
                  <p className="text-sm leading-7 text-muted-foreground">
                    {selectedItem.lastAction ?? `${formatDateTime(selectedItem.updatedAt)} 更新`}
                  </p>
                </SectionCard>

                {selectedItem.preview ? (
                  <SectionCard title="内容预览">
                    <p className="text-sm leading-7 text-muted-foreground">{selectedItem.preview}</p>
                  </SectionCard>
                ) : null}

                <SectionCard title="知识问答上下文">
                  <div className="space-y-3">
                    {qaContexts.length ? (
                      qaContexts.slice(0, 4).map((item) => (
                        <div
                          key={item.id}
                          className="rounded-[1.25rem] border border-border/70 bg-white px-4 py-3"
                        >
                          <p className="font-medium text-surface-900">{item.question}</p>
                          <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.answer}</p>
                        </div>
                      ))
                    ) : (
                      <EmptyState title="暂无问答上下文" description="后续可从知识库问答页回流到这里。" />
                    )}
                  </div>
                </SectionCard>
              </>
            ) : (
              <EmptyState title="请选择一条内容" description="点击列表中的记录后，在此查看右侧固定详情区。" />
            )}
          </DetailPanel>
        }
      />

      {videoPreviewTarget && (library === "motion" || library === "sequence") ? (
        <KnowledgeVideoPreviewDialog
          open={Boolean(videoPreviewTarget)}
          onOpenChange={(open) => {
            if (!open) {
              setVideoPreviewTarget(null);
            }
          }}
          library={library}
          draft={createVideoPreviewDraft(videoPreviewTarget)}
        />
      ) : null}

      <DialogFormShell
        open={aiDialogOpen}
        onOpenChange={(open) => {
          setAiDialogOpen(open);
          if (!open) {
            setAiErrorMessage("");
          }
        }}
        title={library === "motion" ? "AI生成标准动作视频" : "AI生成动作序列"}
        description={
          library === "motion"
            ? "可选康复知识标签和上传资料，再补充生成说明，确认后会自动加入一条未生效标准动作记录。"
            : "可选康复知识标签，必须选择标准动作标签，再补充生成说明，确认后会自动加入一条未生效动作序列记录。"
        }
        onSubmit={() => {
          void handleCreateAiKnowledge();
        }}
        submitLabel="确认生成"
      >
        {(library === "motion" || library === "sequence") ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <TagSelectionField
                label="本地康复知识库标签"
                tags={knowledgeReferenceTagNames}
                value={aiDraft.knowledgeTags}
                emptyText="可多选，不强制选择。"
                onChange={(nextValue) => {
                  setAiDraft((current) => ({ ...current, knowledgeTags: nextValue }));
                  setAiErrorMessage("");
                }}
              />
              {library === "sequence" ? (
                <TagSelectionField
                  label="本地标准动作库标签"
                  required
                  tags={motionReferenceTagNames}
                  value={aiDraft.motionTags}
                  emptyText="至少选择一个标准动作标签。"
                  onChange={(nextValue) => {
                    setAiDraft((current) => ({ ...current, motionTags: nextValue }));
                    setAiErrorMessage("");
                  }}
                />
              ) : null}
            </div>

            <Field label="上传文件">
              <div className="space-y-2">
                <Input
                  type="file"
                  accept=".png,.jpg,.jpeg,.txt,.md,.pdf,.mp4,.mov,.avi"
                  className="h-auto file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
                  onChange={(event) =>
                    setAiDraft((current) => ({
                      ...current,
                      uploadName: event.target.files?.[0]?.name ?? ""
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">支持图片、文本、视频资料。</p>
                {aiDraft.uploadName ? (
                  <p className="text-xs text-surface-900">当前选择：{aiDraft.uploadName}</p>
                ) : null}
              </div>
            </Field>

            <Field label="生成说明" required>
              <Textarea
                value={aiDraft.prompt}
                placeholder={
                  library === "motion"
                    ? "请输入需要生成的动作重点、适用阶段、注意事项等说明"
                    : "请输入动作序列目标、阶段、先后顺序和注意事项等说明"
                }
                onChange={(event) => {
                  setAiDraft((current) => ({ ...current, prompt: event.target.value }));
                  setAiErrorMessage("");
                }}
              />
            </Field>

            <SectionCard title="生成参考摘要">
              <PropertyList
                items={
                  library === "motion"
                    ? [
                        { label: "知识标签", value: aiDraft.knowledgeTags },
                        { label: "匹配知识", value: `${matchedKnowledgeReferenceItems.length} 条` },
                        { label: "生成状态", value: "未生效" }
                      ]
                    : [
                        { label: "知识标签", value: aiDraft.knowledgeTags },
                        { label: "标准动作标签", value: aiDraft.motionTags },
                        { label: "匹配动作", value: `${matchedMotionReferenceItems.length} 条` },
                        { label: "生成状态", value: "未生效" }
                      ]
                }
              />
            </SectionCard>

            {library === "sequence" && matchedMotionReferenceItems.length ? (
              <SectionCard title="拟生成动作顺序">
                <div className="flex flex-wrap gap-2">
                  {uniqueStrings(
                    matchedMotionReferenceItems.map((item) => item.actionName ?? item.title)
                  )
                    .slice(0, 6)
                    .map((item) => (
                      <Badge key={item} className="bg-surface-50 text-surface-700">
                        {item}
                      </Badge>
                    ))}
                </div>
              </SectionCard>
            ) : null}

            {aiErrorMessage ? (
              <Card className="border-rose-200 bg-rose-50">
                <CardContent className="p-4 text-sm text-rose-700">{aiErrorMessage}</CardContent>
              </Card>
            ) : null}
          </>
        ) : null}
      </DialogFormShell>

      <DialogFormShell
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title={`确定删除“${deleteTarget?.title ?? ""}”吗？`}
        onSubmit={handleDeleteKnowledge}
        submitLabel="确认删除"
      />
    </div>
  );
}
