import { createFileRoute } from "@tanstack/react-router";
import { ActionFormPage } from "@/components/page-shells";

export const Route = createFileRoute("/knowledge/voice/edit")({
  component: EditVoicePage
});

function EditVoicePage() {
  return (
    <ActionFormPage
      eyebrow="多模态知识库 > 语音交互库 > 修改语音交互数据"
      title="修改语音交互数据"
      description="用于编辑已有语音交互数据的标准问题、标签和回复内容。"
      fields={[
        { label: "标准问题", required: true, value: "训练完成后给出鼓励" },
        { label: "分类", required: true, value: "正向激励" },
        { label: "标签", required: true, value: "激励、肩关节" },
        { label: "相似问题", textarea: true, value: "训练做完了\n继续加油" },
        { label: "回复内容", textarea: true, value: "今天表现很好，我们继续保持。\n动作完成得很稳定，继续加油。" }
      ]}
      submitLabel="更新语音数据"
    />
  );
}
