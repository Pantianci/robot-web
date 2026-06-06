import { createFileRoute } from "@tanstack/react-router";
import { ActionFormPage } from "@/components/page-shells";

export const Route = createFileRoute("/robots/create")({
  component: CreateRobotPage
});

function CreateRobotPage() {
  return (
    <ActionFormPage
      eyebrow="机器人管理 > 机器人列表 > 新增机器人"
      title="新增机器人"
      description="用于新增机器人设备档案，具体字段待业务进一步补充。"
      fields={[
        { label: "机器人ID", required: true, placeholder: "例如：RB-08" },
        { label: "状态", required: true, placeholder: "正常 / 执行中 / 预警 / 离线" },
        { label: "关联患者", placeholder: "患者姓名" },
        { label: "电量", placeholder: "100" },
        { label: "病床号", placeholder: "12床" },
        { label: "训练状态", placeholder: "待排班 / 训练中" },
        { label: "备注", textarea: true, placeholder: "补充设备说明或异常记录" }
      ]}
      submitLabel="新增机器人"
    />
  );
}
