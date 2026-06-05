import { useState } from "react";
import { FileOutput, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import {
  useCreateKnowledgeMutation,
  useCreateKnowledgeTagMutation,
  useDeleteKnowledgeMutation,
  useKnowledgeQaQuery,
  useKnowledgeQuery,
  useKnowledgeTagsQuery,
  useUpdateKnowledgeMutation
} from "@/lib/hooks";
import { clearDraft, readDraft, writeDraft } from "@/lib/storage";
import { formatDateTime } from "@/lib/utils";
import type { KnowledgeItem, KnowledgeLibrary, TagItem } from "@/lib/types";
import { DetailPanel } from "@/components/detail-panel";
import { DialogFormShell } from "@/components/dialog-form-shell";
import { EmptyState } from "@/components/empty-state";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const libraryMeta: Record<
  KnowledgeLibrary,
  {
    title: string;
    eyebrow: string;
    description: string;
    createTitle: string;
    exportTitle: string;
    tagTitle: string;
  }
> = {
  knowledge: {
    title: "康复知识库",
    eyebrow: "多模态知识库 > 康复知识库",
    description: "维护指南、论文、知识和专家经验，支持列表检索、详情预览、标签管理和知识问答。",
    createTitle: "新增康复知识",
    exportTitle: "导出康复知识",
    tagTitle: "康复知识标签库"
  },
  voice: {
    title: "语音交互库",
    eyebrow: "多模态知识库 > 语音交互库",
    description: "管理语音指令和正向激励内容，支持相似问题、多回复内容和标签体系。",
    createTitle: "新增语音数据",
    exportTitle: "导出语音数据",
    tagTitle: "语音数据标签库"
  },
  motion: {
    title: "标准动作库",
    eyebrow: "多模态知识库 > 标准动作库",
    description: "维护标准动作视频、适用部位、角度和持续时间，用于后续动作序列和处方生成。",
    createTitle: "新增标准动作视频",
    exportTitle: "导出标准动作视频",
    tagTitle: "标准动作标签库"
  },
  sequence: {
    title: "动作序列库",
    eyebrow: "多模态知识库 > 动作序列库",
    description: "以标准动作组合序列的形式维护阶段化康复流程，并支持动作顺序预览。",
    createTitle: "新增动作序列数据",
    exportTitle: "导出动作序列数据",
    tagTitle: "动作序列标签库"
  }
};

type DraftState = {
  title: string;
  category: string;
  tags: string;
  description: string;
  format: string;
  size: string;
  angle: string;
  direction: string;
  durationMinutes: string;
  part: string;
  stage: string;
  standardQuestion: string;
  similarQuestions: string;
  replies: string;
  sequenceSteps: string;
};

const defaultDraft: DraftState = {
  title: "",
  category: "",
  tags: "",
  description: "",
  format: "",
  size: "",
  angle: "",
  direction: "",
  durationMinutes: "",
  part: "",
  stage: "",
  standardQuestion: "",
  similarQuestions: "",
  replies: "",
  sequenceSteps: ""
};

function normalizeDraft(item: DraftState) {
  return {
    title: item.title,
    category: item.category || "自定义",
    format: item.format || "TXT",
    size: item.size || "0.2 MB",
    tags: item.tags
      .split(/[、,，]/)
      .map((value) => value.trim())
      .filter(Boolean),
    status: "生效" as const,
    operator: "当前用户",
    description: item.description,
    angle: item.angle || undefined,
    direction: item.direction || undefined,
    durationMinutes: item.durationMinutes ? Number(item.durationMinutes) : undefined,
    part: item.part || undefined,
    stage: item.stage || undefined,
    standardQuestion: item.standardQuestion || undefined,
    similarQuestions: item.similarQuestions
      ? item.similarQuestions.split(/[;\n]/).map((value) => value.trim()).filter(Boolean)
      : undefined,
    replies: item.replies
      ? item.replies.split(/[;\n]/).map((value) => value.trim()).filter(Boolean)
      : undefined,
    sequenceSteps: item.sequenceSteps
      ? item.sequenceSteps.split(/[;\n]/).map((value) => value.trim()).filter(Boolean)
      : undefined
  };
}

function toDraft(item: KnowledgeItem): DraftState {
  return {
    title: item.title,
    category: item.category,
    tags: item.tags.join("、"),
    description: item.description,
    format: item.format,
    size: item.size,
    angle: item.angle ?? "",
    direction: item.direction ?? "",
    durationMinutes: item.durationMinutes ? String(item.durationMinutes) : "",
    part: item.part ?? "",
    stage: item.stage ?? "",
    standardQuestion: item.standardQuestion ?? "",
    similarQuestions: item.similarQuestions?.join("\n") ?? "",
    replies: item.replies?.join("\n") ?? "",
    sequenceSteps: item.sequenceSteps?.join("\n") ?? ""
  };
}

export function KnowledgeWorkspace({ library }: { library: KnowledgeLibrary }) {
  const meta = libraryMeta[library];
  const { data: items = [] } = useKnowledgeQuery(library);
  const { data: tags = [] } = useKnowledgeTagsQuery(library);
  const { data: qaContexts = [] } = useKnowledgeQaQuery(library);
  const createMutation = useCreateKnowledgeMutation(library);
  const updateMutation = useUpdateKnowledgeMutation(library);
  const deleteMutation = useDeleteKnowledgeMutation(library);
  const createTagMutation = useCreateKnowledgeTagMutation(library);

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [exportResult, setExportResult] = useState<string>("");
  const [draft, setDraft] = useState<DraftState>(
    readDraft<DraftState>(`${library}:draft`) ?? defaultDraft
  );
  const [tagForm, setTagForm] = useState<{
    name: string;
    parent: string;
    description: string;
    status: TagItem["status"];
  }>({ name: "", parent: "", description: "", status: "使用中" });

  const filtered = items.filter((item) =>
    [item.title, item.category, item.description, item.tags.join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  const persistDraft = (next: Partial<DraftState>) => {
    const merged = { ...draft, ...next };
    setDraft(merged);
    writeDraft(`${library}:draft`, merged);
  };

  const resetDraft = () => {
    setDraft(defaultDraft);
    clearDraft(`${library}:draft`);
  };

  const handleCreate = async () => {
    if (!draft.title || !draft.tags) {
      return;
    }
    await createMutation.mutateAsync(normalizeDraft(draft));
    setCreateOpen(false);
    resetDraft();
  };

  const handleUpdate = async () => {
    if (!selected || !draft.title || !draft.tags) {
      return;
    }
    await updateMutation.mutateAsync({
      id: selected.id,
      patch: normalizeDraft(draft)
    });
    setEditOpen(false);
    resetDraft();
  };

  const openEdit = () => {
    if (!selected) {
      return;
    }
    const current = toDraft(selected);
    setDraft(current);
    writeDraft(`${library}:draft`, current);
    setEditOpen(true);
  };

  const handleExport = async () => {
    const result = await api.exportKnowledge(library, filtered.length);
    setExportResult(
      `已生成 ${result.fileName}，包含 ${result.exportedCount} 条记录，生成时间 ${formatDateTime(
        result.generatedAt
      )}`
    );
  };

  const handleCreateTag = async () => {
    if (!tagForm.name || !tagForm.parent) {
      return;
    }
    await createTagMutation.mutateAsync({
      ...tagForm,
      operator: "当前用户",
      relatedCount: 0
    });
    setTagOpen(false);
    setTagForm({ name: "", parent: "", description: "", status: "使用中" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={meta.eyebrow}
        title={meta.title}
        description={meta.description}
        actions={
          <>
            {library === "motion" ? (
              <Button variant="secondary">
                <Sparkles className="h-4 w-4" />
                AI 生成标准动作视频
              </Button>
            ) : null}
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              {meta.createTitle}
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <FileOutput className="h-4 w-4" />
              {meta.exportTitle}
            </Button>
          </>
        }
      />

      <FilterBar
        actions={
          <>
            <Button variant="secondary" onClick={() => setQuery("")}>
              重置
            </Button>
            <Button>查询</Button>
          </>
        }
      >
        <Field label="关键字检索">
          <Input
            placeholder="输入关键词检索"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>
        <Field label="分类">
          <select className="native-select">
            <option>全部</option>
            {[...new Set(items.map((item) => item.category))].map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </Field>
        <Field label="标签">
          <select className="native-select">
            <option>全部</option>
            {tags.map((tag) => (
              <option key={tag.id}>{tag.name}</option>
            ))}
          </select>
        </Field>
        <Field label="状态">
          <select className="native-select">
            <option>全部</option>
            <option>生效</option>
            <option>失效</option>
            <option>草稿</option>
          </select>
        </Field>
      </FilterBar>

      {exportResult ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-sm text-primary">{exportResult}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_380px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60">
            <CardTitle>内容列表</CardTitle>
            <div className="flex gap-2">
              {selected ? (
                <>
                  <Button variant="outline" size="sm" onClick={openEdit}>
                    编辑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(selected.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>标题</TableHead>
                    <TableHead>分类</TableHead>
                    <TableHead>格式</TableHead>
                    <TableHead>标签</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow
                      key={item.id}
                      data-state={selected?.id === item.id ? "selected" : undefined}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(item.id)}
                    >
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.format}</TableCell>
                      <TableCell>{item.tags.join("、")}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            item.status === "生效"
                              ? "bg-emerald-100 text-emerald-700"
                              : item.status === "失效"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-700"
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDateTime(item.updatedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6">
                <EmptyState title="暂无匹配内容" description="调整筛选条件后重试。" />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <DetailPanel
            title="内容详情"
            footer={
              selected?.preview ? (
                <SectionCard title="内容预览">
                  <p className="text-sm leading-7 text-muted-foreground">{selected.preview}</p>
                </SectionCard>
              ) : null
            }
          >
            {selected ? (
              <PropertyList
                items={[
                  { label: "标题", value: selected.title },
                  { label: "分类", value: selected.category },
                  { label: "标签", value: selected.tags },
                  { label: "说明", value: selected.description },
                  { label: "最近操作", value: formatDateTime(selected.updatedAt) }
                ]}
              />
            ) : (
              <EmptyState title="请选择一条内容" />
            )}
          </DetailPanel>

          <Tabs defaultValue="tags">
            <TabsList className="w-full">
              <TabsTrigger value="tags" className="flex-1">
                标签管理
              </TabsTrigger>
              <TabsTrigger value="qa" className="flex-1">
                知识问答
              </TabsTrigger>
            </TabsList>
            <TabsContent value="tags" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{meta.tagTitle}</CardTitle>
                  <Button size="sm" onClick={() => setTagOpen(true)}>
                    新增标签
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tags.map((tag) => (
                    <div
                      key={tag.id}
                      className="rounded-2xl border border-border/70 bg-surface-50 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-surface-900">{tag.name}</p>
                          <p className="text-sm text-muted-foreground">
                            上级标签：{tag.parent} · 最近操作人：{tag.operator}
                          </p>
                        </div>
                        <Badge>{tag.status}</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="qa">
              <Card>
                <CardHeader>
                  <CardTitle>知识问答</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {qaContexts.length ? (
                    qaContexts.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-border/70 bg-white px-4 py-3"
                      >
                        <p className="font-medium text-surface-900">{item.question}</p>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">
                          {item.answer}
                        </p>
                      </div>
                    ))
                  ) : (
                    <EmptyState title="暂无问答上下文" />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <DialogFormShell
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={meta.createTitle}
        description="支持草稿保留，关闭前可手动保存当前输入。"
        onSubmit={handleCreate}
        submitLabel="提交"
      >
        <KnowledgeFormFields
          library={library}
          draft={draft}
          onChange={persistDraft}
          onSaveDraft={() => writeDraft(`${library}:draft`, draft)}
          onReset={resetDraft}
        />
      </DialogFormShell>

      <DialogFormShell
        open={editOpen}
        onOpenChange={setEditOpen}
        title={`编辑${meta.title}`}
        description="会默认带出旧信息，可按需更新。"
        onSubmit={handleUpdate}
        submitLabel="更新"
      >
        <KnowledgeFormFields
          library={library}
          draft={draft}
          onChange={persistDraft}
          onSaveDraft={() => writeDraft(`${library}:draft`, draft)}
          onReset={resetDraft}
        />
      </DialogFormShell>

      <DialogFormShell
        open={tagOpen}
        onOpenChange={setTagOpen}
        title={`新增${meta.tagTitle}`}
        description="标签支持上级标签和启用状态定义。"
        onSubmit={handleCreateTag}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="标签名称" required>
            <Input
              value={tagForm.name}
              onChange={(event) =>
                setTagForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </Field>
          <Field label="上级标签" required>
            <Input
              value={tagForm.parent}
              onChange={(event) =>
                setTagForm((current) => ({ ...current, parent: event.target.value }))
              }
            />
          </Field>
        </div>
        <Field label="是否启用" required>
          <select
            className="native-select"
            value={tagForm.status}
            onChange={(event) =>
              setTagForm((current) => ({
                ...current,
                status: event.target.value as "使用中" | "未使用"
              }))
            }
          >
            <option value="使用中">使用中</option>
            <option value="未使用">未使用</option>
          </select>
        </Field>
        <Field label="说明">
          <Textarea
            value={tagForm.description}
            onChange={(event) =>
              setTagForm((current) => ({ ...current, description: event.target.value }))
            }
          />
        </Field>
      </DialogFormShell>
    </div>
  );
}

function KnowledgeFormFields({
  library,
  draft,
  onChange,
  onSaveDraft,
  onReset
}: {
  library: KnowledgeLibrary;
  draft: DraftState;
  onChange: (value: Partial<DraftState>) => void;
  onSaveDraft: () => void;
  onReset: () => void;
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={library === "voice" ? "标准问题" : "标题"} required>
          <Input
            value={library === "voice" ? draft.standardQuestion : draft.title}
            onChange={(event) =>
              onChange(
                library === "voice"
                  ? { standardQuestion: event.target.value, title: event.target.value }
                  : { title: event.target.value }
              )
            }
          />
        </Field>
        <Field label="分类" required>
          <Input
            value={draft.category}
            onChange={(event) => onChange({ category: event.target.value })}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="标签" required>
          <Input
            value={draft.tags}
            placeholder="多个标签可用 、 隔开"
            onChange={(event) => onChange({ tags: event.target.value })}
          />
        </Field>
        <Field label="文件格式">
          <Input
            value={draft.format}
            onChange={(event) => onChange({ format: event.target.value })}
          />
        </Field>
      </div>

      {library === "motion" ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="适用部位">
            <Input
              value={draft.part}
              onChange={(event) => onChange({ part: event.target.value })}
            />
          </Field>
          <Field label="角度">
            <Input
              value={draft.angle}
              onChange={(event) => onChange({ angle: event.target.value })}
            />
          </Field>
          <Field label="方向">
            <Input
              value={draft.direction}
              onChange={(event) => onChange({ direction: event.target.value })}
            />
          </Field>
          <Field label="持续时间">
            <Input
              value={draft.durationMinutes}
              onChange={(event) => onChange({ durationMinutes: event.target.value })}
            />
          </Field>
        </div>
      ) : null}

      {library === "sequence" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="阶段">
            <Input
              value={draft.stage}
              onChange={(event) => onChange({ stage: event.target.value })}
            />
          </Field>
          <Field label="总时长">
            <Input
              value={draft.durationMinutes}
              onChange={(event) => onChange({ durationMinutes: event.target.value })}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="组成动作">
              <Textarea
                value={draft.sequenceSteps}
                placeholder="每行一个标准动作"
                onChange={(event) => onChange({ sequenceSteps: event.target.value })}
              />
            </Field>
          </div>
        </div>
      ) : null}

      {library === "voice" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="相似问题">
            <Textarea
              value={draft.similarQuestions}
              placeholder="每行一个相似问题"
              onChange={(event) => onChange({ similarQuestions: event.target.value })}
            />
          </Field>
          <Field label="回复内容">
            <Textarea
              value={draft.replies}
              placeholder="每行一个回复"
              onChange={(event) => onChange({ replies: event.target.value })}
            />
          </Field>
        </div>
      ) : null}

      <Field label="说明">
        <Textarea
          value={draft.description}
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={onSaveDraft}>
          <Save className="h-4 w-4" />
          草稿保存
        </Button>
        <Button type="button" variant="outline" onClick={onReset}>
          清空
        </Button>
      </div>
    </>
  );
}
