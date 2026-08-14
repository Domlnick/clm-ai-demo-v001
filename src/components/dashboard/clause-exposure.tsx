"use client";

/* ============================================================
   조항 노출 현황
   ------------------------------------------------------------
   기획서 P1(조항 검색 불가) · P5(리스크 집계 불가)에 답하는 블록.

     "손해배상 한도가 계약금액의 100%를 초과하는 계약이 몇 건인가"
      → As-Is 에서는 전수 육안 검토가 필요했던 질문

   '보유'는 불리한 조항이 들어있는 계약, '부재'는 있어야 할 조항이
   빠진 계약입니다. 후자는 F-LDG-005 가 요구하는 항목이고,
   육안으로는 찾기가 가장 어려운 쪽입니다.

   시연 중 /analyze 에서 등록한 리스크 규칙은 아래쪽에 '시연 중 등록'
   행으로 붙고, 건수는 계약 대장 코퍼스에서 실제로 계산합니다.
   ============================================================ */

import Link from "next/link";
import { ShieldAlert, FileSearch, ChevronRight, Sparkles } from "lucide-react";
import { SectionCard, Pill } from "@/components/kit";
import { CLAUSE_EXPOSURE, SEG_LABEL, type ClauseRow, type DeptId } from "@/lib/data";
import { activeHits, type RiskRule } from "@/lib/risk";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Row = {
  key: string;
  title: string;
  desc: string;
  level: "crit" | "warn";
  total: number;
  confirmed: number;
  segShare: [number, number, number];
  action: string;
  href: string;
  live?: boolean;
};

const SEG_COLOR = ["#0f6e82", "#3bb4c7", "#c8892b"];

function toRow(r: ClauseRow, dept: DeptId): Row {
  const total = dept === "all" ? r.total : r.byDept[dept];
  /* 부문을 좁히면 확정 비율은 유지한 채 건수만 줄입니다 */
  const confirmed = Math.round((r.confirmed / r.total) * total);
  return {
    key: r.id,
    title: r.title,
    desc: r.desc,
    level: r.level,
    total,
    confirmed,
    segShare: r.segShare,
    action: r.action,
    href: r.ruleId ? `/risk#${r.ruleId}` : "/search",
  };
}

function liveRow(rule: RiskRule): Row {
  const hits = activeHits(rule).length;
  return {
    key: rule.id,
    title: rule.title,
    desc: rule.desc,
    level: rule.level,
    total: hits,
    confirmed: hits,
    segShare: [33, 34, 33],
    action: rule.applied ? "전체 적용됨" : "적용 대기",
    href: `/risk#${rule.id}`,
    live: true,
  };
}

function RowItem({ r }: { r: Row }) {
  const open = r.total - r.confirmed;
  return (
    <Link
      href={r.href}
      className="group grid grid-cols-[minmax(0,1fr)_92px_150px_112px_20px] items-center gap-3 border-b border-line-soft px-5 py-3.5 transition last:border-0 hover:bg-surface-2"
    >
      {/* 조항 */}
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            "h-[34px] w-[3px] flex-shrink-0 rounded-full",
            r.level === "crit" ? "bg-[var(--red)]" : "bg-[var(--amber)]",
          )}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14px] font-bold text-t1">{r.title}</span>
            {r.live && (
              <Pill tone="violet" className="flex-shrink-0">
                <Sparkles size={10} /> 시연 중 등록
              </Pill>
            )}
          </div>
          <div className="mt-0.5 truncate text-[12.5px] text-t3">{r.desc}</div>
        </div>
      </div>

      {/* 건수 — 확정/미확정 병기 */}
      <div className="text-right">
        <div className="num text-[22px] font-bold leading-none tracking-[-.6px] text-t1">
          {r.total}
          <span className="ml-0.5 text-[12px] font-semibold text-t3">건</span>
        </div>
        <div className="num mt-1 text-[11px] font-medium text-t4">
          {open > 0 ? `확정 ${r.confirmed} · 미확정 ${open}` : "전건 확정"}
        </div>
      </div>

      {/* 세그먼트 비중 */}
      <div>
        <div className="flex h-[7px] overflow-hidden rounded-full">
          {r.segShare.map((pct, i) => (
            <div key={i} style={{ width: `${pct}%`, background: SEG_COLOR[i] }} />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[10.5px] font-semibold text-t4">
          {r.segShare.map((pct, i) => (
            <span key={i} className="num">
              S{i + 1} {pct}%
            </span>
          ))}
        </div>
      </div>

      {/* 조치 */}
      <div className="text-[12.5px] font-semibold text-t2">{r.action}</div>

      <ChevronRight size={16} className="text-line-strong transition group-hover:text-[var(--accent)]" />
    </Link>
  );
}

function GroupHead({
  icon,
  label,
  desc,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2.5 bg-surface-2 px-5 py-2.5">
      {icon}
      <span className="text-[13px] font-bold text-t2">{label}</span>
      <span className="text-[12px] text-t4">{desc}</span>
      <span className="num ml-auto text-[13px] font-bold text-t1">{count}건</span>
    </div>
  );
}

export function ClauseExposure({ dept }: { dept: DeptId }) {
  const { rules } = useStore();

  const present = CLAUSE_EXPOSURE.filter((r) => r.kind === "present").map((r) => toRow(r, dept));
  const absent = CLAUSE_EXPOSURE.filter((r) => r.kind === "absent").map((r) => toRow(r, dept));

  /* 시드 규칙은 위 하드코딩 행이 대표하므로, 시연 중 새로 등록된 규칙만 얹습니다
     (/analyze 결과 · 버전 변경 · 플레이북 반영 · /risk 직접 등록) */
  const live = rules.filter((r) => r.source !== "seed").map(liveRow);

  const sum = (rows: Row[]) => rows.reduce((a, b) => a + b.total, 0);

  return (
    <SectionCard
      title="조항 노출 현황"
      icon={<ShieldAlert size={17} className="text-[var(--red)]" />}
      sub="계약 대장이 조항 단위로 필드화되어, 전수 육안 검토 없이 집계할 수 있게 된 항목"
      right={
        <Link
          href="/risk"
          className="flex items-center gap-1 text-[13px] font-semibold text-t3 transition hover:text-[var(--accent)]"
        >
          리스크 관리 <ChevronRight size={14} />
        </Link>
      }
      bodyClass="p-0"
    >
      <GroupHead
        icon={<ShieldAlert size={14} className="text-[var(--red)]" />}
        label="불리 조항 보유"
        desc="사내 표준을 벗어난 조항이 들어있는 계약"
        count={sum(present) + sum(live)}
      />
      {present.map((r) => (
        <RowItem key={r.key} r={r} />
      ))}
      {live.map((r) => (
        <RowItem key={r.key} r={r} />
      ))}

      <GroupHead
        icon={<FileSearch size={14} className="text-[var(--amber)]" />}
        label="필수 조항 부재"
        desc="있어야 할 조항이 빠진 계약 — 육안으로는 찾기 가장 어려운 유형"
        count={sum(absent)}
      />
      {absent.map((r) => (
        <RowItem key={r.key} r={r} />
      ))}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line-soft bg-surface-2 px-5 py-3 text-[11.5px] text-t4">
        <span className="font-semibold text-t3">세그먼트</span>
        {(["S1", "S2", "S3"] as const).map((s, i) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: SEG_COLOR[i] }} />
            {s} {SEG_LABEL[s]}
          </span>
        ))}
        <span className="ml-auto">
          미확정 건은 AI 판정만 있고 법무 검토가 끝나지 않은 계약입니다
        </span>
      </div>
    </SectionCard>
  );
}
