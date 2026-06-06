import { createFileRoute } from "@tanstack/react-router";
import { ActionFormPage } from "@/components/page-shells";

export const Route = createFileRoute("/knowledge/library/edit")({
  component: EditKnowledgePage
});

function EditKnowledgePage() {
  return (
    <ActionFormPage
      eyebrow="多模态知识库 > 康复知识库 > 修改康复知识"
      title="修改康复知识"
      description="用于编辑已有康复知识文件信息并更新内容。"
      fields={[
        { label: "标题", required: true, value: "肩袖损伤术后指南" },
        { label: "分类", required: true, value: "指南" },
        { label: "标签", required: true, value: "肩关节、术后早期" },
        { label: "文件格式", value: "PDF" },
        {
          label: "说明",
          textarea: true,
          value: "收录国内外康复医学指南，涵盖肩袖损伤分期训练、疼痛控制和家庭训练建议。"
        }
      ]}
      submitLabel="更新内容"
    />
  );
}
