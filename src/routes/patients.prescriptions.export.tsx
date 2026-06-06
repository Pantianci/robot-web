import { createFileRoute } from "@tanstack/react-router";
import { ExportPage } from "@/components/page-shells";

export const Route = createFileRoute("/patients/prescriptions/export")({
  component: ExportPrescriptionPage
});

function ExportPrescriptionPage() {
  return (
    <ExportPage
      eyebrow="患者档案管理 > 处方列表 > 导出运动处方"
      title="导出运动处方"
      description="用于配置并导出运动处方结果。"
      options={[
        { label: "患者范围", value: "全部患者" },
        { label: "处方状态", value: "待审核 / 已完成" },
        { label: "导出格式", value: "PDF" },
        { label: "内容明细", value: "动作列表 + 参数 + 视频信息" }
      ]}
      exportHint="适合用于查房资料、病区同步和康复方案备案。"
    />
  );
}
