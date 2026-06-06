import { createFileRoute } from "@tanstack/react-router";
import { ExportPage } from "@/components/page-shells";

export const Route = createFileRoute("/knowledge/sequence/export")({
  component: ExportSequencePage
});

function ExportSequencePage() {
  return (
    <ExportPage
      eyebrow="多模态知识库 > 动作序列库 > 导出动作序列"
      title="导出动作序列"
      description="用于导出动作序列及相关配置结果。"
      options={[
        { label: "导出范围", value: "全部动作序列" },
        { label: "阶段筛选", value: "术后1周" },
        { label: "导出格式", value: "JSON / ZIP" },
        { label: "附加内容", value: "组成动作 + 标签 + 说明" }
      ]}
      exportHint="当前原型重点展示导出配置项，便于后续接入真实文件生成。"
    />
  );
}
