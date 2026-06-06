import { createFileRoute } from "@tanstack/react-router";
import { ActionFormPage } from "@/components/page-shells";

export const Route = createFileRoute("/patients/plans/create")({
  component: CreatePlanPage
});

function CreatePlanPage() {
  return (
    <ActionFormPage
      eyebrow="患者档案管理 > 康复方案 > 新增方案"
      title="新增方案"
      description="用于录入康复方案目标、类型、风险和备注，并参考 AI 方案。"
      fields={[
        { label: "患者", required: true, placeholder: "选择患者" },
        { label: "方案类型", required: true, placeholder: "例如：肩关节 ROM 恢复" },
        { label: "阶段", placeholder: "术后1周" },
        { label: "目标", required: true, placeholder: "例如：恢复外展 60 度" },
        { label: "风险", required: true, placeholder: "例如：疼痛波动" },
        { label: "设备ID", placeholder: "RB-01" },
        { label: "方案备注", textarea: true, placeholder: "补充方案执行要点" }
      ]}
      aiReference="AI 将根据患者阶段、评估结果和历史训练情况推荐康复方案。"
    />
  );
}
