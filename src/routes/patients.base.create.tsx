import { createFileRoute } from "@tanstack/react-router";
import { ActionFormPage } from "@/components/page-shells";

export const Route = createFileRoute("/patients/base/create")({
  component: CreatePatientArchivePage
});

function CreatePatientArchivePage() {
  return (
    <ActionFormPage
      eyebrow="患者档案管理 > 基础档案 > 新增档案"
      title="新增档案"
      description="用于录入患者基础信息和备注，生成新的患者档案。"
      fields={[
        { label: "姓名", required: true, placeholder: "患者姓名" },
        { label: "年龄", required: true, placeholder: "30" },
        { label: "性别", required: true, placeholder: "男 / 女" },
        { label: "病种", required: true, placeholder: "例如：肩袖损伤" },
        { label: "阶段", placeholder: "术后1周" },
        { label: "设备ID", placeholder: "RB-01" },
        { label: "病床号", placeholder: "12床" },
        { label: "备注", textarea: true, placeholder: "补充患者情况与注意事项" }
      ]}
    />
  );
}
