import {
  Activity,
  Bot,
  ChevronRight,
  CheckCircle2,
  ClipboardCheck,
  FileOutput,
  FileText,
  FolderKanban,
  ListChecks,
  MessageSquareQuote,
  Plus,
  ShieldCheck,
  Sparkles,
  SquarePen,
  Trash2,
  UploadCloud,
  Workflow,
  type LucideIcon
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateKnowledgeTagMutation,
  useDeleteKnowledgeTagMutation,
  useKnowledgeQuery,
  useUpdateKnowledgeTagMutation
} from "@/lib/hooks";
import type { KnowledgeLibrary, TagItem } from "@/lib/types";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

type FormField = {
  label: string;
  required?: boolean;
  value?: string;
  placeholder?: string;
  textarea?: boolean;
};

type ActionScenario =
  | "knowledge"
  | "voice"
  | "motion"
  | "sequence"
  | "patient"
  | "plan"
  | "prescription"
  | "reportReview"
  | "robot"
  | "tag";

type MetricTone = "primary" | "emerald" | "amber" | "slate";

type MetricItem = {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone?: MetricTone;
};

const metricToneStyles: Record<MetricTone, string> = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  slate: "bg-surface-100 text-surface-700"
};

const defaultActionNotes: Record<ActionScenario, string[]> = {
  knowledge: [
    "知识文件、标签和说明建议同时补齐，方便后续问答引用。",
    "摘要区域可用于承接文件解析、版本说明和使用边界。"
  ],
  voice: [
    "相似问题建议按使用场景分组录入，便于后续语音召回。",
    "回复内容应包含激励、提醒和风险提示三类语义。"
  ],
  motion: [
    "动作角度、部位和方向建议与视频素材同步校验。",
    "动作说明中应明确适应症、禁忌和训练节奏。"
  ],
  sequence: [
    "动作序列建议按阶段目标编排，并明确每段训练重心。",
    "总时长和单动作时长需要保持逻辑一致，方便处方复用。"
  ],
  patient: [
    "基础档案建立后应立即关联设备、病床和主要病种信息。",
    "备注区建议记录依从性、疼痛波动和护理注意事项。"
  ],
  plan: [
    "方案应体现阶段目标、潜在风险和医护协同信息。",
    "AI 参考可作为建议来源，但最终方案仍需人工确认。"
  ],
  prescription: [
    "处方动作清单建议和标准动作库、动作序列库保持一致。",
    "频率、时长和风险提醒需要和患者当前阶段联动。"
  ],
  reportReview: [
    "审核报告时优先确认训练完成率、ROM 变化和疼痛评分。",
    "医生与护士评价建议分别体现医学判断与病区观察。"
  ],
  robot: [
    "设备状态、病床和关联患者建议在同一页面完成校验。",
    "备注区可用于记录告警、维护和排班说明。"
  ],
  tag: [
    "新增标签前建议确认上级层级和适用模块，避免重复命名。",
    "标签说明中应明确业务边界，便于后续检索与统计。"
  ]
};

const workflowMap: Record<ActionScenario, string[]> = {
  knowledge: ["录入基础属性", "关联知识素材", "校验摘要与标签", "提交进入知识库"],
  voice: ["整理标准问题", "补充相似问法", "配置回复脚本", "联调语音触发规则"],
  motion: ["配置动作参数", "核对部位和角度", "预览训练节奏", "提交动作素材"],
  sequence: ["选择组成动作", "调整执行顺序", "核对总时长", "发布到处方候选库"],
  patient: ["录入患者信息", "关联设备病床", "补充病情备注", "提交建立档案"],
  plan: ["选择患者阶段", "配置目标与风险", "同步责任人信息", "提交康复方案"],
  prescription: ["锁定患者与序列", "调整动作参数", "核对频率与风险", "提交运动处方"],
  reportReview: ["校验训练数据", "补充医护评价", "确认审核结论", "归档评估报告"],
  robot: ["建立设备档案", "关联患者病床", "更新设备状态", "提交设备记录"],
  tag: ["确认标签层级", "设置启用状态", "补充适用说明", "发布标签"]
};

const detailCardTitles: Record<ActionScenario, string> = {
  knowledge: "摘要与适用范围",
  voice: "相似问题与回复配置",
  motion: "动作说明与注意事项",
  sequence: "动作清单与阶段说明",
  patient: "补充病情说明",
  plan: "方案说明与执行重点",
  prescription: "动作详情与执行备注",
  reportReview: "审核意见与医护评价",
  robot: "设备说明与异常备注",
  tag: "标签说明"
};

const previewCardTitles: Record<ActionScenario, string> = {
  knowledge: "知识文件预览",
  voice: "对话脚本预演",
  motion: "动作参数预览",
  sequence: "序列编排预览",
  patient: "档案摘要卡",
  plan: "方案拆解视图",
  prescription: "处方动作清单",
  reportReview: "审核摘要视图",
  robot: "设备运行卡片",
  tag: "标签层级预览"
};

function cleanDisplayValue(value?: string) {
  if (!value) {
    return "";
  }

  return value.replace(/^例如[:：]\s*/, "").trim();
}

function createInitialValues(fields: FormField[]) {
  return fields.reduce<Record<string, string>>((accumulator, field) => {
    accumulator[field.label] = field.value ?? "";
    return accumulator;
  }, {});
}

function splitTokens(value: string, pattern: RegExp = /[\n,，、;；]/) {
  return value
    .split(pattern)
    .map((item) => cleanDisplayValue(item))
    .filter(Boolean);
}

function splitSentences(value: string) {
  const primary = value
    .split(/[。！？\n]/)
    .map((item) => cleanDisplayValue(item))
    .filter(Boolean);

  if (primary.length > 1) {
    return primary;
  }

  return value
    .split(/[，；]/)
    .map((item) => cleanDisplayValue(item))
    .filter(Boolean);
}

function extractFirstNumber(value: string) {
  const matched = value.match(/-?\d+(\.\d+)?/);
  return matched ? Number(matched[0]) : undefined;
}

function inferActionScenario(title: string, fields: FormField[]): ActionScenario {
  const source = `${title} ${fields.map((field) => field.label).join(" ")}`;

  if (source.includes("评估报告") || fields.some((field) => field.label === "完成率")) {
    return "reportReview";
  }

  if (source.includes("标签")) {
    return "tag";
  }

  if (source.includes("语音")) {
    return "voice";
  }

  if (source.includes("动作处方")) {
    return "prescription";
  }

  if (source.includes("动作序列")) {
    return "sequence";
  }

  if (source.includes("标准动作")) {
    return "motion";
  }

  if (source.includes("机器人")) {
    return "robot";
  }

  if (source.includes("档案")) {
    return "patient";
  }

  if (source.includes("方案")) {
    return "plan";
  }

  return "knowledge";
}

function buildSelectOptions(field: FormField) {
  if (field.textarea) {
    return [];
  }

  if (field.label === "性别") {
    return ["男", "女"];
  }

  const presetMap: Record<string, string[]> = {
    文件格式: ["PDF", "TXT", "PNG", "MP4", "JSON", "ZIP"],
    状态: ["使用中", "未使用", "正常", "执行中", "预警", "离线", "待审核", "已完成", "已退回"]
  };

  if (presetMap[field.label]) {
    return presetMap[field.label];
  }

  const source = [field.value, field.placeholder].filter(Boolean).join("/");
  if (!source.includes("/")) {
    return [];
  }

  return Array.from(
    new Set(
      source
        .split(/[\/／]/)
        .map((item) => cleanDisplayValue(item))
        .filter(Boolean)
    )
  );
}

function statusLabelForTitle(title: string) {
  if (title.includes("审核")) {
    return "审核页";
  }

  if (title.includes("导出")) {
    return "导出页";
  }

  if (title.includes("修改")) {
    return "编辑页";
  }

  if (title.includes("新增")) {
    return "新增页";
  }

  if (title.includes("问答")) {
    return "问答页";
  }

  return "高保真页";
}

function SummaryMetric({ item }: { item: MetricItem }) {
  const Icon = item.icon;
  const tone = metricToneStyles[item.tone ?? "slate"];

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="space-y-1">
          <p className="stat-kicker">{item.label}</p>
          <p className="text-2xl font-semibold text-surface-900">{item.value}</p>
          <p className="text-xs leading-6 text-muted-foreground">{item.helper}</p>
        </div>
        <div className={cn("rounded-2xl p-3", tone)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressBar({ value, tone = "primary" }: { value: number; tone?: "primary" | "amber" | "emerald" }) {
  const width = Math.max(0, Math.min(100, value));
  const styles: Record<typeof tone, string> = {
    primary: "bg-primary",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500"
  };

  return (
    <div className="h-2.5 rounded-full bg-surface-100">
      <div className={cn("h-2.5 rounded-full transition-all", styles[tone])} style={{ width: `${width}%` }} />
    </div>
  );
}

function PathBadge({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-border/70 bg-surface-50 px-3 py-1 text-xs font-medium text-surface-700">
      {children}
    </span>
  );
}

function ActionPreviewPanel({
  scenario,
  values,
  fields
}: {
  scenario: ActionScenario;
  values: Record<string, string>;
  fields: FormField[];
}) {
  const readValue = (labels: string | string[]) => {
    const targets = Array.isArray(labels) ? labels : [labels];

    for (const label of targets) {
      const field = fields.find((item) => item.label === label);
      if (!field) {
        continue;
      }

      const liveValue = cleanDisplayValue(values[field.label]);
      if (liveValue) {
        return liveValue;
      }

      const staticValue = cleanDisplayValue(field.value);
      if (staticValue) {
        return staticValue;
      }

      const placeholderValue = cleanDisplayValue(field.placeholder);
      if (placeholderValue) {
        return placeholderValue;
      }
    }

    return "";
  };

  const tags = splitTokens(readValue("标签"));
  const descriptions = splitSentences(readValue(["说明", "方案备注", "备注", "报告备注"]));

  if (scenario === "knowledge") {
    return (
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="rounded-[1.5rem] border border-dashed border-primary/30 bg-primary/5 p-6">
          <UploadCloud className="h-8 w-8 text-primary" />
          <p className="mt-4 text-base font-semibold text-surface-900">知识文件上传区</p>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            这里对齐 Figma 中的素材上传卡片，用于承接 PDF、文本、图片等知识文件。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge>{readValue("文件格式") || "PDF"}</Badge>
            <Badge className="bg-white text-surface-700">版本 V1.0</Badge>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {tags.length ? tags.map((tag) => <PathBadge key={tag}>{tag}</PathBadge>) : <PathBadge>待补充标签</PathBadge>}
          </div>
          <div className="rounded-[1.5rem] border border-border/70 bg-surface-50 p-5">
            <p className="text-sm font-medium text-surface-900">摘要预览</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {readValue("说明") || "知识摘要将在这里展示，便于校验内容边界和适用阶段。"}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.25rem] border border-border/70 bg-white p-4">
              <p className="text-xs text-muted-foreground">知识分类</p>
              <p className="mt-2 font-semibold text-surface-900">{readValue("分类") || "指南"}</p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-white p-4">
              <p className="text-xs text-muted-foreground">文件格式</p>
              <p className="mt-2 font-semibold text-surface-900">{readValue("文件格式") || "PDF"}</p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-white p-4">
              <p className="text-xs text-muted-foreground">适用范围</p>
              <p className="mt-2 font-semibold text-surface-900">{readValue("标签") || "肩关节、术后早期"}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (scenario === "voice") {
    const similarQuestions = splitTokens(readValue("相似问题"), /[\n;；]/);
    const replies = splitTokens(readValue("回复内容"), /[\n;；]/);

    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-[1.5rem] border border-border/70 bg-surface-50 p-5">
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-[1.25rem] bg-primary px-4 py-3 text-sm text-white shadow-soft">
              {readValue("标准问题") || "训练完成后给出鼓励"}
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {(replies.length ? replies : ["今天表现很好，我们继续保持。", "动作完成得很稳定，继续加油。"]).map((reply) => (
              <div key={reply} className="max-w-[85%] rounded-[1.25rem] border border-border/70 bg-white px-4 py-3 text-sm text-surface-900">
                {reply}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-border/70 bg-white p-5">
            <p className="text-sm font-medium text-surface-900">相似问题召回</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(similarQuestions.length ? similarQuestions : ["训练做完了", "继续加油"]).map((item) => (
                <PathBadge key={item}>{item}</PathBadge>
              ))}
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-border/70 bg-white p-5">
            <p className="text-sm font-medium text-surface-900">语义标签</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(tags.length ? tags : ["激励", "肩关节"]).map((tag) => (
                <PathBadge key={tag}>{tag}</PathBadge>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (scenario === "motion") {
    const cues = splitSentences(readValue("说明"));

    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-[1.5rem] border border-border/70 bg-surface-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-surface-900">{readValue("动作标题") || "肩外展训练视频"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{readValue("分类") || "标准动作"}</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700">{readValue("适用部位") || "上肢"}</Badge>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.25rem] border border-border/70 bg-white p-4">
              <p className="text-xs text-muted-foreground">动作角度</p>
              <p className="mt-2 font-semibold text-surface-900">{readValue("角度") || "30-60 度"}</p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-white p-4">
              <p className="text-xs text-muted-foreground">动作方向</p>
              <p className="mt-2 font-semibold text-surface-900">{readValue("方向") || "外展"}</p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-white p-4">
              <p className="text-xs text-muted-foreground">持续时间</p>
              <p className="mt-2 font-semibold text-surface-900">{readValue("持续时间") || "6 分钟"}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {(cues.length ? cues : ["适用于肩袖损伤术后 1-3 周的基础肩外展训练。", "肩部离床位 30 度后短暂停留 2 秒。"]).map((cue, index) => (
              <div key={cue} className="flex gap-3 rounded-[1.25rem] border border-border/70 bg-white px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {index + 1}
                </div>
                <p className="text-sm leading-7 text-surface-900">{cue}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-dashed border-primary/30 bg-white p-5">
          <UploadCloud className="h-8 w-8 text-primary" />
          <p className="mt-4 text-base font-semibold text-surface-900">动作素材槽位</p>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            这里可接入视频上传、关键帧抽取和动作质量评分，与 Figma 中的视频位保持一致。
          </p>
        </div>
      </div>
    );
  }

  if (scenario === "sequence") {
    const steps = splitTokens(readValue("组成动作"), /[\n;；]/);
    const totalMinutes = extractFirstNumber(readValue("总时长")) ?? 18;

    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-[1.5rem] border border-border/70 bg-white p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>顺序</TableHead>
                <TableHead>动作</TableHead>
                <TableHead>建议时长</TableHead>
                <TableHead>阶段重点</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(steps.length ? steps : ["肩胛稳定激活", "被动摆动", "肩外展训练"]).map((step, index, items) => (
                <TableRow key={step}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{step}</TableCell>
                  <TableCell>{Math.max(3, Math.round(totalMinutes / items.length))} 分钟</TableCell>
                  <TableCell>{index === items.length - 1 ? "主训练段" : "准备段"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-border/70 bg-surface-50 p-5">
            <p className="text-sm font-medium text-surface-900">序列阶段</p>
            <p className="mt-2 text-xl font-semibold text-surface-900">{readValue("阶段") || "术后1周"}</p>
            <p className="mt-2 text-sm text-muted-foreground">总时长 {readValue("总时长") || "18 分钟"}</p>
          </div>
          <div className="rounded-[1.5rem] border border-border/70 bg-white p-5">
            <p className="text-sm font-medium text-surface-900">说明摘要</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {readValue("说明") || "包含肩胛稳定、肩外展和被动摆动的标准动作序列。"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (scenario === "patient") {
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-[1.5rem] border border-border/70 bg-white p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
              {(readValue("姓名") || "患者").slice(0, 1)}
            </div>
            <div>
              <p className="text-xl font-semibold text-surface-900">{readValue("姓名") || "患者姓名"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {readValue("性别") || "男"} · {readValue("年龄") || "30"} 岁 · {readValue("病种") || "肩袖损伤"}
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.25rem] border border-border/70 bg-surface-50 p-4">
              <p className="text-xs text-muted-foreground">康复阶段</p>
              <p className="mt-2 font-semibold text-surface-900">{readValue("阶段") || "术后1周"}</p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-surface-50 p-4">
              <p className="text-xs text-muted-foreground">关联设备</p>
              <p className="mt-2 font-semibold text-surface-900">{readValue("设备ID") || "RB-01"}</p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-surface-50 p-4">
              <p className="text-xs text-muted-foreground">病床号</p>
              <p className="mt-2 font-semibold text-surface-900">{readValue("病床号") || "12床"}</p>
            </div>
          </div>
          <div className="mt-5 rounded-[1.25rem] border border-border/70 bg-surface-50 p-4">
            <p className="text-sm font-medium text-surface-900">病情备注</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {readValue("备注") || "补充患者情况与注意事项，用于同步病区和康复团队。"}
            </p>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-border/70 bg-white p-5">
          <p className="text-sm font-medium text-surface-900">建档检查项</p>
          <div className="mt-4 space-y-3">
            {["基础身份信息", "病种与阶段", "病床设备绑定"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-[1rem] border border-border/70 bg-surface-50 px-4 py-3 text-sm text-surface-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (scenario === "plan") {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] border border-border/70 bg-white p-5">
          <p className="text-sm font-medium text-surface-900">阶段目标</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{readValue("目标") || "恢复外展 60 度"}</p>
        </div>
        <div className="rounded-[1.5rem] border border-border/70 bg-white p-5">
          <p className="text-sm font-medium text-surface-900">风险管理</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{readValue("风险") || "疼痛波动"}</p>
        </div>
        <div className="rounded-[1.5rem] border border-border/70 bg-white p-5">
          <p className="text-sm font-medium text-surface-900">执行备注</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {readValue("方案备注") || "补充方案执行要点和医护协同安排。"}
          </p>
        </div>
      </div>
    );
  }

  if (scenario === "prescription") {
    const movementRows = splitTokens(readValue("各动作详情"), /[\n;；]/).map((row, index) => {
      const [name, angle, repetitions, duration] = row.split(/[｜|]/).map((item) => cleanDisplayValue(item));
      return {
        id: `${index}-${row}`,
        name: name || `动作 ${index + 1}`,
        angle: angle || "-",
        repetitions: repetitions || "-",
        duration: duration || "-"
      };
    });

    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-[1.5rem] border border-border/70 bg-white p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>动作</TableHead>
                <TableHead>角度</TableHead>
                <TableHead>次数</TableHead>
                <TableHead>时长</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(movementRows.length
                ? movementRows
                : [
                    { id: "demo-1", name: "肩外展训练", angle: "30-60度", repetitions: "8次", duration: "06:00" },
                    { id: "demo-2", name: "被动摆动", angle: "小角度", repetitions: "12次", duration: "04:30" }
                  ]).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.angle}</TableCell>
                  <TableCell>{row.repetitions}</TableCell>
                  <TableCell>{row.duration}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-border/70 bg-surface-50 p-5">
            <p className="text-sm font-medium text-surface-900">处方频率</p>
            <p className="mt-2 text-xl font-semibold text-surface-900">{readValue("频率") || "3-5 次/周"}</p>
            <p className="mt-2 text-sm text-muted-foreground">动作序列：{readValue("动作序列") || "肩袖术后第1周序列"}</p>
          </div>
          <div className="rounded-[1.5rem] border border-border/70 bg-white p-5">
            <p className="text-sm font-medium text-surface-900">目标与风险</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{readValue("目标") || "恢复外展能力"}</p>
            <p className="mt-2 text-sm leading-7 text-amber-700">风险：{readValue("风险") || "疼痛风险"}</p>
          </div>
        </div>
      </div>
    );
  }

  if (scenario === "reportReview") {
    const completion = extractFirstNumber(readValue("完成率")) ?? 82;
    const painScore = Math.min(10, extractFirstNumber(readValue("疼痛评分")) ?? 3);
    const romDelta = extractFirstNumber(readValue("ROM变化")) ?? 18;

    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4 rounded-[1.5rem] border border-border/70 bg-white p-5">
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">训练完成率</span>
              <span className="font-semibold text-surface-900">{completion}%</span>
            </div>
            <div className="mt-3">
              <ProgressBar value={completion} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">ROM 变化</span>
              <span className="font-semibold text-emerald-700">+{romDelta}°</span>
            </div>
            <div className="mt-3">
              <ProgressBar value={Math.min(100, romDelta * 4)} tone="emerald" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">疼痛评分</span>
              <span className="font-semibold text-amber-700">{painScore}/10</span>
            </div>
            <div className="mt-3">
              <ProgressBar value={painScore * 10} tone="amber" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-border/70 bg-surface-50 p-5">
            <p className="text-sm font-medium text-surface-900">医生评价</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {readValue("医生评价") || "补充医生评价，用于确认下一阶段训练方向。"}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-border/70 bg-white p-5">
            <p className="text-sm font-medium text-surface-900">护士评价</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {readValue("护士评价") || "补充病区观察、依从性和训练时段反馈。"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (scenario === "robot") {
    const battery = Math.max(0, Math.min(100, extractFirstNumber(readValue("电量")) ?? 100));

    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-[1.5rem] border border-border/70 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-surface-900">{readValue("机器人ID") || "RB-08"}</p>
              <p className="mt-1 text-sm text-muted-foreground">关联患者：{readValue("关联患者") || "患者姓名"}</p>
            </div>
            <Badge className="bg-primary/10 text-primary">{readValue("状态") || "正常"}</Badge>
          </div>
          <div className="mt-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">设备电量</span>
              <span className="font-semibold text-surface-900">{battery}%</span>
            </div>
            <div className="mt-3">
              <ProgressBar value={battery} tone={battery < 30 ? "amber" : "emerald"} />
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-[1.25rem] border border-border/70 bg-surface-50 p-4">
              <p className="text-xs text-muted-foreground">病床号</p>
              <p className="mt-2 font-semibold text-surface-900">{readValue("病床号") || "12床"}</p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-surface-50 p-4">
              <p className="text-xs text-muted-foreground">训练状态</p>
              <p className="mt-2 font-semibold text-surface-900">{readValue("训练状态") || "待排班"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-border/70 bg-white p-5">
          <p className="text-sm font-medium text-surface-900">运行备注</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {readValue("备注") || "补充设备说明、异常记录和维护提醒。"}
          </p>
        </div>
      </div>
    );
  }

  if (scenario === "tag") {
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-[1.5rem] border border-border/70 bg-white p-5">
          <p className="text-sm font-medium text-surface-900">标签路径</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <PathBadge>{readValue("上级标签") || "父级标签"}</PathBadge>
            <ChevronRight className="h-4 w-4 text-surface-400" />
            <PathBadge>{readValue("标签名称") || "标签名称"}</PathBadge>
          </div>
          <div className="mt-5 rounded-[1.25rem] border border-border/70 bg-surface-50 p-4">
            <p className="text-sm font-medium text-surface-900">标签说明</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {readValue("说明") || "补充标签适用范围、命名口径和检索边界。"}
            </p>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-border/70 bg-white p-5">
          <p className="text-sm font-medium text-surface-900">发布状态</p>
          <div className="mt-4 flex items-center gap-3">
            <Badge className="bg-emerald-100 text-emerald-700">{readValue("状态") || "使用中"}</Badge>
            <span className="text-sm text-muted-foreground">发布后可被对应模块直接引用</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {(descriptions.length ? descriptions : ["当前页面内容将在这里生成预览，便于和 Figma 版式保持一致。"]).map((item) => (
        <div key={item} className="rounded-[1.5rem] border border-border/70 bg-white p-5 text-sm leading-7 text-muted-foreground">
          {item}
        </div>
      ))}
    </div>
  );
}

export function SubPageScaffold({
  eyebrow,
  title,
  description,
  status = "高保真页",
  actions,
  children
}: {
  eyebrow: string;
  title: string;
  description: string;
  status?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader eyebrow={eyebrow} title={title} description={description} badge={status} actions={actions} />
      <div className="flex min-h-0 flex-1 flex-col gap-4">{children}</div>
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
  fields: FormField[];
  tips?: string[];
  aiReference?: string;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => createInitialValues(fields));
  const scenario = useMemo(() => inferActionScenario(title, fields), [fields, title]);

  const readValue = (labels: string | string[]) => {
    const targets = Array.isArray(labels) ? labels : [labels];

    for (const label of targets) {
      const field = fields.find((item) => item.label === label);
      if (!field) {
        continue;
      }

      const liveValue = cleanDisplayValue(values[field.label]);
      if (liveValue) {
        return liveValue;
      }

      const staticValue = cleanDisplayValue(field.value);
      if (staticValue) {
        return staticValue;
      }

      const placeholderValue = cleanDisplayValue(field.placeholder);
      if (placeholderValue) {
        return placeholderValue;
      }
    }

    return "";
  };

  const metrics = useMemo<MetricItem[]>(() => {
    if (scenario === "voice") {
      return [
        {
          label: "标准问题",
          value: readValue("标准问题") || "未填写",
          helper: "当前语音脚本主入口",
          icon: MessageSquareQuote,
          tone: "primary"
        },
        {
          label: "相似问法",
          value: `${splitTokens(readValue("相似问题"), /[\n;；]/).length || 2} 条`,
          helper: "用于问法召回",
          icon: Sparkles,
          tone: "emerald"
        },
        {
          label: "回复数量",
          value: `${splitTokens(readValue("回复内容"), /[\n;；]/).length || 2} 条`,
          helper: "可轮播或随机回复",
          icon: Bot,
          tone: "amber"
        }
      ];
    }

    if (scenario === "motion") {
      return [
        {
          label: "适用部位",
          value: readValue("适用部位") || "上肢",
          helper: "动作归属维度",
          icon: Activity,
          tone: "primary"
        },
        {
          label: "动作角度",
          value: readValue("角度") || "30-60 度",
          helper: "建议和视频同步标注",
          icon: ListChecks,
          tone: "emerald"
        },
        {
          label: "持续时间",
          value: readValue("持续时间") || "6 分钟",
          helper: "可直接进入序列编排",
          icon: Workflow,
          tone: "amber"
        }
      ];
    }

    if (scenario === "sequence") {
      return [
        {
          label: "训练阶段",
          value: readValue("阶段") || "术后1周",
          helper: "序列适用范围",
          icon: Workflow,
          tone: "primary"
        },
        {
          label: "组成动作",
          value: `${splitTokens(readValue("组成动作"), /[\n;；]/).length || 3} 个`,
          helper: "按顺序下发到处方",
          icon: ListChecks,
          tone: "emerald"
        },
        {
          label: "总时长",
          value: readValue("总时长") || "18 分钟",
          helper: "建议和病区节奏匹配",
          icon: ClipboardCheck,
          tone: "amber"
        }
      ];
    }

    if (scenario === "patient") {
      return [
        {
          label: "患者阶段",
          value: readValue("阶段") || "术后1周",
          helper: "用于联动方案与处方",
          icon: ClipboardCheck,
          tone: "primary"
        },
        {
          label: "关联设备",
          value: readValue("设备ID") || "RB-01",
          helper: "同步机器人训练端",
          icon: Bot,
          tone: "emerald"
        },
        {
          label: "病床号",
          value: readValue("病床号") || "12床",
          helper: "病区定位字段",
          icon: FolderKanban,
          tone: "amber"
        }
      ];
    }

    if (scenario === "plan") {
      return [
        {
          label: "患者",
          value: readValue("患者") || "待选择",
          helper: "方案所属对象",
          icon: ClipboardCheck,
          tone: "primary"
        },
        {
          label: "方案阶段",
          value: readValue("阶段") || "术后1周",
          helper: "指导执行时段",
          icon: Workflow,
          tone: "emerald"
        },
        {
          label: "风险等级",
          value: readValue("风险") || "疼痛波动",
          helper: "用于护理提醒",
          icon: ShieldCheck,
          tone: "amber"
        }
      ];
    }

    if (scenario === "prescription") {
      return [
        {
          label: "动作序列",
          value: readValue("动作序列") || "肩袖术后第1周序列",
          helper: "处方主体内容",
          icon: Workflow,
          tone: "primary"
        },
        {
          label: "执行频率",
          value: readValue("频率") || "3-5 次/周",
          helper: "用于病区排班",
          icon: ClipboardCheck,
          tone: "emerald"
        },
        {
          label: "动作数量",
          value: `${splitTokens(readValue("各动作详情"), /[\n;；]/).length || 2} 个`,
          helper: "支持二次编辑",
          icon: ListChecks,
          tone: "amber"
        }
      ];
    }

    if (scenario === "reportReview") {
      return [
        {
          label: "完成率",
          value: readValue("完成率") || "82%",
          helper: "本次训练达成情况",
          icon: ClipboardCheck,
          tone: "primary"
        },
        {
          label: "ROM变化",
          value: readValue("ROM变化") || "+18°",
          helper: "关节活动度进展",
          icon: Activity,
          tone: "emerald"
        },
        {
          label: "疼痛评分",
          value: readValue("疼痛评分") || "3/10",
          helper: "风险评估核心指标",
          icon: ShieldCheck,
          tone: "amber"
        }
      ];
    }

    if (scenario === "robot") {
      return [
        {
          label: "设备状态",
          value: readValue("状态") || "正常",
          helper: "支持病区快速识别",
          icon: Bot,
          tone: "primary"
        },
        {
          label: "关联病床",
          value: readValue("病床号") || "12床",
          helper: "终端定位字段",
          icon: FolderKanban,
          tone: "emerald"
        },
        {
          label: "设备电量",
          value: `${extractFirstNumber(readValue("电量")) ?? 100}%`,
          helper: "用于告警判断",
          icon: ShieldCheck,
          tone: "amber"
        }
      ];
    }

    if (scenario === "tag") {
      return [
        {
          label: "上级标签",
          value: readValue("上级标签") || "待配置",
          helper: "决定检索层级",
          icon: FolderKanban,
          tone: "primary"
        },
        {
          label: "发布状态",
          value: readValue("状态") || "使用中",
          helper: "影响业务是否可见",
          icon: CheckCircle2,
          tone: "emerald"
        },
        {
          label: "标签模块",
          value: title.replace(/^新增|修改/g, "").replace(/标签/g, "") || "知识模块",
          helper: "对应页面导航入口",
          icon: Workflow,
          tone: "amber"
        }
      ];
    }

    return [
      {
        label: "知识分类",
        value: readValue("分类") || "指南",
        helper: "用于知识检索与导出",
        icon: FileText,
        tone: "primary"
      },
      {
        label: "文件格式",
        value: readValue("文件格式") || "PDF",
        helper: "素材类型标识",
        icon: FolderKanban,
        tone: "emerald"
      },
      {
        label: "标签数量",
        value: `${splitTokens(readValue("标签")).length || 2} 个`,
        helper: "影响问答引用范围",
        icon: Sparkles,
        tone: "amber"
      }
    ];
  }, [readValue, scenario]);

  const summaryItems = useMemo(
    () =>
      ({
        knowledge: [
          { label: "页面模式", value: statusLabelForTitle(title) },
          { label: "知识标题", value: readValue("标题") || "待填写" },
          { label: "适用标签", value: readValue("标签") || "肩关节、术后早期" },
          { label: "更新时间", value: formatDateTime(new Date().toISOString()) }
        ],
        voice: [
          { label: "页面模式", value: statusLabelForTitle(title) },
          { label: "标准问题", value: readValue("标准问题") || "待填写" },
          { label: "语义分类", value: readValue("分类") || "正向激励" },
          { label: "标签", value: readValue("标签") || "激励、肩关节" }
        ],
        motion: [
          { label: "页面模式", value: statusLabelForTitle(title) },
          { label: "动作标题", value: readValue("动作标题") || "待填写" },
          { label: "动作角度", value: readValue("角度") || "30-60 度" },
          { label: "动作方向", value: readValue("方向") || "外展" }
        ],
        sequence: [
          { label: "页面模式", value: statusLabelForTitle(title) },
          { label: "序列标题", value: readValue("序列标题") || "待填写" },
          { label: "训练阶段", value: readValue("阶段") || "术后1周" },
          { label: "总时长", value: readValue("总时长") || "18 分钟" }
        ],
        patient: [
          { label: "页面模式", value: statusLabelForTitle(title) },
          { label: "患者姓名", value: readValue("姓名") || "待填写" },
          { label: "病种", value: readValue("病种") || "肩袖损伤" },
          { label: "设备ID", value: readValue("设备ID") || "RB-01" }
        ],
        plan: [
          { label: "页面模式", value: statusLabelForTitle(title) },
          { label: "患者", value: readValue("患者") || "待选择" },
          { label: "方案类型", value: readValue("方案类型") || "基础功能恢复" },
          { label: "设备ID", value: readValue("设备ID") || "RB-01" }
        ],
        prescription: [
          { label: "页面模式", value: statusLabelForTitle(title) },
          { label: "患者", value: readValue("患者") || "待选择" },
          { label: "训练阶段", value: readValue("阶段") || "术后1周" },
          { label: "频率", value: readValue("频率") || "3-5 次/周" }
        ],
        reportReview: [
          { label: "页面模式", value: statusLabelForTitle(title) },
          { label: "患者", value: readValue("患者") || "王丽" },
          { label: "完成率", value: readValue("完成率") || "82%" },
          { label: "审核时间", value: formatDateTime(new Date().toISOString()) }
        ],
        robot: [
          { label: "页面模式", value: statusLabelForTitle(title) },
          { label: "机器人ID", value: readValue("机器人ID") || "RB-08" },
          { label: "状态", value: readValue("状态") || "正常" },
          { label: "关联患者", value: readValue("关联患者") || "待选择" }
        ],
        tag: [
          { label: "页面模式", value: statusLabelForTitle(title) },
          { label: "标签名称", value: readValue("标签名称") || "待填写" },
          { label: "上级标签", value: readValue("上级标签") || "待配置" },
          { label: "状态", value: readValue("状态") || "使用中" }
        ]
      })[scenario],
    [readValue, scenario, title]
  );

  const guidanceItems = aiReference ? [aiReference, ...(tips ?? defaultActionNotes[scenario])] : tips ?? defaultActionNotes[scenario];
  const baseFields = fields.filter((field) => !field.textarea);
  const textFields = fields.filter((field) => field.textarea);

  return (
    <SubPageScaffold eyebrow={eyebrow} title={title} description={description} status={statusLabelForTitle(title)}>
      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <SummaryMetric key={metric.label} item={metric} />
        ))}
      </div>

      <CollapsibleSplitLayout
        label="摘要"
        sideWidthClassName="w-full xl:w-[360px]"
        main={
          <div className="space-y-4">
          <SectionCard title="核心配置" description="对齐 Figma 子页结构，左侧主表单承载核心录入字段。">
            <div className="grid gap-4 md:grid-cols-2">
              {baseFields.map((field) => {
                const selectOptions = buildSelectOptions(field);

                return (
                  <Field key={field.label} label={field.label} required={field.required}>
                    {selectOptions.length ? (
                      <select
                        className="native-select"
                        value={values[field.label]}
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            [field.label]: event.target.value
                          }))
                        }
                      >
                        <option value="">{field.placeholder ? `请选择${field.label}` : "请选择"}</option>
                        {selectOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        value={values[field.label] ?? ""}
                        placeholder={field.placeholder}
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            [field.label]: event.target.value
                          }))
                        }
                      />
                    )}
                  </Field>
                );
              })}
            </div>
          </SectionCard>

          {textFields.length ? (
            <SectionCard title={detailCardTitles[scenario]} description="较长内容单独成区，贴近原始设计稿中的信息块结构。">
              <div className="space-y-4">
                {textFields.map((field) => (
                  <Field key={field.label} label={field.label} required={field.required}>
                    <Textarea
                      value={values[field.label] ?? ""}
                      placeholder={field.placeholder}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [field.label]: event.target.value
                        }))
                      }
                    />
                  </Field>
                ))}
              </div>
            </SectionCard>
          ) : null}

          <SectionCard title={previewCardTitles[scenario]} description="这里补成更接近 Figma 的具体内容区，不再只是通用原型壳页。">
            <ActionPreviewPanel scenario={scenario} values={values} fields={fields} />
          </SectionCard>

          <Card className="border-primary/15 bg-primary/5">
            <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium text-primary">页面内提交仍保持原型交互</p>
                <p className="mt-1 text-sm text-primary/80">
                  当前版本重点展示页面结构、信息层级和表单流转，不连接真实生产接口。
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button>{submitLabel}</Button>
                <Button variant="secondary">草稿保存</Button>
                <Button variant="outline">清空当前内容</Button>
              </div>
            </CardContent>
          </Card>
          </div>
        }
        side={
          <div className="space-y-4">
          <DetailPanel title="页面摘要">
            <PropertyList items={summaryItems} />
          </DetailPanel>

          <SectionCard title="执行流程" description="对齐设计稿右侧说明栏的流程提示区。">
            <div className="space-y-3">
              {workflowMap[scenario].map((step, index) => (
                <div key={step} className="flex gap-3 rounded-[1.25rem] border border-border/70 bg-surface-50 px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-primary shadow-soft">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-surface-900">{step}</p>
                    <p className="mt-1 text-xs leading-6 text-muted-foreground">
                      {index < workflowMap[scenario].length - 1 ? "当前页完成后进入下一节点" : "完成后可回到列表页查看结果"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title={aiReference ? "AI 与校验提示" : "录入提示"}>
            <div className="space-y-3">
              {guidanceItems.map((item) => (
                <div key={item} className="rounded-[1.25rem] border border-border/70 bg-white px-4 py-3 text-sm leading-7 text-muted-foreground">
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>
          </div>
        }
      />
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
  const [values, setValues] = useState<Record<string, string>>(
    () =>
      options.reduce<Record<string, string>>((accumulator, option) => {
        accumulator[option.label] = option.value;
        return accumulator;
      }, {})
  );
  const [exportMessage, setExportMessage] = useState("");

  const fileFormat =
    values[options.find((option) => option.label.includes("格式"))?.label ?? ""] || "ZIP";
  const scope =
    values[options.find((option) => option.label.includes("范围"))?.label ?? ""] ||
    values[options.find((option) => option.label.includes("筛选"))?.label ?? ""] ||
    "当前筛选结果";
  const outputName = `${title.replace(/\s+/g, "").replace(/导出/g, "")}-${new Date()
    .toISOString()
    .slice(0, 10)}.${fileFormat.toLowerCase().replace(/\s+/g, "")}`;

  return (
    <SubPageScaffold eyebrow={eyebrow} title={title} description={description} status="导出页">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryMetric
          item={{
            label: "导出范围",
            value: scope,
            helper: "决定本次任务覆盖对象",
            icon: FolderKanban,
            tone: "primary"
          }}
        />
        <SummaryMetric
          item={{
            label: "导出格式",
            value: fileFormat,
            helper: "文件交付格式",
            icon: FileOutput,
            tone: "emerald"
          }}
        />
        <SummaryMetric
          item={{
            label: "配置项",
            value: `${options.length} 项`,
            helper: "当前页已补齐为导出工作台结构",
            icon: ClipboardCheck,
            tone: "amber"
          }}
        />
      </div>

      {exportMessage ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-sm text-primary">{exportMessage}</CardContent>
        </Card>
      ) : null}

      <CollapsibleSplitLayout
        label="摘要"
        sideWidthClassName="w-full xl:w-[360px]"
        main={
          <div className="space-y-4">
          <SectionCard title="导出配置" description="左侧主区承接范围、格式和内容项设置。">
            <div className="grid gap-4 md:grid-cols-2">
              {options.map((option) => (
                <Field key={option.label} label={option.label}>
                  <Input
                    value={values[option.label] ?? ""}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [option.label]: event.target.value
                      }))
                    }
                  />
                </Field>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={() =>
                  setExportMessage(`已生成 ${outputName}，导出时间 ${formatDateTime(new Date().toISOString())}`)
                }
              >
                <FileOutput className="h-4 w-4" />
                生成导出文件
              </Button>
              <Button variant="outline" onClick={() => setValues(Object.fromEntries(options.map((option) => [option.label, option.value])))}>
                重置条件
              </Button>
            </div>
          </SectionCard>

          <SectionCard title="导出内容预览" description="模拟 Figma 中的结果清单区，用于快速确认导出内容。">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>序号</TableHead>
                  <TableHead>配置项</TableHead>
                  <TableHead>当前值</TableHead>
                  <TableHead>影响结果</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {options.map((option, index) => (
                  <TableRow key={option.label}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{option.label}</TableCell>
                    <TableCell>{values[option.label]}</TableCell>
                    <TableCell>{option.label.includes("格式") ? "决定生成文件后缀" : "参与导出筛选与归档"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>

          <SectionCard title="交付清单" description="右下角常见的交付说明块在这里具体化展示。">
            <div className="grid gap-3 md:grid-cols-3">
              {["结构化数据", "业务说明", "标签关系"].map((item) => (
                <div key={item} className="rounded-[1.25rem] border border-border/70 bg-white p-4">
                  <p className="text-sm font-medium text-surface-900">{item}</p>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">会根据当前筛选条件一并打包输出。</p>
                </div>
              ))}
            </div>
          </SectionCard>
          </div>
        }
        side={
          <div className="space-y-4">
          <DetailPanel title="任务摘要">
            <PropertyList
              items={[
                { label: "任务名称", value: title },
                { label: "输出文件", value: outputName },
                { label: "导出范围", value: scope },
                { label: "生成日期", value: formatDate(new Date().toISOString()) }
              ]}
            />
          </DetailPanel>

          <SectionCard title="最近任务">
            <div className="space-y-3">
              {[
                { name: "当前任务", value: outputName, status: "待生成" },
                { name: "上次导出", value: `${title}-2026-06-05.zip`, status: "已完成" },
                { name: "共享建议", value: "导出后可直接发给病区或算法团队", status: "提示" }
              ].map((item) => (
                <div key={item.name} className="rounded-[1.25rem] border border-border/70 bg-surface-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-surface-900">{item.name}</p>
                    <Badge>{item.status}</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="导出说明">
            <p className="text-sm leading-7 text-muted-foreground">{exportHint}</p>
          </SectionCard>
          </div>
        }
      />
    </SubPageScaffold>
  );
}

export function QaPage({
  eyebrow,
  title,
  description,
  prompts,
  answer,
  qaPairs
}: {
  eyebrow: string;
  title: string;
  description: string;
  prompts: string[];
  answer: string;
  qaPairs?: Array<{ question: string; answer: string }>;
}) {
  const [question, setQuestion] = useState(qaPairs?.[0]?.question ?? prompts[0] ?? "");
  const activePair =
    qaPairs?.find((item) => item.question === question) ??
    qaPairs?.[0] ??
    null;
  const displayAnswer = activePair?.answer ?? answer;
  const answerSegments = splitSentences(displayAnswer);

  return (
    <SubPageScaffold eyebrow={eyebrow} title={title} description={description} status="问答页">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryMetric
          item={{
            label: "推荐问题",
            value: `${prompts.length} 条`,
            helper: "来自当前知识库的高频问法",
            icon: Sparkles,
            tone: "primary"
          }}
        />
        <SummaryMetric
          item={{
            label: "答复模式",
            value: "知识摘要",
            helper: "展示核心结论与风险提醒",
            icon: Bot,
            tone: "emerald"
          }}
        />
        <SummaryMetric
          item={{
            label: "引用范围",
            value: "康复知识库",
            helper: "后续可扩展到多库联合问答",
            icon: FolderKanban,
            tone: "amber"
          }}
        />
      </div>

      <CollapsibleSplitLayout
        label="问答"
        sideWidthClassName="w-full xl:w-[360px]"
        main={
          <div className="space-y-4">
          <SectionCard title="知识问答输入台" description="主输入区补成更接近 Figma 的问答工作台。">
            <Field label="输入问题" required>
              <Textarea value={question} onChange={(event) => setQuestion(event.target.value)} />
            </Field>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button>
                <Sparkles className="h-4 w-4" />
                开始问答
              </Button>
              <Button variant="outline" onClick={() => setQuestion("")}>
                清空问题
              </Button>
            </div>
          </SectionCard>

          <SectionCard title="回答结构" description="把原来单段答案补成更具体的结论区、提醒区和建议区。">
            <div className="grid gap-4 md:grid-cols-3">
              {(answerSegments.length ? answerSegments : [displayAnswer]).slice(0, 3).map((segment, index) => (
                <div key={`${segment}-${index}`} className="rounded-[1.5rem] border border-border/70 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-surface-500">
                    {index === 0 ? "核心结论" : index === 1 ? "风险提醒" : "执行建议"}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-surface-900">{segment}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="答案摘要">
            <div className="rounded-[1.5rem] border border-border/70 bg-surface-50 p-5">
              <p className="text-sm leading-7 text-muted-foreground">{displayAnswer}</p>
            </div>
          </SectionCard>
          </div>
        }
        side={
          <div className="space-y-4">
          <DetailPanel title="推荐问题">
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
          </DetailPanel>

          <SectionCard title="引用知识片段">
            <div className="space-y-3">
              {(qaPairs?.length ? qaPairs : prompts.map((prompt) => ({ question: prompt, answer }))).slice(0, 3).map((item) => (
                <div key={item.question} className="rounded-[1.25rem] border border-border/70 bg-surface-50 px-4 py-3">
                  <p className="text-sm font-medium text-surface-900">{item.question}</p>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">{item.answer}</p>
                </div>
              ))}
            </div>
          </SectionCard>
          </div>
        }
      />
    </SubPageScaffold>
  );
}

export function TagManagementPage({
  eyebrow,
  title,
  description,
  tags,
  library
}: {
  eyebrow: string;
  title: string;
  description: string;
  tags: TagItem[];
  library: KnowledgeLibrary;
}) {
  const { data: items = [] } = useKnowledgeQuery(library);
  const createMutation = useCreateKnowledgeTagMutation(library);
  const updateMutation = useUpdateKnowledgeTagMutation(library);
  const deleteMutation = useDeleteKnowledgeTagMutation(library);

  const [query, setQuery] = useState("");
  const [parentFilter, setParentFilter] = useState("全部");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [dateFilter, setDateFilter] = useState("全部");
  const [selectedId, setSelectedId] = useState<string | null>(tags[0]?.id ?? null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [deletingTag, setDeletingTag] = useState<TagItem | null>(null);
  const [formError, setFormError] = useState("");
  const [tagForm, setTagForm] = useState({
    name: "",
    parent: "",
    enabled: true,
    description: ""
  });
  const resolveTagStatus = (tag: Pick<TagItem, "relatedCount" | "status">): TagItem["status"] =>
    tag.relatedCount > 0 ? "使用中" : "未使用";

  useEffect(() => {
    if (!tags.length) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !tags.some((item) => item.id === selectedId)) {
      setSelectedId(tags[0]?.id ?? null);
    }
  }, [selectedId, tags]);

  const parentOptions = useMemo(
    () => Array.from(new Set(tags.map((tag) => tag.parent).filter(Boolean))),
    [tags]
  );

  const filtered = useMemo(() => {
    const now = Date.now();
    return tags.filter((tag) => {
      const keywordMatch =
        !query ||
        [tag.name, tag.parent, tag.description, tag.operator]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase());
      const parentMatch = parentFilter === "全部" || tag.parent === parentFilter;
      const statusMatch =
        statusFilter === "全部" || resolveTagStatus(tag) === statusFilter;

      let dateMatch = true;
      if (dateFilter !== "全部") {
        const updatedTime = new Date(tag.updatedAt).getTime();
        const diff = now - updatedTime;
        const oneDay = 24 * 60 * 60 * 1000;
        if (dateFilter === "近7天") {
          dateMatch = diff <= oneDay * 7;
        } else if (dateFilter === "近30天") {
          dateMatch = diff <= oneDay * 30;
        } else if (dateFilter === "近90天") {
          dateMatch = diff <= oneDay * 90;
        }
      }

      return keywordMatch && parentMatch && statusMatch && dateMatch;
    });
  }, [dateFilter, parentFilter, query, statusFilter, tags]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const relatedItems = useMemo(() => {
    if (!selected) {
      return [];
    }

    return items.filter((item) => item.tags.includes(selected.name)).slice(0, 10);
  }, [items, selected]);

  const resetFilters = () => {
    setQuery("");
    setParentFilter("全部");
    setStatusFilter("全部");
    setDateFilter("全部");
  };

  const resetTagForm = () => {
    setTagForm({
      name: "",
      parent: parentOptions[0] ?? "",
      enabled: true,
      description: ""
    });
    setFormError("");
  };

  const openCreateDialog = () => {
    setEditingTag(null);
    resetTagForm();
    setCreateOpen(true);
  };

  const openEditDialog = (tag: TagItem) => {
    setEditingTag(tag);
    setTagForm({
      name: tag.name,
      parent: tag.parent,
      enabled: tag.enabled ?? tag.status === "使用中",
      description: tag.description
    });
    setFormError("");
  };

  const closeDialogs = () => {
    setCreateOpen(false);
    setEditingTag(null);
    setDeletingTag(null);
    setFormError("");
  };

  const handleSubmitTag = async () => {
    if (!tagForm.name.trim() || !tagForm.parent.trim()) {
      setFormError("请补全标签名称和上级标签。");
      return;
    }

    const payload = {
      name: tagForm.name.trim(),
      parent: tagForm.parent.trim(),
      description: tagForm.description.trim(),
      enabled: tagForm.enabled,
      operator: "当前用户",
      status: resolveTagStatus({
        relatedCount: editingTag?.relatedCount ?? 0,
        status: editingTag?.status ?? "未使用"
      }) as TagItem["status"],
      relatedCount: editingTag?.relatedCount ?? 0,
      createdAt: editingTag?.createdAt ?? new Date().toISOString()
    };

    if (editingTag) {
      await updateMutation.mutateAsync({
        id: editingTag.id,
        patch: payload
      });
    } else {
      await createMutation.mutateAsync(payload);
    }

    closeDialogs();
  };

  const handleDeleteTag = async () => {
    if (!deletingTag) {
      return;
    }

    await deleteMutation.mutateAsync(deletingTag.id);

    if (selectedId === deletingTag.id) {
      const fallback = tags.find((item) => item.id !== deletingTag.id);
      setSelectedId(fallback?.id ?? null);
    }

    setDeletingTag(null);
  };

  return (
    <SubPageScaffold
      eyebrow={eyebrow}
      title={title}
      description={description}
      status="管理页"
      actions={
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          新建标签
        </Button>
      }
    >
      <FilterBar
        actions={
          <>
            <Button variant="secondary" onClick={resetFilters}>
              重置
            </Button>
            <Button>查询</Button>
          </>
        }
      >
        <Field label="标签检索">
          <Input
            value={query}
            placeholder="搜索标签名称、说明、操作人"
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>
        <Field label="上级标签">
          <select
            className="native-select"
            value={parentFilter}
            onChange={(event) => setParentFilter(event.target.value)}
          >
            <option value="全部">全部</option>
            {parentOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
        <Field label="状态">
          <select
            className="native-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="全部">全部</option>
            <option value="使用中">使用中</option>
            <option value="未使用">未使用</option>
          </select>
        </Field>
        <Field label="更新时间">
          <select
            className="native-select"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
          >
            <option value="全部">全部</option>
            <option value="近7天">近7天</option>
            <option value="近30天">近30天</option>
            <option value="近90天">近90天</option>
          </select>
        </Field>
      </FilterBar>

      <CollapsibleSplitLayout
        label="标签"
        sideWidthClassName="w-full xl:w-[360px]"
        main={
          <Card className="flex min-h-0 flex-col overflow-hidden">
            <CardHeader className="border-b border-border/60">
              <CardTitle>标签列表</CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              {filtered.length ? (
                <Table className="min-w-full">
                  <TableHeader className="sticky top-0 z-10 bg-white">
                    <TableRow>
                      <TableHead className="min-w-[140px]">标签名称</TableHead>
                      <TableHead className="min-w-[220px]">标签说明</TableHead>
                      <TableHead className="min-w-[120px]">上级标签</TableHead>
                      <TableHead className="min-w-[100px]">标签状态</TableHead>
                      <TableHead className="min-w-[110px]">最近操作人</TableHead>
                      <TableHead className="min-w-[150px]">更新时间</TableHead>
                      <TableHead className="min-w-[140px]">操作</TableHead>
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
                        <TableCell className="max-w-[280px] text-muted-foreground">
                          <p className="line-clamp-2">{tag.description || "暂无说明"}</p>
                        </TableCell>
                        <TableCell>{tag.parent}</TableCell>
                        <TableCell>
                          <Badge>{resolveTagStatus(tag)}</Badge>
                        </TableCell>
                        <TableCell>{tag.operator}</TableCell>
                        <TableCell>{formatDateTime(tag.updatedAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditDialog(tag);
                              }}
                            >
                              <SquarePen className="h-4 w-4" />
                              编辑
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-rose-600 hover:text-rose-700"
                              onClick={(event) => {
                                event.stopPropagation();
                                setDeletingTag(tag);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              删除
                            </Button>
                          </div>
                        </TableCell>
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
        }
        side={
          <DetailPanel title="标签详情" className="h-full">
            {selected ? (
              <>
                <PropertyList
                  items={[
                    { label: "标签名称", value: selected.name },
                    { label: "上级标签", value: selected.parent },
                    { label: "标签状态", value: resolveTagStatus(selected) },
                    { label: "创建时间", value: selected.createdAt ? formatDateTime(selected.createdAt) : "暂无记录" },
                    { label: "最近操作人", value: selected.operator },
                    { label: "更新时间", value: formatDateTime(selected.updatedAt) }
                  ]}
                />
                <SectionCard title="标签说明">
                  <p className="text-sm leading-7 text-muted-foreground">
                    {selected.description || "暂无标签说明。"}
                  </p>
                </SectionCard>
                <SectionCard title="标签关系">
                  <div className="flex flex-wrap items-center gap-2">
                    <PathBadge>{selected.parent}</PathBadge>
                    <ChevronRight className="h-4 w-4 text-surface-400" />
                    <PathBadge>{selected.name}</PathBadge>
                  </div>
                </SectionCard>
                <SectionCard title="关联文件（最近10条）">
                  <div className="space-y-3">
                    {relatedItems.length ? (
                      relatedItems.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-[1rem] border border-border/70 bg-surface-50 px-4 py-3"
                        >
                          <p className="text-sm font-medium text-surface-900">{item.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.category} · {formatDate(item.updatedAt)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1rem] border border-dashed border-border/70 bg-surface-50 px-4 py-5 text-sm text-muted-foreground">
                        当前标签暂无关联文件。
                      </div>
                    )}
                  </div>
                </SectionCard>
              </>
            ) : (
              <EmptyState title="请选择一个标签" />
            )}
          </DetailPanel>
        }
      />

      <DialogFormShell
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            resetTagForm();
          }
        }}
        title={`新建${title}`}
        description="填写标签名称、上级标签、启用状态和说明，提交后会回流到当前标签列表。"
        onSubmit={handleSubmitTag}
        submitLabel="提交"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="标签名称">
            <Input
              value={tagForm.name}
              placeholder="请输入标签名称"
              onChange={(event) => setTagForm((current) => ({ ...current, name: event.target.value }))}
            />
          </Field>
          <Field label="上级标签">
            <select
              className="native-select"
              value={tagForm.parent}
              onChange={(event) => setTagForm((current) => ({ ...current, parent: event.target.value }))}
            >
              {parentOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="启用状态">
            <select
              className="native-select"
              value={tagForm.enabled ? "启用" : "停用"}
              onChange={(event) =>
                setTagForm((current) => ({ ...current, enabled: event.target.value === "启用" }))
              }
            >
              <option value="启用">启用</option>
              <option value="停用">停用</option>
            </select>
          </Field>
          <Field label="最近操作人">
            <Input value="当前用户" disabled />
          </Field>
          <div className="md:col-span-2">
            <Field label="标签说明">
              <Textarea
                value={tagForm.description}
                placeholder="补充标签适用范围和说明"
                onChange={(event) =>
                  setTagForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </Field>
          </div>
        </div>
        {formError ? (
          <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {formError}
          </div>
        ) : null}
      </DialogFormShell>

      <DialogFormShell
        open={Boolean(editingTag)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTag(null);
            resetTagForm();
          }
        }}
        title={`编辑${title}`}
        description="支持调整标签名称、上级标签、启用状态和说明，并记录最近操作时间。"
        onSubmit={handleSubmitTag}
        submitLabel="保存"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="标签名称">
            <Input
              value={tagForm.name}
              placeholder="请输入标签名称"
              onChange={(event) => setTagForm((current) => ({ ...current, name: event.target.value }))}
            />
          </Field>
          <Field label="上级标签">
            <select
              className="native-select"
              value={tagForm.parent}
              onChange={(event) => setTagForm((current) => ({ ...current, parent: event.target.value }))}
            >
              {parentOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="启用状态">
            <select
              className="native-select"
              value={tagForm.enabled ? "启用" : "停用"}
              onChange={(event) =>
                setTagForm((current) => ({ ...current, enabled: event.target.value === "启用" }))
              }
            >
              <option value="启用">启用</option>
              <option value="停用">停用</option>
            </select>
          </Field>
          <Field label="更新时间">
            <Input value={editingTag ? formatDateTime(editingTag.updatedAt) : ""} disabled />
          </Field>
          <div className="md:col-span-2">
            <Field label="标签说明">
              <Textarea
                value={tagForm.description}
                placeholder="补充标签适用范围和说明"
                onChange={(event) =>
                  setTagForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </Field>
          </div>
        </div>
        {formError ? (
          <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {formError}
          </div>
        ) : null}
      </DialogFormShell>

      <DialogFormShell
        open={Boolean(deletingTag)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingTag(null);
          }
        }}
        title="删除标签"
        description={`确认删除“${deletingTag?.name ?? ""}”后，将从当前标签库中移除。`}
        onSubmit={handleDeleteTag}
        submitLabel="确认删除"
      >
        <div className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
          删除前请确认该标签的业务关系已处理完成。当前原型会直接更新列表与详情区域。
        </div>
      </DialogFormShell>
    </SubPageScaffold>
  );
}
