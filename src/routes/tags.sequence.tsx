import { createFileRoute } from "@tanstack/react-router";
import { TagManagementPage } from "@/components/page-shells";
import { useKnowledgeTagsQuery } from "@/lib/hooks";

export const Route = createFileRoute("/tags/sequence")({
  component: SequenceTagsPage
});

function SequenceTagsPage() {
  const { data = [] } = useKnowledgeTagsQuery("sequence");

  return (
    <TagManagementPage
      eyebrow="标签管理 > 动作序列标签库"
      title="动作序列标签库"
      description="用于管理动作序列标签、状态和关联关系。"
      tags={data}
      createLink="/tags/sequence/create"
    />
  );
}
