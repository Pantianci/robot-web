import { createFileRoute } from "@tanstack/react-router";
import { ActionFormPage } from "@/components/page-shells";

export const Route = createFileRoute("/knowledge/motion/create")({
  component: CreateMotionPage
});

function CreateMotionPage() {
  return (
    <ActionFormPage
      eyebrow="多模态知识库 > 标准动作库 > 新增标准动作视频"
      title="新增标准动作视频"
      description="用于上传标准动作视频并录入动作名称、角度、方向、适应症等信息。"
      fields={[
        { label: "动作标题", required: true, placeholder: "例如：肩外展训练视频" },
        { label: "分类", required: true, placeholder: "标准动作" },
        { label: "标签", required: true, placeholder: "肩关节、术后早期" },
        { label: "适用部位", placeholder: "上肢" },
        { label: "角度", placeholder: "30-60 度" },
        { label: "方向", placeholder: "外展" },
        { label: "持续时间", placeholder: "6 分钟" },
        { label: "说明", textarea: true, placeholder: "补充动作适应症和注意事项" }
      ]}
      aiReference="后续可在此接入 AI 动作分解和关键点分析。"
    />
  );
}
