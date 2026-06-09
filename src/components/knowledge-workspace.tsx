import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  FileOutput,
  PencilLine,
  Plus,
  Sparkles,
  Trash2
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  useDeleteKnowledgeMutation,
  useKnowledgeQaQuery,
  useKnowledgeQuery,
  useKnowledgeTagsQuery
} from "@/lib/hooks";
import {
  createMultiModalListContextKey,
  defaultMultiModalListFilters,
  isInDateRange,
  knowledgeLibraryMeta,
  multiModalPageSizeOptions,
  voiceCategoryOptions,
  type MultiModalListContext,
  type MultiModalListFilters
} from "@/lib/multimodal";
import { readState, writeState } from "@/lib/storage";
import type { KnowledgeItem, KnowledgeLibrary } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { CollapsibleSplitLayout } from "@/components/collapsible-side-panel";
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
      item.status,
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
      item.status
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
      item.status
    ];
  }

  return [
    item.title,
    item.format,
    item.size,
    item.tags.join("、"),
    item.status,
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

export function KnowledgeWorkspace({ library }: { library: KnowledgeLibrary }) {
  const meta = knowledgeLibraryMeta[library];
  const contextKey = createMultiModalListContextKey(library);
  const [context, setContext] = useState<MultiModalListContext>(
    () => readState<MultiModalListContext>(contextKey) ?? createDefaultListContext()
  );
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeItem | null>(null);

  const { data: items = [] } = useKnowledgeQuery(library);
  const { data: tags = [] } = useKnowledgeTagsQuery(library);
  const { data: qaContexts = [] } = useKnowledgeQaQuery(library);
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
  const tagNames = useMemo(() => tags.map((tag) => tag.name), [tags]);
  const statusColumnIndex = statusColumnIndexForLibrary(library);

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

  const toggleSelected = (id: string) => {
    setContext((current) => ({
      ...current,
      selectedIds: current.selectedIds.includes(id)
        ? current.selectedIds.filter((item) => item !== id)
        : [...current.selectedIds, id]
    }));
  };

  const selectedCount = context.selectedIds.filter((id) =>
    filteredItems.some((item) => item.id === id)
  ).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        eyebrow={meta.eyebrow}
        title={meta.title}
        description={meta.listDescription}
        className="mb-1"
        actions={
          <>
            {meta.aiActionLabel ? (
              <Button variant="secondary">
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
            <option value="草稿">草稿</option>
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
                        <TableHead className="w-12">选择</TableHead>
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
                              <input
                                type="checkbox"
                                checked={context.selectedIds.includes(item.id)}
                                onChange={() => toggleSelected(item.id)}
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
                    { label: "状态", value: selectedItem.status },
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

      <DialogFormShell
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="删除知识记录"
        description="确认删除后将刷新列表，并在原型中模拟记录最近操作信息。"
        onSubmit={handleDeleteKnowledge}
        submitLabel="确认删除"
      >
        <p className="text-sm leading-7 text-muted-foreground">
          确定删除“{deleteTarget?.title}”吗？此操作在当前原型中不可恢复。
        </p>
      </DialogFormShell>
    </div>
  );
}
