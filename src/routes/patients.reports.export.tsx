import { createFileRoute } from "@tanstack/react-router";
import { ExportPage } from "@/components/page-shells";

export const Route = createFileRoute("/patients/reports/export")({
  component: ExportReportPage
});

function ExportReportPage() {
  return (
    <ExportPage
      eyebrow="患者档案管理 > 评估报告 > 导出评估报告"
      title="导出评估报告"
      description="用于配置并导出评估报告结果。"
      options={[
        { label: "患者范围", value: "全部报告" },
        { label: "审核状态", value: "已完成" },
        { label: "导出格式", value: "PDF / ZIP" },
        { label: "附加内容", value: "图表 + 医护评价 + AI 摘要" }
      ]}
      exportHint="当前原型保留导出项配置和结果反馈，适合演示查房归档流程。"
    />
  );
}
