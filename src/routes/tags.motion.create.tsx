import { createFileRoute } from "@tanstack/react-router";
import { ActionFormPage } from "@/components/page-shells";

export const Route = createFileRoute("/tags/motion/create")({
  component: CreateMotionTagPage
});

function CreateMotionTagPage() {
  return (
    <ActionFormPage
      eyebrow="标签管理 > 标准动作标签库 > 新增标签"
      title="新增标准动作标签"
      description="用于新增标准动作标签并配置上级标签、状态和说明。"
      fields={[
        { label: "标签名称", required: true, placeholder: "例如：下肢" },
        { label: "上级标签", required: true, placeholder: "标准动作" },
        { label: "状态", placeholder: "使用中 / 未使用" },
        { label: "说明", textarea: true, placeholder: "补充动作标签的适用范围" }
      ]}
      submitLabel="新增标签"
    />
  );
}
