import { createFileRoute } from "@tanstack/react-router";
import { ActionFormPage } from "@/components/page-shells";

export const Route = createFileRoute("/tags/voice/create")({
  component: CreateVoiceTagPage
});

function CreateVoiceTagPage() {
  return (
    <ActionFormPage
      eyebrow="标签管理 > 问答对标签库 > 新增标签"
      title="新增问答对标签"
      description="用于新增问答对标签并配置层级、状态和说明。"
      fields={[
        { label: "标签名称", required: true, placeholder: "例如：激励" },
        { label: "上级标签", required: true, placeholder: "问答对" },
        { label: "状态", placeholder: "使用中 / 未使用" },
        { label: "说明", textarea: true, placeholder: "补充问答对标签用途" }
      ]}
      submitLabel="新增标签"
    />
  );
}
