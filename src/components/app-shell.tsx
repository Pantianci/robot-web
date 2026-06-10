import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { navigationGroups } from "@/lib/navigation";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(214,231,255,0.65),_transparent_48%),linear-gradient(180deg,_#f7fbff_0%,_#eef5ff_100%)] text-foreground lg:h-screen lg:overflow-hidden">
      <div className="grid min-h-screen lg:h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-white/50 bg-surface-900 text-white lg:h-screen lg:border-b-0 lg:border-r lg:border-r-white/10">
          <div className="no-scrollbar h-full overflow-y-auto p-5">
            <div className="rounded-[1.5rem] bg-white/6 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/90 text-lg font-bold text-white">
                  康
                </div>
                <div>
                  <p className="text-lg font-semibold">智慧康复机器人</p>
                  <p className="text-xs text-white/65">康复管理平台</p>
                </div>
              </div>
            </div>

            <nav className="mt-6 space-y-5">
              {navigationGroups.map((group) => {
                const Icon = group.icon;

                return (
                  <div key={group.label} className="space-y-2">
                    <Link
                      to={group.to}
                      className="block"
                      activeOptions={{ exact: group.to === "/" }}
                      activeProps={{ className: "block" }}
                    >
                      {({ isActive }) => (
                        <div
                          className={cn(
                            "flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-white/92 transition hover:bg-white/8 hover:text-white",
                            isActive && "bg-white/12 text-white"
                          )}
                        >
                          <Icon className="h-4 w-4 text-white/72" />
                          <span>{group.label}</span>
                        </div>
                      )}
                    </Link>
                    <div className="space-y-1">
                      {group.items.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          activeOptions={{ exact: true }}
                          className="block"
                          activeProps={{ className: "block" }}
                        >
                          {({ isActive }) => (
                            <div
                              className={cn(
                                "rounded-2xl px-4 py-2.5 text-sm text-white/72 transition hover:bg-white/10 hover:text-white",
                                isActive && "bg-white text-surface-900 shadow-soft"
                              )}
                            >
                              {item.label}
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </nav>

            <div className="mt-8 rounded-[1.25rem] bg-white/7 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">当前角色</p>
                <Badge className="bg-white/16 text-white">康复科主任</Badge>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 lg:flex lg:h-screen lg:flex-col lg:overflow-hidden">
          <header className="shrink-0 border-b border-white/60 bg-white/75 backdrop-blur">
            <div className="flex flex-wrap items-center justify-end gap-4 px-5 py-4 lg:px-8">
              <div className="flex items-center gap-3">
                <Badge>通知 6</Badge>
                <Badge className="bg-primary/10 text-primary">账号 李琴</Badge>
                <Badge className="bg-emerald-100 text-emerald-700">Vercel Auto Deploy</Badge>
              </div>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 lg:px-4 lg:py-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
