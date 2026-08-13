"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, GitBranch, ShieldAlert, ShieldCheck, FileText, Check, EyeOff, Eye,
  ArrowRight, Flag, CircleAlert, Clock, User, ChevronRight, Zap,
} from "lucide-react";
import { Pill, Tag, SectionCard, FileType } from "@/components/kit";
import { getContract, STATUS_META, STATUS_ORDER, type VersionChange } from "@/lib/contracts";
import { SEG_LABEL } from "@/lib/data";
import { rulesForContract, excludedRulesForContract, extractKeywords, LEVEL_META, SOURCE_META, searchRule } from "@/lib/risk";
import { useStore } from "@/lib/store";
import { contractReviewStatus, usePermissions } from "@/lib/permissions";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";

export default function ContractDetailPage() {
  const params = useParams<{ id: string }>();
  const contract = getContract(params.id);
  const { rules, statuses, setStatus, toggleException, addRule, setApplied, flaggedChanges, flagChange, unflagChange } = useStore();

  const [tab, setTab] = useState<"versions" | "clauses" | "risk">("versions");
  /* 권한 — 체결본(확정)은 법무 관리자만 되돌릴 수 있습니다 */
  const { allow, guard, reason } = usePermissions();

  if (!contract) {
    return (
      <div className="rounded-[var(--radius)] border border-line bg-surface px-6 py-16 text-center shadow-[var(--shadow-card)]">
        <p className="text-[15px] font-bold text-t1">계약을 찾을 수 없습니다</p>
        <p className="mt-1 text-[13px] text-t3">계약번호 {params.id}</p>
        <Link href="/contracts" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--accent)] hover:underline">
          <ArrowLeft size={14} /> 계약 대장으로
        </Link>
      </div>
    );
  }

  const st = statuses[contract.id] ?? contract.status;
  const review = contractReviewStatus(st);
  /* 확정(체결본) 상태를 바꾸는 건 확정 취소로 취급합니다 */
  const statusAction = review === "confirmed" ? ("reopenResult" as const) : ("confirmResult" as const);
  const canChangeStatus = allow(statusAction, review);
  const risks = rulesForContract(contract.id, rules);
  const ignored = excludedRulesForContract(contract.id, rules);
  const crit = risks.filter((r) => r.rule.level === "crit").length;

  /* 버전 변경 항목을 리스크로 등록 */
  const flagAsRisk = (ch: VersionChange) => {
    if (!guard("editSummary")) return;
    const { keywords } = extractKeywords(`${ch.field} ${ch.after}`);
    if (keywords.length === 0) {
      toast("이 변경에서 탐지할 키워드를 찾지 못했습니다");
      return;
    }
    const { rule, created } = addRule({
      title: `${ch.field} — ${ch.after}`,
      desc: `${contract.title}(${contract.id}) ${ch.field}가 「${ch.before}」에서 「${ch.after}」로 변경되어 리스크로 지정되었습니다.`,
      level: "crit",
      keywords,
      mode: "all",
      source: "version",
      sourceRef: contract.id,
      applied: true,
    });
    if (!created) setApplied(rule.id, true);
    flagChange(ch.id, rule.id);
    const hits = searchRule(rule).length;
    toast(created
      ? `리스크로 등록했습니다 — 같은 조항이 있는 계약 ${hits}건에 적용됩니다`
      : `이미 등록된 규칙에 연결했습니다 (${hits}건 적용)`);
  };

  const unflag = (ch: VersionChange) => {
    /* 지정 해제는 확정 취소에 해당 — 법무 관리자만 */
    if (!guard("reopenResult", "confirmed")) return;
    unflagChange(ch.id);
    toast("리스크 지정을 해제했습니다");
  };

  return (
    <>
      {/* 헤더 */}
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-t4">
        <Link href="/contracts" className="flex items-center gap-1 font-semibold text-t3 hover:text-[var(--accent)]">
          <ArrowLeft size={13} /> 계약 대장
        </Link>
        <ChevronRight size={12} />
        <span className="num">{contract.id}</span>
      </div>

      <div className="flex flex-wrap items-start gap-3.5 rounded-[var(--radius)] border border-line bg-surface px-5 py-4 shadow-[var(--shadow-card)]">
        <FileType type={contract.ft} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[19px] font-bold tracking-[-.5px] text-t1">{contract.title}</h1>
            {crit > 0 ? (
              <Pill tone="crit">고위험 {crit}건</Pill>
            ) : risks.length > 0 ? (
              <Pill tone="warn">주의 {risks.length}건</Pill>
            ) : (
              <Pill tone="ok" dot>리스크 없음</Pill>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-t4">
            <Pill tone="accent" className="h-[19px] text-[10.5px]">{contract.type}</Pill>
            <Tag className="h-[19px] text-[10px]">{contract.seg} · {SEG_LABEL[contract.seg]}</Tag>
            <span>· {contract.party}</span>
            <span className="num">· {contract.amount}</span>
            <span className="num">· 체결 {contract.signed} ~ 만료 {contract.expires}</span>
          </div>
        </div>
      </div>

      {/* 상태 전환 */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-[var(--radius)] border border-line bg-surface px-5 py-3.5 shadow-[var(--shadow-card)]">
        <span className="text-[11.5px] font-bold uppercase tracking-[.06em] text-t4">계약 상태</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_ORDER.map((s, i) => (
            <span key={s} className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  if (st === s) return;
                  if (!guard(statusAction, review)) return;
                  setStatus(contract.id, s);
                  toast(`상태를 『${STATUS_META[s].label}』(으)로 변경했습니다`);
                }}
                aria-disabled={!canChangeStatus && st !== s}
                title={st === s ? undefined : reason(statusAction, review) ?? undefined}
                className={cn(
                  "flex h-[32px] items-center gap-1.5 rounded-[8px] border px-3 text-[12.5px] font-bold transition",
                  st === s ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-line bg-surface text-t3 hover:border-line-strong hover:text-t1",
                  !canChangeStatus && st !== s && "cursor-not-allowed opacity-45",
                )}
              >
                {st === s && <Check size={13} />}
                {STATUS_META[s].label}
              </button>
              {i < STATUS_ORDER.length - 1 && <ChevronRight size={13} className="text-t4" />}
            </span>
          ))}
        </div>
        <span className="ml-auto text-[11.5px] text-t4">{STATUS_META[st].desc}</span>
      </div>

      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        {/* 좌: 탭 */}
        <div className="flex flex-col gap-[18px]">
          <div className="flex rounded-[10px] bg-surface-3 p-[3px]">
            {([
              { k: "versions", l: `버전 이력 ${contract.versions.length}`, ico: <GitBranch size={14} /> },
              { k: "clauses", l: `조항 ${contract.clauses.length}`, ico: <FileText size={14} /> },
              { k: "risk", l: `리스크 ${risks.length}`, ico: <ShieldAlert size={14} /> },
            ] as const).map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={cn("flex h-[34px] flex-1 items-center justify-center gap-1.5 rounded-[8px] text-[13px] font-bold transition", tab === t.k ? "bg-white text-[var(--accent-text)] shadow-sm" : "text-t3 hover:text-t1")}
              >
                {t.ico} {t.l}
              </button>
            ))}
          </div>

          {/* 버전 이력 */}
          {tab === "versions" && (
            <SectionCard
              title="버전 이력"
              icon={<GitBranch size={17} className="text-[var(--accent)]" />}
              sub="변경 항목 중 문제가 됐던 조건은 『리스크로 지정』하면 전체 계약에 규칙으로 적용됩니다"
              bodyClass="p-0"
            >
              <div className="flex flex-col">
                {[...contract.versions].reverse().map((ver, idx) => (
                  <div key={ver.v} className="relative border-b border-line-soft px-5 py-4 last:border-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("num flex h-[26px] items-center rounded-[7px] px-2.5 text-[12px] font-extrabold", idx === 0 ? "bg-[var(--accent)] text-white" : "bg-surface-3 text-t3")}>
                        {ver.v}
                      </span>
                      {idx === 0 && <Pill tone="accent" className="h-[19px] text-[10px]">최신</Pill>}
                      <Pill tone={STATUS_META[ver.status].tone} className="h-[19px] text-[10.5px]">{STATUS_META[ver.status].label}</Pill>
                      <span className="text-[13px] font-semibold text-t1">{ver.note}</span>
                      <span className="num ml-auto flex items-center gap-2 text-[11px] text-t4">
                        <span className="flex items-center gap-1"><Clock size={11} />{ver.when}</span>
                        <span className="flex items-center gap-1"><User size={11} />{ver.author}</span>
                      </span>
                    </div>

                    {ver.changes.length === 0 ? (
                      <p className="mt-2 text-[11.5px] text-t4">기록된 변경 항목이 없습니다.</p>
                    ) : (
                      <div className="mt-2.5 flex flex-col gap-2">
                        {ver.changes.map((ch) => {
                          const flaggedRuleId = flaggedChanges[ch.id];
                          const flaggedRule = rules.find((r) => r.id === flaggedRuleId);
                          return (
                            <div key={ch.id} className={cn("rounded-[11px] border p-3", flaggedRule ? "border-[var(--red-line)] bg-[var(--red-soft)]" : "border-line bg-surface-2")}>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[12.5px] font-bold text-t1">{ch.field}</span>
                                {flaggedRule && <Pill tone="crit" className="h-[18px] text-[10px]">리스크로 지정됨</Pill>}
                                <button
                                  onClick={() => (flaggedRule ? unflag(ch) : flagAsRisk(ch))}
                                  className={cn(
                                    "ml-auto flex h-[28px] items-center gap-1.5 rounded-[8px] border px-2.5 text-[11.5px] font-bold transition",
                                    flaggedRule
                                      ? "border-[var(--red)] bg-white text-[var(--red)]"
                                      : "border-line bg-surface text-t3 hover:border-[var(--red)] hover:text-[var(--red)]",
                                  )}
                                >
                                  <Flag size={12} />
                                  {flaggedRule ? "리스크 지정 해제" : "이건 리스크였다"}
                                </button>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
                                <span className="rounded-[7px] border border-line bg-white px-2.5 py-1 text-t3 line-through">{ch.before}</span>
                                <ArrowRight size={13} className="text-t4" />
                                <span className={cn("rounded-[7px] border px-2.5 py-1 font-bold", flaggedRule ? "border-[var(--red-line)] bg-white text-[var(--red)]" : "border-[#bcd9e0] bg-white text-[var(--accent-text)]")}>
                                  {ch.after}
                                </span>
                              </div>
                              {flaggedRule && (
                                <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#a52f22]">
                                  <Zap size={12} />
                                  리스크 규칙 『{flaggedRule.title}』로 등록 — 같은 조항이 있는 계약 {searchRule(flaggedRule).length}건에 적용 중
                                  <Link href="/risk" className="ml-1 underline">리스크 관리에서 보기</Link>
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* 조항 */}
          {tab === "clauses" && (
            <SectionCard title="계약 조항" icon={<FileText size={17} className="text-[var(--accent)]" />} sub="리스크 규칙에 걸린 조항은 붉게 표시됩니다" bodyClass="p-0">
              <div className="flex flex-col">
                {contract.clauses.map((cl) => {
                  const hit = risks.find((r) => r.clauses.some((c) => c.clause.no === cl.no));
                  const ignoredHit = ignored.find((r) => r.clauses.some((c) => c.clause.no === cl.no));
                  return (
                    <div key={cl.no} className={cn("border-b border-line-soft px-5 py-3.5 last:border-0", hit && "bg-[var(--red-soft)]/40")}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="num text-[12px] font-bold text-[var(--accent)]">{cl.no}</span>
                        <span className="text-[13.5px] font-bold text-t1">{cl.title}</span>
                        {hit && <Pill tone={LEVEL_META[hit.rule.level].tone} className="h-[19px] text-[10.5px]">{hit.rule.title}</Pill>}
                        {!hit && ignoredHit && (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-t4">
                            <EyeOff size={11} /> {ignoredHit.rule.title} — 무시 중
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[12.8px] leading-relaxed text-t2">{cl.body}</p>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* 리스크 */}
          {tab === "risk" && (
            <SectionCard title="적용된 리스크" icon={<ShieldAlert size={17} className="text-[var(--red)]" />} sub="리스크 관리에서 적용한 규칙 중 이 계약에 걸린 것" bodyClass="p-4">
              {risks.length === 0 && ignored.length === 0 ? (
                <div className="flex items-center gap-2.5 rounded-[11px] border border-[var(--green-line)] bg-[var(--green-soft)] p-4">
                  <ShieldCheck size={20} className="text-[#0a6b42]" />
                  <span className="text-[13px] font-semibold text-[#0a6b42]">이 계약에 걸린 리스크 규칙이 없습니다.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {risks.map(({ rule, clauses }) => (
                    <div key={rule.id} className={cn("rounded-[12px] border p-3.5", rule.level === "crit" ? "border-[var(--red-line)] bg-[var(--red-soft)]" : "border-[var(--amber-line)] bg-[var(--amber-soft)]")}>
                      <div className="flex flex-wrap items-center gap-2">
                        <ShieldAlert size={16} className={rule.level === "crit" ? "text-[var(--red)]" : "text-[var(--amber)]"} />
                        <span className="text-[13px] font-bold text-t1">{rule.title}</span>
                        <Pill tone={SOURCE_META[rule.source].tone} className="h-[18px] text-[10px]">{SOURCE_META[rule.source].label}</Pill>
                        <button
                          onClick={() => {
                  if (!guard("editSummary")) return;
                  toggleException(rule.id, contract.id);
                  toast("이 계약에서는 해당 리스크를 무시합니다");
                }}
                          className="ml-auto flex h-[27px] items-center gap-1.5 rounded-[8px] border border-line bg-white px-2.5 text-[11.5px] font-bold text-t3 transition hover:border-[var(--amber)] hover:text-[var(--amber)]"
                        >
                          <EyeOff size={12} /> 이 계약은 무시
                        </button>
                      </div>
                      <p className="mt-1 text-[11.8px] leading-relaxed text-t3">{rule.desc}</p>
                      {clauses.map((c) => (
                        <div key={c.clause.no} className="mt-2 rounded-[9px] bg-white px-3 py-2">
                          <span className="num text-[10.5px] font-bold text-[var(--accent)]">{c.clause.no} {c.clause.title}</span>
                          <p className="mt-0.5 text-[12px] leading-relaxed text-t2">{c.clause.body}</p>
                        </div>
                      ))}
                    </div>
                  ))}

                  {ignored.map(({ rule, clauses }) => (
                    <div key={rule.id} className="rounded-[12px] border border-line bg-surface-2 p-3.5 opacity-70">
                      <div className="flex flex-wrap items-center gap-2">
                        <EyeOff size={16} className="text-t4" />
                        <span className="text-[13px] font-bold text-t2">{rule.title}</span>
                        <Pill tone="gray" className="h-[18px] text-[10px]">무시 중</Pill>
                        <button
                          onClick={() => {
                  if (!guard("editSummary")) return;
                  toggleException(rule.id, contract.id);
                  toast("다시 리스크로 집계합니다");
                }}
                          className="ml-auto flex h-[27px] items-center gap-1.5 rounded-[8px] border border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 text-[11.5px] font-bold text-[var(--accent-text)] transition"
                        >
                          <Eye size={12} /> 다시 포함
                        </button>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-t4">
                        <CircleAlert size={11} /> {clauses.map((c) => c.clause.no).join(", ")}에서 매칭되지만 집계에서 제외됩니다.
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}
        </div>

        {/* 우: 요약 */}
        <div className="flex flex-col gap-4 xl:sticky xl:top-3">
          <SectionCard title="리스크 요약" icon={<ShieldAlert size={16} className="text-[var(--red)]" />} bodyClass="p-4">
            <div className="flex items-end justify-between">
              <div>
                <span className={cn("num text-[30px] font-bold leading-none tracking-[-1px]", crit > 0 ? "text-[var(--red)]" : risks.length > 0 ? "text-[var(--amber)]" : "text-[var(--green)]")}>
                  {risks.length}
                </span>
                <span className="ml-1 text-[12px] text-t3">건 적용 중</span>
              </div>
              {ignored.length > 0 && <span className="text-[11.5px] font-semibold text-t4">{ignored.length}건 무시</span>}
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              {risks.map(({ rule }) => (
                <button key={rule.id} onClick={() => setTab("risk")} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] transition hover:bg-surface-2">
                  <span className={cn("h-2 w-2 flex-shrink-0 rounded-full", rule.level === "crit" ? "bg-[var(--red)]" : "bg-[var(--amber)]")} />
                  <span className="truncate font-semibold text-t2">{rule.title}</span>
                </button>
              ))}
              {risks.length === 0 && <p className="text-[11.5px] text-t4">적용된 리스크가 없습니다.</p>}
            </div>
            <Link href="/risk" className="mt-3 flex items-center justify-center gap-1.5 rounded-[9px] border border-line py-2.5 text-[12.5px] font-semibold text-t2 transition hover:bg-surface-2">
              리스크 규칙 관리 <ArrowRight size={13} />
            </Link>
          </SectionCard>

          <SectionCard title="버전 요약" icon={<GitBranch size={16} className="text-[var(--accent)]" />} bodyClass="p-4">
            <div className="flex flex-col gap-2">
              {[...contract.versions].reverse().map((v, i) => (
                <button key={v.v} onClick={() => setTab("versions")} className="flex items-center gap-2.5 rounded-[10px] border border-line-soft bg-surface-2 px-3 py-2 text-left transition hover:bg-surface-3">
                  <span className={cn("num flex h-[22px] items-center rounded-[6px] px-2 text-[10.5px] font-extrabold", i === 0 ? "bg-[var(--accent)] text-white" : "bg-white text-t3")}>{v.v}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.8px] font-semibold text-t1">{v.note}</span>
                    <span className="num block text-[10px] text-t4">{v.when} · 변경 {v.changes.length}건</span>
                  </span>
                </button>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
