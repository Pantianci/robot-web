import { createFileRoute } from "@tanstack/react-router";
import { TagManagementPage } from "@/components/page-shells";
import { useKnowledgeTagsQuery } from "@/lib/hooks";

export const Route = createFileRoute("/tags/voice")({
  component: VoiceTagsPage
});

function VoiceTagsPage() {
  const { data = [] } = useKnowledgeTagsQuery("voice");

  return (
    <TagManagementPage
      eyebrow="标签管理 > 问答对标签库"
      title="问答对标签库"
      description="用于管理问答对标签及标签层级、状态和关联关系。"
      tags={data}
      library="voice"
    />
  );
}
