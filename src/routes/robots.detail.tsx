import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Clock, User, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { usePrescriptionsQuery } from "@/lib/hooks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import type { Schedule, ScheduleAction } from "@/lib/schedule-types";
import type { Prescription } from "@/lib/types";

export const Route = createFileRoute("/robots/detail")({
  component: RobotDetailPage
});

// 模拟从处方生成排班任务
function prescriptionToSchedule(prescription: Prescription, time: string, date: string): Schedule {
  const actions: ScheduleAction[] = prescription.movements.map((movement, index) => ({
    id: `${prescription.id}-${movement.id}`,
    type: movement.name,
    duration: movement.duration,
    sets: parseInt(movement.repetitions.split("组")[0]) || 1,
    reps: parseInt(movement.repetitions.split("×")[1]) || 1,
    icon: getActionIcon(index)
  }));

  return {
    id: `schedule-${Date.now()}-${Math.random()}`,
    robotId: "R001",
    patientName: prescription.patientName,
    scheduledTime: time,
    date: date,
    prescriptionId: prescription.id,
    prescriptionName: prescription.sequenceName,
    actions: actions,
    status: "待执行"
  };
}

function getActionIcon(index: number): string {
  const icons = ["🎯", "🌸", "🔄", "🦁", "➗", "🎨", "🟨", "💫", "🌟", "⚡"];
  return icons[index % icons.length];
}

const mockSchedules: Schedule[] = [
  {
    id: "1",
    robotId: "R001",
    patientName: "李凯",
    scheduledTime: "09:00",
    date: "今天",
    prescriptionId: "P001",
    prescriptionName: "上肢康复序列A",
    status: "已完成",
    actions: [
      { id: "a1", type: "肩关节前屈", duration: "5分钟", sets: 3, reps: 10, icon: "🎯" },
      { id: "a2", type: "肩关节外展", duration: "5分钟", sets: 3, reps: 10, icon: "🌸" },
      { id: "a3", type: "肘关节屈伸", duration: "5分钟", sets: 3, reps: 15, icon: "🔄" },
      { id: "a4", type: "腕关节旋转", duration: "3分钟", sets: 2, reps: 20, icon: "🦁" }
    ]
  },
  {
    id: "2",
    robotId: "R001",
    patientName: "李凯",
    scheduledTime: "14:00",
    date: "今天",
    prescriptionId: "P002",
    prescriptionName: "下肢力量训练",
    status: "待执行",
    actions: [
      { id: "a5", type: "髋关节屈伸", duration: "8分钟", sets: 3, reps: 12, icon: "🌸" },
      { id: "a6", type: "膝关节伸展", duration: "8分钟", sets: 3, reps: 12, icon: "➗" },
      { id: "a7", type: "踝关节背屈", duration: "5分钟", sets: 2, reps: 15, icon: "🎨" }
    ]
  }
];

function RobotDetailPage() {
  const { data: prescriptions = [] } = usePrescriptionsQuery();
  const [schedules, setSchedules] = useState<Schedule[]>(mockSchedules);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("09:00");

  const handleImportPrescription = () => {
    const prescription = prescriptions.find((p) => p.id === selectedPrescription);
    if (!prescription) return;

    const newSchedule = prescriptionToSchedule(prescription, selectedTime, "今天");
    setSchedules([...schedules, newSchedule]);
    setIsImportOpen(false);
    setSelectedPrescription("");
  };

  const completedCount = schedules.filter((s) => s.status === "已完成").length;
  const totalCount = schedules.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        eyebrow="机器人管理 > 机器人详情"
        title="机器人任务排班"
        description="查看和管理机器人的训练任务排班，运动处方中的动作序列将按顺序执行"
        badge="排班管理"
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-4">
        {/* 统计信息 */}
        <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-gradient-to-br from-primary/5 to-primary/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">今日任务进度</div>
              <div className="text-2xl font-semibold">
                {completedCount}/{totalCount}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">完成率</div>
            <div className="text-xl font-semibold text-primary">
              {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
            </div>
          </div>
        </div>

        {/* 排班列表 */}
        <div className="space-y-3">
          {schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 py-12 text-center">
              <Clock className="mb-3 h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">暂无排班任务</p>
              <p className="mt-1 text-xs text-muted-foreground/70">点击下方按钮导入康复处方创建任务</p>
            </div>
          ) : (
            schedules.map((schedule) => <ScheduleCard key={schedule.id} schedule={schedule} />)
          )}
        </div>

        {/* 导入处方按钮 */}
        <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/50 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary">
              <Plus className="h-5 w-5" />
              导入康复处方
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>导入康复处方</DialogTitle>
              <DialogDescription>
                选择一个康复处方并设置执行时间。处方中的动作序列将按顺序执行，动作参数不可修改。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">选择处方</label>
                <Select value={selectedPrescription} onValueChange={setSelectedPrescription}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择康复处方" />
                  </SelectTrigger>
                  <SelectContent>
                    {prescriptions.map((prescription) => (
                      <SelectItem key={prescription.id} value={prescription.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{prescription.patientName}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{prescription.sequenceName}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">执行时间</label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => 8 + i).map((hour) => (
                      <SelectItem key={hour} value={`${hour.toString().padStart(2, "0")}:00`}>
                        {hour.toString().padStart(2, "0")}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPrescription && (
                <div className="rounded-lg border border-border/50 bg-surface-50 p-3">
                  <div className="mb-2 text-sm font-medium">处方动作预览</div>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    {prescriptions
                      .find((p) => p.id === selectedPrescription)
                      ?.movements.map((movement, index) => (
                        <div key={movement.id} className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/20 text-xs font-medium text-primary">
                            {index + 1}
                          </span>
                          <span>{movement.name}</span>
                          <span className="text-muted-foreground/70">-</span>
                          <span>{movement.repetitions}</span>
                          <span className="text-muted-foreground/70">-</span>
                          <span>{movement.duration}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsImportOpen(false)}>
                取消
              </Button>
              <Button onClick={handleImportPrescription} disabled={!selectedPrescription}>
                导入并创建任务
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function ScheduleCard({ schedule }: { schedule: Schedule }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusColors = {
    待执行: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
    执行中: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    已完成: "bg-green-500/10 text-green-700 border-green-500/20"
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* 卡片头部 */}
      <div className="border-b border-border/50 bg-surface-50/50 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center justify-center rounded-xl bg-primary/10 px-3 py-2">
              <div className="text-xl font-bold text-primary">{schedule.scheduledTime}</div>
              <div className="text-xs text-muted-foreground">{schedule.date}</div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{schedule.prescriptionName}</span>
                <span
                  className={`rounded-md border px-2 py-0.5 text-xs font-medium ${statusColors[schedule.status]}`}
                >
                  {schedule.status}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>{schedule.patientName}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-lg p-1 transition-colors hover:bg-surface-100"
          >
            <ChevronRight
              className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* 动作序列 */}
      <div className="p-4">
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          动作序列（共 {schedule.actions.length} 个动作）
        </div>
        <div className={`grid gap-2 ${isExpanded ? "grid-cols-1" : "grid-cols-2 md:grid-cols-4"}`}>
          {schedule.actions.map((action, index) => (
            <ActionCard key={action.id} action={action} order={index + 1} isExpanded={isExpanded} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  action,
  order,
  isExpanded
}: {
  action: ScheduleAction;
  order: number;
  isExpanded: boolean;
}) {
  if (isExpanded) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-surface-50 p-3 transition-colors hover:bg-surface-100">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-sm font-bold text-primary">
          {order}
        </div>
        <div className="flex flex-1 items-center justify-between">
          <div>
            <div className="font-medium">{action.type}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{action.duration}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary/20 px-2 py-1 text-xs font-medium text-primary">
              {action.sets} 组
            </span>
            <span className="text-sm text-muted-foreground">× {action.reps}</span>
            <span className="text-2xl">{action.icon}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/50 bg-surface-50 p-3 transition-colors hover:bg-surface-100">
      <div className="flex items-center justify-between">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/20 text-xs font-bold text-primary">
          {order}
        </div>
        <span className="text-xl">{action.icon}</span>
      </div>
      <div>
        <div className="text-sm font-medium">{action.type}</div>
        <div className="mt-1 text-xs text-muted-foreground">{action.duration}</div>
      </div>
      <div className="flex items-center gap-1.5 text-xs">
        <span className="rounded bg-primary/20 px-1.5 py-0.5 font-medium text-primary">{action.sets}组</span>
        <span className="text-muted-foreground">× {action.reps}</span>
      </div>
    </div>
  );
}
