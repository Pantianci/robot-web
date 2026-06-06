import { Link } from "@tanstack/react-router";
import { ChevronRight, FileOutput, Plus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { DetailPanel } from "@/components/detail-panel";
import { EmptyState } from "@/components/empty-state";
import { Field } from "@/components/field";
import { FilterBar } from "@/components/filter-bar";
import { PropertyList } from "@/components/property-list";
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

export function SubPageScaffold({
  eyebrow,
  title,
  description,
  status = "原型页",
  children
}: {
  eyebrow: string;
  title: string;
  description: string;
  status?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        badge={status}
      />
      {children}
    </div>
  );
}

export function ActionFormPage({
  eyebrow,
  title,
  description,
  fields,
  tips,
  aiReference,
  submitLabel = "提交"
}: {
  eyebrow: string;
  title: string;
  description: string;
  fields: Array<{
    label: string;
    required?: boolean;
    value?: string;
    placeholder?: string;
    textarea?: boolean;
  }>;
  tips?: string[];
  aiReference?: string;
  submitLabel?: string;
}) {
  return (
    <SubPageScaffold eyebrow={eyebrow} title={title} description={description}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <SectionCard title="录入表单" description="当前为高保真原型，提交行为保持为页面内反馈。">
          <div className="space-y-4">
            {fields.map((field) => (
              <Field key={field.label} label={field.label} required={field.required}>
                {field.textarea ? (
                  <Textarea
                    value={field.value ?? ""}
                    placeholder={field.placeholder}
                    onChange={() => undefined}
                  />
                ) : (
                  <Input
                    value={field.value ?? ""}
                    placeholder={field.placeholder}
                    onChange={() => undefined}
                  />
                )}
              </Field>
            ))}
            <div className="flex flex-wrap gap-3">
              <Button>{submitLabel}</Button>
              <Button variant="secondary">草稿保存</Button>
              <Button variant="outline">清空</Button>
            </div>
          </div>
        </SectionCard>

        <div className="space-y-6">
          {aiReference ? (
            <SectionCard title="AI 参考">
              <p className="text-sm leading-7 text-muted-foreground">{aiReference}</p>
            </SectionCard>
          ) : null}
          {tips?.length ? (
            <SectionCard title="页面说明">
              <div className="space-y-3">
                {tips.map((tip) => (
                  <div
                    key={tip}
                    className="rounded-2xl border border-border/70 bg-surface-50 px-4 py-3 text-sm text-muted-foreground"
                  >
                    {tip}
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </SubPageScaffold>
  );
}

export function ExportPage({
  eyebrow,
  title,
  description,
  options,
  exportHint
}: {
  eyebrow: string;
  title: string;
  description: string;
  options: Array<{ label: string; value: string }>;
  exportHint: string;
}) {
  return (
    <SubPageScaffold eyebrow={eyebrow} title={title} description={description}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <SectionCard title="导出配置">
          <div className="grid gap-4 md:grid-cols-2">
            {options.map((option) => (
              <Field key={option.label} label={option.label}>
                <Input value={option.value} onChange={() => undefined} />
              </Field>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <Button>
              <FileOutput className="h-4 w-4" />
              生成导出文件
            </Button>
            <Button variant="outline">重置条件</Button>
          </div>
        </SectionCard>

        <SectionCard title="导出说明">
          <p className="text-sm leading-7 text-muted-foreground">{exportHint}</p>
        </SectionCard>
      </div>
    </SubPageScaffold>
  );
}

export function QaPage({
  eyebrow,
  title,
  description,
  prompts,
  answer
}: {
  eyebrow: string;
  title: string;
  description: string;
  prompts: string[];
  answer: string;
}) {
  const [question, setQuestion] = useState(prompts[0] ?? "");

  return (
    <SubPageScaffold eyebrow={eyebrow} title={title} description={description}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <SectionCard title="知识问答">
          <Field label="输入问题" required>
            <Textarea value={question} onChange={(event) => setQuestion(event.target.value)} />
          </Field>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button>
              <Sparkles className="h-4 w-4" />
              开始问答
            </Button>
            <Button variant="outline">清空问题</Button>
          </div>
          <div className="mt-6 rounded-[1.5rem] border border-border/70 bg-surface-50 p-5">
            <p className="text-sm font-medium text-surface-900">答案摘要</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{answer}</p>
          </div>
        </SectionCard>

        <SectionCard title="推荐问题">
          <div className="space-y-3">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="flex w-full items-center justify-between rounded-2xl border border-border/70 bg-white px-4 py-3 text-left text-sm text-surface-900"
                onClick={() => setQuestion(prompt)}
              >
                <span>{prompt}</span>
                <ChevronRight className="h-4 w-4 text-surface-500" />
              </button>
            ))}
          </div>
        </SectionCard>
      </div>
    </SubPageScaffold>
  );
}

export function TagManagementPage({
  eyebrow,
  title,
  description,
  tags,
  createLink
}: {
  eyebrow: string;
  title: string;
  description: string;
  tags: Array<{
    id: string;
    name: string;
    parent: string;
    status: string;
    operator: string;
    relatedCount: number;
    updatedAt: string;
    description: string;
  }>;
  createLink?: string;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(tags[0]?.id ?? null);

  const filtered = useMemo(
    () =>
      tags.filter((tag) =>
        [tag.name, tag.parent, tag.description, tag.operator].join(" ").includes(query)
      ),
    [query, tags]
  );

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  return (
    <SubPageScaffold eyebrow={eyebrow} title={title} description={description}>
      <FilterBar
        actions={
          <>
            <Button variant="secondary" onClick={() => setQuery("")}>
              重置
            </Button>
            {createLink ? (
              <Button asChild>
                <Link to={createLink}>
                  <Plus className="h-4 w-4" />
                  新增标签
                </Link>
              </Button>
            ) : null}
          </>
        }
      >
        <Field label="标签检索">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} />
        </Field>
        <Field label="状态">
          <select className="native-select">
            <option>全部</option>
            <option>使用中</option>
            <option>未使用</option>
          </select>
        </Field>
      </FilterBar>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_360px]">
        <Card>
          <CardHeader className="border-b border-border/60">
            <CardTitle>标签列表</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>标签</TableHead>
                    <TableHead>上级标签</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>关联数</TableHead>
                    <TableHead>操作人</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((tag) => (
                    <TableRow
                      key={tag.id}
                      className="cursor-pointer"
                      data-state={selected?.id === tag.id ? "selected" : undefined}
                      onClick={() => setSelectedId(tag.id)}
                    >
                      <TableCell className="font-medium">{tag.name}</TableCell>
                      <TableCell>{tag.parent}</TableCell>
                      <TableCell>
                        <Badge>{tag.status}</Badge>
                      </TableCell>
                      <TableCell>{tag.relatedCount}</TableCell>
                      <TableCell>{tag.operator}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6">
                <EmptyState title="暂无匹配标签" />
              </div>
            )}
          </CardContent>
        </Card>

        <DetailPanel title="标签详情">
          {selected ? (
            <>
              <PropertyList
                items={[
                  { label: "标签", value: selected.name },
                  { label: "上级", value: selected.parent },
                  { label: "状态", value: selected.status },
                  { label: "关联数", value: selected.relatedCount },
                  { label: "操作人", value: selected.operator },
                  { label: "更新时间", value: selected.updatedAt }
                ]}
              />
              <SectionCard title="说明">
                <p className="text-sm leading-7 text-muted-foreground">{selected.description}</p>
              </SectionCard>
            </>
          ) : (
            <EmptyState title="请选择一个标签" />
          )}
        </DetailPanel>
      </div>
    </SubPageScaffold>
  );
}
