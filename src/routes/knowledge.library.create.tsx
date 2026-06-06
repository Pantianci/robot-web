import { createFileRoute } from "@tanstack/react-router";
import { ActionFormPage } from "@/components/page-shells";

export const Route = createFileRoute("/knowledge/library/create")({
  component: CreateKnowledgePage
});

function CreateKnowledgePage() {
  return (
    <ActionFormPage
      eyebrow="多模态知识库 > 康复知识库 > 新增康复知识"
      title="新增康复知识"
      description="用于新增康复知识文件，录入标题、分类、标签、说明并提交或保存草稿。"
      fields={[
        { label: "标题", required: true, placeholder: "例如：肩袖损伤术后指南" },
        { label: "分类", required: true, placeholder: "指南 / 论文 / 知识" },
        { label: "标签", required: true, placeholder: "多个标签用、分隔" },
        { label: "文件格式", placeholder: "PDF / TXT / PNG" },
        { label: "说明", textarea: true, placeholder: "补充知识文件的适用范围和摘要" }
      ]}
      tips={["支持保存草稿，关闭页面后可恢复。", "后续可接入文件上传和版本管理。"]}
    />
  );
}
