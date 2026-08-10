"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Handshake, Search, ListFilter, ChevronRight, GitBranch, Inbox,
  X, ShieldAlert, ListChecks,
} from "lucide-react";
import { Pill, Tag } from "@/components/kit";
import { ReviewBadge } from "@/components/review-badge";
import { PB_STATUS_META, openRequests, reviewState, daysUntilReview, type PbStatus } from "@/lib/playbooks";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: PbStatus[] = ["submitted", "review", "confirmed", "change_requested"];

export default function PlaybookListPage() {
  const { playbooks } = useStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<PbStatus | "all">("all");
  const [dept, setDept] = useState("all");
  const [reviewOnly, setReviewOnly] = useState(false);

  const depts = useMemo(() => Array.from(new Set(playbooks.map((p) => p.dept))), [playbooks]);

  const rows = useMemo(() => {
    return playbooks
      .map((pb) => ({ pb, rs: reviewState(pb), left: daysUntilReview(pb), open: openRequests(pb) }))
      .filter((r) => (status === "all" ? true : r.pb.status === status))
      .filter((r) => (dept === "all" ? true : r.pb.dept === dept))
      .filter((r) => (reviewOnly ? r.rs === "due" || r.rs === "overdue" : true))
      .filter((r) => {
        if (!q.trim()) return true;
        const t = q.trim().toLowerCase();
        return (
          r.pb.title.toLowerCase().includes(t) ||
          r.pb.dept.toLowerCase().includes(t) ||
          r.pb.id.toLowerCase().includes(t) ||
          r.pb.scope.join(" ").toLowerCase().includes(t)
        );
      })
      /* 기한 초과 → 임박 순으로 앞에 세운다 */
      .sort((a, b) => (a.left ?? 9999) - (b.left ?? 9999));
  }, [playbooks, q, status, dept, reviewOnly]);

  const counts = useMemo(() => {
    const byStatus = Object.fromEntries(STATUS_FILTERS.map((s) => [s, 0])) as Record<PbStatus, number>;
    let needReview = 0;
    let requests = 0;
    for (const pb of playbooks) {
      byStatus[pb.status]++;
      const rs = reviewState(pb);
      if (rs === "due" || rs === "overdue") needReview++;
      requests += openRequests(pb).length;
    }
    return { byStatus, needReview, requests };
  }, [playbooks]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[23px] font-bold tracking-[-.7px] text-t1">협상 플레이북</h1>
          <p className="mt-1 text-[13px] text-t3">
            부서별 협상 기준을 현업과 법무가 함께 다듬고, 확정된 기준으로 실제 계약을 대조합니다. 확정본은 1년마다 다시 확인합니다.
          </p>
        </div>
        <Link href="/risk" className="flex h-[38px] items-center gap-2 rounded-[9px] border border-line bg-surface px-3.5 text-[13px] font-semibold text-t2 transition hover:bg-surface-2">
          <ShieldAlert size={15} className="text-[var(--red)]" /> 리스크 관리
        </Link>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-[18px] lg:grid-cols-4">
        {STATUS_FILTERS.slice(0, 3).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(status === s ? "all" : s)}
            className={cn(
              "rounded-[var(--radius)] border bg-surface p-4 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-0.5",
              status === s ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : "border-line",
            )}
          >
            <Pill tone={PB_STATUS_META[s].tone} className="h-[19px] text-[10.5px]">{PB_STATUS_META[s].label}</Pill>
            <div className="num mt-2 text-[26px] font-bold leading-none tracking-[-1px] text-t1">
              {counts.byStatus[s]}<span className="text-[12px] font-semibold text-t3"> 건</span>
            </div>
            <div className="mt-1 text-[10.5px] leading-snug text-t4">{PB_STATUS_META[s].desc}</div>
          </button>
        ))}
        <button
          onClick={() => setReviewOnly((v) => !v)}
          className={cn(
            "rounded-[var(--radius)] border bg-surface p-4 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-0.5",
            reviewOnly ? "border-[var(--amber)] ring-1 ring-[var(--amber)]" : "border-line",
          )}
        >
          <Pill tone="warn" className="h-[19px] text-[10.5px]">재검토 대상</Pill>
          <div className="num mt-2 text-[26px] font-bold leading-none tracking-[-1px] text-[var(--amber)]">
            {counts.needReview}<span className="text-[12px] font-semibold text-t3"> 건</span>
          </div>
          <div className="mt-1 text-[10.5px] leading-snug text-t4">기한 60일 이내 또는 초과</div>
        </button>
      </div>

      {counts.requests > 0 && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-[var(--radius)] border border-[var(--amber-line)] bg-[var(--amber-soft)] px-5 py-3.5">
          <Inbox size={17} className="text-[var(--amber)]" />
          <span className="text-[13px] font-bold text-[#93610a]">
            현업에서 보낸 수정요청 {counts.requests}건이 처리 대기 중입니다
          </span>
          <button
            onClick={() => setStatus("change_requested")}
            className="ml-auto flex h-[30px] items-center gap-1.5 rounded-[8px] bg-white px-3 text-[12px] font-bold text-[#93610a] transition hover:brightness-95"
          >
            해당 플레이북 보기 <ChevronRight size={13} />
          </button>
        </div>
      )}

      {/* 검색·필터 */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-[var(--radius)] border border-line bg-surface px-4 py-3 shadow-[var(--shadow-card)]">
        <div className="flex h-[36px] min-w-[240px] flex-1 items-center gap-2 rounded-[9px] border border-line bg-surface-2 px-3">
          <Search size={15} className="flex-shrink-0 text-t4" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="플레이북명·부서·적용 범위로 찾기"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-t1 outline-none placeholder:text-t4"
          />
          {q && <button onClick={() => setQ("")} className="text-t4 hover:text-t2"><X size={14} /></button>}
        </div>
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.06em] text-t4">
          <ListFilter size={12} /> 부서
        </span>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setDept("all")} className={cn("h-[28px] rounded-full border px-3 text-[12px] font-semibold transition", dept === "all" ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-line bg-surface text-t3 hover:text-t1")}>
            전체
          </button>
          {depts.map((d) => (
            <button key={d} onClick={() => setDept(dept === d ? "all" : d)} className={cn("h-[28px] rounded-full border px-3 text-[12px] font-semibold transition", dept === d ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-line bg-surface text-t3 hover:text-t1")}>
              {d}
            </button>
          ))}
        </div>
        {(status !== "all" || dept !== "all" || reviewOnly) && (
          <button onClick={() => { setStatus("all"); setDept("all"); setReviewOnly(false); }} className="ml-auto flex h-[28px] items-center gap-1 rounded-full border border-line px-3 text-[12px] font-semibold text-t3 hover:text-t1">
            <X size={12} /> 필터 초기화
          </button>
        )}
      </div>

      <div className="flex items-baseline gap-2 px-0.5 text-[14px] font-bold text-t1">
        <Handshake size={16} className="text-[var(--accent)]" />
        플레이북 <em className="num not-italic text-[var(--accent)]">{rows.length}</em>건
        <span className="text-[11.5px] font-medium text-t4">· 전체 {playbooks.length}건</span>
      </div>

      <div className="flex flex-col gap-2.5">
        {rows.length === 0 && (
          <div className="rounded-[var(--radius)] border border-dashed border-line-strong bg-surface px-6 py-12 text-center text-[13px] text-t3">
            조건에 맞는 플레이북이 없습니다.
          </div>
        )}
        {rows.map(({ pb, rs, open }) => {
          const latest = pb.versions[pb.versions.length - 1];
          const urgent = rs === "overdue" || open.length > 0;
          return (
            <Link
              key={pb.id}
              href={`/playbook/${pb.id}`}
              className="group relative flex gap-3.5 overflow-hidden rounded-[var(--radius-md)] border border-line bg-surface p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-[#c9dde2] hover:shadow-[0_10px_26px_-16px_rgba(15,110,130,.5)]"
            >
              <span className={cn("absolute inset-y-0 left-0 w-[3px] transition", urgent ? "bg-[var(--red)] opacity-100" : "bg-[var(--accent)] opacity-0 group-hover:opacity-100")} />
              <span className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[10px] bg-[var(--accent-soft)] text-[11px] font-extrabold tracking-[-.3px] text-[var(--accent-text)]">
                {pb.dept.slice(0, 2)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-bold tracking-[-.25px] text-t1">{pb.title}</span>
                  <Pill tone={PB_STATUS_META[pb.status].tone} className="h-[19px] text-[10.5px]">{PB_STATUS_META[pb.status].label}</Pill>
                  {open.length > 0 && <Pill tone="crit" className="h-[19px] text-[10.5px]">수정요청 {open.length}</Pill>}
                  <ReviewBadge pb={pb} />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-t4">
                  <span className="num font-bold text-t3">{pb.id}</span>
                  <Pill tone="accent" className="h-[18px] text-[10px]">{pb.dept}</Pill>
                  <Tag className="h-[18px] text-[10px]">적용 · {pb.scope.join(" / ")}</Tag>
                  <span>· 법무 {pb.owner}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-[7px] bg-surface-2 px-2 py-1 text-[11px] font-semibold text-t3">
                    <ListChecks size={11} className="text-[var(--accent)]" /> 기준 항목 {pb.items.length}개
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-[7px] bg-surface-2 px-2 py-1 text-[11px] font-semibold text-t3">
                    <GitBranch size={11} className="text-[var(--accent)]" /> {latest.v} · {pb.versions.length}개 버전
                  </span>
                  <span className="num text-[11px] text-t4">최종 {latest.when} · {latest.author}</span>
                  {pb.pending.length > 0 && (
                    <Tag className="h-[19px] bg-[var(--accent-soft)] text-[10px] text-[var(--accent-text)]">미확정 변경 {pb.pending.length}</Tag>
                  )}
                  <ChevronRight size={15} className="ml-auto text-t4 transition group-hover:text-[var(--accent)]" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
