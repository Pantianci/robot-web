import { createFileRoute } from "@tanstack/react-router";
import { ActionFormPage } from "@/components/page-shells";

export const Route = createFileRoute("/tags/knowledge/create")({
  component: CreateKnowledgeTagPage
});

function CreateKnowledgeTagPage() {
  return (
    <ActionFormPage
      eyebrow="标签管理 > 康复知识标签库 > 新增康复知识标签"
      title="新增康复知识标签"
      description="用于新增康复知识标签并配置上级标签、启用状态和说明。"
      fields={[
        { label: "标签名称", required: true, placeholder: "例如：肩关节" },
        { label: "上级标签", required: true, placeholder: "例如：上肢康复" },
        { label: "状态", placeholder: "使用中 / 未使用" },
        { label: "说明", textarea: true, placeholder: "补充标签适用范围" }
      ]}
      submitLabel="新增标签"
    />
  );
}
