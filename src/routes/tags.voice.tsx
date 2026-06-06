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
      eyebrow="标签管理 > 语音交互标签库"
      title="语音交互标签库"
      description="用于管理语音数据标签及标签层级、状态和关联关系。"
      tags={data}
      createLink="/tags/voice/create"
    />
  );
}
