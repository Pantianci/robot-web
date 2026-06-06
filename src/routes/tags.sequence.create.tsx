import { createFileRoute } from "@tanstack/react-router";
import { ActionFormPage } from "@/components/page-shells";

export const Route = createFileRoute("/tags/sequence/create")({
  component: CreateSequenceTagPage
});

function CreateSequenceTagPage() {
  return (
    <ActionFormPage
      eyebrow="标签管理 > 动作序列标签库 > 新增标签"
      title="新增动作序列标签"
      description="用于新增动作序列标签并配置上级标签、状态和说明。"
      fields={[
        { label: "标签名称", required: true, placeholder: "例如：术后1周" },
        { label: "上级标签", required: true, placeholder: "序列阶段" },
        { label: "状态", placeholder: "使用中 / 未使用" },
        { label: "说明", textarea: true, placeholder: "补充序列标签说明" }
      ]}
      submitLabel="新增标签"
    />
  );
}
