"use client";

/* ============================================================
   계약 인텔리전스 대시보드
   ------------------------------------------------------------
   기획서 F-LDG-005(대시보드·집계)를 화면으로 옮긴 구성입니다.
   블록마다 기획서의 As-Is 손실 하나에 대응합니다.

     부문 필터           F-SEC-002 집계 누출 방지
     KPI                 데이터 품질 지표(미확정 비율·검토 대기)
     만료·갱신 타임라인  P2 만료·자동갱신 누락 — 유일한 '직접 금전 손실'
     조항 노출 현황      P1 조항 검색 불가 · P5 리스크 집계 불가

   숫자는 프로토타입용 가상값입니다. 다만 F-LDG-005 의 예외 규칙
   ("미확정 데이터가 포함된 집계는 그 비율을 함께 표시")을 지키려고
   모든 집계에 확정/미확정을 병기했습니다.
   ============================================================ */

import { useState } from "react";
import Link from "next/link";
import { ScanText } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { kpisFor, type DeptId, type PeriodId } from "@/lib/data";
import { FilterBar, lockedDeptFor } from "@/components/dashboard/filter-bar";
import { KpiRow } from "@/components/dashboard/kpi-row";
import { ClauseExposure } from "@/components/dashboard/clause-exposure";
import { RenewalTimeline } from "@/components/dashboard/renewal-timeline";
import { RecentTable } from "@/components/dashboard/recent-table";

export default function DashboardPage() {
  const { user } = useAuth();
  const [dept, setDept] = useState<DeptId>("all");
  const [period, setPeriod] = useState<PeriodId>("30d");

  /* 현업 담당자는 소속 부문 집계만 볼 수 있습니다 (F-SEC-002).
     선택값을 덮어쓰지 않고, 잠긴 부문이 있으면 그쪽을 우선합니다 —
     로그인 세션은 클라이언트에서 복원되므로 계정을 바꿔도 바로 따라옵니다. */
  const locked = lockedDeptFor(user?.role, user?.dept);
  const view = locked ?? dept;

  const kpis = kpisFor(view, period);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-.7px] text-t1">계약 인텔리전스 대시보드</h1>
          <p className="mt-1 text-[13.5px] text-t3">
            수십만 건의 계약서를 구조화된 데이터로 — 조회·집계·추적이 가능해진 항목을 모았습니다.
          </p>
        </div>
        <Link
          href="/analyze"
          className="flex h-[40px] items-center gap-2 rounded-[9px] bg-[var(--accent)] px-4 text-[14px] font-semibold text-white shadow-[0_4px_12px_-3px_rgba(15,110,130,.5)] transition hover:bg-[var(--accent-600)]"
        >
          <ScanText size={17} /> 계약서 분석 시작
        </Link>
      </div>

      <FilterBar dept={view} period={period} onDept={setDept} onPeriod={setPeriod} />

      <KpiRow kpis={kpis} period={period} />

      <RenewalTimeline dept={view} />

      <ClauseExposure dept={view} />

      <RecentTable dept={view} />
    </>
  );
}
