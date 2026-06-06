import { createFileRoute } from "@tanstack/react-router";
import { ActionFormPage } from "@/components/page-shells";

export const Route = createFileRoute("/knowledge/sequence/edit")({
  component: EditSequencePage
});

function EditSequencePage() {
  return (
    <ActionFormPage
      eyebrow="多模态知识库 > 动作序列库 > 修改动作序列"
      title="修改动作序列"
      description="用于更新动作序列中的组成动作、阶段、目标和标签。"
      fields={[
        { label: "序列标题", required: true, value: "肩袖术后第 1 周序列" },
        { label: "分类", required: true, value: "动作序列" },
        { label: "标签", required: true, value: "术后1周、肩关节" },
        { label: "阶段", value: "术后1周" },
        { label: "总时长", value: "18 分钟" },
        { label: "组成动作", textarea: true, value: "肩胛稳定激活\n被动摆动\n肩外展训练" },
        {
          label: "说明",
          textarea: true,
          value: "包含肩胛稳定、肩外展和被动摆动的标准动作序列。"
        }
      ]}
      submitLabel="更新动作序列"
    />
  );
}
