import { createFileRoute } from "@tanstack/react-router";
import { TagManagementPage } from "@/components/page-shells";
import { useKnowledgeTagsQuery } from "@/lib/hooks";

export const Route = createFileRoute("/tags/motion")({
  component: MotionTagsPage
});

function MotionTagsPage() {
  const { data = [] } = useKnowledgeTagsQuery("motion");

  return (
    <TagManagementPage
      eyebrow="标签管理 > 标准动作标签库"
      title="标准动作标签库"
      description="用于管理标准动作标签、状态和关联关系。"
      tags={data}
      createLink="/tags/motion/create"
    />
  );
}
