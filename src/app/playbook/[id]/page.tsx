"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, ChevronRight, ChevronDown, Check, Sparkles, GitBranch, ListChecks,
  Inbox, Quote, ArrowDown, Lightbulb, Search, Zap, CalendarClock, ShieldAlert,
  Clock, User, ArrowRight, CheckCircle2, RotateCcw, FileText,
} from "lucide-react";
import { Pill, Tag, SectionCard, FileType, Bar } from "@/components/kit";
import { ContractChat } from "@/components/contract-chat";
import { ReviewBadge } from "@/components/review-badge";
import {
  PB_STATUS_META, PB_STATUS_ORDER,
  openRequests, itemHits, itemDeviations, suggestionsFor, canBecomeRule,
  nextReviewDate, reviewState, reviewLabel,
  type PlaybookItem, type PbSuggestion,
} from "@/lib/playbooks";
import { PLAYBOOK_QA, PLAYBOOK_QA_SUGGESTIONS } from "@/lib/data";
import { searchRule, LEVEL_META } from "@/lib/risk";
import { useStore } from "@/lib/store";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";

export default function PlaybookDetailPage() {
  const params = useParams<{ id: string }>();
  const {
    playbooks, pbRules, rules,
    acceptPbSuggestion, dismissPbSuggestion, setPbStatus, resolvePbRequest,
    commitPbVersion, revalidatePlaybook, registerPbItemRule,
  } = useStore();

  const pb = playbooks.find((p) => p.id === params.id);
  const [tab, setTab] = useState<"items" | "suggest" | "history">("items");
  const [openItem, setOpenItem] = useState<string | null>(null);

  if (!pb) {
    return (
      <div className="rounded-[var(--radius)] border border-line bg-surface px-6 py-16 text-center shadow-[var(--shadow-card)]">
        <p className="text-[15px] font-bold text-t1">플레이북을 찾을 수 없습니다</p>
        <p className="mt-1 text-[13px] text-t3">{params.id}</p>
        <Link href="/playbook" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--accent)] hover:underline">
          <ArrowLeft size={14} /> 협상 플레이북으로
        </Link>
      </div>
    );
  }

  const open = openRequests(pb);
  const suggestions = suggestionsFor(pb);
  const rs = reviewState(pb);
  const nextDate = nextReviewDate(pb);
  /* 수정요청은 검토 단계로 돌아간 것으로 본다 */
  const stepActive = pb.status === "change_requested" ? "review" : pb.status;
  const latest = pb.versions[pb.versions.length - 1];

  const accept = (s: PbSuggestion) => {
    acceptPbSuggestion(pb.id, s);
    toast("AI 제안을 반영했습니다 — 확정하면 새 버전으로 기록됩니다");
  };

  const confirm = () => {
    if (pb.pending.length === 0) {
      revalidatePlaybook(pb.id);
      toast("내용 변경 없이 재확인했습니다 — 재검토 기한이 1년 연장됩니다");
      return;
    }
    commitPbVersion(pb.id, `${pb.pending.length}건 반영 확정`);
    toast(`변경 ${pb.pending.length}건을 확정했습니다 — 재검토 기한도 갱신됐습니다`);
  };

  const registerRule = (item: PlaybookItem) => {
    const res = registerPbItemRule(pb.id, item.id);
    if (!res) {
      toast("이탈 키워드가 없는 항목은 규칙으로 만들 수 없습니다");
      return;
    }
    const hits = searchRule(res.rule).length;
    toast(res.created ? `리스크 규칙으로 등록했습니다 — 계약 ${hits}건에 적용` : `이미 있는 규칙에 연결했습니다 (${hits}건 적용)`);
  };

  return (
    <>
      {/* 브레드크럼 */}
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-t4">
        <Link href="/playbook" className="flex items-center gap-1 font-semibold text-t3 hover:text-[var(--accent)]">
          <ArrowLeft size={13} /> 협상 플레이북
        </Link>
        <ChevronRight size={12} />
        <span className="num">{pb.id}</span>
      </div>

      {/* 헤더 */}
      <div className="flex flex-wrap items-start gap-3.5 rounded-[var(--radius)] border border-line bg-surface px-5 py-4 shadow-[var(--shadow-card)]">
        <span className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-[12px] bg-[var(--accent-soft)] text-[13px] font-extrabold tracking-[-.3px] text-[var(--accent-text)]">
          {pb.dept.slice(0, 2)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[19px] font-bold tracking-[-.5px] text-t1">{pb.title}</h1>
            <Pill tone={PB_STATUS_META[pb.status].tone}>{PB_STATUS_META[pb.status].label}</Pill>
            {open.length > 0 && <Pill tone="crit">수정요청 {open.length}건</Pill>}
            <ReviewBadge pb={pb} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-t4">
            <Pill tone="accent" className="h-[19px] text-[10.5px]">{pb.dept}</Pill>
            <Tag className="h-[19px] text-[10px]">적용 · {pb.scope.join(" / ")}</Tag>
            <span>· 법무 {pb.owner}</span>
            <span className="num">· 기준 항목 {pb.items.length}개</span>
            <span className="num">· 최신 {latest.v} ({latest.when})</span>
          </div>
        </div>
      </div>

      {/* 재검토 기한 배너 — 임박·초과일 때만 */}
      {(rs === "due" || rs === "overdue") && (
        <div className={cn(
          "flex flex-wrap items-center gap-2.5 rounded-[var(--radius)] border px-5 py-3.5 shadow-[var(--shadow-card)]",
          rs === "overdue" ? "border-[var(--red-line)] bg-[var(--red-soft)]" : "border-[var(--amber-line)] bg-[var(--amber-soft)]",
        )}>
          <CalendarClock size={18} className={rs === "overdue" ? "text-[var(--red)]" : "text-[var(--amber)]"} />
          <div className="min-w-0 flex-1">
            <div className={cn("text-[13.5px] font-bold", rs === "overdue" ? "text-[#a52f22]" : "text-[#93610a]")}>
              {rs === "overdue"
                ? `정기 재검토 기한이 지났습니다 — ${reviewLabel(pb)}`
                : `정기 재검토 기한이 다가옵니다 — ${reviewLabel(pb)}`}
            </div>
            <div className={cn("num text-[11.5px]", rs === "overdue" ? "text-[#a52f22]/80" : "text-[#93610a]/85")}>
              마지막 확정 {pb.lastReviewedAt} · {pb.reviewCycleMonths}개월 주기 · 다음 기한 {nextDate}
            </div>
          </div>
          <button
            onClick={() => { revalidatePlaybook(pb.id); toast("내용 변경 없이 재확인했습니다 — 기한이 1년 연장됩니다"); }}
            className="flex h-[34px] items-center gap-1.5 rounded-[8px] bg-white px-3.5 text-[12.5px] font-bold text-t2 transition hover:brightness-95"
          >
            <Check size={14} /> 변경 없이 재확인
          </button>
          <button
            onClick={() => { setPbStatus(pb.id, "review"); setTab("items"); toast("재검토를 시작합니다"); }}
            className="flex h-[34px] items-center gap-1.5 rounded-[8px] bg-[var(--accent)] px-3.5 text-[12.5px] font-bold text-white transition hover:bg-[var(--accent-600)]"
          >
            <RotateCcw size={14} /> 지금 재검토
          </button>
        </div>
      )}

      {/* 수정요청 배너 */}
      {open.length > 0 && (
        <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--amber-line)] bg-[var(--amber-soft)] shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center gap-2.5 px-5 py-3.5">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-white text-[var(--amber)]">
              <Inbox size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-bold text-[#93610a]">
                {pb.dept}에서 수정요청 {open.length}건이 도착했습니다
              </div>
              <div className="num text-[11.5px] text-[#93610a]/85">
                {open[0].when} · {open[0].from} · 확정 {latest.v} 기준
              </div>
            </div>
            <button
              onClick={() => { setPbStatus(pb.id, "review"); setTab("suggest"); toast("AI가 제안한 반영안을 확인하세요"); }}
              className="flex h-[34px] items-center gap-1.5 rounded-[8px] bg-[var(--accent)] px-3.5 text-[12.5px] font-bold text-white transition hover:bg-[var(--accent-600)]"
            >
              <Sparkles size={14} /> AI 반영안 보기
            </button>
          </div>
          <div className="border-t border-[var(--amber-line)] bg-white/60">
            {open.map((r) => {
              const item = pb.items.find((i) => i.id === r.itemId);
              return (
                <div key={r.id} className="border-b border-[var(--amber-line)] px-5 py-3 last:border-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {item && <Tag className="h-[19px] bg-white text-[10.5px] text-[#93610a]">{item.no} {item.title}</Tag>}
                    <span className="num text-[11px] text-[#93610a]/80">{r.when} · {r.from}</span>
                    <button
                      onClick={() => { resolvePbRequest(pb.id, r.id); toast("요청을 처리 완료로 표시했습니다"); }}
                      className="ml-auto flex h-[26px] items-center gap-1 rounded-[7px] border border-[var(--amber-line)] bg-white px-2.5 text-[11.5px] font-bold text-[#93610a] transition hover:brightness-95"
                    >
                      <Check size={12} /> 처리 완료
                    </button>
                  </div>
                  <p className="mt-1.5 flex gap-1.5 rounded-[9px] border border-[var(--amber-line)] bg-white px-3 py-2 text-[12.3px] leading-relaxed text-t2">
                    <Quote size={12} className="mt-0.5 flex-shrink-0 text-t4" />
                    {r.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 상태 스테퍼 */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-[var(--radius)] border border-line bg-surface px-5 py-3.5 shadow-[var(--shadow-card)]">
        <span className="text-[11.5px] font-bold uppercase tracking-[.06em] text-t4">진행 상태</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {PB_STATUS_ORDER.map((s, i) => (
            <span key={s} className="flex items-center gap-1.5">
              <button
                onClick={() => { setPbStatus(pb.id, s); toast(`상태를 『${PB_STATUS_META[s].label}』(으)로 변경했습니다`); }}
                className={cn(
                  "flex h-[32px] items-center gap-1.5 rounded-[8px] border px-3 text-[12.5px] font-bold transition",
                  stepActive === s ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-line bg-surface text-t3 hover:border-line-strong hover:text-t1",
                )}
              >
                {stepActive === s && <Check size={13} />}
                {PB_STATUS_META[s].label}
              </button>
              {i < PB_STATUS_ORDER.length - 1 && <ChevronRight size={13} className="text-t4" />}
            </span>
          ))}
          {pb.status === "change_requested" && (
            <>
              <ChevronRight size={13} className="text-t4" />
              <span className="flex h-[32px] items-center gap-1.5 rounded-[8px] border border-[var(--amber-line)] bg-[var(--amber-soft)] px-3 text-[12.5px] font-bold text-[#93610a]">
                <RotateCcw size={13} /> 수정요청 {open.length}
              </span>
            </>
          )}
        </div>
        <span className="ml-auto text-[11.5px] text-t4">{PB_STATUS_META[pb.status].desc}</span>
      </div>

      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        {/* 좌측 */}
        <div className="flex flex-col gap-[18px]">
          <div className="flex rounded-[10px] bg-surface-3 p-[3px]">
            {([
              { k: "items", l: `기준 항목 ${pb.items.length}`, ico: <ListChecks size={14} /> },
              { k: "suggest", l: `AI 제안 ${suggestions.length}`, ico: <Sparkles size={14} /> },
              { k: "history", l: `개정 이력 ${pb.versions.length}`, ico: <GitBranch size={14} /> },
            ] as const).map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={cn("flex h-[34px] flex-1 items-center justify-center gap-1.5 rounded-[8px] text-[13px] font-bold transition", tab === t.k ? "bg-white text-[var(--accent-text)] shadow-sm" : "text-t3 hover:text-t1")}
              >
                {t.ico} {t.l}
                {t.k === "suggest" && suggestions.length > 0 && <span className="h-[6px] w-[6px] rounded-full bg-[var(--accent)]" />}
              </button>
            ))}
          </div>

          {/* 기준 항목 */}
          {tab === "items" && (
            <SectionCard
              title="기준 항목"
              icon={<ListChecks size={17} className="text-[var(--accent)]" />}
              sub="항목마다 탐지 키워드로 계약 코퍼스를 실시간 검색합니다 — 지금 이 기준에 걸리는 계약과 이탈 건수입니다"
              bodyClass="p-0"
            >
              <div className="flex flex-col">
                {pb.items.map((item) => {
                  const hits = itemHits(item);
                  const devs = itemDeviations(item);
                  const isOpen = openItem === item.id;
                  const ruleId = pbRules[item.id];
                  const rule = ruleId ? rules.find((r) => r.id === ruleId) : undefined;
                  const targeted = open.some((r) => r.itemId === item.id);
                  return (
                    <div key={item.id} className="border-b border-line-soft last:border-0">
                      <button onClick={() => setOpenItem(isOpen ? null : item.id)} className="flex w-full items-start gap-3 px-5 py-4 text-left">
                        <span className="num mt-0.5 flex h-[26px] flex-shrink-0 items-center rounded-[7px] bg-surface-3 px-2.5 text-[12px] font-extrabold text-t3">
                          {item.no}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[14px] font-bold text-t1">{item.title}</span>
                            <Pill tone={item.level === "crit" ? "crit" : "warn"} className="h-[19px] text-[10.5px]">{LEVEL_META[item.level].label}</Pill>
                            {targeted && <Pill tone="crit" className="h-[19px] text-[10.5px]">수정요청 대상</Pill>}
                            {rule && <Pill tone="ok" className="h-[19px] text-[10.5px]">규칙 등록됨</Pill>}
                          </div>
                          <p className="mt-1 line-clamp-2 text-[12.8px] leading-relaxed text-t2">{item.standard}</p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2.5">
                          <div className="text-right">
                            <div className="num text-[16px] font-bold leading-none">
                              <span className={devs.length > 0 ? "text-[var(--red)]" : "text-t1"}>{devs.length}</span>
                              <span className="text-[11px] font-semibold text-t4">/{hits.length}</span>
                            </div>
                            <div className="text-[10px] text-t4">이탈 / 매칭</div>
                          </div>
                          <ChevronDown size={17} className={cn("text-t4 transition", isOpen && "rotate-180")} />
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-line-soft bg-[#fafcfc] px-5 py-4">
                          <div className="rounded-[10px] border border-line border-l-[3px] border-l-[var(--accent)] bg-white px-3.5 py-2.5">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-t4">확정 기준 문구</span>
                            <p className="mt-1 text-[13px] leading-[1.7] text-t1">{item.standard}</p>
                          </div>
                          <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-relaxed text-t3">
                            <Lightbulb size={13} className="mt-0.5 flex-shrink-0 text-[var(--accent)]" />
                            {item.rationale}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10.5px] font-bold uppercase tracking-wide text-t4">탐지</span>
                            {item.detect.map((k) => (
                              <Tag key={k} className="bg-[var(--accent-soft)] text-[10.5px] text-[var(--accent-text)]">{k}</Tag>
                            ))}
                            {item.deviation.length > 0 && (
                              <>
                                <span className="ml-2 text-[10.5px] font-bold uppercase tracking-wide text-t4">이탈</span>
                                {item.deviation.map((k) => (
                                  <Tag key={k} className="bg-[var(--red-soft)] text-[10.5px] text-[#a52f22]">{k}</Tag>
                                ))}
                              </>
                            )}
                          </div>

                          <div className="mt-3 rounded-[12px] border border-line bg-white">
                            <div className="flex items-center gap-2 border-b border-line-soft px-4 py-2.5">
                              <Search size={14} className="text-[var(--accent)]" />
                              <span className="text-[12.5px] font-bold text-t1">
                                이 기준으로 <em className="num not-italic text-[var(--accent)]">{hits.length}</em>건 매칭 ·
                                <em className="num not-italic text-[var(--red)]"> {devs.length}</em>건 이탈
                              </span>
                            </div>
                            {hits.length === 0 ? (
                              <p className="px-4 py-5 text-center text-[12px] text-t4">코퍼스에서 이 기준에 걸리는 조항이 없습니다.</p>
                            ) : (
                              <div className="max-h-[240px] overflow-y-auto">
                                {hits.map((h) => {
                                  const dev = devs.find((d) => d.contract.id === h.contract.id);
                                  return (
                                    <div key={h.contract.id} className="border-b border-line-soft px-4 py-2.5 last:border-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <FileType type={h.contract.ft} size={16} />
                                        <Link href={`/contracts/${h.contract.id}`} className="truncate text-[12.5px] font-bold text-t1 hover:text-[var(--accent)] hover:underline">
                                          {h.contract.title}
                                        </Link>
                                        <span className="num text-[10.5px] text-t4">{h.contract.id}</span>
                                        <Pill tone={dev ? "crit" : "ok"} className="ml-auto h-[18px] text-[10px]">{dev ? "이탈" : "준수"}</Pill>
                                      </div>
                                      <div className={cn("mt-1.5 rounded-[8px] border-l-[3px] bg-surface-2 px-3 py-2", dev ? "border-l-[var(--red)]" : "border-l-[var(--green)]")}>
                                        <span className="num text-[10.5px] font-bold text-[var(--accent)]">
                                          {h.clauses[0].clause.no} {h.clauses[0].clause.title}
                                        </span>
                                        <p className="mt-0.5 text-[11.8px] leading-relaxed text-t2">{h.clauses[0].clause.body}</p>
                                        {dev && (
                                          <div className="mt-1 flex flex-wrap gap-1">
                                            {dev.evalResult.deviated.map((d) => (
                                              <Tag key={d} className="h-[17px] bg-[var(--red-soft)] text-[9.5px] text-[#a52f22]">{d}</Tag>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            {rule ? (
                              <Link href="/risk" className="flex h-[32px] items-center gap-1.5 rounded-[8px] border border-[var(--green-line)] bg-[var(--green-soft)] px-3 text-[12.5px] font-bold text-[#0a6b42]">
                                <CheckCircle2 size={14} /> 리스크 규칙 등록됨 · {searchRule(rule).length}건 적용
                              </Link>
                            ) : canBecomeRule(item) ? (
                              <button onClick={() => registerRule(item)} className="flex h-[32px] items-center gap-1.5 rounded-[8px] bg-[var(--accent)] px-3.5 text-[12.5px] font-bold text-white transition hover:bg-[var(--accent-600)]">
                                <Zap size={14} /> 리스크 규칙으로 등록
                              </button>
                            ) : (
                              <span className="text-[11.5px] text-t4">이탈 키워드가 없어 규칙으로는 등록할 수 없습니다 (조항 부재를 보는 항목)</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* AI 제안 */}
          {tab === "suggest" && (
            <SectionCard
              title="AI 제안"
              icon={<Sparkles size={17} className="text-[var(--accent)]" />}
              sub="선례와 코퍼스 통계를 근거로 기준 문구를 다듬는 제안입니다 — 채택하면 항목이 바뀌고 개정 이력에 남습니다"
              bodyClass="p-4"
            >
              {suggestions.length === 0 ? (
                <div className="flex items-center gap-2.5 rounded-[11px] border border-[var(--green-line)] bg-[var(--green-soft)] p-4">
                  <CheckCircle2 size={20} className="text-[#0a6b42]" />
                  <span className="text-[13px] font-semibold text-[#0a6b42]">확인이 필요한 AI 제안이 없습니다.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3.5">
                  {suggestions.map((s) => {
                    const item = pb.items.find((i) => i.id === s.itemId);
                    if (!item) return null;
                    return (
                      <div key={s.id} className="overflow-hidden rounded-[var(--radius-md)] border border-[#cfe6eb] bg-surface shadow-[var(--shadow-card)]">
                        <div className="flex items-center gap-2.5 border-b border-[#dcecef] bg-[linear-gradient(180deg,#f2fafb,#fff)] px-4 py-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[image:var(--accent-grad)] text-white">
                            <Sparkles size={16} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13.5px] font-bold text-t1">{item.title} 기준 문구 수정 제안</div>
                            <div className="text-[11.5px] text-t3">대상 · {item.no} {item.title}</div>
                          </div>
                        </div>

                        <div className="px-4 py-3.5">
                          <div className="rounded-[10px] border border-line bg-surface-2 px-3 py-2.5">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-t4">현재 기준 문구</span>
                            <p className="mt-1 text-[12.8px] leading-[1.7] text-t3 line-through decoration-[var(--red)]/45">{item.standard}</p>
                          </div>
                          <div className="my-1.5 flex items-center gap-1.5 pl-1 text-t4">
                            <ArrowDown size={14} />
                            <span className="text-[10.5px] font-bold uppercase tracking-wide">AI 제안</span>
                          </div>
                          <div className="rounded-[10px] border border-[#bcd9e0] bg-[var(--accent-soft)] px-3 py-2.5">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--accent-text)]/70">제안 문구</span>
                            <p className="mt-1 text-[12.8px] font-semibold leading-[1.7] text-[var(--accent-text)]">{s.after}</p>
                          </div>

                          <div className="mt-3 rounded-[10px] border border-line bg-white p-3">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-t2">
                              <Lightbulb size={13} className="text-[var(--accent)]" /> 이렇게 제안하는 이유
                            </div>
                            <p className="mt-1 text-[12.3px] leading-relaxed text-t2">{s.rationale}</p>
                            {s.cites.map((c, i) => (
                              <div key={i} className="mt-2 rounded-[9px] border border-line-soft bg-surface-2 p-2.5">
                                <p className="flex gap-1.5 text-[11.8px] leading-relaxed text-t2">
                                  <Quote size={12} className="mt-0.5 flex-shrink-0 text-t4" />{c.quote}
                                </p>
                                <div className="num mt-1.5 flex items-center gap-1.5 text-[10.5px] text-t4">
                                  <span className="font-bold text-[var(--accent)]">{c.id}</span>
                                  <span>· {c.loc}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 border-t border-line-soft bg-surface-2 px-4 py-3">
                          <span className="min-w-0 flex-1 text-[11px] text-t4">채택하면 기준 문구가 교체되고 확정 시 새 버전에 기록됩니다</span>
                          <button onClick={() => { dismissPbSuggestion(pb.id, s.id); toast("제안을 무시했습니다"); }} className="h-[32px] rounded-[8px] border border-line bg-surface px-3 text-[12.5px] font-semibold text-t2 transition hover:bg-surface-3">
                            무시
                          </button>
                          <button onClick={() => accept(s)} className="flex h-[32px] items-center gap-1.5 rounded-[8px] bg-[var(--accent)] px-3.5 text-[12.5px] font-bold text-white transition hover:bg-[var(--accent-600)]">
                            <Check size={14} /> 제안 채택
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          )}

          {/* 개정 이력 */}
          {tab === "history" && (
            <SectionCard
              title="개정 이력"
              icon={<GitBranch size={17} className="text-[var(--accent)]" />}
              sub="확정본과 그 사이 변경 항목 — 정기 재검토도 이력으로 남습니다"
              bodyClass="p-0"
            >
              <div className="flex flex-col">
                {pb.pending.length > 0 && (
                  <div className="border-b border-line-soft bg-[#fafcfc] px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="num flex h-[26px] items-center rounded-[7px] border border-dashed border-line-strong bg-surface-3 px-2.5 text-[12px] font-extrabold text-t3">
                        작성 중
                      </span>
                      <span className="text-[13px] font-semibold text-t1">확정 대기 변경 {pb.pending.length}건</span>
                      <button onClick={confirm} className="ml-auto flex h-[30px] items-center gap-1.5 rounded-[8px] bg-[var(--accent)] px-3 text-[12px] font-bold text-white transition hover:bg-[var(--accent-600)]">
                        <Check size={13} /> 이 버전으로 확정
                      </button>
                    </div>
                    <div className="mt-2.5 flex flex-col gap-2">
                      {pb.pending.map((ch) => <ChangeRow key={ch.id} ch={ch} />)}
                    </div>
                  </div>
                )}
                {[...pb.versions].reverse().map((ver, idx) => (
                  <div key={ver.v} className="border-b border-line-soft px-5 py-4 last:border-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("num flex h-[26px] items-center rounded-[7px] px-2.5 text-[12px] font-extrabold", idx === 0 && pb.pending.length === 0 ? "bg-[var(--accent)] text-white" : "bg-surface-3 text-t3")}>
                        {ver.v}
                      </span>
                      {idx === 0 && pb.pending.length === 0 && <Pill tone="accent" className="h-[19px] text-[10px]">최신</Pill>}
                      <Pill tone={PB_STATUS_META[ver.status].tone} className="h-[19px] text-[10.5px]">{PB_STATUS_META[ver.status].label}</Pill>
                      <span className="text-[13px] font-semibold text-t1">{ver.note}</span>
                      <span className="num ml-auto flex items-center gap-2 text-[11px] text-t4">
                        <span className="flex items-center gap-1"><Clock size={11} />{ver.when}</span>
                        <span className="flex items-center gap-1"><User size={11} />{ver.author}</span>
                      </span>
                    </div>
                    {ver.changes.length === 0 ? (
                      <p className="mt-2 text-[11.5px] text-t4">내용 변경 없음.</p>
                    ) : (
                      <div className="mt-2.5 flex flex-col gap-2">
                        {ver.changes.map((ch) => <ChangeRow key={ch.id} ch={ch} />)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* AI 채팅 — 탭과 무관하게 항상 보인다 */}
          <ContractChat
            title="플레이북 AI 협의"
            sub={`${pb.title} · 기준 항목 ${pb.items.length}개 ↔ 계약 코퍼스`}
            greeting={`${pb.title}의 기준 항목을 사내 표준·선례와 대조해 두었습니다. 어떤 항목을 손볼지 물어보시거나, 현업 수정요청을 그대로 붙여넣어 보세요.`}
            bank={PLAYBOOK_QA}
            suggestions={PLAYBOOK_QA_SUGGESTIONS}
            height={400}
          />
        </div>

        {/* 우측 레일 */}
        <div className="flex flex-col gap-4 xl:sticky xl:top-3">
          <SectionCard title="정기 재검토" icon={<CalendarClock size={16} className="text-[var(--accent)]" />} bodyClass="p-4">
            {nextDate ? (
              <>
                <div className="flex items-end justify-between">
                  <span className={cn("num text-[30px] font-bold leading-none tracking-[-1px]",
                    rs === "overdue" ? "text-[var(--red)]" : rs === "due" ? "text-[var(--amber)]" : "text-t1")}>
                    {reviewLabel(pb).replace("재검토 ", "").replace(" 초과", "")}
                  </span>
                  <ReviewBadge pb={pb} />
                </div>
                <div className="mt-3 flex flex-col gap-2 text-[12px]">
                  <Row k="마지막 확정" v={pb.lastReviewedAt ?? "-"} />
                  <Row k="재검토 주기" v={`${pb.reviewCycleMonths}개월`} />
                  <Row k="다음 기한" v={nextDate} />
                </div>
                <button
                  onClick={() => { revalidatePlaybook(pb.id); toast("재확인 완료 — 기한이 1년 연장됐습니다"); }}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[9px] border border-line py-2.5 text-[12.5px] font-semibold text-t2 transition hover:bg-surface-2"
                >
                  <Check size={14} /> 변경 없이 재확인
                </button>
              </>
            ) : (
              <p className="text-[12px] leading-relaxed text-t4">
                아직 확정된 적이 없습니다. 첫 확정 시점부터 {pb.reviewCycleMonths}개월 주기로 재검토 기한이 잡힙니다.
              </p>
            )}
          </SectionCard>

          <SectionCard title="확정 처리" icon={<CheckCircle2 size={16} className="text-[var(--accent)]" />} bodyClass="p-4">
            <div className="flex flex-col gap-2 text-[12.5px]">
              <Row k="확정 대기 변경" v={`${pb.pending.length}건`} />
              <Row k="미확인 AI 제안" v={`${suggestions.length}건`} />
              <Row k="미해결 수정요청" v={`${open.length}건`} />
            </div>
            <div className="mt-3"><Bar value={pb.pending.length > 0 ? 60 : 100} tone={pb.pending.length > 0 ? "warn" : "ok"} /></div>
            <button
              onClick={confirm}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[10px] bg-[var(--accent)] py-3 text-[14px] font-bold text-white shadow-[0_4px_12px_-3px_rgba(15,110,130,.5)] transition hover:bg-[var(--accent-600)]"
            >
              <Check size={16} />
              {pb.pending.length > 0 ? `변경 ${pb.pending.length}건 확정` : "변경 없이 재확인"}
            </button>
            <p className="mt-2 text-[11px] leading-relaxed text-t4">
              확정하면 새 버전으로 기록되고 재검토 기한이 오늘부터 {pb.reviewCycleMonths}개월 뒤로 갱신됩니다.
            </p>
          </SectionCard>

          <SectionCard title="적용 대상 계약" icon={<FileText size={16} className="text-[var(--accent)]" />} sub="이 플레이북 기준이 적용되는 유형" bodyClass="p-4">
            <div className="flex flex-wrap gap-1.5">
              {pb.scope.map((s) => <Tag key={s} className="bg-[var(--accent-soft)] text-[11px] text-[var(--accent-text)]">{s}</Tag>)}
            </div>
            <Link href="/contracts" className="mt-3 flex items-center justify-center gap-1.5 rounded-[9px] border border-line py-2.5 text-[12.5px] font-semibold text-t2 transition hover:bg-surface-2">
              계약 대장에서 보기 <ArrowRight size={13} />
            </Link>
          </SectionCard>

          <SectionCard title="연결된 리스크 규칙" icon={<ShieldAlert size={16} className="text-[var(--red)]" />} bodyClass="p-4">
            {(() => {
              const linked = pb.items.filter((i) => pbRules[i.id]);
              if (linked.length === 0) {
                return <p className="text-[11.5px] leading-relaxed text-t4">아직 규칙으로 등록한 항목이 없습니다. 기준 항목에서 『리스크 규칙으로 등록』을 눌러보세요.</p>;
              }
              return (
                <div className="flex flex-col gap-1.5">
                  {linked.map((i) => {
                    const r = rules.find((x) => x.id === pbRules[i.id]);
                    return (
                      <Link key={i.id} href="/risk" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] transition hover:bg-surface-2">
                        <span className={cn("h-2 w-2 flex-shrink-0 rounded-full", i.level === "crit" ? "bg-[var(--red)]" : "bg-[var(--amber)]")} />
                        <span className="truncate font-semibold text-t2">{i.title}</span>
                        {r && <span className="num ml-auto text-[10.5px] text-t4">{searchRule(r).length}건</span>}
                      </Link>
                    );
                  })}
                </div>
              );
            })()}
          </SectionCard>
        </div>
      </div>
    </>
  );
}

/* ---------- 조각 ---------- */
function ChangeRow({ ch }: { ch: { id: string; field: string; before: string; after: string } }) {
  const long = ch.before.length > 40 || ch.after.length > 40;
  return (
    <div className="rounded-[11px] border border-line bg-surface-2 p-3">
      <div className="text-[12.5px] font-bold text-t1">{ch.field}</div>
      {long ? (
        <div className="mt-2 flex flex-col gap-1.5">
          <div className="rounded-[7px] border border-line bg-white px-2.5 py-1.5 text-[12px] leading-relaxed text-t3 line-through">{ch.before}</div>
          <ArrowDown size={13} className="text-t4" />
          <div className="rounded-[7px] border border-[#bcd9e0] bg-white px-2.5 py-1.5 text-[12px] font-bold leading-relaxed text-[var(--accent-text)]">{ch.after}</div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
          <span className="rounded-[7px] border border-line bg-white px-2.5 py-1 text-t3 line-through">{ch.before}</span>
          <ArrowRight size={13} className="text-t4" />
          <span className="rounded-[7px] border border-[#bcd9e0] bg-white px-2.5 py-1 font-bold text-[var(--accent-text)]">{ch.after}</span>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line-soft pb-2 last:border-0 last:pb-0">
      <span className="flex-shrink-0 font-semibold text-t3">{k}</span>
      <span className="num text-right font-semibold text-t1">{v}</span>
    </div>
  );
}
