import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BedDouble,
  ClipboardList,
  Edit3,
  Expand,
  FileImage,
  LocateFixed,
  MapPinned,
  Minus,
  Plus,
  RotateCcw,
  Route,
  Trash2,
  ZoomIn
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DialogFormShell } from "@/components/dialog-form-shell";
import { CollapsibleSplitLayout } from "@/components/collapsible-side-panel";
import { EmptyState } from "@/components/empty-state";
import { Field } from "@/components/field";
import { FilterBar } from "@/components/filter-bar";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { clearState, readState, writeState } from "@/lib/storage";
import { cn, formatDateTime, generateId } from "@/lib/utils";

type CampusMapType = "病房地图" | "导航地图";
type CampusRecordStatus = "启用" | "停用";
type BedStatus = "启用" | "停用" | "维修中";
type BedUsageStatus = "空闲" | "使用中" | "已预约";
type NavigationPointType =
  | "路径点"
  | "转弯点"
  | "电梯入口"
  | "电梯出口"
  | "等待点"
  | "停靠点"
  | "充电点"
  | "中转点";

type CampusMap = {
  id: string;
  name: string;
  type: CampusMapType;
  description: string;
  fileName: string;
  creator: string;
  createdAt: string;
  updatedAt: string;
  status: CampusRecordStatus;
};

type BedRecord = {
  id: string;
  code: string;
  name: string;
  wardName: string;
  type: string;
  status: BedStatus;
  note: string;
  mapId?: string;
  pointId?: string;
  x?: number;
  y?: number;
  updatedAt: string;
  lastEndedAt?: string;
};

type BedUsageRecord = {
  id: string;
  bedId: string;
  patientName: string;
  startAt: string;
  expectedEndAt: string;
  endAt?: string;
  registrar: string;
  registeredAt: string;
  note: string;
  endNote?: string;
};

type BedPoint = {
  id: string;
  mapId: string;
  bedId: string;
  x: number;
  y: number;
  note: string;
  createdAt: string;
  updatedAt: string;
};

type NavigationPoint = {
  id: string;
  mapId: string;
  name: string;
  code: string;
  type: NavigationPointType;
  description: string;
  note: string;
  x: number;
  y: number;
  updatedAt: string;
};

type NavigationSegment = {
  id: string;
  mapId: string;
  fromPointId: string;
  toPointId: string;
  updatedAt: string;
};

type ZoneVertex = {
  x: number;
  y: number;
};

type NoGoZone = {
  id: string;
  mapId: string;
  name: string;
  points: ZoneVertex[];
  updatedAt: string;
};

type OperationLog = {
  id: string;
  operator: string;
  operatedAt: string;
  type: string;
  detail: string;
};

type CampusState = {
  maps: CampusMap[];
  beds: BedRecord[];
  bedPoints: BedPoint[];
  navigationPoints: NavigationPoint[];
  navigationSegments: NavigationSegment[];
  noGoZones: NoGoZone[];
  usageRecords: BedUsageRecord[];
  logs: OperationLog[];
};

type MapDraft = {
  name: string;
  type: CampusMapType;
  description: string;
  fileName: string;
  status: CampusRecordStatus;
};

type BedPointDraft = {
  bedId?: string;
  code: string;
  name: string;
  wardName: string;
  type: string;
  status: BedStatus;
  note: string;
  x: string;
  y: string;
};

type NavPointDraft = {
  id?: string;
  name: string;
  code: string;
  type: NavigationPointType;
  description: string;
  note: string;
  x: string;
  y: string;
};

type BedDraft = {
  id?: string;
  code: string;
  name: string;
  wardName: string;
  type: string;
  status: BedStatus;
  note: string;
  mapId: string;
  x: string;
  y: string;
};

type UsageDraft = {
  patientName: string;
  startAt: string;
  expectedEndAt: string;
  note: string;
};

type LocateState = {
  mapId: string;
  pointId: string;
};

type MapInteractionMode = "pan" | "pick-bed" | "pick-nav" | "link" | "polygon";

const CAMPUS_STATE_KEY = "robot-web-prototype::campus-state-v4";
const CAMPUS_LOCATE_KEY = "robot-web-prototype::campus-locate";

const mapTypes: CampusMapType[] = ["病房地图", "导航地图"];
const recordStatuses: CampusRecordStatus[] = ["启用", "停用"];
const bedStatuses: BedStatus[] = ["启用", "停用", "维修中"];
const usageStatuses: BedUsageStatus[] = ["空闲", "使用中", "已预约"];
const navigationPointTypes: NavigationPointType[] = [
  "路径点",
  "转弯点",
  "电梯入口",
  "电梯出口",
  "等待点",
  "停靠点",
  "充电点",
  "中转点"
];

function createCampusSeed(): CampusState {
  return {
    maps: [
      {
        id: "map-ward-302",
        name: "骨科三病区302病房地图",
        type: "病房地图",
        description: "骨科三病区 302 病房内部布局及病床点位。",
        fileName: "orthopedics-302.svg",
        creator: "王医生",
        createdAt: "2026-06-01T08:00",
        updatedAt: "2026-06-14T10:20",
        status: "启用"
      },
      {
        id: "map-ward-305",
        name: "康复病区305病房地图",
        type: "病房地图",
        description: "康复病区 305 病房地图，含康复床和观察床。",
        fileName: "rehab-305.png",
        creator: "周宁",
        createdAt: "2026-06-02T08:20",
        updatedAt: "2026-06-13T16:00",
        status: "启用"
      },
      {
        id: "map-nav-2f",
        name: "二层公共导航地图",
        type: "导航地图",
        description: "连接护士站、电梯厅、走廊和公共通道的导航地图。",
        fileName: "floor-2-navigation.svg",
        creator: "设备管理员",
        createdAt: "2026-06-03T09:00",
        updatedAt: "2026-06-15T11:30",
        status: "启用"
      }
    ],
    beds: [
      {
        id: "bed-302-01",
        code: "BED-302-01",
        name: "302-1床",
        wardName: "骨科三病区302",
        type: "康复床",
        status: "启用",
        note: "靠窗病床，适合肩关节训练机器人停靠。",
        mapId: "map-ward-302",
        pointId: "bp-302-01",
        x: 24,
        y: 34,
        updatedAt: "2026-06-15T08:00",
        lastEndedAt: "2026-06-15T18:00"
      },
      {
        id: "bed-302-02",
        code: "BED-302-02",
        name: "302-2床",
        wardName: "骨科三病区302",
        type: "普通床",
        status: "启用",
        note: "靠近门口，预留机器人转向空间。",
        mapId: "map-ward-302",
        pointId: "bp-302-02",
        x: 58,
        y: 32,
        updatedAt: "2026-06-15T08:10"
      },
      {
        id: "bed-302-03",
        code: "BED-302-03",
        name: "302-3床",
        wardName: "骨科三病区302",
        type: "观察床",
        status: "启用",
        note: "已安排明日使用计划。",
        mapId: "map-ward-302",
        pointId: "bp-302-03",
        x: 78,
        y: 68,
        updatedAt: "2026-06-15T09:00"
      },
      {
        id: "bed-302-04",
        code: "BED-302-04",
        name: "302-4床",
        wardName: "骨科三病区302",
        type: "普通床",
        status: "停用",
        note: "临时停用，等待病房调整。",
        mapId: "map-ward-302",
        pointId: "bp-302-04",
        x: 35,
        y: 72,
        updatedAt: "2026-06-12T14:30"
      },
      {
        id: "bed-305-01",
        code: "BED-305-01",
        name: "305-1床",
        wardName: "康复病区305",
        type: "康复床",
        status: "维修中",
        note: "床旁电源接口检修中。",
        mapId: "map-ward-305",
        pointId: "bp-305-01",
        x: 30,
        y: 48,
        updatedAt: "2026-06-14T10:00"
      },
      {
        id: "bed-305-02",
        code: "BED-305-02",
        name: "305-2床",
        wardName: "康复病区305",
        type: "康复床",
        status: "启用",
        note: "可用于下肢训练机器人。",
        mapId: "map-ward-305",
        pointId: "bp-305-02",
        x: 66,
        y: 48,
        updatedAt: "2026-06-14T11:00"
      }
    ],
    bedPoints: [
      {
        id: "bp-302-01",
        mapId: "map-ward-302",
        bedId: "bed-302-01",
        x: 24,
        y: 34,
        note: "床旁机器人停靠点。",
        createdAt: "2026-06-01T08:30",
        updatedAt: "2026-06-15T08:00"
      },
      {
        id: "bp-302-02",
        mapId: "map-ward-302",
        bedId: "bed-302-02",
        x: 58,
        y: 32,
        note: "靠近门口。",
        createdAt: "2026-06-01T08:40",
        updatedAt: "2026-06-15T08:10"
      },
      {
        id: "bp-302-03",
        mapId: "map-ward-302",
        bedId: "bed-302-03",
        x: 78,
        y: 68,
        note: "观察床点位。",
        createdAt: "2026-06-01T08:45",
        updatedAt: "2026-06-15T09:00"
      },
      {
        id: "bp-302-04",
        mapId: "map-ward-302",
        bedId: "bed-302-04",
        x: 35,
        y: 72,
        note: "停用病床点位。",
        createdAt: "2026-06-01T08:50",
        updatedAt: "2026-06-12T14:30"
      },
      {
        id: "bp-305-01",
        mapId: "map-ward-305",
        bedId: "bed-305-01",
        x: 30,
        y: 48,
        note: "维修点位。",
        createdAt: "2026-06-02T09:00",
        updatedAt: "2026-06-14T10:00"
      },
      {
        id: "bp-305-02",
        mapId: "map-ward-305",
        bedId: "bed-305-02",
        x: 66,
        y: 48,
        note: "下肢训练机器人通道旁。",
        createdAt: "2026-06-02T09:10",
        updatedAt: "2026-06-14T11:00"
      }
    ],
    navigationPoints: [
      {
        id: "np-2f-001",
        mapId: "map-nav-2f",
        name: "护士站前等待点",
        code: "NAV-2F-WAIT-01",
        type: "等待点",
        description: "护士站前公共等待区域。",
        note: "机器人跨病房任务默认等待点。",
        x: 18,
        y: 48,
        updatedAt: "2026-06-15T11:00"
      },
      {
        id: "np-2f-002",
        mapId: "map-nav-2f",
        name: "东侧电梯入口",
        code: "NAV-2F-ELEV-IN",
        type: "电梯入口",
        description: "东侧电梯厅入口。",
        note: "预留跨楼层导航接口。",
        x: 62,
        y: 22,
        updatedAt: "2026-06-15T11:10"
      },
      {
        id: "np-2f-003",
        mapId: "map-nav-2f",
        name: "二层充电点",
        code: "NAV-2F-CHARGE-01",
        type: "充电点",
        description: "二层公共走廊充电停靠点。",
        note: "靠近弱电间。",
        x: 78,
        y: 70,
        updatedAt: "2026-06-15T11:30"
      }
    ],
    navigationSegments: [
      {
        id: "seg-2f-001",
        mapId: "map-nav-2f",
        fromPointId: "np-2f-001",
        toPointId: "np-2f-002",
        updatedAt: "2026-06-15T11:20"
      },
      {
        id: "seg-2f-002",
        mapId: "map-nav-2f",
        fromPointId: "np-2f-002",
        toPointId: "np-2f-003",
        updatedAt: "2026-06-15T11:30"
      }
    ],
    noGoZones: [
      {
        id: "zone-2f-001",
        mapId: "map-nav-2f",
        name: "电梯厅禁行区",
        points: [
          { x: 58, y: 18 },
          { x: 70, y: 22 },
          { x: 68, y: 34 },
          { x: 56, y: 30 }
        ],
        updatedAt: "2026-06-15T11:40"
      }
    ],
    usageRecords: [
      {
        id: "usage-001",
        bedId: "bed-302-01",
        patientName: "张三",
        startAt: "2026-06-16T08:00",
        expectedEndAt: "2026-06-16T18:00",
        registrar: "李琴",
        registeredAt: "2026-06-16T07:40",
        note: "术后早期肩关节康复训练使用。"
      },
      {
        id: "usage-002",
        bedId: "bed-302-03",
        patientName: "李华",
        startAt: "2026-06-17T09:00",
        expectedEndAt: "2026-06-17T12:00",
        registrar: "周宁",
        registeredAt: "2026-06-15T16:20",
        note: "明日上午康复训练预约。"
      },
      {
        id: "usage-003",
        bedId: "bed-302-01",
        patientName: "张三",
        startAt: "2026-06-15T08:00",
        expectedEndAt: "2026-06-15T18:00",
        endAt: "2026-06-15T17:45",
        registrar: "李琴",
        registeredAt: "2026-06-15T07:50",
        note: "上一日使用记录。",
        endNote: "训练完成，床位释放。"
      }
    ],
    logs: [
      {
        id: "log-001",
        operator: "李琴",
        operatedAt: "2026-06-16T07:40",
        type: "病床使用登记",
        detail: "登记 BED-302-01 给患者张三使用。"
      },
      {
        id: "log-002",
        operator: "设备管理员",
        operatedAt: "2026-06-15T11:30",
        type: "编辑点位",
        detail: "更新二层公共导航地图充电点。"
      }
    ]
  };
}

function getStoredCampusState() {
  return readState<CampusState>(CAMPUS_STATE_KEY) ?? createCampusSeed();
}

function statusColorClass(status: BedUsageStatus | BedStatus) {
  if (status === "空闲" || status === "启用") {
    return "bg-emerald-500 text-white";
  }

  if (status === "使用中") {
    return "bg-rose-500 text-white";
  }

  if (status === "已预约") {
    return "bg-amber-400 text-surface-950";
  }

  if (status === "维修中") {
    return "bg-orange-500 text-white";
  }

  return "bg-surface-400 text-white";
}

function badgeClassForStatus(status: BedUsageStatus | BedStatus | CampusRecordStatus) {
  if (status === "启用" || status === "空闲") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "使用中") {
    return "bg-rose-100 text-rose-700";
  }

  if (status === "已预约") {
    return "bg-amber-100 text-amber-700";
  }

  if (status === "维修中") {
    return "bg-orange-100 text-orange-700";
  }

  return "bg-surface-100 text-surface-700";
}

function toDateTimeInput(value?: string) {
  return value ? value.slice(0, 16) : "";
}

function clampPercent(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return 50;
  }
  return Math.min(95, Math.max(5, parsed));
}

function appendLog(state: CampusState, type: string, detail: string) {
  state.logs.unshift({
    id: generateId("campus-log"),
    operator: "李琴",
    operatedAt: new Date().toISOString(),
    type,
    detail
  });
  state.logs = state.logs.slice(0, 80);
}

function deriveBedUsageStatus(bed: BedRecord, records: BedUsageRecord[], now = new Date()): BedUsageStatus {
  if (bed.status === "停用") {
    return "空闲";
  }

  if (bed.status === "维修中") {
    return "空闲";
  }

  const activeRecords = records.filter((record) => record.bedId === bed.id && !record.endAt);
  const current = activeRecords.find((record) => {
    const start = new Date(record.startAt);
    const end = new Date(record.expectedEndAt);
    return start <= now && now <= end;
  });

  if (current) {
    return "使用中";
  }

  const future = activeRecords.some((record) => new Date(record.startAt) > now);
  return future ? "已预约" : "空闲";
}

function getCurrentUsage(bed: BedRecord | null, records: BedUsageRecord[]) {
  if (!bed) {
    return null;
  }

  const now = new Date();
  return (
    records.find((record) => {
      if (record.bedId !== bed.id || record.endAt) {
        return false;
      }

      const start = new Date(record.startAt);
      const end = new Date(record.expectedEndAt);
      return start <= now && now <= end;
    }) ?? null
  );
}

function getNextReservation(bed: BedRecord | null, records: BedUsageRecord[]) {
  if (!bed) {
    return null;
  }

  const now = new Date();
  return (
    records
      .filter((record) => record.bedId === bed.id && !record.endAt && new Date(record.startAt) > now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0] ?? null
  );
}

function formatDuration(startAt: string, endAt?: string) {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt ?? new Date().toISOString()).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return "-";
  }

  const hours = (end - start) / (1000 * 60 * 60);
  return `${hours.toFixed(1)} 小时`;
}

function getBedDisplayStatus(bed: BedRecord, records: BedUsageRecord[]) {
  if (bed.status === "停用" || bed.status === "维修中") {
    return bed.status;
  }

  return deriveBedUsageStatus(bed, records);
}

function createDefaultMapDraft(): MapDraft {
  return {
    name: "",
    type: "病房地图",
    description: "",
    fileName: "",
    status: "启用"
  };
}

function createDefaultBedPointDraft(map?: CampusMap | null): BedPointDraft {
  return {
    code: "",
    name: "",
    wardName: map?.name.replace(/病房地图$/, "") ?? "",
    type: "康复床",
    status: "启用",
    note: "",
    x: "50",
    y: "50"
  };
}

function createDefaultNavPointDraft(): NavPointDraft {
  return {
    name: "",
    code: "",
    type: "路径点",
    description: "",
    note: "",
    x: "50",
    y: "50"
  };
}

function createDefaultBedDraft(): BedDraft {
  return {
    code: "",
    name: "",
    wardName: "",
    type: "康复床",
    status: "启用",
    note: "",
    mapId: "",
    x: "50",
    y: "50"
  };
}

function createUsageDraft(bed?: BedRecord | null): UsageDraft {
  return {
    patientName: "",
    startAt: toDateTimeInput(new Date().toISOString()),
    expectedEndAt: toDateTimeInput(new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()),
    note: bed ? `${bed.name} 使用登记` : ""
  };
}

function renderWardScanBlueprint(mapId: string) {
  if (mapId === "map-ward-302") {
    return (
      <>
        <div className="absolute left-[14%] top-[12%] h-[72%] w-[70%] border-[3px] border-surface-900/75 bg-white/95" />
        <div className="absolute left-[14%] top-[12%] h-[3px] w-[40%] bg-surface-900/75" />
        <div className="absolute left-[54%] top-[12%] h-[3px] w-[30%] bg-surface-900/75" />
        <div className="absolute left-[14%] top-[56%] h-[3px] w-[52%] bg-surface-900/75" />
        <div className="absolute left-[14%] top-[26%] h-[3px] w-[18%] bg-surface-900/75" />
        <div className="absolute left-[66%] top-[56%] h-[16%] w-[3px] bg-surface-900/75" />
        <div className="absolute left-[32%] top-[36%] h-[36%] w-[3px] bg-surface-900/75" />
        <div className="absolute left-[49%] top-[28%] h-[44%] w-[3px] bg-surface-900/75" />
        <div className="absolute left-[18%] top-[20%] h-[11%] w-[16%] border-[3px] border-surface-900/70" />
        <div className="absolute left-[54%] top-[20%] h-[11%] w-[16%] border-[3px] border-surface-900/70" />
        <div className="absolute left-[18%] top-[60%] h-[11%] w-[16%] border-[3px] border-surface-900/70" />
        <div className="absolute left-[54%] top-[60%] h-[11%] w-[16%] border-[3px] border-surface-900/70" />
        <div className="absolute left-[72%] top-[36%] h-[10%] w-[8%] border-[3px] border-surface-900/55" />
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(15,23,42,0.7)_0.7px,transparent_0.7px)] [background-size:18px_18px]" />
      </>
    );
  }

  return (
    <>
      <div className="absolute left-[18%] top-[12%] h-[72%] w-[62%] border-[3px] border-surface-900/75 bg-white/95" />
      <div className="absolute left-[18%] top-[34%] h-[3px] w-[42%] bg-surface-900/75" />
      <div className="absolute left-[18%] top-[56%] h-[3px] w-[42%] bg-surface-900/75" />
      <div className="absolute left-[60%] top-[20%] h-[50%] w-[3px] bg-surface-900/75" />
      <div className="absolute left-[32%] top-[18%] h-[10%] w-[18%] border-[3px] border-surface-900/70" />
      <div className="absolute left-[32%] top-[40%] h-[10%] w-[18%] border-[3px] border-surface-900/70" />
      <div className="absolute left-[32%] top-[62%] h-[10%] w-[18%] border-[3px] border-surface-900/70" />
      <div className="absolute left-[64%] top-[24%] h-[8%] w-[10%] border-[3px] border-surface-900/55" />
      <div className="absolute left-[64%] top-[40%] h-[8%] w-[10%] border-[3px] border-surface-900/55" />
      <div className="absolute left-[64%] top-[56%] h-[8%] w-[10%] border-[3px] border-surface-900/55" />
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(15,23,42,0.75)_0.7px,transparent_0.7px)] [background-size:16px_16px]" />
    </>
  );
}

function renderNavigationScanBlueprint() {
  return (
    <>
      <div className="absolute left-[10%] top-[14%] h-[16%] w-[76%] border-[3px] border-surface-900/70 bg-white/90" />
      <div className="absolute left-[24%] top-[14%] h-[58%] w-[10%] border-x-[3px] border-surface-900/70" />
      <div className="absolute left-[52%] top-[14%] h-[58%] w-[10%] border-x-[3px] border-surface-900/70" />
      <div className="absolute left-[10%] top-[64%] h-[14%] w-[76%] border-[3px] border-surface-900/70 bg-white/90" />
      <div className="absolute left-[10%] top-[38%] h-[3px] w-[76%] bg-surface-900/70" />
      <div className="absolute left-[10%] top-[52%] h-[3px] w-[76%] bg-surface-900/40" />
      <div className="absolute inset-0 opacity-15 [background-image:radial-gradient(rgba(15,23,42,0.75)_0.7px,transparent_0.7px)] [background-size:16px_16px]" />
    </>
  );
}

function useCampusState() {
  const [data, setData] = useState<CampusState>(getStoredCampusState);

  useEffect(() => {
    writeState(CAMPUS_STATE_KEY, data);
  }, [data]);

  return [data, setData] as const;
}

export function CampusMapsPage() {
  const navigate = useNavigate();
  const [data, setData] = useCampusState();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("全部");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [editingMap, setEditingMap] = useState<CampusMap | null>(null);
  const [mapDraft, setMapDraft] = useState<MapDraft>(createDefaultMapDraft);
  const [mapError, setMapError] = useState("");
  const [deleteMap, setDeleteMap] = useState<CampusMap | null>(null);
  const [message, setMessage] = useState("");

  const filteredMaps = useMemo(
    () =>
      data.maps.filter((map) => {
        const keywordMatch =
          !query ||
          [map.name, map.description, map.fileName].join(" ").toLowerCase().includes(query.toLowerCase());
        const typeMatch = typeFilter === "全部" || map.type === typeFilter;
        const statusMatch = statusFilter === "全部" || map.status === statusFilter;
        return keywordMatch && typeMatch && statusMatch;
      }),
    [data.maps, query, statusFilter, typeFilter]
  );

  const updateCampus = (mutator: (next: CampusState) => void) => {
    setData((current) => {
      const next = structuredClone(current);
      mutator(next);
      return next;
    });
  };

  const resetFilters = () => {
    setQuery("");
    setTypeFilter("全部");
    setStatusFilter("全部");
  };

  const openCreateMap = () => {
    setEditingMap(null);
    setMapDraft(createDefaultMapDraft());
    setMapError("");
    setMapDialogOpen(true);
  };

  const openEditMap = (map: CampusMap) => {
    setEditingMap(map);
    setMapDraft({
      name: map.name,
      type: map.type,
      description: map.description,
      fileName: map.fileName,
      status: map.status
    });
    setMapError("");
    setMapDialogOpen(true);
  };

  const submitMap = () => {
    if (!mapDraft.name.trim() || !mapDraft.fileName.trim()) {
      setMapError("请补全地图名称并上传地图文件。");
      return;
    }

    updateCampus((next) => {
      if (editingMap) {
        next.maps = next.maps.map((map) =>
          map.id === editingMap.id
            ? {
                ...map,
                ...mapDraft,
                updatedAt: new Date().toISOString()
              }
            : map
        );
      } else {
        next.maps.unshift({
          id: generateId("campus-map"),
          ...mapDraft,
          creator: "李琴",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    });
    setMapDialogOpen(false);
  };

  const confirmDeleteMap = () => {
    if (!deleteMap) {
      return;
    }

    const hasBedPoints = data.bedPoints.some((point) => point.mapId === deleteMap.id);
    const hasNavPoints = data.navigationPoints.some((point) => point.mapId === deleteMap.id);
    if (hasBedPoints || hasNavPoints) {
      setMessage(`地图“${deleteMap.name}”存在${hasBedPoints ? "病床" : "导航"}点位关联，不允许删除。`);
      setDeleteMap(null);
      return;
    }

    updateCampus((next) => {
      next.maps = next.maps.filter((map) => map.id !== deleteMap.id);
    });
    setDeleteMap(null);
  };

  const goToMapDetail = (mapId: string) => {
    navigate({ to: `/campus/maps/${mapId}` });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeader
        eyebrow="院区管理 > 地图管理"
        title="地图管理"
        description="统一管理病房地图、公共导航地图及其点位。"
        badge="地图列表"
        actions={
          <Button onClick={openCreateMap}>
            <Plus className="h-4 w-4" />
            新增地图
          </Button>
        }
      />

      {message ? <p className="text-sm text-primary">{message}</p> : null}

      <FilterBar
        actions={
          <>
            <Button variant="secondary" onClick={resetFilters}>重置</Button>
            <Button>查询</Button>
          </>
        }
      >
        <Field label="地图名称">
          <Input value={query} placeholder="骨科三病区302" onChange={(event) => setQuery(event.target.value)} />
        </Field>
        <Field label="地图类型">
          <select className="native-select" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="全部">全部</option>
            {mapTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </Field>
        <Field label="状态">
          <select className="native-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="全部">全部</option>
            {recordStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </Field>
      </FilterBar>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CardHeader className="border-b border-border/60">
          <CardTitle>地图列表</CardTitle>
          <p className="text-sm text-muted-foreground">共 {filteredMaps.length} 张地图</p>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>序号</TableHead>
                <TableHead>地图名称</TableHead>
                <TableHead>地图类型</TableHead>
                <TableHead>地图说明</TableHead>
                <TableHead>关联病床数量</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaps.map((map, index) => (
                <TableRow key={map.id} className="cursor-pointer" onClick={() => goToMapDetail(map.id)}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{map.name}</TableCell>
                  <TableCell>{map.type}</TableCell>
                  <TableCell className="max-w-[260px] truncate">{map.description}</TableCell>
                  <TableCell>{data.bedPoints.filter((point) => point.mapId === map.id).length}</TableCell>
                  <TableCell>{formatDateTime(map.createdAt)}</TableCell>
                  <TableCell><Badge className={badgeClassForStatus(map.status)}>{map.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); goToMapDetail(map.id); }}>
                        <LocateFixed className="h-4 w-4" />
                        点位
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); openEditMap(map); }}>
                        <Edit3 className="h-4 w-4" />
                        编辑
                      </Button>
                      <Button variant="ghost" size="sm" className="text-rose-600" onClick={(event) => { event.stopPropagation(); setDeleteMap(map); }}>
                        <Trash2 className="h-4 w-4" />
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DialogFormShell
        open={mapDialogOpen}
        onOpenChange={setMapDialogOpen}
        title={editingMap ? "编辑地图" : "新增地图"}
        description="支持病房地图和导航地图，地图文件支持 PNG、JPG、JPEG、SVG。"
        onSubmit={submitMap}
        submitLabel={editingMap ? "保存" : "新增"}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="地图名称" required>
            <Input value={mapDraft.name} onChange={(event) => setMapDraft((current) => ({ ...current, name: event.target.value }))} />
          </Field>
          <Field label="地图类型" required>
            <select className="native-select" value={mapDraft.type} onChange={(event) => setMapDraft((current) => ({ ...current, type: event.target.value as CampusMapType }))}>
              {mapTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </Field>
          <Field label="状态">
            <select className="native-select" value={mapDraft.status} onChange={(event) => setMapDraft((current) => ({ ...current, status: event.target.value as CampusRecordStatus }))}>
              {recordStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </Field>
          <Field label="上传地图文件" required>
            <Input
              type="file"
              accept=".png,.jpg,.jpeg,.svg"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setMapDraft((current) => ({ ...current, fileName: file.name }));
                }
              }}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="地图说明">
              <Textarea value={mapDraft.description} onChange={(event) => setMapDraft((current) => ({ ...current, description: event.target.value }))} />
            </Field>
          </div>
        </div>
        {mapDraft.fileName ? <p className="text-sm text-muted-foreground">当前文件：{mapDraft.fileName}</p> : null}
        {mapError ? <p className="text-sm text-rose-700">{mapError}</p> : null}
      </DialogFormShell>

      <DialogFormShell
        open={Boolean(deleteMap)}
        onOpenChange={(open) => !open && setDeleteMap(null)}
        title={`确定删除“${deleteMap?.name ?? ""}”吗？`}
        description="若存在病床关联或导航点位关联，将阻止删除。"
        onSubmit={confirmDeleteMap}
        submitLabel="确认删除"
      />
    </div>
  );
}

export function CampusMapDetailPage({ mapId }: { mapId: string }) {
  const navigate = useNavigate();
  const [data, setData] = useCampusState();
  const [highlightPointId, setHighlightPointId] = useState("");
  const [message, setMessage] = useState("");
  const [bedPointDialogOpen, setBedPointDialogOpen] = useState(false);
  const [editingBedPoint, setEditingBedPoint] = useState<BedPoint | null>(null);
  const [bedPointDraft, setBedPointDraft] = useState<BedPointDraft>(createDefaultBedPointDraft);
  const [bedPointError, setBedPointError] = useState("");
  const [navPointDialogOpen, setNavPointDialogOpen] = useState(false);
  const [editingNavPoint, setEditingNavPoint] = useState<NavigationPoint | null>(null);
  const [navPointDraft, setNavPointDraft] = useState<NavPointDraft>(createDefaultNavPointDraft);
  const [segmentDialogOpen, setSegmentDialogOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<NavigationSegment | null>(null);
  const [segmentDraft, setSegmentDraft] = useState({ fromPointId: "", toPointId: "" });
  const [pointPreview, setPointPreview] = useState<BedPoint | NavigationPoint | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [fullscreen, setFullscreen] = useState(false);
  const [interactionMode, setInteractionMode] = useState<MapInteractionMode>("pan");
  const [pendingLinkPointId, setPendingLinkPointId] = useState("");
  const [draftZonePoints, setDraftZonePoints] = useState<ZoneVertex[]>([]);
  const [editingZoneId, setEditingZoneId] = useState("");
  const [dragStart, setDragStart] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const mapAreaRef = useRef<HTMLDivElement | null>(null);

  const selectedMap = data.maps.find((map) => map.id === mapId) ?? null;
  const currentBedPoints = selectedMap ? data.bedPoints.filter((point) => point.mapId === selectedMap.id) : [];
  const currentNavPoints = selectedMap ? data.navigationPoints.filter((point) => point.mapId === selectedMap.id) : [];
  const currentSegments = selectedMap ? data.navigationSegments.filter((segment) => segment.mapId === selectedMap.id) : [];
  const currentZones = selectedMap ? data.noGoZones.filter((zone) => zone.mapId === selectedMap.id) : [];
  const selectedBedPoint = pointPreview && "bedId" in pointPreview ? pointPreview : null;
  const selectedNavPoint = pointPreview && "code" in pointPreview && !("bedId" in pointPreview) ? pointPreview : null;
  const selectedBed = selectedBedPoint ? data.beds.find((bed) => bed.id === selectedBedPoint.bedId) ?? null : null;
  const selectedBedUsage = getCurrentUsage(selectedBed, data.usageRecords) ?? getNextReservation(selectedBed, data.usageRecords);

  useEffect(() => {
    const locate = readState<LocateState>(CAMPUS_LOCATE_KEY);
    if (locate?.mapId === mapId) {
      setHighlightPointId(locate.pointId);
      setZoom(1.35);
      setPan({ x: 0, y: 0 });
      setMessage("已定位到病床绑定点位。");
      clearState(CAMPUS_LOCATE_KEY);
    }

  }, [mapId, selectedMap]);

  const updateCampus = (mutator: (next: CampusState) => void) => {
    setData((current) => {
      const next = structuredClone(current);
      mutator(next);
      return next;
    });
  };

  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const frame = mapAreaRef.current?.querySelector("[data-map-frame='true']") as HTMLDivElement | null;
    if (!frame) {
      return;
    }

    const rect = frame.getBoundingClientRect();
    const x = clampPercent(((event.clientX - rect.left) / rect.width) * 100);
    const y = clampPercent(((event.clientY - rect.top) / rect.height) * 100);

    if (interactionMode === "pick-bed") {
      setBedPointDraft((current) => ({ ...current, x: String(x), y: String(y) }));
      setInteractionMode("pan");
      setMessage(`已加载病床点位坐标：${x}% / ${y}%。`);
      return;
    }

    if (interactionMode === "pick-nav") {
      setNavPointDraft((current) => ({ ...current, x: String(x), y: String(y) }));
      setInteractionMode("pan");
      setMessage(`已加载导航点位坐标：${x}% / ${y}%。`);
      return;
    }

    if (interactionMode === "polygon") {
      setDraftZonePoints((current) => [...current, { x, y }]);
    }
  };

  const createNavigationSegment = (pointId: string) => {
    if (!selectedMap || selectedMap.type !== "导航地图") {
      return;
    }

    if (!pendingLinkPointId) {
      setPendingLinkPointId(pointId);
      setMessage("已选择起点，请点击第二个点位完成连线。");
      return;
    }

    if (pendingLinkPointId === pointId) {
      return;
    }

    const exists = data.navigationSegments.some(
      (segment) =>
        segment.mapId === selectedMap.id &&
        ((segment.fromPointId === pendingLinkPointId && segment.toPointId === pointId) ||
          (segment.fromPointId === pointId && segment.toPointId === pendingLinkPointId))
    );

    if (!exists) {
      updateCampus((next) => {
        next.navigationSegments.unshift({
          id: generateId("nav-segment"),
          mapId: selectedMap.id,
          fromPointId: pendingLinkPointId,
          toPointId: pointId,
          updatedAt: new Date().toISOString()
        });
      });
    }

    setPendingLinkPointId("");
    setInteractionMode("pan");
    setMessage("导航连线已创建。");
  };

  const saveNoGoZone = () => {
    if (!selectedMap || draftZonePoints.length < 3) {
      return;
    }

    updateCampus((next) => {
      const now = new Date().toISOString();
      if (editingZoneId) {
        next.noGoZones = next.noGoZones.map((zone) =>
          zone.id === editingZoneId
            ? { ...zone, points: draftZonePoints, updatedAt: now }
            : zone
        );
      } else {
        next.noGoZones.unshift({
          id: generateId("no-go-zone"),
          mapId: selectedMap.id,
          name: `禁行区 ${next.noGoZones.filter((zone) => zone.mapId === selectedMap.id).length + 1}`,
          points: draftZonePoints,
          updatedAt: now
        });
      }
    });

    setDraftZonePoints([]);
    setEditingZoneId("");
    setInteractionMode("pan");
    setMessage(editingZoneId ? "禁行区已更新。" : "禁行区已标记。");
  };

  const pickDraftPointFromPreview = (
    event: React.MouseEvent<HTMLDivElement>,
    target: "bed" | "nav"
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clampPercent(((event.clientX - rect.left) / rect.width) * 100);
    const y = clampPercent(((event.clientY - rect.top) / rect.height) * 100);

    if (target === "bed") {
      setBedPointDraft((current) => ({ ...current, x: String(x), y: String(y) }));
      return;
    }

    setNavPointDraft((current) => ({ ...current, x: String(x), y: String(y) }));
  };

  const openCreateBedPoint = () => {
    setEditingBedPoint(null);
    setBedPointDraft(createDefaultBedPointDraft(selectedMap));
    setBedPointError("");
    setInteractionMode("pan");
    setBedPointDialogOpen(true);
  };

  const openEditBedPoint = (point: BedPoint) => {
    const bed = data.beds.find((item) => item.id === point.bedId);
    setEditingBedPoint(point);
    setBedPointDraft({
      bedId: bed?.id,
      code: bed?.code ?? "",
      name: bed?.name ?? "",
      wardName: bed?.wardName ?? selectedMap?.name.replace(/病房地图$/, "") ?? "",
      type: bed?.type ?? "康复床",
      status: bed?.status ?? "启用",
      note: bed?.note ?? point.note,
      x: String(point.x),
      y: String(point.y)
    });
    setBedPointError("");
    setInteractionMode("pan");
    setBedPointDialogOpen(true);
  };

  const submitBedPoint = () => {
    if (!selectedMap || selectedMap.type !== "病房地图") {
      setBedPointError("病床点位仅允许在病房地图中创建。");
      return;
    }
    if (!bedPointDraft.code.trim() || !bedPointDraft.name.trim()) {
      setBedPointError("请补全病床编号和病床名称。");
      return;
    }
    const duplicated = data.beds.find(
      (bed) =>
        bed.code === bedPointDraft.code.trim() &&
        bed.id !== bedPointDraft.bedId &&
        bed.id !== data.beds.find((item) => item.id === editingBedPoint?.bedId)?.id
    );
    if (duplicated) {
      setBedPointError("病床编号全院唯一，当前编号已存在。");
      return;
    }

    updateCampus((next) => {
      const now = new Date().toISOString();
      if (editingBedPoint) {
        const pointId = editingBedPoint.id;
        next.bedPoints = next.bedPoints.map((point) =>
          point.id === pointId ? { ...point, x: clampPercent(bedPointDraft.x), y: clampPercent(bedPointDraft.y), note: bedPointDraft.note, updatedAt: now } : point
        );
        next.beds = next.beds.map((bed) =>
          bed.id === editingBedPoint.bedId
            ? { ...bed, code: bedPointDraft.code.trim(), name: bedPointDraft.name.trim(), wardName: bedPointDraft.wardName.trim() || selectedMap.name, type: bedPointDraft.type, status: bedPointDraft.status, note: bedPointDraft.note, mapId: selectedMap.id, pointId, x: clampPercent(bedPointDraft.x), y: clampPercent(bedPointDraft.y), updatedAt: now }
            : bed
        );
      } else {
        const bedId = generateId("bed");
        const pointId = generateId("bed-point");
        next.beds.unshift({ id: bedId, code: bedPointDraft.code.trim(), name: bedPointDraft.name.trim(), wardName: bedPointDraft.wardName.trim() || selectedMap.name, type: bedPointDraft.type, status: bedPointDraft.status, note: bedPointDraft.note, mapId: selectedMap.id, pointId, x: clampPercent(bedPointDraft.x), y: clampPercent(bedPointDraft.y), updatedAt: now });
        next.bedPoints.unshift({ id: pointId, mapId: selectedMap.id, bedId, x: clampPercent(bedPointDraft.x), y: clampPercent(bedPointDraft.y), note: bedPointDraft.note, createdAt: now, updatedAt: now });
      }
    });
    setInteractionMode("pan");
    setBedPointDialogOpen(false);
  };

  const deleteBedPoint = (point: BedPoint) => {
    updateCampus((next) => {
      next.bedPoints = next.bedPoints.filter((item) => item.id !== point.id);
      next.beds = next.beds.map((item) =>
        item.id === point.bedId ? { ...item, mapId: undefined, pointId: undefined, x: undefined, y: undefined, updatedAt: new Date().toISOString() } : item
      );
    });
  };

  const openCreateNavPoint = () => {
    setEditingNavPoint(null);
    setNavPointDraft(createDefaultNavPointDraft());
    setInteractionMode("pan");
    setNavPointDialogOpen(true);
  };

  const openEditNavPoint = (point: NavigationPoint) => {
    setEditingNavPoint(point);
    setNavPointDraft({ id: point.id, name: point.name, code: point.code, type: point.type, description: point.description, note: point.note, x: String(point.x), y: String(point.y) });
    setInteractionMode("pan");
    setNavPointDialogOpen(true);
  };

  const submitNavPoint = () => {
    if (!selectedMap || selectedMap.type !== "导航地图" || !navPointDraft.name.trim() || !navPointDraft.code.trim()) {
      return;
    }

    updateCampus((next) => {
      const now = new Date().toISOString();
      if (editingNavPoint) {
        next.navigationPoints = next.navigationPoints.map((point) =>
          point.id === editingNavPoint.id ? { ...point, name: navPointDraft.name.trim(), code: navPointDraft.code.trim(), type: navPointDraft.type, description: navPointDraft.description, note: navPointDraft.note, x: clampPercent(navPointDraft.x), y: clampPercent(navPointDraft.y), updatedAt: now } : point
        );
      } else {
        next.navigationPoints.unshift({ id: generateId("nav-point"), mapId: selectedMap.id, name: navPointDraft.name.trim(), code: navPointDraft.code.trim(), type: navPointDraft.type, description: navPointDraft.description, note: navPointDraft.note, x: clampPercent(navPointDraft.x), y: clampPercent(navPointDraft.y), updatedAt: now });
      }
    });
    setInteractionMode("pan");
    setNavPointDialogOpen(false);
  };

  const deleteNavPoint = (point: NavigationPoint) => {
    updateCampus((next) => {
      next.navigationPoints = next.navigationPoints.filter((item) => item.id !== point.id);
    });
  };

  const openEditSegment = (segment: NavigationSegment) => {
    setEditingSegment(segment);
    setSegmentDraft({ fromPointId: segment.fromPointId, toPointId: segment.toPointId });
    setSegmentDialogOpen(true);
  };

  const submitSegment = () => {
    if (!selectedMap || selectedMap.type !== "导航地图" || !editingSegment) {
      return;
    }
    if (!segmentDraft.fromPointId || !segmentDraft.toPointId || segmentDraft.fromPointId === segmentDraft.toPointId) {
      setMessage("请为导航连线选择两个不同的点位。");
      return;
    }

    updateCampus((next) => {
      next.navigationSegments = next.navigationSegments.map((segment) =>
        segment.id === editingSegment.id
          ? {
              ...segment,
              fromPointId: segmentDraft.fromPointId,
              toPointId: segmentDraft.toPointId,
              updatedAt: new Date().toISOString()
            }
          : segment
      );
    });

    setEditingSegment(null);
    setSegmentDialogOpen(false);
    setMessage("导航连线已更新。");
  };

  const deleteSegment = (segmentId: string) => {
    updateCampus((next) => {
      next.navigationSegments = next.navigationSegments.filter((segment) => segment.id !== segmentId);
    });
    setMessage("导航连线已删除。");
  };

  const startEditZone = (zone: NoGoZone) => {
    setEditingZoneId(zone.id);
    setDraftZonePoints(zone.points);
    setInteractionMode("polygon");
    setMessage("已载入禁行区边界，可撤销、清空重绘后保存。");
  };

  const deleteNoGoZone = (zoneId: string) => {
    updateCampus((next) => {
      next.noGoZones = next.noGoZones.filter((zone) => zone.id !== zoneId);
    });
    if (editingZoneId === zoneId) {
      setEditingZoneId("");
      setDraftZonePoints([]);
      setInteractionMode("pan");
    }
    setMessage("禁行区已删除。");
  };

  if (!selectedMap) {
    return <EmptyState title="地图不存在" />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeader
        eyebrow={`院区管理 > 地图管理 > ${selectedMap.name}`}
        title={selectedMap.type === "病房地图" ? "病房地图" : "导航地图"}
        description={selectedMap.description || "维护地图点位与地图联动数据。"}
        badge={selectedMap.fileName}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate({ to: "/campus/maps" })}>
              <ArrowLeft className="h-4 w-4" />
              返回列表
            </Button>
            <Button onClick={selectedMap.type === "病房地图" ? openCreateBedPoint : openCreateNavPoint}>
              <Plus className="h-4 w-4" />
              新增点位
            </Button>
          </>
        }
      />

      {message ? <p className="text-sm text-primary">{message}</p> : null}

      <CollapsibleSplitLayout
        label={selectedMap.type === "病房地图" ? "点位列表" : "地图侧栏"}
        defaultCollapsed={false}
        sideWidthClassName="w-full xl:w-[360px]"
        main={
          <Card className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", fullscreen && "fixed inset-4 z-50")}>
            <CardHeader className="border-b border-border/60">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle>{selectedMap.name}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedMap.type} · {selectedMap.fileName}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant={interactionMode === "pan" ? "default" : "outline"} size="sm" onClick={() => { setInteractionMode("pan"); setPendingLinkPointId(""); }}>
                      拖拽
                    </Button>
                    {selectedMap.type === "导航地图" ? (
                      <Button variant={interactionMode === "link" ? "default" : "outline"} size="sm" onClick={() => { setInteractionMode("link"); setPendingLinkPointId(""); setMessage("请依次点击两个导航点位完成连线。"); }}>
                        连线工具
                      </Button>
                    ) : null}
                    <Button variant={interactionMode === "polygon" ? "default" : "outline"} size="sm" onClick={() => { setInteractionMode("polygon"); setEditingZoneId(""); setDraftZonePoints([]); setMessage("请在地图上连续点击绘制禁行区。"); }}>
                      禁行区工具
                    </Button>
                    {interactionMode === "polygon" ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setDraftZonePoints((current) => current.slice(0, -1))} disabled={!draftZonePoints.length}>撤销一点</Button>
                        <Button variant="outline" size="sm" onClick={() => setDraftZonePoints([])} disabled={!draftZonePoints.length}>清空重绘</Button>
                        <Button variant="outline" size="sm" onClick={saveNoGoZone} disabled={draftZonePoints.length < 3}>{editingZoneId ? "保存禁行区" : "完成禁行区"}</Button>
                        <Button variant="outline" size="sm" onClick={() => { setDraftZonePoints([]); setEditingZoneId(""); setInteractionMode("pan"); }}>取消</Button>
                      </>
                    ) : null}
                    <Button variant="outline" size="sm" onClick={() => setZoom((value) => Math.min(2, value + 0.1))}><ZoomIn className="h-4 w-4" />放大</Button>
                    <Button variant="outline" size="sm" onClick={() => setZoom((value) => Math.max(0.65, value - 0.1))}><Minus className="h-4 w-4" />缩小</Button>
                    <Button variant="outline" size="sm" onClick={() => setFullscreen((value) => !value)}><Expand className="h-4 w-4" />全屏</Button>
                    <Button variant="outline" size="sm" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><RotateCcw className="h-4 w-4" />重置视图</Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {interactionMode === "pick-bed" || interactionMode === "pick-nav" ? "地图选点中：请直接点击中间地图加载坐标。" : null}
                  {interactionMode === "link" ? "连线模式：点击两个导航点位建立路径。" : null}
                  {interactionMode === "polygon" ? `禁行区绘制中：已记录 ${draftZonePoints.length} 个顶点。` : null}
                </p>
              </div>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 p-4">
              <div
                ref={mapAreaRef}
                className={cn(
                  "relative h-full min-h-[560px] overflow-hidden rounded-[1.5rem] border border-border/70 bg-surface-100",
                  interactionMode === "pan" ? "cursor-grab" : "cursor-crosshair"
                )}
                onMouseDown={(event) => {
                  if (interactionMode !== "pan") return;
                  setDragStart({ x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y });
                }}
                onMouseMove={(event) => {
                  if (!dragStart || interactionMode !== "pan") return;
                  setPan({ x: dragStart.panX + event.clientX - dragStart.x, y: dragStart.panY + event.clientY - dragStart.y });
                }}
                onMouseUp={() => setDragStart(null)}
                onMouseLeave={() => setDragStart(null)}
                onClick={handleMapClick}
              >
                <div
                  data-map-frame="true"
                  className="absolute inset-8 overflow-hidden rounded-[1.75rem] border border-surface-300 bg-white shadow-inner"
                  style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "center" }}
                >
                  {selectedMap.type === "病房地图" ? renderWardScanBlueprint(selectedMap.id) : renderNavigationScanBlueprint()}
                  <div className="absolute left-8 top-6 flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-surface-700 shadow-soft">
                    <FileImage className="h-4 w-4" />
                    {selectedMap.fileName}
                  </div>
                  <svg className="absolute inset-0 h-full w-full">
                    {currentSegments.map((segment) => {
                      const fromPoint = currentNavPoints.find((point) => point.id === segment.fromPointId);
                      const toPoint = currentNavPoints.find((point) => point.id === segment.toPointId);
                      if (!fromPoint || !toPoint) return null;
                      return <line key={segment.id} x1={`${fromPoint.x}%`} y1={`${fromPoint.y}%`} x2={`${toPoint.x}%`} y2={`${toPoint.y}%`} stroke="#2563eb" strokeWidth="4" strokeLinecap="round" opacity="0.8" />;
                    })}
                    {currentZones.map((zone) => (
                      <polygon key={zone.id} points={zone.points.map((point) => `${point.x}% ${point.y}%`).join(" ")} fill="rgba(239,68,68,0.18)" stroke="#ef4444" strokeWidth="3" strokeDasharray="8 6" />
                    ))}
                    {draftZonePoints.length ? (
                      <>
                        {draftZonePoints.length >= 3 ? (
                          <polygon points={draftZonePoints.map((point) => `${point.x}% ${point.y}%`).join(" ")} fill="rgba(245,158,11,0.14)" stroke="#f59e0b" strokeWidth="3" strokeDasharray="8 6" />
                        ) : (
                          <polyline points={draftZonePoints.map((point) => `${point.x}% ${point.y}%`).join(" ")} fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="8 6" />
                        )}
                        {draftZonePoints.map((point, index) => (
                          <circle key={`${point.x}-${point.y}-${index}`} cx={`${point.x}%`} cy={`${point.y}%`} r="7" fill="#f59e0b" stroke="white" strokeWidth="3" />
                        ))}
                      </>
                    ) : null}
                  </svg>

                  {selectedMap.type === "病房地图"
                    ? currentBedPoints.map((point) => {
                        const bed = data.beds.find((item) => item.id === point.bedId);
                        if (!bed) return null;
                        const displayStatus = getBedDisplayStatus(bed, data.usageRecords);
                        return (
                          <button
                            key={point.id}
                            type="button"
                            className={cn("absolute flex h-16 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-2xl border-2 border-white text-xs font-semibold shadow-panel transition hover:scale-105", statusColorClass(displayStatus), highlightPointId === point.id && "ring-4 ring-primary/45")}
                            style={{ left: `${point.x}%`, top: `${point.y}%` }}
                            onClick={(event) => {
                              event.stopPropagation();
                              setPointPreview(point);
                              setHighlightPointId(point.id);
                            }}
                          >
                            <span>{bed.code}</span>
                            <span className="mt-1 text-[11px] opacity-90">{displayStatus}</span>
                          </button>
                        );
                      })
                    : currentNavPoints.map((point) => (
                        <button
                          key={point.id}
                          type="button"
                          className={cn("absolute flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-white shadow-panel transition hover:scale-105", pendingLinkPointId === point.id ? "bg-amber-500" : "bg-primary")}
                          style={{ left: `${point.x}%`, top: `${point.y}%` }}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (interactionMode === "link") {
                              createNavigationSegment(point.id);
                              return;
                            }
                            setPointPreview(point);
                          }}
                          title={point.name}
                        >
                          <Route className="h-5 w-5" />
                        </button>
                      ))}
                </div>
              </div>
            </CardContent>
          </Card>
        }
        side={
          <Card className="flex min-h-0 flex-col overflow-hidden">
            <CardHeader className="border-b border-border/60">
              <CardTitle>{selectedMap.type === "病房地图" ? "点位列表" : "地图侧栏"}</CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
              <SectionCard title={selectedMap.type === "病房地图" ? "病床点位" : "导航点位"}>
                <div className="space-y-2">
                  {selectedMap.type === "病房地图" ? (
                    currentBedPoints.length ? currentBedPoints.map((point) => {
                      const bed = data.beds.find((item) => item.id === point.bedId);
                      const status = bed ? getBedDisplayStatus(bed, data.usageRecords) : "空闲";
                      return (
                        <div key={point.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-50 px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-surface-900">{bed?.code ?? point.id}</p>
                            <p className="text-xs text-muted-foreground">{bed?.name ?? "未关联病床"} · {point.x}% / {point.y}%</p>
                          </div>
                          <div className="flex gap-1">
                            <Badge className={badgeClassForStatus(status)}>{status}</Badge>
                            <Button variant="ghost" size="sm" onClick={() => openEditBedPoint(point)}>编辑</Button>
                            <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => deleteBedPoint(point)}>删除</Button>
                          </div>
                        </div>
                      );
                    }) : <EmptyState title="暂无病床点位" />
                  ) : currentNavPoints.length ? currentNavPoints.map((point) => (
                    <div key={point.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-50 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-surface-900">{point.name}</p>
                        <p className="text-xs text-muted-foreground">{point.code} · {point.type}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditNavPoint(point)}>编辑</Button>
                        <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => deleteNavPoint(point)}>删除</Button>
                      </div>
                    </div>
                  )) : <EmptyState title="暂无导航点位" />}
                </div>
              </SectionCard>
              {selectedMap.type === "导航地图" ? (
                <>
                  <SectionCard title="导航连线">
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {currentSegments.length ? currentSegments.map((segment) => {
                        const fromPoint = currentNavPoints.find((point) => point.id === segment.fromPointId);
                        const toPoint = currentNavPoints.find((point) => point.id === segment.toPointId);
                        return (
                          <div key={segment.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-50 px-3 py-2">
                            <p>{fromPoint?.name ?? segment.fromPointId} {" -> "} {toPoint?.name ?? segment.toPointId}</p>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditSegment(segment)}>编辑</Button>
                              <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => deleteSegment(segment.id)}>删除</Button>
                            </div>
                          </div>
                        );
                      }) : <p>暂无导航连线</p>}
                    </div>
                  </SectionCard>
                </>
              ) : null}
              <SectionCard title="禁行区">
                <div className="space-y-2 text-sm text-muted-foreground">
                  {currentZones.length ? currentZones.map((zone) => (
                    <div key={zone.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-50 px-3 py-2">
                      <p>{zone.name} · {zone.points.length} 个顶点</p>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => startEditZone(zone)}>编辑</Button>
                        <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => deleteNoGoZone(zone.id)}>删除</Button>
                      </div>
                    </div>
                  )) : <p>暂无禁行区</p>}
                </div>
              </SectionCard>
            </CardContent>
          </Card>
        }
      />

      <DialogFormShell open={bedPointDialogOpen} onOpenChange={setBedPointDialogOpen} title={editingBedPoint ? "编辑病床点位" : "新增病床点位"} description="保存后自动同步病床管理；删除点位只解除地图关联。" onSubmit={submitBedPoint} submitLabel="保存">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="病床编号" required><Input value={bedPointDraft.code} onChange={(event) => setBedPointDraft((current) => ({ ...current, code: event.target.value }))} /></Field>
          <Field label="病床名称" required><Input value={bedPointDraft.name} onChange={(event) => setBedPointDraft((current) => ({ ...current, name: event.target.value }))} /></Field>
          <Field label="所属病房"><Input value={bedPointDraft.wardName} onChange={(event) => setBedPointDraft((current) => ({ ...current, wardName: event.target.value }))} /></Field>
          <Field label="病床类型"><Input value={bedPointDraft.type} onChange={(event) => setBedPointDraft((current) => ({ ...current, type: event.target.value }))} /></Field>
          <Field label="病床状态">
            <select className="native-select" value={bedPointDraft.status} onChange={(event) => setBedPointDraft((current) => ({ ...current, status: event.target.value as BedStatus }))}>
              {bedStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </Field>
          <Field label="地图位置">
            <div className="space-y-2">
              <Input value={bedPointDraft.x && bedPointDraft.y ? `${bedPointDraft.x}% / ${bedPointDraft.y}%` : ""} readOnly placeholder="点击下方按钮后，在地图中选点" />
              <div
                className="relative h-40 cursor-crosshair overflow-hidden rounded-xl border border-border/70 bg-surface-100"
                onClick={(event) => pickDraftPointFromPreview(event, "bed")}
              >
                {selectedMap ? renderWardScanBlueprint(selectedMap.id) : null}
                {bedPointDraft.x && bedPointDraft.y ? (
                  <div className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary" style={{ left: `${bedPointDraft.x}%`, top: `${bedPointDraft.y}%` }} />
                ) : null}
              </div>
            </div>
          </Field>
          <div className="md:col-span-2"><Field label="备注"><Textarea value={bedPointDraft.note} onChange={(event) => setBedPointDraft((current) => ({ ...current, note: event.target.value }))} /></Field></div>
        </div>
        {bedPointError ? <p className="text-sm text-rose-700">{bedPointError}</p> : null}
      </DialogFormShell>

      <DialogFormShell open={navPointDialogOpen} onOpenChange={setNavPointDialogOpen} title={editingNavPoint ? "编辑导航点位" : "新增导航点位"} description="导航地图不允许创建病床点位，仅用于机器人导航。" onSubmit={submitNavPoint} submitLabel="保存">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="点位名称" required><Input value={navPointDraft.name} onChange={(event) => setNavPointDraft((current) => ({ ...current, name: event.target.value }))} /></Field>
          <Field label="点位编码" required><Input value={navPointDraft.code} onChange={(event) => setNavPointDraft((current) => ({ ...current, code: event.target.value }))} /></Field>
          <Field label="点位类型">
            <select className="native-select" value={navPointDraft.type} onChange={(event) => setNavPointDraft((current) => ({ ...current, type: event.target.value as NavigationPointType }))}>
              {navigationPointTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </Field>
          <Field label="地图位置">
            <div className="space-y-2">
              <Input value={navPointDraft.x && navPointDraft.y ? `${navPointDraft.x}% / ${navPointDraft.y}%` : ""} readOnly placeholder="点击下方按钮后，在地图中选点" />
              <div
                className="relative h-40 cursor-crosshair overflow-hidden rounded-xl border border-border/70 bg-surface-100"
                onClick={(event) => pickDraftPointFromPreview(event, "nav")}
              >
                {renderNavigationScanBlueprint()}
                {navPointDraft.x && navPointDraft.y ? (
                  <div className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary" style={{ left: `${navPointDraft.x}%`, top: `${navPointDraft.y}%` }} />
                ) : null}
              </div>
            </div>
          </Field>
          <div className="md:col-span-2"><Field label="描述"><Textarea value={navPointDraft.description} onChange={(event) => setNavPointDraft((current) => ({ ...current, description: event.target.value }))} /></Field></div>
          <div className="md:col-span-2"><Field label="备注"><Textarea value={navPointDraft.note} onChange={(event) => setNavPointDraft((current) => ({ ...current, note: event.target.value }))} /></Field></div>
        </div>
      </DialogFormShell>

      <DialogFormShell open={segmentDialogOpen} onOpenChange={setSegmentDialogOpen} title="编辑导航连线" description="选择两个导航点位后保存连线。" onSubmit={submitSegment} submitLabel="保存">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="起点" required>
            <select className="native-select" value={segmentDraft.fromPointId} onChange={(event) => setSegmentDraft((current) => ({ ...current, fromPointId: event.target.value }))}>
              <option value="">请选择起点</option>
              {currentNavPoints.map((point) => <option key={point.id} value={point.id}>{point.name}</option>)}
            </select>
          </Field>
          <Field label="终点" required>
            <select className="native-select" value={segmentDraft.toPointId} onChange={(event) => setSegmentDraft((current) => ({ ...current, toPointId: event.target.value }))}>
              <option value="">请选择终点</option>
              {currentNavPoints.map((point) => <option key={point.id} value={point.id}>{point.name}</option>)}
            </select>
          </Field>
        </div>
      </DialogFormShell>

      <Dialog open={Boolean(pointPreview)} onOpenChange={(open) => !open && setPointPreview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedBedPoint ? "病床点位详情" : "导航点位详情"}</DialogTitle>
            <DialogDescription>点位信息用于地图与病床联动和机器人导航。</DialogDescription>
          </DialogHeader>
          {selectedBedPoint && selectedBed ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-surface-50 px-4 py-3"><p className="text-xs text-muted-foreground">病床编号</p><p className="mt-1 font-medium">{selectedBed.code}</p></div>
                <div className="rounded-xl border border-border/70 bg-surface-50 px-4 py-3"><p className="text-xs text-muted-foreground">病床名称</p><p className="mt-1 font-medium">{selectedBed.name}</p></div>
                <div className="rounded-xl border border-border/70 bg-surface-50 px-4 py-3"><p className="text-xs text-muted-foreground">当前状态</p><p className="mt-1 font-medium">{selectedBed.status}</p></div>
                <div className="rounded-xl border border-border/70 bg-surface-50 px-4 py-3"><p className="text-xs text-muted-foreground">当前使用状态</p><p className="mt-1 font-medium">{getBedDisplayStatus(selectedBed, data.usageRecords)}</p></div>
              </div>
              <div className="rounded-xl border border-border/70 bg-surface-50 px-4 py-3 text-sm leading-7 text-muted-foreground">
                <p>当前患者：{selectedBedUsage?.patientName ?? "暂无"}</p>
                <p>开始使用时间：{selectedBedUsage ? formatDateTime(selectedBedUsage.startAt) : "暂无"}</p>
                <p>预计结束时间：{selectedBedUsage ? formatDateTime(selectedBedUsage.expectedEndAt) : "暂无"}</p>
              </div>
            </div>
          ) : selectedNavPoint ? (
            <div className="space-y-3">
              {[["点位名称", selectedNavPoint.name], ["点位编码", selectedNavPoint.code], ["点位类型", selectedNavPoint.type], ["描述信息", selectedNavPoint.description || "暂无描述"]].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border/70 bg-surface-50 px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div>
              ))}
            </div>
          ) : null}
          {selectedBedPoint && selectedBed ? (
            <DialogFooter>
              <Button variant="outline" onClick={() => setPointPreview(null)}>关闭</Button>
              <Button onClick={() => navigate({ to: `/campus/beds/${selectedBed.id}` })}>跳转病床详情</Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function CampusBedsPage() {
  const navigate = useNavigate();
  const [data, setData] = useCampusState();
  const [filters, setFilters] = useState({ keyword: "", status: "全部", dateFrom: "", dateTo: "" });
  const [bedDialogOpen, setBedDialogOpen] = useState(false);
  const [bedDraft, setBedDraft] = useState<BedDraft>(createDefaultBedDraft);
  const [editingBed, setEditingBed] = useState<BedRecord | null>(null);
  const [bedError, setBedError] = useState("");
  const [deleteBed, setDeleteBed] = useState<BedRecord | null>(null);
  const [recordsBed, setRecordsBed] = useState<BedRecord | null>(null);
  const [recordDateFrom, setRecordDateFrom] = useState("");
  const [recordDateTo, setRecordDateTo] = useState("");
  const [message, setMessage] = useState("");

  const updateCampus = (mutator: (next: CampusState) => void) => {
    setData((current) => {
      const next = structuredClone(current);
      mutator(next);
      return next;
    });
  };

  const bedsWithUsage = useMemo(
    () => data.beds.map((bed) => ({ ...bed, usageStatus: deriveBedUsageStatus(bed, data.usageRecords), displayStatus: getBedDisplayStatus(bed, data.usageRecords), currentUsage: getCurrentUsage(bed, data.usageRecords), nextReservation: getNextReservation(bed, data.usageRecords) })),
    [data.beds, data.usageRecords]
  );

  const filteredBeds = useMemo(
    () => bedsWithUsage.filter((bed) => {
      const keywordMatch =
        !filters.keyword ||
        [bed.code, bed.name, bed.wardName].join(" ").toLowerCase().includes(filters.keyword.toLowerCase());
      const statusMatch = filters.status === "全部" || bed.displayStatus === filters.status;
      const usageRecord = bed.currentUsage ?? bed.nextReservation;
      const fromMatch = !filters.dateFrom || (usageRecord && new Date(usageRecord.startAt) >= new Date(`${filters.dateFrom}T00:00`));
      const toMatch = !filters.dateTo || (usageRecord && new Date(usageRecord.startAt) <= new Date(`${filters.dateTo}T23:59`));
      return keywordMatch && statusMatch && fromMatch && toMatch;
    }),
    [bedsWithUsage, filters]
  );

  const resetFilters = () => setFilters({ keyword: "", status: "全部", dateFrom: "", dateTo: "" });

  const openCreateBed = () => {
    setEditingBed(null);
    setBedDraft(createDefaultBedDraft());
    setBedError("");
    setBedDialogOpen(true);
  };

  const openEditBed = (bed: BedRecord) => {
    setEditingBed(bed);
    setBedDraft({ id: bed.id, code: bed.code, name: bed.name, wardName: bed.wardName, type: bed.type, status: bed.status, note: bed.note, mapId: bed.mapId ?? "", x: String(bed.x ?? 50), y: String(bed.y ?? 50) });
    setBedError("");
    setBedDialogOpen(true);
  };

  const submitBed = () => {
    if (!bedDraft.code.trim() || !bedDraft.name.trim() || !bedDraft.wardName.trim()) {
      setBedError("请补全病床编号、病床名称和所属病房。");
      return;
    }
    const duplicated = data.beds.some((bed) => bed.code === bedDraft.code.trim() && bed.id !== editingBed?.id);
    if (duplicated) {
      setBedError("病床编号全院唯一，当前编号已存在。");
      return;
    }
    const targetMap = data.maps.find((map) => map.id === bedDraft.mapId);
    if (bedDraft.mapId && targetMap?.type !== "病房地图") {
      setBedError("病床只能绑定病房地图点位。");
      return;
    }
    updateCampus((next) => {
      const now = new Date().toISOString();
      if (editingBed) {
        let pointId = editingBed.pointId;
        if (bedDraft.mapId) {
          if (!pointId) {
            pointId = generateId("bed-point");
            next.bedPoints.unshift({ id: pointId, mapId: bedDraft.mapId, bedId: editingBed.id, x: clampPercent(bedDraft.x), y: clampPercent(bedDraft.y), note: bedDraft.note, createdAt: now, updatedAt: now });
          } else {
            next.bedPoints = next.bedPoints.map((point) => point.id === pointId ? { ...point, mapId: bedDraft.mapId, x: clampPercent(bedDraft.x), y: clampPercent(bedDraft.y), note: bedDraft.note, updatedAt: now } : point);
          }
        } else if (pointId) {
          next.bedPoints = next.bedPoints.filter((point) => point.id !== pointId);
          pointId = undefined;
        }
        next.beds = next.beds.map((bed) => bed.id === editingBed.id ? { ...bed, code: bedDraft.code.trim(), name: bedDraft.name.trim(), wardName: bedDraft.wardName.trim(), type: bedDraft.type, status: bedDraft.status, note: bedDraft.note, mapId: bedDraft.mapId || undefined, pointId, x: bedDraft.mapId ? clampPercent(bedDraft.x) : undefined, y: bedDraft.mapId ? clampPercent(bedDraft.y) : undefined, updatedAt: now } : bed);
      } else {
        const bedId = generateId("bed");
        let pointId: string | undefined;
        if (bedDraft.mapId) {
          pointId = generateId("bed-point");
          next.bedPoints.unshift({ id: pointId, mapId: bedDraft.mapId, bedId, x: clampPercent(bedDraft.x), y: clampPercent(bedDraft.y), note: bedDraft.note, createdAt: now, updatedAt: now });
        }
        next.beds.unshift({ id: bedId, code: bedDraft.code.trim(), name: bedDraft.name.trim(), wardName: bedDraft.wardName.trim(), type: bedDraft.type, status: bedDraft.status, note: bedDraft.note, mapId: bedDraft.mapId || undefined, pointId, x: bedDraft.mapId ? clampPercent(bedDraft.x) : undefined, y: bedDraft.mapId ? clampPercent(bedDraft.y) : undefined, updatedAt: now });
      }
    });
    setBedDialogOpen(false);
  };

  const confirmDeleteBed = () => {
    if (!deleteBed) return;
    const hasRecords = data.usageRecords.some((record) => record.bedId === deleteBed.id);
    updateCampus((next) => {
      if (hasRecords) {
        next.beds = next.beds.map((bed) => bed.id === deleteBed.id ? { ...bed, status: "停用", updatedAt: new Date().toISOString() } : bed);
      } else {
        next.beds = next.beds.filter((bed) => bed.id !== deleteBed.id);
        next.bedPoints = next.bedPoints.filter((point) => point.bedId !== deleteBed.id);
      }
    });
    setDeleteBed(null);
  };

  const locateBedOnMap = (bed: BedRecord) => {
    if (!bed.mapId || !bed.pointId) {
      setMessage(`病床 ${bed.code} 尚未绑定地图点位。`);
      return;
    }
    writeState(CAMPUS_LOCATE_KEY, { mapId: bed.mapId, pointId: bed.pointId });
    navigate({ to: `/campus/maps/${bed.mapId}` });
  };

  const selectedRecords = recordsBed ? data.usageRecords.filter((record) => record.bedId === recordsBed.id).filter((record) => (!recordDateFrom || new Date(record.startAt) >= new Date(`${recordDateFrom}T00:00`)) && (!recordDateTo || new Date(record.startAt) <= new Date(`${recordDateTo}T23:59`))).sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()) : [];
  const completedRecords = selectedRecords.filter((record) => record.endAt);
  const totalDuration = completedRecords.reduce((sum, record) => sum + Math.max(0, new Date(record.endAt ?? record.expectedEndAt).getTime() - new Date(record.startAt).getTime()), 0);
  const totalHours = totalDuration / (1000 * 60 * 60);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeader eyebrow="院区管理 > 病床管理" title="病床管理" description="统一管理病床位置、状态、使用登记、使用记录和地图联动定位。" badge="病床列表" actions={<Button onClick={openCreateBed}><Plus className="h-4 w-4" />新增病床</Button>} />
      {message ? <p className="text-sm text-primary">{message}</p> : null}
      <FilterBar actions={<><Button variant="secondary" onClick={resetFilters}>重置</Button><Button>查询</Button></>}>
        <Field label="关键词"><Input value={filters.keyword} placeholder="BED-302-01 / 302-1床 / 骨科三病区302" onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))} /></Field>
        <Field label="病床状态"><select className="native-select" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="全部">全部</option>{["空闲", "使用中", "已预约", "停用", "维修中"].map((status) => <option key={status} value={status}>{status}</option>)}</select></Field>
        <Field label="使用时间范围"><div className="grid grid-cols-2 gap-2"><Input type="date" value={filters.dateFrom} onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))} /><Input type="date" value={filters.dateTo} onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))} /></div></Field>
      </FilterBar>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CardHeader className="border-b border-border/60"><CardTitle>病床列表</CardTitle><p className="text-sm text-muted-foreground">共 {filteredBeds.length} 张病床</p></CardHeader>
        <CardContent className="min-h-0 flex-1 p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>病床编号</TableHead><TableHead>病床名称</TableHead><TableHead>所属病房</TableHead><TableHead>病床状态</TableHead><TableHead>当前患者</TableHead><TableHead>开始使用时间</TableHead><TableHead>预计结束时间</TableHead><TableHead>地图绑定状态</TableHead><TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBeds.map((bed) => {
                const current = bed.currentUsage ?? bed.nextReservation;
                return (
                  <TableRow key={bed.id} className="cursor-pointer" onClick={() => navigate({ to: `/campus/beds/${bed.id}` })}>
                    <TableCell className="font-medium">{bed.code}</TableCell>
                    <TableCell>{bed.name}</TableCell>
                    <TableCell>{bed.wardName}</TableCell>
                    <TableCell><Badge className={badgeClassForStatus(bed.displayStatus)}>{bed.displayStatus}</Badge></TableCell>
                    <TableCell>{current?.patientName ?? "-"}</TableCell>
                    <TableCell>{current ? formatDateTime(current.startAt) : "-"}</TableCell>
                    <TableCell>{current ? formatDateTime(current.expectedEndAt) : "-"}</TableCell>
                    <TableCell>{bed.mapId ? "已绑定" : "未绑定"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); navigate({ to: `/campus/beds/${bed.id}` }); }}><BedDouble className="h-4 w-4" />查看</Button>
                        <Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); openEditBed(bed); }}><Edit3 className="h-4 w-4" />编辑</Button>
                        <Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); locateBedOnMap(bed); }}><LocateFixed className="h-4 w-4" />定位</Button>
                        <Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); setRecordsBed(bed); }}><ClipboardList className="h-4 w-4" />使用记录</Button>
                        <Button variant="ghost" size="sm" className="text-rose-600" onClick={(event) => { event.stopPropagation(); setDeleteBed(bed); }}><Trash2 className="h-4 w-4" />删除</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DialogFormShell open={bedDialogOpen} onOpenChange={setBedDialogOpen} title={editingBed ? "编辑病床" : "新增病床"} description="病床编号全院唯一，可直接绑定病房地图点位。" onSubmit={submitBed} submitLabel="保存">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="病床编号" required><Input value={bedDraft.code} onChange={(event) => setBedDraft((current) => ({ ...current, code: event.target.value }))} /></Field>
          <Field label="病床名称" required><Input value={bedDraft.name} onChange={(event) => setBedDraft((current) => ({ ...current, name: event.target.value }))} /></Field>
          <Field label="所属病房" required><Input value={bedDraft.wardName} onChange={(event) => setBedDraft((current) => ({ ...current, wardName: event.target.value }))} /></Field>
          <Field label="病床状态"><select className="native-select" value={bedDraft.status} onChange={(event) => setBedDraft((current) => ({ ...current, status: event.target.value as BedStatus }))}>{bedStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></Field>
          <Field label="绑定地图点位"><select className="native-select" value={bedDraft.mapId} onChange={(event) => setBedDraft((current) => ({ ...current, mapId: event.target.value }))}><option value="">暂不绑定</option>{data.maps.filter((map) => map.type === "病房地图").map((map) => <option key={map.id} value={map.id}>{map.name}</option>)}</select></Field>
          <Field label="地图位置 X / Y"><div className="grid grid-cols-2 gap-2"><Input value={bedDraft.x} onChange={(event) => setBedDraft((current) => ({ ...current, x: event.target.value }))} /><Input value={bedDraft.y} onChange={(event) => setBedDraft((current) => ({ ...current, y: event.target.value }))} /></div></Field>
          <div className="md:col-span-2"><Field label="备注"><Textarea value={bedDraft.note} onChange={(event) => setBedDraft((current) => ({ ...current, note: event.target.value }))} /></Field></div>
        </div>
        {bedError ? <p className="text-sm text-rose-700">{bedError}</p> : null}
      </DialogFormShell>

      <DialogFormShell open={Boolean(deleteBed)} onOpenChange={(open) => !open && setDeleteBed(null)} title={`确定删除“${deleteBed?.code ?? ""}”吗？`} description="存在历史使用记录的病床不允许物理删除，将自动转为停用。" onSubmit={confirmDeleteBed} submitLabel="确认" />

      <Dialog open={Boolean(recordsBed)} onOpenChange={(open) => !open && setRecordsBed(null)}>
        <DialogContent className="w-[min(96vw,980px)] max-w-none">
          <DialogHeader><DialogTitle>{recordsBed?.code ?? ""} 使用记录</DialogTitle><DialogDescription>保存全部历史记录，并自动统计使用次数、累计使用时长和平均使用时长。</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-5">
              <MetricCard label="使用次数" value={selectedRecords.length} hint="当前查询范围" />
              <MetricCard label="累计使用时长" value={`${totalHours.toFixed(1)}h`} hint="已结束记录" />
              <MetricCard label="平均使用时长" value={completedRecords.length ? `${(totalHours / completedRecords.length).toFixed(1)}h` : "0h"} hint="已结束记录均值" />
              <Field label="开始日期"><Input type="date" value={recordDateFrom} onChange={(event) => setRecordDateFrom(event.target.value)} /></Field>
              <Field label="结束日期"><Input type="date" value={recordDateTo} onChange={(event) => setRecordDateTo(event.target.value)} /></Field>
            </div>
            <div className="max-h-[420px] overflow-auto rounded-xl border border-border/70">
              <Table>
                <TableHeader><TableRow><TableHead>患者姓名</TableHead><TableHead>开始使用时间</TableHead><TableHead>结束使用时间</TableHead><TableHead>使用时长</TableHead><TableHead>登记人</TableHead><TableHead>登记时间</TableHead><TableHead>备注</TableHead></TableRow></TableHeader>
                <TableBody>
                  {selectedRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.patientName}</TableCell><TableCell>{formatDateTime(record.startAt)}</TableCell><TableCell>{record.endAt ? formatDateTime(record.endAt) : "未结束"}</TableCell><TableCell>{formatDuration(record.startAt, record.endAt ?? record.expectedEndAt)}</TableCell><TableCell>{record.registrar}</TableCell><TableCell>{formatDateTime(record.registeredAt)}</TableCell><TableCell>{record.endNote ?? record.note}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function CampusBedDetailPage({ bedId }: { bedId: string }) {
  const navigate = useNavigate();
  const [data, setData] = useCampusState();
  const [bedDialogOpen, setBedDialogOpen] = useState(false);
  const [bedDraft, setBedDraft] = useState<BedDraft>(createDefaultBedDraft);
  const [editingBed, setEditingBed] = useState<BedRecord | null>(null);
  const [bedError, setBedError] = useState("");
  const [usageDialogOpen, setUsageDialogOpen] = useState(false);
  const [usageDraft, setUsageDraft] = useState<UsageDraft>(createUsageDraft);
  const [endingBed, setEndingBed] = useState<BedRecord | null>(null);
  const [endDraft, setEndDraft] = useState({ endAt: toDateTimeInput(new Date().toISOString()), note: "" });
  const [recordDateFrom, setRecordDateFrom] = useState("");
  const [recordDateTo, setRecordDateTo] = useState("");
  const [message, setMessage] = useState("");

  const selectedBed = data.beds.find((bed) => bed.id === bedId) ?? null;
  const selectedMap = selectedBed?.mapId ? data.maps.find((map) => map.id === selectedBed.mapId) ?? null : null;
  const selectedUsage = getCurrentUsage(selectedBed, data.usageRecords) ?? getNextReservation(selectedBed, data.usageRecords);

  const updateCampus = (mutator: (next: CampusState) => void) => {
    setData((current) => {
      const next = structuredClone(current);
      mutator(next);
      return next;
    });
  };

  const openEditBed = (bed: BedRecord) => {
    setEditingBed(bed);
    setBedDraft({ id: bed.id, code: bed.code, name: bed.name, wardName: bed.wardName, type: bed.type, status: bed.status, note: bed.note, mapId: bed.mapId ?? "", x: String(bed.x ?? 50), y: String(bed.y ?? 50) });
    setBedError("");
    setBedDialogOpen(true);
  };

  const submitBed = () => {
    if (!selectedBed || !bedDraft.code.trim() || !bedDraft.name.trim() || !bedDraft.wardName.trim()) {
      setBedError("请补全病床编号、病床名称和所属病房。");
      return;
    }
    const duplicated = data.beds.some((bed) => bed.code === bedDraft.code.trim() && bed.id !== selectedBed.id);
    if (duplicated) {
      setBedError("病床编号全院唯一，当前编号已存在。");
      return;
    }
    const targetMap = data.maps.find((map) => map.id === bedDraft.mapId);
    if (bedDraft.mapId && targetMap?.type !== "病房地图") {
      setBedError("病床只能绑定病房地图点位。");
      return;
    }
    updateCampus((next) => {
      const now = new Date().toISOString();
      let pointId = selectedBed.pointId;
      if (bedDraft.mapId) {
        if (!pointId) {
          pointId = generateId("bed-point");
          next.bedPoints.unshift({ id: pointId, mapId: bedDraft.mapId, bedId: selectedBed.id, x: clampPercent(bedDraft.x), y: clampPercent(bedDraft.y), note: bedDraft.note, createdAt: now, updatedAt: now });
        } else {
          next.bedPoints = next.bedPoints.map((point) => point.id === pointId ? { ...point, mapId: bedDraft.mapId, x: clampPercent(bedDraft.x), y: clampPercent(bedDraft.y), note: bedDraft.note, updatedAt: now } : point);
        }
      } else if (pointId) {
        next.bedPoints = next.bedPoints.filter((point) => point.id !== pointId);
        pointId = undefined;
      }
      next.beds = next.beds.map((bed) => bed.id === selectedBed.id ? { ...bed, code: bedDraft.code.trim(), name: bedDraft.name.trim(), wardName: bedDraft.wardName.trim(), type: bedDraft.type, status: bedDraft.status, note: bedDraft.note, mapId: bedDraft.mapId || undefined, pointId, x: bedDraft.mapId ? clampPercent(bedDraft.x) : undefined, y: bedDraft.mapId ? clampPercent(bedDraft.y) : undefined, updatedAt: now } : bed);
    });
    setBedDialogOpen(false);
  };

  const openUsageDialog = (bed: BedRecord) => {
    if (bed.status === "停用" || bed.status === "维修中") {
      setMessage(`病床 ${bed.code} 当前为${bed.status}，不可登记使用。`);
      return;
    }
    setUsageDraft(createUsageDraft(bed));
    setUsageDialogOpen(true);
  };

  const submitUsage = () => {
    if (!selectedBed || !usageDraft.patientName.trim()) return;
    updateCampus((next) => {
      next.usageRecords.unshift({ id: generateId("usage"), bedId: selectedBed.id, patientName: usageDraft.patientName.trim(), startAt: usageDraft.startAt, expectedEndAt: usageDraft.expectedEndAt, registrar: "李琴", registeredAt: new Date().toISOString(), note: usageDraft.note });
    });
    setUsageDialogOpen(false);
  };

  const submitEndUsage = () => {
    if (!selectedBed || !endingBed) return;
    const active = getCurrentUsage(endingBed, data.usageRecords);
    if (!active) {
      setEndingBed(null);
      return;
    }
    updateCampus((next) => {
      next.usageRecords = next.usageRecords.map((record) => record.id === active.id ? { ...record, endAt: endDraft.endAt, endNote: endDraft.note } : record);
      next.beds = next.beds.map((bed) => bed.id === endingBed.id ? { ...bed, lastEndedAt: endDraft.endAt, updatedAt: new Date().toISOString() } : bed);
    });
    setEndingBed(null);
  };

  const selectedRecords = data.usageRecords
    .filter((record) => record.bedId === (selectedBed?.id ?? ""))
    .filter(
      (record) =>
        (!recordDateFrom || new Date(record.startAt) >= new Date(`${recordDateFrom}T00:00`)) &&
        (!recordDateTo || new Date(record.startAt) <= new Date(`${recordDateTo}T23:59`))
    )
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
  const completedRecords = selectedRecords.filter((record) => record.endAt);
  const totalDuration = completedRecords.reduce((sum, record) => sum + Math.max(0, new Date(record.endAt ?? record.expectedEndAt).getTime() - new Date(record.startAt).getTime()), 0);
  const totalHours = totalDuration / (1000 * 60 * 60);

  if (!selectedBed) {
    return <EmptyState title="病床不存在" />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeader eyebrow={`院区管理 > 病床管理 > ${selectedBed.code}`} title="病床详情与使用管理" description="病床详情和使用管理已拆分为独立子页面，上下结构展示。" badge={selectedBed.name} actions={<Button variant="outline" onClick={() => navigate({ to: "/campus/beds" })}><ArrowLeft className="h-4 w-4" />返回列表</Button>} />
      {message ? <p className="text-sm text-primary">{message}</p> : null}

      <SectionCard title="病床详情">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            {[["病床编号", selectedBed.code], ["病床名称", selectedBed.name], ["所属病房", selectedBed.wardName], ["病床状态", getBedDisplayStatus(selectedBed, data.usageRecords)]].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border/70 bg-surface-50 px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium text-surface-900">{value}</p></div>
            ))}
          </div>
          <div className="rounded-xl border border-border/70 bg-surface-50 px-4 py-3 text-sm leading-7 text-muted-foreground">
            <p>备注：{selectedBed.note || "暂无备注"}</p>
            <p>所属病房地图：{selectedMap?.name ?? "未绑定地图"}</p>
            <p>地图位置：{selectedBed.x && selectedBed.y ? `${selectedBed.x}% / ${selectedBed.y}%` : "未绑定位置"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate({ to: selectedMap ? `/campus/maps/${selectedMap.id}` : "/campus/maps" })}><MapPinned className="h-4 w-4" />跳转地图管理</Button>
            <Button variant="outline" onClick={() => openEditBed(selectedBed)}><Edit3 className="h-4 w-4" />编辑病床</Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="病床使用管理">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-surface-50 px-4 py-3"><p className="text-xs text-muted-foreground">当前患者</p><p className="mt-1 font-medium">{selectedUsage?.patientName ?? "暂无"}</p></div>
            <div className="rounded-xl border border-border/70 bg-surface-50 px-4 py-3"><p className="text-xs text-muted-foreground">当前状态</p><p className="mt-1 font-medium">{getBedDisplayStatus(selectedBed, data.usageRecords)}</p></div>
            <div className="rounded-xl border border-border/70 bg-surface-50 px-4 py-3"><p className="text-xs text-muted-foreground">开始使用时间</p><p className="mt-1 font-medium">{selectedUsage ? formatDateTime(selectedUsage.startAt) : "暂无"}</p></div>
            <div className="rounded-xl border border-border/70 bg-surface-50 px-4 py-3"><p className="text-xs text-muted-foreground">预计结束时间</p><p className="mt-1 font-medium">{selectedUsage ? formatDateTime(selectedUsage.expectedEndAt) : "暂无"}</p></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={!getCurrentUsage(selectedBed, data.usageRecords)} onClick={() => { setEndingBed(selectedBed); setEndDraft({ endAt: toDateTimeInput(new Date().toISOString()), note: "" }); }}>结束使用</Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="使用记录">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => openUsageDialog(selectedBed)} disabled={selectedBed.status !== "启用"}><Plus className="h-4 w-4" />使用登记</Button>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            <MetricCard label="使用次数" value={selectedRecords.length} hint="当前查询范围" />
            <MetricCard label="累计使用时长" value={`${totalHours.toFixed(1)}h`} hint="已结束记录" />
            <MetricCard label="平均使用时长" value={completedRecords.length ? `${(totalHours / completedRecords.length).toFixed(1)}h` : "0h"} hint="已结束记录均值" />
            <Field label="开始日期"><Input type="date" value={recordDateFrom} onChange={(event) => setRecordDateFrom(event.target.value)} /></Field>
            <Field label="结束日期"><Input type="date" value={recordDateTo} onChange={(event) => setRecordDateTo(event.target.value)} /></Field>
          </div>
          <div className="overflow-auto rounded-xl border border-border/70">
            <Table>
              <TableHeader><TableRow><TableHead>患者姓名</TableHead><TableHead>开始使用时间</TableHead><TableHead>结束使用时间</TableHead><TableHead>使用时长</TableHead><TableHead>登记人</TableHead><TableHead>登记时间</TableHead><TableHead>备注</TableHead></TableRow></TableHeader>
              <TableBody>
                {selectedRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.patientName}</TableCell><TableCell>{formatDateTime(record.startAt)}</TableCell><TableCell>{record.endAt ? formatDateTime(record.endAt) : "未结束"}</TableCell><TableCell>{formatDuration(record.startAt, record.endAt ?? record.expectedEndAt)}</TableCell><TableCell>{record.registrar}</TableCell><TableCell>{formatDateTime(record.registeredAt)}</TableCell><TableCell>{record.endNote ?? record.note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </SectionCard>

      <DialogFormShell open={bedDialogOpen} onOpenChange={setBedDialogOpen} title="编辑病床" description="病床编号全院唯一，可直接绑定病房地图点位。" onSubmit={submitBed} submitLabel="保存">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="病床编号" required><Input value={bedDraft.code} onChange={(event) => setBedDraft((current) => ({ ...current, code: event.target.value }))} /></Field>
          <Field label="病床名称" required><Input value={bedDraft.name} onChange={(event) => setBedDraft((current) => ({ ...current, name: event.target.value }))} /></Field>
          <Field label="所属病房" required><Input value={bedDraft.wardName} onChange={(event) => setBedDraft((current) => ({ ...current, wardName: event.target.value }))} /></Field>
          <Field label="病床状态"><select className="native-select" value={bedDraft.status} onChange={(event) => setBedDraft((current) => ({ ...current, status: event.target.value as BedStatus }))}>{bedStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></Field>
          <Field label="绑定地图点位"><select className="native-select" value={bedDraft.mapId} onChange={(event) => setBedDraft((current) => ({ ...current, mapId: event.target.value }))}><option value="">暂不绑定</option>{data.maps.filter((map) => map.type === "病房地图").map((map) => <option key={map.id} value={map.id}>{map.name}</option>)}</select></Field>
          <Field label="地图位置 X / Y"><div className="grid grid-cols-2 gap-2"><Input value={bedDraft.x} onChange={(event) => setBedDraft((current) => ({ ...current, x: event.target.value }))} /><Input value={bedDraft.y} onChange={(event) => setBedDraft((current) => ({ ...current, y: event.target.value }))} /></div></Field>
          <div className="md:col-span-2"><Field label="备注"><Textarea value={bedDraft.note} onChange={(event) => setBedDraft((current) => ({ ...current, note: event.target.value }))} /></Field></div>
        </div>
        {bedError ? <p className="text-sm text-rose-700">{bedError}</p> : null}
      </DialogFormShell>

      <DialogFormShell open={usageDialogOpen} onOpenChange={setUsageDialogOpen} title="使用登记" description="登记后会按时间规则自动显示为使用中或已预约。" onSubmit={submitUsage} submitLabel="登记">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="患者姓名" required><Input value={usageDraft.patientName} onChange={(event) => setUsageDraft((current) => ({ ...current, patientName: event.target.value }))} /></Field>
          <Field label="开始使用时间"><Input type="datetime-local" value={usageDraft.startAt} onChange={(event) => setUsageDraft((current) => ({ ...current, startAt: event.target.value }))} /></Field>
          <Field label="预计结束时间"><Input type="datetime-local" value={usageDraft.expectedEndAt} onChange={(event) => setUsageDraft((current) => ({ ...current, expectedEndAt: event.target.value }))} /></Field>
          <div className="md:col-span-2"><Field label="备注"><Textarea value={usageDraft.note} onChange={(event) => setUsageDraft((current) => ({ ...current, note: event.target.value }))} /></Field></div>
        </div>
      </DialogFormShell>

      <DialogFormShell open={Boolean(endingBed)} onOpenChange={(open) => !open && setEndingBed(null)} title="结束使用" description="结束后病床会按自动判断规则恢复为空闲或已预约。" onSubmit={submitEndUsage} submitLabel="结束使用">
        <Field label="实际结束时间"><Input type="datetime-local" value={endDraft.endAt} onChange={(event) => setEndDraft((current) => ({ ...current, endAt: event.target.value }))} /></Field>
        <Field label="备注"><Textarea value={endDraft.note} onChange={(event) => setEndDraft((current) => ({ ...current, note: event.target.value }))} /></Field>
      </DialogFormShell>
    </div>
  );
}
