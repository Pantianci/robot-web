import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  FileUp,
  GripVertical,
  MessageSquareDashed,
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
  knowledgeLibraryMeta,
  type MultiModalExportDraft,
  type MultiModalExportHistoryItem,
  type MultiModalListContext,
  type MultiModalQaMessage
} from "@/lib/multimodal";
import { clearDraft, readDraft, readState, writeDraft, writeState } from "@/lib/storage";
import type { KnowledgeItem, KnowledgeLibrary } from "@/lib/types";
import { formatDateTime, generateId } from "@/lib/utils";
import { Field } from "@/components/field";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  { label: "语音交互库", value: "voice" },
  { label: "标准动作库", value: "motion" },
  { label: "动作序列库", value: "sequence" }
];

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
    category: draft.category || "自定义",
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
      if (!draft.standardQuestion || !draft.tags || !draft.replies.filter(Boolean).length) {
        return "无法提交，请补全标准问题、标签和至少一条回复内容。";
      }

      return "";
    }

    if (!draft.title || !draft.category || !draft.tags) {
      return mode === "edit"
        ? "无法更新，请补全标题、分类和标签。"
        : "无法上传，请补全标题、分类和标签。";
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

    if (mode === "edit" && currentItem) {
      await updateMutation.mutateAsync({
        id: currentItem.id,
        patch: payload
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
    { label: "完成分类配置", done: Boolean(draft.category) },
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
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${meta.eyebrow} > ${mode === "edit" ? meta.editTitle : meta.createTitle}`}
        title={mode === "edit" ? meta.editTitle : meta.createTitle}
        description={meta.createDescription}
        badge={mode === "edit" ? "编辑页" : "新增页"}
        actions={
          <Button variant="outline" onClick={() => navigate({ to: meta.listPath })}>
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <div className="space-y-6">
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

              <Field label="分类" required>
                <Input
                  value={draft.category}
                  placeholder="请输入分类"
                  onChange={(event) => persist({ category: event.target.value })}
                />
              </Field>
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
                  <option value="草稿">草稿</option>
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

          <Card className="border-primary/15 bg-primary/5">
            <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium text-primary">当前页面支持草稿恢复</p>
                <p className="mt-1 text-sm text-primary/80">
                  草稿保存在本地浏览器 LocalStorage 中，再次进入页面可继续编辑。
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
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

        <div className="space-y-6">
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
        </div>
      </div>
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
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${meta.eyebrow} > ${meta.exportTitle}`}
        title={meta.exportTitle}
        description={meta.exportDescription}
        badge="导出页"
        actions={
          <Button variant="outline" onClick={() => navigate({ to: meta.listPath })}>
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_360px]">
        <div className="space-y-6">
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

          <SectionCard title="导出结果预览">
            <Table>
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
          </SectionCard>
        </div>

        <div className="space-y-6">
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
        </div>
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
  const [messages, setMessages] = useState<MultiModalQaMessage[]>(
    () => readState<MultiModalQaMessage[]>(qaStateKey) ?? []
  );
  const [question, setQuestion] = useState("");
  const [selectedSources, setSelectedSources] = useState<KnowledgeLibrary[]>([]);

  const sourceMap = {
    knowledge: knowledgeQa,
    voice: voiceQa,
    motion: motionQa,
    sequence: sequenceQa
  };

  const promptPool = useMemo(() => {
    const pools = selectedSources.length ? selectedSources : qaLibraryOptions.map((item) => item.value);
    return pools.flatMap((source) => sourceMap[source]).slice(0, 8);
  }, [knowledgeQa, motionQa, selectedSources, sequenceQa, voiceQa]);

  useEffect(() => {
    writeState(qaStateKey, messages);
  }, [messages]);

  const sendQuestion = () => {
    const trimmed = question.trim();
    if (!trimmed) {
      return;
    }

    const sources = selectedSources.length ? selectedSources : [];
    const matchedAnswers = (selectedSources.length ? selectedSources : qaLibraryOptions.map((item) => item.value))
      .flatMap((source) => sourceMap[source])
      .filter((item) => trimmed.includes(item.question.slice(0, 6)) || item.question.includes(trimmed.slice(0, 4)));

    const answerText =
      matchedAnswers[0]?.answer ??
      "当前为自由问答模式，建议进一步限定知识源或补充患者阶段、动作名称等上下文信息。";

    const nextMessages: MultiModalQaMessage[] = [
      ...messages,
      {
        id: generateId("qa-user"),
        role: "user",
        text: trimmed,
        sources,
        createdAt: new Date().toISOString()
      },
      {
        id: generateId("qa-assistant"),
        role: "assistant",
        text: answerText,
        sources,
        createdAt: new Date().toISOString(),
        summary: matchedAnswers[0]?.answer ?? "基于当前问法给出摘要结论。",
        suggestion:
          selectedSources.length > 0
            ? "已优先基于所选知识源回答，可继续追问执行细节。"
            : "当前未限定知识源，建议选择一个或多个知识库提高准确性。",
        expertOpinion: "专家意见区用于沉淀标准建议和临床边界。",
        relatedResources: matchedAnswers.map((item) => item.question).slice(0, 3),
        feedback: null
      }
    ];

    setMessages(nextMessages);
    setQuestion("");
  };

  const resetConversation = () => {
    setMessages([]);
    setQuestion("");
    writeState(qaStateKey, []);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="多模态知识库 > 知识库问答"
        title="知识库问答"
        description="支持自由问答、定向问答、多轮对话和结构化答案卡片。"
        badge="问答页"
        actions={
          <Button variant="outline" onClick={() => navigate({ to: "/knowledge/library" })}>
            <ArrowLeft className="h-4 w-4" />
            返回知识库
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <div className="space-y-6">
          <SectionCard title="知识源选择">
            <div className="flex flex-wrap gap-3">
              {qaLibraryOptions.map((item) => {
                const active = selectedSources.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    className={
                      active
                        ? "rounded-full bg-primary px-4 py-2 text-sm font-medium text-white"
                        : "rounded-full border border-border/70 bg-white px-4 py-2 text-sm font-medium text-surface-700"
                    }
                    onClick={() =>
                      setSelectedSources((current) =>
                        current.includes(item.value)
                          ? current.filter((value) => value !== item.value)
                          : [...current, item.value]
                      )
                    }
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {selectedSources.length
                ? `已选择 ${selectedSources.length} 个知识源，问答结果将优先基于所选范围生成。`
                : "当前未选择知识源，默认处于自由问答模式。"}
            </p>
          </SectionCard>

          <SectionCard title="多轮对话">
            <div className="space-y-4">
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
                          <p className="font-medium text-surface-900">关联资源摘要</p>
                          <p className="mt-2 leading-7">{message.summary}</p>
                        </div>
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
                                current.map((item) =>
                                  item.id === message.id ? { ...item, feedback: "up" } : item
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
                                current.map((item) =>
                                  item.id === message.id ? { ...item, feedback: "down" } : item
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
                <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-surface-50 px-5 py-10 text-center text-sm text-muted-foreground">
                  <MessageSquareDashed className="mx-auto h-8 w-8 text-surface-400" />
                  <p className="mt-3">还没有对话内容，输入问题后开始多轮问答。</p>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="输入区">
            <Field label="问题输入">
              <Textarea
                value={question}
                placeholder="请输入问题，支持连续追问和上下文承接"
                onChange={(event) => setQuestion(event.target.value)}
              />
            </Field>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={sendQuestion}>
                <Send className="h-4 w-4" />
                发送
              </Button>
              <Button variant="outline" onClick={() => setQuestion("")}>
                清空输入
              </Button>
              <Button variant="secondary" onClick={resetConversation}>
                重置会话
              </Button>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
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
                选择一个或多个知识源后，可获得更定向的回答结果。
              </div>
              <div className="rounded-[1rem] border border-border/70 bg-surface-50 px-4 py-3">
                支持连续追问，系统会保留当前会话上下文。
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
