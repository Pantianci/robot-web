export interface ScheduleAction {
  id: string;
  type: string;
  duration: string;
  sets: number;
  reps: number;
  icon: string;
}

export interface Schedule {
  id: string;
  robotId: string;
  patientName: string;
  scheduledTime: string;
  date: string;
  prescriptionId: string;
  prescriptionName: string;
  actions: ScheduleAction[];
  status: "待执行" | "执行中" | "已完成";
}
