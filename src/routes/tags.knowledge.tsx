import { createFileRoute } from "@tanstack/react-router";
import { TagManagementPage } from "@/components/page-shells";
import { useKnowledgeTagsQuery } from "@/lib/hooks";

export const Route = createFileRoute("/tags/knowledge")({
  component: KnowledgeTagsPage
});

function KnowledgeTagsPage() {
  const { data = [] } = useKnowledgeTagsQuery("knowledge");

  return (
    <TagManagementPage
      eyebrow="标签管理 > 康复知识标签库"
      title="康复知识标签库"
      description="用于管理康复知识标签，支持筛选、详情、编辑和删除。"
      tags={data}
      createLink="/tags/knowledge/create"
    />
  );
}
