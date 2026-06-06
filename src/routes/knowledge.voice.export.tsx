import { createFileRoute } from "@tanstack/react-router";
import { ExportPage } from "@/components/page-shells";

export const Route = createFileRoute("/knowledge/voice/export")({
  component: ExportVoicePage
});

function ExportVoicePage() {
  return (
    <ExportPage
      eyebrow="多模态知识库 > 语音交互库 > 导出语音交互数据"
      title="导出语音交互数据"
      description="用于配置导出对象和格式，生成语音交互数据导出结果。"
      options={[
        { label: "导出范围", value: "全部语音交互数据" },
        { label: "标签筛选", value: "激励" },
        { label: "文件格式", value: "JSON / ZIP" },
        { label: "导出内容", value: "标准问题 + 相似问题 + 回复内容" }
      ]}
      exportHint="适合给语音服务或标注服务做离线同步。"
    />
  );
}
