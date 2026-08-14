"use client";

/* ============================================================
   만료·갱신 타임라인
   ------------------------------------------------------------
   기획서 P2(만료·자동갱신 누락)는 As-Is 손실 중 유일하게 성격이
   "직접 금전 손실"로 분류된 항목입니다.

   눈금은 F-LDG-004 의 알림 시점(120/90/60/30/7일 전)과 같습니다.
   자동갱신은 '통지기한', 재계약은 '만료일'이 기준이라 마커를
   채움/테두리로 구분합니다. 통지기한을 놓치면 조건 그대로 연장됩니다.
   ============================================================ */

import Link from "next/link";
import { Clock, BellRing, ChevronRight } from "lucide-react";
import { SectionCard, Pill } from "@/components/kit";
import { EXPIRING, EXPIRING_TOTAL, type DeptId, type ExpiringItem } from "@/lib/data";

const SPAN = 126; // 타임라인 왼쪽 끝 (D-126) — D-120 눈금이 안쪽에 놓이도록
const TICKS = [120, 90, 60, 30, 7];

const TONE = {
  crit: { dot: "#c0392b", soft: "var(--red-soft)", text: "#a52f22" },
  warn: { dot: "#b0740b", soft: "var(--amber-soft)", text: "#93610a" },
  ok: { dot: "#1e7a52", soft: "var(--green-soft)", text: "#0a6b42" },
} as const;

/** D-day → 왼쪽에서의 위치(%). 왼쪽이 먼 미래, 오른쪽이 임박 */
const posOf = (dday: number) => ((SPAN - dday) / SPAN) * 100;

/** 금액 규모 → 마커 지름(px) */
function sizeOf(weight: number) {
  const s = 18 + Math.sqrt(weight) * 4.2;
  return Math.min(40, Math.round(s));
}

function Marker({ item }: { item: ExpiringItem }) {
  const t = TONE[item.risk];
  const size = sizeOf(item.weight);
  const notice = item.kind === "notice";
  const href = item.cid ? `/contracts/${item.cid}` : "/contracts";

  return (
    <Link
      href={href}
      className="group absolute bottom-0 z-10 -translate-x-1/2"
      style={{ left: `${posOf(item.dday)}%` }}
    >
      <span
        className="flex items-center justify-center rounded-full border-2 transition group-hover:scale-110"
        style={{
          width: size,
          height: size,
          borderColor: t.dot,
          background: notice ? t.dot : "#fff",
        }}
      >
        <span
          className="num text-[10px] font-extrabold leading-none"
          style={{ color: notice ? "#fff" : t.dot }}
        >
          {item.dday}
        </span>
      </span>

      {/* 툴팁 */}
      <span className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-30 w-[250px] -translate-x-1/2 scale-95 rounded-[10px] border border-line bg-surface p-3 text-left opacity-0 shadow-[var(--shadow-pop)] transition group-hover:scale-100 group-hover:opacity-100">
        <span className="block text-[13px] font-bold text-t1">{item.title}</span>
        <span className="num mt-1 block text-[11.5px] text-t3">
          {item.party} · {item.amount}
        </span>
        <span className="mt-1.5 block text-[11.5px] leading-snug text-t4">{item.note}</span>
        <span
          className="num mt-2 inline-flex items-center gap-1 rounded-[6px] px-2 py-0.5 text-[11px] font-bold"
          style={{ background: t.soft, color: t.text }}
        >
          {notice ? "통지기한" : "만료일"} D-{item.dday}
        </span>
      </span>
    </Link>
  );
}

export function RenewalTimeline({ dept }: { dept: DeptId }) {
  const items = EXPIRING.filter((e) => dept === "all" || e.dept === dept);
  const urgent = items.filter((e) => e.dday <= 30).sort((a, b) => a.dday - b.dday);
  const total = dept === "all" ? EXPIRING_TOTAL : Math.round(EXPIRING_TOTAL * (items.length / EXPIRING.length));

  return (
    <SectionCard
      title="만료·갱신 타임라인"
      icon={<Clock size={17} className="text-[var(--amber)]" />}
      sub={`D-120 이내 조치 필요 ${total}건 중 담당자 확인이 필요한 ${items.length}건`}
      right={
        <Pill tone="crit" dot>
          통지기한 임박 {urgent.length}건
        </Pill>
      }
    >
      {items.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-t4">해당 부문에 D-120 이내 계약이 없습니다</div>
      ) : (
        <>
          {/* 축 */}
          <div className="relative h-[92px]">
            {/* 눈금 */}
            {TICKS.map((d) => (
              <div
                key={d}
                className="absolute bottom-0 top-0 border-l border-dashed border-line"
                style={{ left: `${posOf(d)}%` }}
              >
                <span className="num absolute -top-1 left-1.5 whitespace-nowrap text-[11px] font-bold text-t4">
                  D-{d}
                </span>
              </div>
            ))}

            {/* 임박 구간 강조 */}
            <div
              className="absolute bottom-[19px] top-6 rounded-l-[6px] bg-[linear-gradient(90deg,transparent,var(--red-soft))]"
              style={{ left: `${posOf(30)}%`, right: 0 }}
            />

            {/* 기준선 */}
            <div className="absolute bottom-[19px] left-0 right-0 h-[2px] rounded-full bg-line-strong" />

            {items.map((e) => (
              <Marker key={e.id} item={e} />
            ))}
          </div>

          {/* 범례 */}
          <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-line-soft pt-3 text-[11.5px] text-t4">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#b0740b]" />
              자동갱신 · <b className="font-semibold text-t3">통지기한</b> 기준
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border-2 border-[#b0740b] bg-white" />
              재계약 협의 · <b className="font-semibold text-t3">만료일</b> 기준
            </span>
            <span>원 크기 = 계약금액 규모</span>
          </div>

          {/* 임박 항목 */}
          {urgent.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-3">
              {urgent.slice(0, 3).map((e) => {
                const t = TONE[e.risk];
                return (
                  <Link
                    key={e.id}
                    href={e.cid ? `/contracts/${e.cid}` : "/contracts"}
                    className="group flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--red-line)] bg-[linear-gradient(100deg,#fdf1ef,#fdf8f2)] px-3.5 py-3 transition hover:shadow-[var(--shadow-card)]"
                  >
                    <span
                      className="num flex h-10 w-10 flex-shrink-0 flex-col items-center justify-center rounded-[11px]"
                      style={{ background: t.soft, color: t.text }}
                    >
                      <span className="text-[9px] font-bold leading-none opacity-70">D-</span>
                      <span className="text-[15px] font-extrabold leading-none">{e.dday}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <BellRing size={12} className="flex-shrink-0 text-[var(--red)]" />
                        <span className="truncate text-[13px] font-bold text-t1">{e.title}</span>
                      </span>
                      <span className="mt-0.5 block text-[11.5px] text-t3">
                        {e.party} · {e.renew}
                      </span>
                      <span className="mt-1 block text-[11.5px] leading-snug text-t4">{e.note}</span>
                    </span>
                    <ChevronRight
                      size={15}
                      className="mt-0.5 flex-shrink-0 text-[var(--red-line)] transition group-hover:text-[var(--red)]"
                    />
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}
