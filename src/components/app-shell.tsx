"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  PanelLeftClose,
  Search,
  Bot,
  Bell,
  Sparkles,
  Command,
  User,
  RefreshCw,
} from "lucide-react";
import { BrandLockup } from "@/components/brand";
import { NAV, type NavItem } from "@/lib/nav";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";

const PAGE_META: Record<string, { title: string; crumb: string }> = {
  "/": { title: "대시보드", crumb: "워크스페이스" },
  "/analyze": { title: "계약서 분석·요약", crumb: "계약 AI" },
  "/search": { title: "계약서 검색", crumb: "계약 AI" },
  "/draft": { title: "초안 작성 어시스트", crumb: "계약 AI" },
};

function activeIdFor(pathname: string): string {
  if (pathname === "/") return "dashboard";
  if (pathname.startsWith("/analyze")) return "analyze";
  if (pathname.startsWith("/search")) return "search";
  if (pathname.startsWith("/draft")) return "draft";
  return "";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeId = activeIdFor(pathname);
  const meta = PAGE_META[pathname] ?? { title: "GS칼텍스 법무 AI", crumb: "워크스페이스" };
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("legalai_sb_collapsed") === "1");
  }, []);

  const toggleCollapse = () => {
    setCollapsed((c) => {
      localStorage.setItem("legalai_sb_collapsed", !c ? "1" : "0");
      return !c;
    });
  };

  return (
    <div className="min-h-screen">
      {/* ===== GLOBAL HEADER ===== */}
      <header className="sticky top-0 z-[60] flex h-14 items-center justify-between border-b border-line bg-surface px-[22px]">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandLockup />
        </Link>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full bg-surface-3 px-3 py-1 text-[11.5px] font-medium text-t3 sm:flex">
            <span className="blink-dot h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
            문서 인덱싱 <span className="num font-semibold text-t2">248,391</span>건
          </span>
          <span className="whitespace-nowrap rounded-md bg-[#101828] px-[9px] py-[3px] text-[12px] font-semibold text-white">
            법무팀
          </span>
          <span className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-3 px-3 text-[13.5px] font-semibold text-t2">
            <User size={16} className="text-t3" />
            정연우
          </span>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-56px)]">
        {/* ===== SIDEBAR ===== */}
        <aside
          className={cn(
            "sticky top-14 z-40 flex h-[calc(100vh-56px)] flex-shrink-0 flex-col overflow-y-auto border-r border-line bg-sidebar px-3.5 py-[18px] transition-[width] duration-300",
            collapsed ? "w-[74px]" : "w-[264px]",
          )}
        >
          {/* profile */}
          <div className={cn("flex items-center gap-2.5 px-1.5 pb-1", collapsed && "flex-col gap-2.5 px-0")}>
            <div className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[13px] bg-[image:var(--accent-grad)] text-white shadow-[0_1px_4px_rgba(15,110,130,.3)]">
              <Bot size={22} />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5 whitespace-nowrap text-[14.5px] font-bold tracking-[-.2px] text-t1">
                  정연우 <span className="text-[11px] font-medium text-t3">변호사</span>
                </div>
                <div className="mt-[3px] inline-block whitespace-nowrap rounded-md bg-[#eef2f3] px-[7px] py-[1px] text-[10.5px] font-medium text-t3">
                  법무실 · 계약심사팀
                </div>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={toggleCollapse}
                title="접기"
                className="ml-auto flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[7px] text-t4 transition hover:bg-[#eceef1] hover:text-t2"
              >
                <PanelLeftClose size={18} />
              </button>
            )}
          </div>

          {/* search */}
          <button
            onClick={() => toast("전역 검색은 프로토타입 범위 밖입니다 — 좌측 '계약서 검색'을 이용해 주세요")}
            className={cn(
              "mx-1 mt-3.5 mb-1.5 flex items-center gap-2.5 rounded-[11px] border border-line bg-surface px-3 py-2.5 text-[13px] text-t4 transition hover:border-line-strong",
              collapsed && "mx-auto w-12 justify-center px-0",
            )}
          >
            <Search size={16} className="flex-shrink-0" />
            {!collapsed && (
              <>
                <span>검색</span>
                <span className="num ml-auto rounded-[5px] border border-line bg-surface-2 px-[5px] text-[10.5px]">⌘K</span>
              </>
            )}
          </button>

          {/* nav groups */}
          <div className="-mx-1 flex-1 overflow-y-auto py-1.5">
            {NAV.map((g) => (
              <div key={g.group} className="mt-1 px-1">
                {!collapsed && (
                  <div className="px-3 pb-1.5 pt-[11px] text-[10.5px] font-bold uppercase tracking-[.07em] text-t4">
                    {g.group}
                  </div>
                )}
                {collapsed && <div className="mt-1.5" />}
                {g.items.map((it) => (
                  <NavLink key={it.id} item={it} active={it.id === activeId} collapsed={collapsed} />
                ))}
              </div>
            ))}
          </div>

          {collapsed && (
            <button
              onClick={toggleCollapse}
              title="펼치기"
              className="mx-auto mt-2 flex h-9 w-9 items-center justify-center rounded-[9px] text-t4 transition hover:bg-[#eceef1] hover:text-t2"
            >
              <PanelLeftClose size={18} className="rotate-180" />
            </button>
          )}
        </aside>

        {/* ===== MAIN ===== */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* topbar */}
          <div className="sticky top-14 z-30 flex h-[60px] flex-shrink-0 items-center gap-3.5 border-b border-line bg-surface px-[26px]">
            <div className="flex items-center gap-2.5 text-[15px] font-bold tracking-[-.2px] text-t1">
              {meta.title}
              <span className="text-[12.5px] font-medium text-t4">· {meta.crumb}</span>
            </div>
            <div className="flex-1" />
            <button
              onClick={() => toast('자연어 질의는 "계약서 검색" 페이지에서 시연할 수 있어요')}
              className="hidden h-[42px] max-w-[440px] flex-1 items-center gap-2.5 rounded-full border border-transparent bg-surface-3 px-4 text-[13.5px] text-t3 transition hover:border-line hover:bg-surface md:flex"
            >
              <Sparkles size={17} className="flex-shrink-0 text-[var(--accent)]" />
              <span className="flex-1 truncate text-left">
                자연어로 질문하세요 — &quot;손해배상 한도 100% 초과 계약&quot; · &quot;90일 내 자동갱신 건&quot;
              </span>
              <span className="num flex-shrink-0 rounded-[5px] border border-line bg-surface px-1.5 py-0.5 text-[11px] text-t4">
                <Command size={11} className="mb-px inline" />K
              </span>
            </button>
            <div className="flex items-center gap-2.5 rounded-full bg-surface-3 px-3 py-1.5 text-[12.5px] font-medium text-t2">
              <span className="h-[7px] w-[7px] rounded-full bg-[var(--green)] shadow-[0_0_0_3px_var(--green-soft)]" />
              <RefreshCw size={12} className="text-t3" />
              동기화 <span className="num">2</span>분 전
            </div>
            <button
              onClick={() => toast("알림 3건 — 만료 임박 계약을 확인하세요")}
              className="relative flex h-9 w-9 items-center justify-center rounded-[10px] text-t3 transition hover:bg-surface-3 hover:text-t1"
            >
              <Bell size={19} />
              <span className="absolute right-2 top-[7px] h-[7px] w-[7px] rounded-full border-[1.5px] border-white bg-[var(--red)]" />
            </button>
          </div>

          {/* content */}
          <main className="flex-1 overflow-y-auto px-[26px] pb-16 pt-6">
            <div className="mx-auto flex max-w-[1560px] flex-col gap-[18px]">{children}</div>
            <footer className="mx-auto mt-6 flex max-w-[1560px] flex-wrap justify-between gap-3 px-0.5 text-[11.5px] text-t4">
              <div>GS칼텍스 법무 계약서 AI · POC 프로토타입 v0.1</div>
              <div>AWS Bedrock · 한국어 OCR · 코퍼스 248,391건 · 최종 인덱싱 08-08 09:41</div>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}

function NavLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  const cls = cn(
    "relative mb-px flex h-10 items-center gap-2.5 overflow-hidden rounded-[9px] px-3 text-[14px] font-medium transition",
    collapsed && "mx-auto w-12 justify-center gap-0 px-0",
    active
      ? "bg-[image:var(--accent-grad)] text-white shadow-[0_6px_16px_-5px_rgba(15,110,130,.55)]"
      : "text-t2 hover:bg-[#e9eef0] hover:text-t1",
  );
  const iconEl = <Icon size={19} className={cn("flex-shrink-0", active ? "text-white" : "text-t3")} />;
  const badge = item.badge && !collapsed && (
    <span
      className={cn(
        "num ml-1 flex h-4 min-w-0 items-center justify-center rounded-md px-1.5 text-[10px] font-bold",
        active ? "bg-white/20 text-white" : item.warn ? "bg-[var(--red-soft)] text-[var(--red)]" : "bg-[var(--accent-soft)] text-[var(--accent-text)]",
      )}
    >
      {item.badge}
    </span>
  );

  if (item.href) {
    return (
      <Link href={item.href} className={cls} title={collapsed ? item.label : undefined}>
        {iconEl}
        {!collapsed && <span className="flex-shrink-0 whitespace-nowrap">{item.label}</span>}
        {badge}
      </Link>
    );
  }
  return (
    <button
      onClick={() => toast("해당 화면은 프로토타입 범위 밖이에요 — 연결된 3개 화면을 둘러보세요")}
      className={cn(cls, "w-full text-left")}
      title={collapsed ? item.label : undefined}
    >
      {iconEl}
      {!collapsed && <span className="flex-shrink-0 whitespace-nowrap">{item.label}</span>}
      {badge}
    </button>
  );
}
