import { createFileRoute } from "@tanstack/react-router";
import { ActionFormPage } from "@/components/page-shells";

export const Route = createFileRoute("/knowledge/sequence/create")({
  component: CreateSequencePage
});

function CreateSequencePage() {
  return (
    <ActionFormPage
      eyebrow="多模态知识库 > 动作序列库 > 新增动作序列"
      title="新增动作序列"
      description="用于选择标准动作并编排成动作序列，配置阶段、目标和标签。"
      fields={[
        { label: "序列标题", required: true, placeholder: "例如：肩袖术后第 1 周序列" },
        { label: "分类", required: true, placeholder: "动作序列" },
        { label: "标签", required: true, placeholder: "术后1周、肩关节" },
        { label: "阶段", placeholder: "术后1周" },
        { label: "总时长", placeholder: "18 分钟" },
        { label: "组成动作", textarea: true, placeholder: "每行一个标准动作" },
        { label: "说明", textarea: true, placeholder: "补充阶段目标和注意事项" }
      ]}
      aiReference="后续可接入 AI 推荐动作序列、训练节奏和阶段化建议。"
    />
  );
}
