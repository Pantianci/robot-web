import { createFileRoute } from "@tanstack/react-router";
import { ActionFormPage } from "@/components/page-shells";

export const Route = createFileRoute("/knowledge/voice/create")({
  component: CreateVoicePage
});

function CreateVoicePage() {
  return (
    <ActionFormPage
      eyebrow="多模态知识库 > 语音交互库 > 新增语音交互数据"
      title="新增语音交互数据"
      description="用于录入标准问题、相似问题、标签和回复内容，形成语音交互数据。"
      fields={[
        { label: "标准问题", required: true, placeholder: "例如：训练完成后给出鼓励" },
        { label: "分类", required: true, placeholder: "正向激励 / 指令交互" },
        { label: "标签", required: true, placeholder: "激励、肩关节" },
        { label: "相似问题", textarea: true, placeholder: "每行一个相似问题" },
        { label: "回复内容", textarea: true, placeholder: "每行一个回复内容" }
      ]}
    />
  );
}
