import { createFileRoute } from "@tanstack/react-router";
import { ExportPage } from "@/components/page-shells";

export const Route = createFileRoute("/knowledge/library/export")({
  component: ExportKnowledgePage
});

function ExportKnowledgePage() {
  return (
    <ExportPage
      eyebrow="多模态知识库 > 康复知识库 > 导出康复知识"
      title="导出康复知识"
      description="用于配置导出对象和格式，生成康复知识导出结果。"
      options={[
        { label: "导出范围", value: "全部康复知识" },
        { label: "标签筛选", value: "肩关节、术后早期" },
        { label: "文件格式", value: "ZIP" },
        { label: "导出内容", value: "正文 + 元数据 + 标签关系" }
      ]}
      exportHint="当前原型支持导出条件配置与结果反馈，真实文件生成可后续接入。"
    />
  );
}
