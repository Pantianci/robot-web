import { createFileRoute } from "@tanstack/react-router";
import { ActionFormPage } from "@/components/page-shells";

export const Route = createFileRoute("/knowledge/motion/edit")({
  component: EditMotionPage
});

function EditMotionPage() {
  return (
    <ActionFormPage
      eyebrow="多模态知识库 > 标准动作库 > 修改标准动作视频"
      title="修改标准动作视频"
      description="用于更新标准动作视频的动作参数、适应症和标签信息。"
      fields={[
        { label: "动作标题", required: true, value: "肩外展训练视频" },
        { label: "分类", required: true, value: "标准动作" },
        { label: "标签", required: true, value: "肩关节、术后早期" },
        { label: "适用部位", value: "上肢" },
        { label: "角度", value: "30-60 度" },
        { label: "方向", value: "外展" },
        { label: "持续时间", value: "6 分钟" },
        {
          label: "说明",
          textarea: true,
          value: "适用于肩袖损伤术后 1-3 周的基础肩外展训练。"
        }
      ]}
      submitLabel="更新动作视频"
    />
  );
}
