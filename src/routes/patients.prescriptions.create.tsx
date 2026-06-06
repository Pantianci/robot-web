import { createFileRoute } from "@tanstack/react-router";
import { ActionFormPage } from "@/components/page-shells";

export const Route = createFileRoute("/patients/prescriptions/create")({
  component: CreatePrescriptionPage
});

function CreatePrescriptionPage() {
  return (
    <ActionFormPage
      eyebrow="患者档案管理 > 处方列表 > 新增动作处方"
      title="新增动作处方"
      description="用于选择动作序列并编辑动作详情，生成新的运动处方。"
      fields={[
        { label: "患者", required: true, placeholder: "选择患者" },
        { label: "阶段", required: true, placeholder: "术后1周" },
        { label: "目标", required: true, placeholder: "恢复外展能力" },
        { label: "风险", required: true, placeholder: "疼痛风险" },
        { label: "动作序列", required: true, placeholder: "肩袖术后第1周序列" },
        { label: "频率", placeholder: "3-5 次/周" },
        { label: "各动作详情", textarea: true, placeholder: "例如：肩外展训练｜30-60度｜8次｜06:00" }
      ]}
      aiReference="AI 将输出运动处方建议、动作参数和训练频率。"
    />
  );
}
