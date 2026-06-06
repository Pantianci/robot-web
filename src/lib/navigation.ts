import {
  BookCopy,
  ClipboardList,
  FileBarChart2,
  Home,
  MessageSquareQuote,
  MonitorCog,
  NotebookTabs,
  Rows4,
  Tags,
  Users2
} from "lucide-react";

export const navigationGroups = [
  {
    label: "首页概览",
    icon: Home,
    items: [{ to: "/", label: "首页概览" }]
  },
  {
    label: "多模态知识库",
    icon: BookCopy,
    items: [
      { to: "/knowledge/qa", label: "知识库问答" },
      { to: "/knowledge/library", label: "康复知识库" },
      { to: "/knowledge/motion", label: "标准动作库" },
      { to: "/knowledge/sequence", label: "动作序列库" },
      { to: "/knowledge/voice", label: "语音交互库" }
    ]
  },
  {
    label: "患者档案管理",
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
    icon: Tags,
    items: [
      { to: "/tags/knowledge", label: "康复知识标签库" },
      { to: "/tags/voice", label: "语音交互标签库" },
      { to: "/tags/motion", label: "标准动作标签库" },
      { to: "/tags/sequence", label: "动作序列标签库" }
    ]
  },
  {
    label: "机器人管理",
    icon: MonitorCog,
    items: [
      { to: "/robots/list", label: "机器人列表" },
      { to: "/robots/detail", label: "机器人详情" }
    ]
  }
] as const;

export const quickLinks = [
  { to: "/knowledge/library/create", label: "新增康复知识", icon: NotebookTabs },
  { to: "/patients/base/create", label: "新增档案", icon: Users2 },
  { to: "/patients/prescriptions/create", label: "新增动作处方", icon: ClipboardList },
  { to: "/patients/reports/review", label: "审核评估报告", icon: FileBarChart2 },
  { to: "/robots/create", label: "新增机器人", icon: Rows4 },
  { to: "/knowledge/qa", label: "知识问答", icon: MessageSquareQuote }
] as const;
