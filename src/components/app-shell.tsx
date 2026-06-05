import type { ReactNode } from "react";
import {
  BookCopy,
  ClipboardList,
  FileBarChart2,
  Home,
  LayoutGrid,
  MonitorCog,
  Users2
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const navigation = [
  { to: "/", label: "首页预览", icon: Home },
  { to: "/knowledge", label: "多模态知识库", icon: BookCopy },
  { to: "/patients", label: "患者档案管理", icon: Users2 },
  { to: "/prescriptions", label: "处方列表管理", icon: ClipboardList },
  { to: "/reports", label: "评估报告管理", icon: FileBarChart2 },
  { to: "/robots", label: "机器人管理", icon: MonitorCog }
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(214,231,255,0.65),_transparent_48%),linear-gradient(180deg,_#f7fbff_0%,_#eef5ff_100%)] text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-white/50 bg-surface-900 text-white lg:border-b-0 lg:border-r lg:border-r-white/10">
          <div className="sticky top-0 p-5">
            <div className="rounded-[1.5rem] bg-white/6 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/90 text-lg font-bold text-white">
                  康
                </div>
                <div>
                  <p className="text-lg font-semibold">智慧康复机器人后台</p>
                  <p className="text-xs text-white/65">康复原型管理平台</p>
                </div>
              </div>
            </div>

            <nav className="mt-6 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    activeOptions={{ exact: item.to === "/" }}
                    className="block"
                    activeProps={{
                      className: "block"
                    }}
                  >
                    {({ isActive }) => (
                      <div
                        className={cn(
                          "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-white/72 transition hover:bg-white/10 hover:text-white",
                          isActive && "bg-white text-surface-900 shadow-soft"
                        )}
                      >
                        <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-white/60")} />
                        <span>{item.label}</span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-8 rounded-[1.25rem] bg-white/7 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">当前角色</p>
                <Badge className="bg-white/16 text-white">康复科主任</Badge>
              </div>
              <p className="mt-3 text-xs leading-6 text-white/65">
                当前原型覆盖管理端 P1 范围：知识库、档案、处方、评估和机器人调度。
              </p>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-white/60 bg-white/70 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-8">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-surface-500">
                  Robot Web Prototype
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <LayoutGrid className="h-4 w-4" />
                  TanStack Start + shadcn/ui + MSW 高保真原型
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge>通知 6</Badge>
                <Badge className="bg-primary/10 text-primary">账号 李琴</Badge>
              </div>
            </div>
          </header>

          <div className="px-5 py-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
