import { createFileRoute } from "@tanstack/react-router";
import { ActionFormPage } from "@/components/page-shells";

export const Route = createFileRoute("/patients/reports/review")({
  component: ReviewReportPage
});

function ReviewReportPage() {
  return (
    <ActionFormPage
      eyebrow="患者档案管理 > 评估报告 > 审核评估报告"
      title="审核评估报告"
      description="用于审核 AI 生成的评估报告内容并补充医生护士评价。"
      fields={[
        { label: "患者", required: true, value: "王丽" },
        { label: "完成率", value: "82%" },
        { label: "ROM变化", value: "+18°" },
        { label: "疼痛评分", value: "3/10" },
        { label: "医生评价", textarea: true, placeholder: "补充医生评价" },
        { label: "护士评价", textarea: true, placeholder: "补充护士评价" },
        { label: "报告备注", textarea: true, placeholder: "补充审核意见" }
      ]}
      aiReference="AI 已根据训练数据和历史评估结果自动生成评估摘要，当前页用于人工审核。"
      submitLabel="提交审核"
    />
  );
}
