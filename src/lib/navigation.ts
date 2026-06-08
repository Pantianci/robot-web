import {
  BookCopy,
  Home,
  type LucideIcon,
  MonitorCog,
  Tags,
  Users2
} from "lucide-react";

type NavigationItem = {
  to: string;
  label: string;
};

type NavigationGroup = {
  label: string;
  to: string;
  icon: LucideIcon;
  items: readonly NavigationItem[];
};

export const navigationGroups = [
  {
    label: "首页概览",
    to: "/",
    icon: Home,
    items: [{ to: "/", label: "首页概览" }]
  },
  {
    label: "多模态知识库",
    to: "/knowledge/library",
    icon: BookCopy,
    items: [
      { to: "/knowledge/qa", label: "知识库问答" },
      { to: "/knowledge/library", label: "康复知识库" },
      { to: "/knowledge/motion", label: "标准动作库" },
      { to: "/knowledge/sequence", label: "动作序列库" },
      { to: "/knowledge/voice", label: "问答对管理" }
    ]
  },
  {
    label: "患者档案管理",
    to: "/patients/base",
    icon: Users2,
    items: [
      { to: "/patients/base", label: "基础档案" },
      { to: "/patients/plans", label: "康复方案" },
      { to: "/patients/prescriptions", label: "处方列表" },
      { to: "/patients/current", label: "当前处方" },
      { to: "/patients/reports", label: "评估报告" }
    ]
  },
  {
    label: "标签管理",
    to: "/tags/knowledge",
    icon: Tags,
    items: [
      { to: "/tags/knowledge", label: "康复知识标签库" },
      { to: "/tags/voice", label: "问答对标签库" },
      { to: "/tags/motion", label: "标准动作标签库" },
      { to: "/tags/sequence", label: "动作序列标签库" }
    ]
  },
  {
    label: "机器人管理",
    to: "/robots/list",
    icon: MonitorCog,
    items: [
      { to: "/robots/list", label: "机器人列表" },
      { to: "/robots/detail", label: "机器人详情" }
    ]
  }
] as const satisfies readonly NavigationGroup[];
