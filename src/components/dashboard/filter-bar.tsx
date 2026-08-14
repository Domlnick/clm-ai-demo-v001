"use client";

/* ============================================================
   대시보드 필터 — 기간 · 부문
   ------------------------------------------------------------
   기획서 F-SEC-002 (집계 누출 주의):
     "문서 목록은 막았는데 대시보드 집계에는 포함되면
      건수·금액으로 정보가 새어나갑니다."

   그래서 현업 담당자(business)는 자기 부문에 고정되고
   전사 집계를 선택할 수 없습니다. 법무 담당자 이상은 전사를 봅니다.
   ============================================================ */

import { Building2, CalendarRange, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { DEPTS, PERIODS, DEPT_BY_NAME, type DeptId, type PeriodId } from "@/lib/data";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";

/** 로그인 계정이 볼 수 있는 부문. null 이면 제한 없음(전사 포함 전체) */
export function lockedDeptFor(role: string | null | undefined, dept: string | undefined): DeptId | null {
  if (role !== "business" || !dept) return null;
  return DEPT_BY_NAME[dept] ?? null;
}

function Segmented({
  items,
  value,
  onChange,
  lockedTo,
  onBlocked,
}: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  lockedTo?: string | null;
  onBlocked?: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-[10px] border border-line bg-surface-2 p-1">
      {items.map((it) => {
        const active = it.id === value;
        const blocked = lockedTo != null && it.id !== lockedTo;
        return (
          <button
            key={it.id}
            onClick={() => (blocked ? onBlocked?.() : onChange(it.id))}
            title={blocked ? "현업 담당자는 소속 부문 집계만 조회할 수 있습니다" : undefined}
            className={cn(
              "flex h-8 items-center gap-1.5 whitespace-nowrap rounded-[7px] px-3 text-[13px] font-semibold transition",
              active
                ? "bg-surface text-[var(--accent-text)] shadow-[var(--shadow-card)]"
                : blocked
                  ? "cursor-not-allowed text-t4 opacity-50"
                  : "text-t3 hover:text-t1",
            )}
          >
            {blocked && <Lock size={11} />}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

export function FilterBar({
  dept,
  period,
  onDept,
  onPeriod,
}: {
  dept: DeptId;
  period: PeriodId;
  onDept: (d: DeptId) => void;
  onPeriod: (p: PeriodId) => void;
}) {
  const { user } = useAuth();
  const locked = lockedDeptFor(user?.role, user?.dept);

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-[var(--radius)] border border-line bg-surface px-[18px] py-3.5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2.5">
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-t3">
          <Building2 size={15} className="text-[var(--accent)]" /> 부문
        </span>
        <Segmented
          items={DEPTS}
          value={dept}
          onChange={(d) => onDept(d as DeptId)}
          lockedTo={locked}
          onBlocked={() => toast("현업 담당자는 소속 부문 집계만 조회할 수 있습니다")}
        />
      </div>

      <div className="flex items-center gap-2.5">
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-t3">
          <CalendarRange size={15} className="text-[var(--accent)]" /> 기간
        </span>
        <Segmented
          items={PERIODS.map((p) => ({ id: p.id, label: p.label }))}
          value={period}
          onChange={(p) => onPeriod(p as PeriodId)}
        />
      </div>

      {locked && (
        <span className="ml-auto flex items-center gap-1.5 rounded-[8px] bg-[var(--amber-soft)] px-2.5 py-1.5 text-[12px] font-semibold text-[#93610a]">
          <Lock size={12} />
          {user?.dept} 집계만 조회 가능
        </span>
      )}
    </div>
  );
}
