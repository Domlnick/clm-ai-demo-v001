"use client";

/* ============================================================
   KPI 4장
   ------------------------------------------------------------
   "AI 자동 분류 정확도" 같은 시스템 지표 대신, 기획서 F-LDG-005 의
   기본 지표(건수·금액)와 데이터 품질 지표(미확정 비율·검토 대기)를
   씁니다. 모든 카드에 확정/미확정을 알리는 캡션을 답니다.
   ============================================================ */

import Link from "next/link";
import { FileText, ShieldCheck, Clock, Coins, TrendingUp, TrendingDown } from "lucide-react";
import { PERIODS, type Kpi, type PeriodId } from "@/lib/data";
import { cn } from "@/lib/utils";

const ACCENT: Record<string, { ring: string; ico: string }> = {
  accent: { ring: "#0f6e82", ico: "bg-[var(--accent-soft)] text-[var(--accent)]" },
  ok: { ring: "#1e7a52", ico: "bg-[var(--green-soft)] text-[#0a8d3d]" },
  warn: { ring: "#b0740b", ico: "bg-[var(--amber-soft)] text-[#c47a00]" },
  crit: { ring: "#c0392b", ico: "bg-[var(--red-soft)] text-[#d01016]" },
};

const ICON: Record<string, React.ReactNode> = {
  digitized: <FileText size={17} />,
  field: <ShieldCheck size={17} />,
  queue: <Clock size={17} />,
  amount: <Coins size={17} />,
};

function Spark({ data, color }: { data: number[]; color: string }) {
  const w = 76, h = 28, max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M${pts.join(" L")} L${w},${h} L0,${h} Z`} fill={color} opacity={0.08} />
    </svg>
  );
}

function Card({ k, deltaLabel }: { k: Kpi; deltaLabel: string }) {
  const a = ACCENT[k.tone];
  const body = (
    <>
      <div className="mb-3 flex items-center gap-2.5 text-[13px] font-semibold text-t3">
        <span className={cn("flex h-[30px] w-[30px] items-center justify-center rounded-[9px]", a.ico)}>
          {ICON[k.key]}
        </span>
        {k.label}
      </div>

      <div className="num flex items-baseline gap-1 text-[30px] font-bold leading-none tracking-[-1px] text-t1">
        {k.value}
        <span className="text-[15px] font-semibold text-t3">{k.unit}</span>
      </div>

      {k.pct != null && (
        <div className="mt-2.5 h-[7px] overflow-hidden rounded-full bg-[#eceef2]">
          <div
            className="h-full rounded-full transition-[width] duration-700"
            style={{ width: `${k.pct}%`, background: k.tone === "ok" ? "linear-gradient(90deg,#22a869,#158a4e)" : "var(--accent-grad)" }}
          />
        </div>
      )}

      {/* 확정/미확정 구간 — F-LDG-005 예외 규칙 */}
      <div className="mt-2 text-[12px] font-medium text-t4">{k.caption}</div>

      <div className="mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold">
        <span className={cn("num inline-flex items-center gap-0.5", k.up ? "text-[#0a9b46]" : "text-[#e0444a]")}>
          {k.up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {k.delta}
        </span>
        <span className="font-medium text-t4">{deltaLabel}</span>
      </div>

      <div className="absolute right-3.5 top-4 opacity-90">
        <Spark data={k.spark} color={a.ring} />
      </div>
    </>
  );

  const cls =
    "relative block overflow-hidden rounded-[var(--radius)] border border-line bg-surface px-5 py-[18px] shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)]";

  return k.href ? (
    <Link href={k.href} className={cls}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function KpiRow({ kpis, period }: { kpis: Kpi[]; period: PeriodId }) {
  const deltaLabel = PERIODS.find((p) => p.id === period)?.deltaLabel ?? "";
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((k) => (
        <Card key={k.key} k={k} deltaLabel={deltaLabel} />
      ))}
    </div>
  );
}
