import { PlayCircle } from "lucide-react";
import type { KnowledgeLibrary } from "@/lib/types";
import { PropertyList } from "@/components/property-list";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

type KnowledgeVideoPreviewLibrary = Extract<KnowledgeLibrary, "motion" | "sequence">;

export type KnowledgeVideoPreviewDraft = {
  title?: string;
  actionName?: string;
  part?: string;
  angle?: string;
  direction?: string;
  durationMinutes?: number | string;
  stage?: string;
  goal?: string;
  sequenceSteps?: string[];
};

function formatDuration(value: KnowledgeVideoPreviewDraft["durationMinutes"]) {
  if (!value) {
    return "-";
  }

  const text = String(value).trim();

  if (!text) {
    return "-";
  }

  return text.includes("分钟") ? text : `${text} 分钟`;
}

export function KnowledgeVideoPreviewDialog({
  open,
  onOpenChange,
  library,
  draft
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  library: KnowledgeVideoPreviewLibrary;
  draft: KnowledgeVideoPreviewDraft;
}) {
  const previewTitle =
    library === "motion"
      ? draft.actionName || draft.title || "标准动作视频预览"
      : draft.title || "动作序列视频预览";
  const previewDescription =
    library === "motion"
      ? "预览标准动作视频，便于编辑时快速核对动作信息。"
      : "预览动作序列播放窗口，便于编辑时核对顺序和节奏。";
  const sequenceSteps = draft.sequenceSteps?.filter(Boolean) ?? [];

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

          <div className="space-y-3">
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
                        { label: "持续时间", value: formatDuration(draft.durationMinutes) }
                      ]
                    : [
                        { label: "序列名称", value: draft.title || "-" },
                        { label: "阶段", value: draft.stage || "-" },
                        { label: "总时长", value: formatDuration(draft.durationMinutes) },
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
                  用于在编辑页核对标准动作视频的标题、参数和说明信息。
                </p>
              </SectionCard>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
