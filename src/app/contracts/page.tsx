"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BookText, Search, ShieldAlert, ListFilter, ChevronRight, GitBranch,
  FolderTree, X, EyeOff,
} from "lucide-react";
import { Pill, Tag, FileType } from "@/components/kit";
import { CONTRACTS, STATUS_META, STATUS_ORDER, type ContractStatus } from "@/lib/contracts";
import { SEG_LABEL } from "@/lib/data";
import { rulesForContract, excludedRulesForContract } from "@/lib/risk";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function ContractsPage() {
  const { rules, statuses } = useStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ContractStatus | "all">("all");
  const [type, setType] = useState<string>("all");
  const [riskOnly, setRiskOnly] = useState(false);

  const types = useMemo(() => Array.from(new Set(CONTRACTS.map((c) => c.type))), []);

  const rows = useMemo(() => {
    return CONTRACTS.map((c) => {
      const st = statuses[c.id] ?? c.status;
      const risks = rulesForContract(c.id, rules);
      const ignored = excludedRulesForContract(c.id, rules);
      return { c, st, risks, ignored };
    })
      .filter((r) => (status === "all" ? true : r.st === status))
      .filter((r) => (type === "all" ? true : r.c.type === type))
      .filter((r) => (riskOnly ? r.risks.length > 0 : true))
      .filter((r) => {
        if (!q.trim()) return true;
        const t = q.trim().toLowerCase();
        return (
          r.c.title.toLowerCase().includes(t) ||
          r.c.party.toLowerCase().includes(t) ||
          r.c.id.toLowerCase().includes(t) ||
          r.c.type.toLowerCase().includes(t)
        );
      });
  }, [rules, statuses, q, status, type, riskOnly]);

  const counts = useMemo(() => {
    const byStatus = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<ContractStatus, number>;
    let risky = 0;
    for (const c of CONTRACTS) {
      byStatus[statuses[c.id] ?? c.status]++;
      if (rulesForContract(c.id, rules).length > 0) risky++;
    }
    return { byStatus, risky };
  }, [rules, statuses]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[23px] font-bold tracking-[-.7px] text-t1">계약 대장</h1>
          <p className="mt-1 text-[13px] text-t3">
            AI가 분류한 유형·세그먼트와 계약 상태, 버전 이력, 적용된 리스크를 한곳에서 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/risk" className="flex h-[38px] items-center gap-2 rounded-[9px] border border-line bg-surface px-3.5 text-[13px] font-semibold text-t2 transition hover:bg-surface-2">
            <ShieldAlert size={15} className="text-[var(--red)]" /> 리스크 관리
          </Link>
          <Link href="/analyze" className="flex h-[38px] items-center gap-2 rounded-[9px] bg-[var(--accent)] px-3.5 text-[13px] font-bold text-white transition hover:bg-[var(--accent-600)]">
            새 계약서 분석
          </Link>
        </div>
      </div>

      {/* 상태 요약 */}
      <div className="grid grid-cols-2 gap-[18px] lg:grid-cols-5">
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(status === s ? "all" : s)}
            className={cn(
              "rounded-[var(--radius)] border bg-surface p-4 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-0.5",
              status === s ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : "border-line",
            )}
          >
            <Pill tone={STATUS_META[s].tone} className="h-[19px] text-[10.5px]">{STATUS_META[s].label}</Pill>
            <div className="num mt-2 text-[26px] font-bold leading-none tracking-[-1px] text-t1">
              {counts.byStatus[s]}<span className="text-[12px] font-semibold text-t3"> 건</span>
            </div>
            <div className="mt-1 text-[10.5px] leading-snug text-t4">{STATUS_META[s].desc}</div>
          </button>
        ))}
        <button
          onClick={() => setRiskOnly((v) => !v)}
          className={cn(
            "rounded-[var(--radius)] border bg-surface p-4 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-0.5",
            riskOnly ? "border-[var(--red)] ring-1 ring-[var(--red)]" : "border-line",
          )}
        >
          <Pill tone="crit" className="h-[19px] text-[10.5px]">리스크 보유</Pill>
          <div className="num mt-2 text-[26px] font-bold leading-none tracking-[-1px] text-[var(--red)]">
            {counts.risky}<span className="text-[12px] font-semibold text-t3"> 건</span>
          </div>
          <div className="mt-1 text-[10.5px] leading-snug text-t4">적용된 규칙에 걸린 계약</div>
        </button>
      </div>

      {/* 검색·필터 */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-[var(--radius)] border border-line bg-surface px-4 py-3 shadow-[var(--shadow-card)]">
        <div className="flex h-[36px] min-w-[240px] flex-1 items-center gap-2 rounded-[9px] border border-line bg-surface-2 px-3">
          <Search size={15} className="flex-shrink-0 text-t4" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="계약명·상대방·계약번호로 찾기"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-t1 outline-none placeholder:text-t4"
          />
          {q && <button onClick={() => setQ("")} className="text-t4 hover:text-t2"><X size={14} /></button>}
        </div>
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.06em] text-t4">
          <ListFilter size={12} /> 유형
        </span>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setType("all")} className={cn("h-[28px] rounded-full border px-3 text-[12px] font-semibold transition", type === "all" ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-line bg-surface text-t3 hover:text-t1")}>
            전체
          </button>
          {types.map((t) => (
            <button key={t} onClick={() => setType(type === t ? "all" : t)} className={cn("h-[28px] rounded-full border px-3 text-[12px] font-semibold transition", type === t ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-line bg-surface text-t3 hover:text-t1")}>
              {t}
            </button>
          ))}
        </div>
        {(status !== "all" || riskOnly || type !== "all") && (
          <button onClick={() => { setStatus("all"); setRiskOnly(false); setType("all"); }} className="ml-auto flex h-[28px] items-center gap-1 rounded-full border border-line px-3 text-[12px] font-semibold text-t3 hover:text-t1">
            <X size={12} /> 필터 초기화
          </button>
        )}
      </div>

      {/* 목록 */}
      <div className="flex items-baseline gap-2 px-0.5 text-[14px] font-bold text-t1">
        <BookText size={16} className="text-[var(--accent)]" />
        계약 <em className="num not-italic text-[var(--accent)]">{rows.length}</em>건
        <span className="text-[11.5px] font-medium text-t4">· 전체 {CONTRACTS.length}건</span>
      </div>

      <div className="flex flex-col gap-2.5">
        {rows.length === 0 && (
          <div className="rounded-[var(--radius)] border border-dashed border-line-strong bg-surface px-6 py-12 text-center text-[13px] text-t3">
            조건에 맞는 계약이 없습니다.
          </div>
        )}
        {rows.map(({ c, st, risks, ignored }) => {
          const crit = risks.filter((r) => r.rule.level === "crit").length;
          const latest = c.versions[c.versions.length - 1];
          return (
            <Link
              key={c.id}
              href={`/contracts/${c.id}`}
              className="group relative flex gap-3.5 overflow-hidden rounded-[var(--radius-md)] border border-line bg-surface p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-[#c9dde2] hover:shadow-[0_10px_26px_-16px_rgba(15,110,130,.5)]"
            >
              <span className={cn("absolute inset-y-0 left-0 w-[3px] transition", crit > 0 ? "bg-[var(--red)] opacity-100" : "bg-[var(--accent)] opacity-0 group-hover:opacity-100")} />
              <FileType type={c.ft} size={38} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-bold tracking-[-.25px] text-t1">{c.title}</span>
                  <Pill tone={STATUS_META[st].tone} className="h-[19px] text-[10.5px]">{STATUS_META[st].label}</Pill>
                  {crit > 0 && <Pill tone="crit" className="h-[19px] text-[10.5px]">고위험 {crit}</Pill>}
                  {risks.length - crit > 0 && <Pill tone="warn" className="h-[19px] text-[10.5px]">주의 {risks.length - crit}</Pill>}
                  {risks.length === 0 && <Pill tone="ok" className="h-[19px] text-[10.5px]">리스크 없음</Pill>}
                  {ignored.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-t4">
                      <EyeOff size={11} /> {ignored.length}건 무시
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-t4">
                  <span className="num font-bold text-t3">{c.id}</span>
                  <Pill tone="accent" className="h-[18px] text-[10px]">{c.type}</Pill>
                  <Tag className="h-[18px] text-[10px]">{c.seg} · {SEG_LABEL[c.seg]}</Tag>
                  <span>· {c.party}</span>
                  <span className="num">· {c.amount}</span>
                  <span className="num inline-flex items-center gap-1">· <FolderTree size={11} /> {c.path}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-[7px] bg-surface-2 px-2 py-1 text-[11px] font-semibold text-t3">
                    <GitBranch size={11} className="text-[var(--accent)]" />
                    {latest.v} · {c.versions.length}개 버전
                  </span>
                  <span className="num text-[11px] text-t4">최종 {latest.when} · {latest.author}</span>
                  {risks.slice(0, 2).map((r) => (
                    <Tag key={r.rule.id} className={cn("h-[19px] text-[10px]", r.rule.level === "crit" ? "bg-[var(--red-soft)] text-[#a52f22]" : "bg-[var(--amber-soft)] text-[#93610a]")}>
                      {r.rule.title}
                    </Tag>
                  ))}
                  {risks.length > 2 && <span className="text-[10.5px] text-t4">+{risks.length - 2}</span>}
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
