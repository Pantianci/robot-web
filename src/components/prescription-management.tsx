import { useMemo, useState } from "react";
import { FileOutput, Plus, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import {
  useCreatePlanMutation,
  useCreatePrescriptionMutation,
  useCurrentActionsQuery,
  usePatientsQuery,
  usePlansQuery,
  usePrescriptionsQuery
} from "@/lib/hooks";
import { clearDraft, readDraft, writeDraft } from "@/lib/storage";
import { formatDateTime } from "@/lib/utils";
import type { Prescription, RehabPlan } from "@/lib/types";
import { DetailPanel } from "@/components/detail-panel";
import { DialogFormShell } from "@/components/dialog-form-shell";
import { EmptyState } from "@/components/empty-state";
import { Field } from "@/components/field";
import { PageHeader } from "@/components/page-header";
import { PropertyList } from "@/components/property-list";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type PlanDraft = Omit<RehabPlan, "id" | "updatedAt">;
type PrescriptionDraft = Omit<Prescription, "id" | "issuedAt">;

const planDraftKey = "care-plan:draft";
const prescriptionDraftKey = "prescription:draft";

export function PrescriptionManagement({
  initialTab = "plans"
}: {
  initialTab?: "plans" | "current" | "prescriptions";
}) {
  const { data: patients = [] } = usePatientsQuery();
  const { data: plans = [] } = usePlansQuery();
  const { data: currentActions = [] } = useCurrentActionsQuery();
  const { data: prescriptions = [] } = usePrescriptionsQuery();
  const createPlanMutation = useCreatePlanMutation();
  const createPrescriptionMutation = useCreatePrescriptionMutation();

  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id ?? null);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState(prescriptions[0]?.id ?? null);
  const [planOpen, setPlanOpen] = useState(false);
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
  const [planDraft, setPlanDraft] = useState<PlanDraft>(
    readDraft<PlanDraft>(planDraftKey) ?? {
      patientId: patients[0]?.id ?? "",
      patientName: patients[0]?.name ?? "",
      type: "",
      goal: "",
      risk: "",
      description: "",
      doctor: "李明",
      nurse: "周宁",
      deviceId: patients[0]?.robotId ?? "",
      stage: "",
      aiReference: "AI 将根据患者阶段与历史评估自动生成方案参考。",
      status: "待同步"
    }
  );
  const [prescriptionDraft, setPrescriptionDraft] = useState<PrescriptionDraft>(
    readDraft<PrescriptionDraft>(prescriptionDraftKey) ?? {
      patientId: patients[0]?.id ?? "",
      patientName: patients[0]?.name ?? "",
      stage: "",
      goal: "",
      risk: "",
      sequenceName: "",
      doctor: "李明医生",
      status: "待审核",
      note: "",
      aiReference: "AI 将输出运动处方建议和动作参数。",
      videoTitle: "待生成视频",
      videoDuration: "00:00",
      frequency: "3-5 次/周",
      movements: []
    }
  );
  const [exportMessage, setExportMessage] = useState("");

  const selectedPlan = plans.find((item) => item.id === selectedPlanId) ?? plans[0] ?? null;
  const selectedPrescription =
    prescriptions.find((item) => item.id === selectedPrescriptionId) ?? prescriptions[0] ?? null;

  const linkedActions = useMemo(
    () => currentActions.filter((item) => item.patientId === selectedPlan?.patientId),
    [currentActions, selectedPlan?.patientId]
  );

  const persistPlanDraft = (patch: Partial<PlanDraft>) => {
    const next = { ...planDraft, ...patch };
    setPlanDraft(next);
    writeDraft(planDraftKey, next);
  };

  const persistPrescriptionDraft = (patch: Partial<PrescriptionDraft>) => {
    const next = { ...prescriptionDraft, ...patch };
    setPrescriptionDraft(next);
    writeDraft(prescriptionDraftKey, next);
  };

  const resetPlanDraft = () => {
    clearDraft(planDraftKey);
  };

  const resetPrescriptionDraft = () => {
    clearDraft(prescriptionDraftKey);
  };

  const handleCreatePlan = async () => {
    if (!planDraft.patientId || !planDraft.type || !planDraft.goal) {
      return;
    }
    await createPlanMutation.mutateAsync(planDraft);
    resetPlanDraft();
    setPlanOpen(false);
  };

  const handleCreatePrescription = async () => {
    if (!prescriptionDraft.patientId || !prescriptionDraft.sequenceName) {
      return;
    }
    await createPrescriptionMutation.mutateAsync({
      ...prescriptionDraft,
      movements:
        prescriptionDraft.movements.length > 0
          ? prescriptionDraft.movements
          : [
              {
                id: "generated-1",
                name: "肩外展训练",
                angle: "30-60 度",
                repetitions: "8 次",
                duration: "06:00"
              }
            ]
    });
    resetPrescriptionDraft();
    setPrescriptionOpen(false);
  };

  const handleExport = async () => {
    const result = await api.exportPrescriptions(prescriptions.length);
    setExportMessage(
      `已生成 ${result.fileName}，包含 ${result.exportedCount} 份处方，生成时间 ${formatDateTime(
        result.generatedAt
      )}`
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="患者档案管理 > 康复方案 / 处方列表"
        title="康复方案与运动处方"
        description="按文档要求还原康复方案列表、当前处方和运动处方新增流，并保留 AI 参考位。"
      />

      {exportMessage ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-sm text-primary">{exportMessage}</CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="plans">康复方案</TabsTrigger>
          <TabsTrigger value="current">当前处方</TabsTrigger>
          <TabsTrigger value="prescriptions">处方列表</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-6">
          <PageHeader
            eyebrow="患者档案管理 > 康复方案"
            title="康复方案"
            description="方案以最近操作时间排序，右侧显示详情和 AI 推荐文案。"
            actions={
              <>
                <Button variant="secondary">
                  <Sparkles className="h-4 w-4" />
                  AI生成方案
                </Button>
                <Button onClick={() => setPlanOpen(true)}>
                  <Plus className="h-4 w-4" />
                  新增方案
                </Button>
                <Button variant="outline" onClick={handleExport}>
                  <FileOutput className="h-4 w-4" />
                  导出方案
                </Button>
              </>
            }
          />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_360px]">
            <Card>
              <CardHeader className="border-b border-border/60">
                <CardTitle>方案列表</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>患者</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>风险</TableHead>
                      <TableHead>阶段</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>最近操作时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((item) => (
                      <TableRow
                        key={item.id}
                        data-state={selectedPlan?.id === item.id ? "selected" : undefined}
                        className="cursor-pointer"
                        onClick={() => setSelectedPlanId(item.id)}
                      >
                        <TableCell className="font-medium">{item.patientName}</TableCell>
                        <TableCell>{item.type}</TableCell>
                        <TableCell>{item.risk}</TableCell>
                        <TableCell>{item.stage}</TableCell>
                        <TableCell>
                          <Badge>{item.status}</Badge>
                        </TableCell>
                        <TableCell>{formatDateTime(item.updatedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <DetailPanel title="方案详情">
              {selectedPlan ? (
                <>
                  <PropertyList
                    items={[
                      { label: "姓名", value: selectedPlan.patientName },
                      { label: "阶段", value: selectedPlan.stage },
                      { label: "病种", value: selectedPlan.type },
                      { label: "设备", value: selectedPlan.deviceId },
                      { label: "护士", value: selectedPlan.nurse },
                      { label: "医生", value: selectedPlan.doctor }
                    ]}
                  />
                  <SectionCard title="方案说明">
                    <p className="text-sm leading-7 text-muted-foreground">
                      {selectedPlan.description}
                    </p>
                  </SectionCard>
                  <SectionCard title="AI 方案参考">
                    <p className="text-sm leading-7 text-muted-foreground">
                      {selectedPlan.aiReference}
                    </p>
                  </SectionCard>
                </>
              ) : (
                <EmptyState title="请选择方案" />
              )}
            </DetailPanel>
          </div>
        </TabsContent>

        <TabsContent value="current">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_360px]">
            <Card>
              <CardHeader className="border-b border-border/60">
                <CardTitle>当前处方动作列表</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {linkedActions.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>动作</TableHead>
                        <TableHead>部位</TableHead>
                        <TableHead>时长</TableHead>
                        <TableHead>强度</TableHead>
                        <TableHead>最近操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linkedActions.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.title}</TableCell>
                          <TableCell>{item.part}</TableCell>
                          <TableCell>{item.duration}</TableCell>
                          <TableCell>{item.intensity}</TableCell>
                          <TableCell>{formatDateTime(item.updatedAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-6">
                    <EmptyState title="暂无动作明细" />
                  </div>
                )}
              </CardContent>
            </Card>

            <DetailPanel title="当前处方详情">
              {linkedActions[0] ? (
                <PropertyList
                  items={[
                    { label: "动作名", value: linkedActions[0].title },
                    { label: "说明", value: linkedActions[0].note },
                    { label: "时长", value: linkedActions[0].duration },
                    { label: "强度", value: linkedActions[0].intensity }
                  ]}
                />
              ) : (
                <EmptyState title="暂无当前处方" />
              )}
            </DetailPanel>
          </div>
        </TabsContent>

        <TabsContent value="prescriptions" className="space-y-6">
          <PageHeader
            eyebrow="患者档案管理 > 处方列表管理"
            title="运动处方列表"
            description="支持 AI 生成处方、新增运动处方和导出处方，右侧详情包含动作参数和视频信息。"
            actions={
              <>
                <Button variant="secondary">
                  <Sparkles className="h-4 w-4" />
                  AI生成处方
                </Button>
                <Button onClick={() => setPrescriptionOpen(true)}>
                  <Plus className="h-4 w-4" />
                  新增运动处方
                </Button>
                <Button variant="outline" onClick={handleExport}>
                  <FileOutput className="h-4 w-4" />
                  导出运动处方
                </Button>
              </>
            }
          />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_360px]">
            <Card>
              <CardHeader className="border-b border-border/60">
                <CardTitle>处方列表</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>患者</TableHead>
                      <TableHead>医生</TableHead>
                      <TableHead>组合动作数</TableHead>
                      <TableHead>审批状态</TableHead>
                      <TableHead>阶段</TableHead>
                      <TableHead>创建时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prescriptions.map((item) => (
                      <TableRow
                        key={item.id}
                        data-state={selectedPrescription?.id === item.id ? "selected" : undefined}
                        className="cursor-pointer"
                        onClick={() => setSelectedPrescriptionId(item.id)}
                      >
                        <TableCell className="font-medium">{item.patientName}</TableCell>
                        <TableCell>{item.doctor}</TableCell>
                        <TableCell>{item.movements.length}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              item.status === "已完成"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.stage}</TableCell>
                        <TableCell>{formatDateTime(item.issuedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <DetailPanel title="当前处方详情">
              {selectedPrescription ? (
                <>
                  <PropertyList
                    items={[
                      { label: "患者", value: selectedPrescription.patientName },
                      { label: "处方编号", value: selectedPrescription.id },
                      { label: "开具医生", value: selectedPrescription.doctor },
                      { label: "日期", value: formatDateTime(selectedPrescription.issuedAt) },
                      { label: "目标", value: selectedPrescription.goal },
                      { label: "频率", value: selectedPrescription.frequency },
                      { label: "视频", value: selectedPrescription.videoTitle }
                    ]}
                  />
                  <SectionCard title="动作参数">
                    <div className="space-y-3">
                      {selectedPrescription.movements.map((movement) => (
                        <div
                          key={movement.id}
                          className="rounded-2xl border border-border/70 bg-surface-50 px-4 py-3"
                        >
                          <p className="font-medium text-surface-900">{movement.name}</p>
                          <p className="text-sm text-muted-foreground">
                            角度 {movement.angle} · 次数 {movement.repetitions} · 时长{" "}
                            {movement.duration}
                          </p>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                </>
              ) : (
                <EmptyState title="请选择一条处方" />
              )}
            </DetailPanel>
          </div>
        </TabsContent>
      </Tabs>

      <DialogFormShell
        open={planOpen}
        onOpenChange={setPlanOpen}
        title="新增方案"
        description="支持 AI 参考位和富文本备注的原型级录入。"
        onSubmit={handleCreatePlan}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="姓名" required>
            <select
              className="native-select"
              value={planDraft.patientId}
              onChange={(event) => {
                const target = patients.find((item) => item.id === event.target.value);
                persistPlanDraft({
                  patientId: event.target.value,
                  patientName: target?.name ?? "",
                  deviceId: target?.robotId ?? ""
                });
              }}
            >
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="类型" required>
            <Input value={planDraft.type} onChange={(event) => persistPlanDraft({ type: event.target.value })} />
          </Field>
          <Field label="目标" required>
            <Input value={planDraft.goal} onChange={(event) => persistPlanDraft({ goal: event.target.value })} />
          </Field>
          <Field label="风险" required>
            <Input value={planDraft.risk} onChange={(event) => persistPlanDraft({ risk: event.target.value })} />
          </Field>
          <Field label="阶段">
            <Input value={planDraft.stage} onChange={(event) => persistPlanDraft({ stage: event.target.value })} />
          </Field>
          <Field label="设备">
            <Input
              value={planDraft.deviceId}
              onChange={(event) => persistPlanDraft({ deviceId: event.target.value })}
            />
          </Field>
        </div>
        <Field label="方案备注">
          <Textarea
            value={planDraft.description}
            onChange={(event) => persistPlanDraft({ description: event.target.value })}
          />
        </Field>
        <Field label="AI 方案参考">
          <Textarea
            value={planDraft.aiReference}
            onChange={(event) => persistPlanDraft({ aiReference: event.target.value })}
          />
        </Field>
      </DialogFormShell>

      <DialogFormShell
        open={prescriptionOpen}
        onOpenChange={setPrescriptionOpen}
        title="新增动作处方"
        description="可从动作序列库加载序列，再对各动作参数进行二次编辑。"
        onSubmit={handleCreatePrescription}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="姓名" required>
            <select
              className="native-select"
              value={prescriptionDraft.patientId}
              onChange={(event) => {
                const target = patients.find((item) => item.id === event.target.value);
                persistPrescriptionDraft({
                  patientId: event.target.value,
                  patientName: target?.name ?? ""
                });
              }}
            >
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="阶段" required>
            <Input
              value={prescriptionDraft.stage}
              onChange={(event) => persistPrescriptionDraft({ stage: event.target.value })}
            />
          </Field>
          <Field label="目标" required>
            <Input
              value={prescriptionDraft.goal}
              onChange={(event) => persistPrescriptionDraft({ goal: event.target.value })}
            />
          </Field>
          <Field label="风险" required>
            <Input
              value={prescriptionDraft.risk}
              onChange={(event) => persistPrescriptionDraft({ risk: event.target.value })}
            />
          </Field>
          <Field label="动作序列" required>
            <Input
              value={prescriptionDraft.sequenceName}
              onChange={(event) => persistPrescriptionDraft({ sequenceName: event.target.value })}
            />
          </Field>
          <Field label="频率">
            <Input
              value={prescriptionDraft.frequency}
              onChange={(event) => persistPrescriptionDraft({ frequency: event.target.value })}
            />
          </Field>
        </div>
        <Field label="各动作详情">
          <Textarea
            placeholder="例如：肩外展训练｜30-60度｜8次｜06:00"
            value={prescriptionDraft.note}
            onChange={(event) => persistPrescriptionDraft({ note: event.target.value })}
          />
        </Field>
        <Field label="AI 运动处方参考">
          <Textarea
            value={prescriptionDraft.aiReference}
            onChange={(event) => persistPrescriptionDraft({ aiReference: event.target.value })}
          />
        </Field>
      </DialogFormShell>
    </div>
  );
}
