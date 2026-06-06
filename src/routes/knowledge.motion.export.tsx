import { createFileRoute } from "@tanstack/react-router";
import { ExportPage } from "@/components/page-shells";

export const Route = createFileRoute("/knowledge/motion/export")({
  component: ExportMotionPage
});

function ExportMotionPage() {
  return (
    <ExportPage
      eyebrow="多模态知识库 > 标准动作库 > 导出标准动作视频"
      title="导出标准动作视频"
      description="用于导出标准动作视频及相关参数信息。"
      options={[
        { label: "动作范围", value: "全部标准动作" },
        { label: "导出格式", value: "MP4 + CSV" },
        { label: "标签筛选", value: "下肢 / 肩关节" },
        { label: "附加内容", value: "角度、方向、时长、适应症" }
      ]}
      exportHint="适合与训练终端、动作识别服务或算法团队同步标准动作素材。"
    />
  );
}
