"use client";

/* ============================================================
   헤더 우측 사용자 메뉴
   ------------------------------------------------------------
   로그인 상태  → 이름 클릭 시 토글박스(계정 목록 + 로그아웃)
   로그아웃 상태 → "로그인" 버튼 (/login 으로 이동)
   ============================================================ */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, LogIn, LogOut, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ROLE_DESC, ROLE_LABEL } from "@/lib/permissions";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";

export function UserMenu() {
  const { user, signedIn, accounts, logout, switchAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const router = useRouter();

  /* 바깥 클릭 · Esc 로 닫기 */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!signedIn || !user) {
    return (
      <Link
        href="/login"
        className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full bg-[image:var(--accent-grad)] px-3.5 text-[13px] font-semibold text-white shadow-[0_1px_4px_rgba(15,110,130,.3)] transition hover:opacity-90"
      >
        <LogIn size={15} />
        로그인
      </Link>
    );
  }

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13.5px] font-semibold text-t2 transition",
          open ? "bg-surface-3 ring-1 ring-line-strong" : "bg-surface-3 hover:bg-[#e0e8ea]",
        )}
      >
        <User size={16} className="text-t3" />
        {user.name}
        <ChevronDown size={14} className={cn("text-t4 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[38px] z-[70] w-[268px] overflow-hidden rounded-[13px] border border-line bg-surface shadow-[var(--shadow-pop)]"
        >
          {/* 현재 사용자 */}
          <div className="flex items-center gap-2.5 border-b border-line-soft px-3.5 py-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[11px] bg-[image:var(--accent-grad)] text-[14px] font-bold text-white">
              {user.name.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5 text-[13.5px] font-bold text-t1">
                {user.name}
                <span className="text-[10.5px] font-medium text-t3">{user.title}</span>
              </div>
              <div className="mt-px truncate text-[11px] text-t3">{user.email}</div>
              <div className="mt-[3px] flex flex-wrap items-center gap-1">
                <span className="rounded-md bg-[#101828] px-[6px] py-px text-[10px] font-semibold text-white">
                  {ROLE_LABEL[user.role]}
                </span>
                <span className="rounded-md bg-surface-3 px-[6px] py-px text-[10px] font-medium text-t3">
                  {user.dept} · {user.team}
                </span>
              </div>
              <div className="mt-[3px] text-[10px] text-t4">{ROLE_DESC[user.role]}</div>
            </div>
          </div>

          {/* 계정 목록 */}
          <div className="px-1.5 py-1.5">
            <div className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[.06em] text-t4">
              계정 전환
            </div>
            {accounts.map((a) => {
              const me = a.id === user.id;
              return (
                <button
                  key={a.id}
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    if (me) return;
                    switchAccount(a.id);
                    toast(`${a.name} · ${ROLE_LABEL[a.role]} 권한으로 전환했습니다`);
                  }}
                  className="flex w-full items-center gap-2 rounded-[8px] px-2 py-[7px] text-left transition hover:bg-surface-2"
                >
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[7px] bg-surface-3 text-[11px] font-bold text-t2">
                    {a.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold text-t1">
                      {a.name} <span className="font-medium text-t3">{a.title}</span>
                    </span>
                    <span className="flex items-center gap-1 truncate text-[10.5px] text-t4">
                      <span className="rounded bg-surface-3 px-1 font-semibold text-t3">{ROLE_LABEL[a.role]}</span>
                      {a.dept} · {a.team}
                    </span>
                  </span>
                  {me && <Check size={14} className="flex-shrink-0 text-[var(--accent)]" />}
                </button>
              );
            })}
          </div>

          {/* 로그아웃 */}
          <div className="border-t border-line-soft px-1.5 py-1.5">
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                logout();
                toast("로그아웃했습니다");
                router.push("/login");
              }}
              className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-[8px] text-[12.5px] font-semibold text-[var(--red)] transition hover:bg-[var(--red-soft)]"
            >
              <LogOut size={15} />
              로그아웃
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
