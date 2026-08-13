"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert, Plus, Search, Check, X, Sparkles, ChevronDown, Trash2,
  EyeOff, Eye, FileText, Zap, ListFilter, ArrowRight, CircleAlert, RotateCcw,
} from "lucide-react";
import { Pill, Tag, FileType } from "@/components/kit";
import { CONTRACTS, STATUS_META } from "@/lib/contracts";
import {
  extractKeywords, searchRule, activeHits, LEVEL_META, SOURCE_META,
  type RiskRule, type RiskLevel, type MatchMode,
} from "@/lib/risk";
import { useStore } from "@/lib/store";
import { usePermissions } from "@/lib/permissions";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";

export default function RiskPage() {
  const { rules, addRule, setApplied, toggleException, removeRule, resetStore } = useStore();
  /* 권한 — 규칙 등록·적용은 법무 담당자 이상, 해제·삭제·초기화는 법무 관리자만 */
  const { allow, guard, reason } = usePermissions();
  const canEdit = allow("editSummary");
  const canReopen = allow("reopenResult", "confirmed");
  const [composing, setComposing] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "applied" | "draft">("all");

  const shown = rules.filter((r) =>
    filter === "all" ? true : filter === "applied" ? r.applied : !r.applied,
  );

  /* 전체 리스크 노출 집계 */
  const stats = useMemo(() => {
    const appliedRules = rules.filter((r) => r.applied);
    const flagged = new Set<string>();
    let crit = 0;
    for (const r of appliedRules) {
      const hits = activeHits(r);
      hits.forEach((h) => flagged.add(h.contract.id));
      if (r.level === "crit") crit += hits.length;
    }
    const exceptions = rules.reduce((n, r) => n + r.exceptions.length, 0);
    return {
      rules: rules.length,
      applied: appliedRules.length,
      contracts: flagged.size,
      crit,
      exceptions,
      coverage: Math.round((flagged.size / CONTRACTS.length) * 100),
    };
  }, [rules]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[23px] font-bold tracking-[-.7px] text-t1">리스크 관리</h1>
          <p className="mt-1 text-[13px] text-t3">
            &ldquo;이런 내용은 리스크다&rdquo;를 정의하면 계약 코퍼스를 검색해 해당 조항이 있는 계약을 찾아내고, 전체에 적용합니다.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              if (!guard("reopenResult", "confirmed")) return;
              resetStore(); setComposing(false); setOpenId(null);
              toast("리스크 규칙을 초기 상태로 되돌렸습니다");
            }}
            aria-disabled={!canReopen}
            className={cn(
              "flex h-[40px] items-center gap-2 rounded-[10px] border border-line bg-surface px-3.5 text-[13px] font-semibold text-t2 transition hover:bg-surface-2",
              !canReopen && "cursor-not-allowed opacity-50",
            )}
            title={reason("reopenResult", "confirmed") ?? "등록한 규칙·예외·상태를 모두 초기화합니다"}
          >
            <RotateCcw size={15} /> 데모 초기화
          </button>
          <button
            onClick={() => {
              if (!composing && !guard("editSummary")) return;
              setComposing((c) => !c);
            }}
            aria-disabled={!canEdit}
            title={reason("editSummary") ?? undefined}
            className={cn(
              "flex h-[40px] items-center gap-2 rounded-[10px] px-4 text-[13.5px] font-bold transition",
              composing ? "border border-line bg-surface text-t2 hover:bg-surface-2" : "bg-[var(--accent)] text-white shadow-[0_4px_12px_-3px_rgba(15,110,130,.5)] hover:bg-[var(--accent-600)]",
              !canEdit && !composing && "cursor-not-allowed opacity-50",
            )}
          >
            {composing ? <><X size={16} /> 닫기</> : <><Plus size={16} /> 리스크 규칙 만들기</>}
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-[18px] lg:grid-cols-4">
        {[
          { l: "등록된 규칙", v: stats.rules, u: "개", s: `${stats.applied}개 적용 중`, tone: "accent" },
          { l: "리스크 노출 계약", v: stats.contracts, u: "건", s: `전체 ${CONTRACTS.length}건 중`, tone: "crit" },
          { l: "고위험 매칭", v: stats.crit, u: "건", s: "재협상 검토 대상", tone: "crit" },
          { l: "예외 처리", v: stats.exceptions, u: "건", s: "무시하기로 한 계약", tone: "gray" },
        ].map((k) => (
          <div key={k.l} className="rounded-[var(--radius)] border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
            <div className="text-[11.5px] font-semibold text-t4">{k.l}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className={cn("num text-[26px] font-bold leading-none tracking-[-1px]", k.tone === "crit" && stats.crit > 0 ? "text-[var(--red)]" : "text-t1")}>{k.v}</span>
              <span className="text-[12px] text-t3">{k.u}</span>
            </div>
            <div className="mt-1.5 text-[11px] text-t4">{k.s}</div>
          </div>
        ))}
      </div>

      {/* 규칙 작성기 */}
      {composing && (
        <RuleComposer
          onCancel={() => setComposing(false)}
          onCreate={(r) => {
            if (!guard("editSummary")) return;
            const { rule, created } = addRule(r);
            setComposing(false);
            setOpenId(rule.id);
            toast(created ? `『${rule.title}』 규칙을 등록했습니다` : "같은 조건의 규칙이 이미 있습니다");
          }}
        />
      )}

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.06em] text-t4">
          <ListFilter size={12} /> 규칙
        </span>
        {([
          { k: "all", l: `전체 ${rules.length}` },
          { k: "applied", l: `적용 중 ${rules.filter((r) => r.applied).length}` },
          { k: "draft", l: `미적용 ${rules.filter((r) => !r.applied).length}` },
        ] as const).map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            className={cn(
              "h-[30px] rounded-full border px-3.5 text-[12.5px] font-semibold transition",
              filter === f.k ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-line bg-surface text-t3 hover:border-line-strong hover:text-t1",
            )}
          >
            {f.l}
          </button>
        ))}
      </div>

      {/* 규칙 목록 */}
      <div className="flex flex-col gap-3.5">
        {shown.length === 0 && (
          <div className="rounded-[var(--radius)] border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
            <p className="text-[13px] text-t3">해당 조건의 규칙이 없습니다.</p>
          </div>
        )}
        {shown.map((rule) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            open={openId === rule.id}
            onToggleOpen={() => setOpenId(openId === rule.id ? null : rule.id)}
            onApply={(v) => {
              /* 적용은 법무 담당자 이상, 이미 적용된 규칙의 해제는 확정 취소로 봅니다 */
              if (v ? !guard("confirmResult") : !guard("reopenResult", "confirmed")) return;
              setApplied(rule.id, v);
              toast(v ? `『${rule.title}』을(를) 전체 계약에 적용했습니다` : "적용을 해제했습니다");
            }}
            onException={(cid) => {
              if (!guard("editSummary")) return;
              toggleException(rule.id, cid);
            }}
            onRemove={() => {
              if (!guard("reopenResult", "confirmed")) return;
              removeRule(rule.id);
              toast("규칙을 삭제했습니다");
            }}
          />
        ))}
      </div>
    </>
  );
}

/* ============================================================
   규칙 작성기 — 자연어 → 키워드 추출 → 실시간 검색 미리보기
   ============================================================ */
function RuleComposer({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (r: { title: string; desc: string; level: RiskLevel; keywords: string[]; mode: MatchMode; source: "manual"; applied: boolean }) => void;
}) {
  const [desc, setDesc] = useState("");
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<RiskLevel>("crit");
  const [mode, setMode] = useState<MatchMode>("all");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [kwInput, setKwInput] = useState("");
  const [touched, setTouched] = useState(false);
  const [dropped, setDropped] = useState<string[]>([]);

  const analyze = () => {
    const { keywords: ks, dropped: dr } = extractKeywords(desc);
    setKeywords(ks);
    setDropped(dr);
    setTouched(true);
    if (!title.trim()) setTitle(desc.trim().slice(0, 30));
  };

  const preview: RiskRule = {
    id: "preview", title, desc, level, keywords, mode,
    source: "manual", createdAt: "", applied: false, exceptions: [],
  };
  const hits = keywords.length ? searchRule(preview) : [];

  const addKw = () => {
    const k = kwInput.trim();
    if (!k || keywords.includes(k)) return;
    setKeywords((ks) => [...ks, k]);
    setKwInput("");
  };

  const EXAMPLES = [
    "손해배상 한도를 정하지 않아 무한책임이 되는 조항",
    "통지 없이 자동 연장되는 계약",
    "지식재산권이 수급인에게 귀속되는 조항",
    "위약벌을 손해배상과 별도로 청구하는 조항",
  ];

  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-[#cfe6eb] bg-[linear-gradient(180deg,#f2fafb,#fff_40%)] shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2.5 border-b border-[#dcecef] px-5 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[image:var(--accent-grad)] text-white">
          <ShieldAlert size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold text-t1">새 리스크 규칙</div>
          <div className="text-[11.5px] text-t3">어떤 내용을 리스크로 볼지 문장으로 적으면, 탐지 키워드를 뽑아 코퍼스를 검색합니다</div>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-5 py-4">
        {/* 자연어 입력 */}
        <div>
          <label className="mb-1.5 block text-[11.5px] font-bold text-t3">어떤 내용이 리스크인가요?</label>
          <div className="flex items-end gap-2">
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); analyze(); } }}
              rows={2}
              placeholder="예) 손해배상 한도를 정하지 않아 무한책임이 되는 조항"
              className="max-h-[110px] flex-1 resize-none rounded-[10px] border border-line bg-white px-3.5 py-2.5 text-[13px] leading-[1.6] text-t1 outline-none transition placeholder:text-t4 focus:border-[var(--accent)]"
            />
            <button
              onClick={analyze}
              disabled={!desc.trim()}
              className="flex h-[42px] items-center gap-1.5 rounded-[10px] bg-[var(--accent)] px-4 text-[13px] font-bold text-white transition hover:bg-[var(--accent-600)] disabled:bg-surface-3 disabled:text-t4"
            >
              <Sparkles size={15} /> 분석
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10.5px] font-bold text-t4">예시</span>
            {EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => setDesc(ex)} className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-t3 transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
                {ex}
              </button>
            ))}
          </div>
        </div>

        {touched && (
          <>
            {/* 키워드 */}
            <div className="rounded-[12px] border border-line bg-white p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-bold text-t2">탐지 키워드</span>
                <span className="text-[11px] text-t4">조항 본문에서 이 표현을 찾습니다 — 직접 고칠 수 있습니다</span>
                <div className="ml-auto flex rounded-[8px] bg-surface-3 p-[3px]">
                  {([
                    { k: "all", l: "모두 포함" },
                    { k: "any", l: "하나라도" },
                  ] as const).map((m) => (
                    <button key={m.k} onClick={() => setMode(m.k)} className={cn("h-[26px] rounded-[6px] px-2.5 text-[11.5px] font-bold transition", mode === m.k ? "bg-white text-[var(--accent-text)] shadow-sm" : "text-t3")}>
                      {m.l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {keywords.map((k) => (
                  <span key={k} className="inline-flex h-[26px] items-center gap-1 rounded-full border border-[#d3e8ec] bg-[var(--accent-soft)] pl-2.5 pr-1 text-[12px] font-semibold text-[var(--accent-text)]">
                    {k}
                    <button onClick={() => setKeywords((ks) => ks.filter((x) => x !== k))} className="flex h-[18px] w-[18px] items-center justify-center rounded-full hover:bg-[var(--accent)] hover:text-white">
                      <X size={11} />
                    </button>
                  </span>
                ))}
                <input
                  value={kwInput}
                  onChange={(e) => setKwInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKw(); } }}
                  placeholder="키워드 추가"
                  className="h-[26px] w-[110px] rounded-full border border-dashed border-line-strong bg-surface px-2.5 text-[12px] text-t1 outline-none placeholder:text-t4 focus:border-[var(--accent)]"
                />
              </div>
              {dropped.length > 0 && (
                <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-t4">
                  <CircleAlert size={12} />
                  코퍼스 조항에 실제로 등장하지 않아 제외했습니다:
                  {dropped.map((d) => (
                    <span key={d} className="rounded-md bg-surface-3 px-1.5 py-0.5 font-semibold line-through">{d}</span>
                  ))}
                </p>
              )}
            </div>

            {/* 실시간 검색 결과 */}
            <div className="rounded-[12px] border border-line bg-white">
              <div className="flex items-center gap-2 border-b border-line-soft px-4 py-2.5">
                <Search size={14} className="text-[var(--accent)]" />
                <span className="text-[12.5px] font-bold text-t1">
                  지금 코퍼스에서 <em className="num not-italic text-[var(--accent)]">{hits.length}</em>건 매칭
                </span>
                <span className="text-[11px] text-t4">· 전체 {CONTRACTS.length}건 검색</span>
              </div>
              {hits.length === 0 ? (
                <p className="px-4 py-6 text-center text-[12px] text-t4">
                  매칭되는 조항이 없습니다. 키워드를 줄이거나 &lsquo;하나라도&rsquo; 모드로 바꿔보세요.
                </p>
              ) : (
                <div className="max-h-[260px] overflow-y-auto">
                  {hits.map((h) => (
                    <div key={h.contract.id} className="border-b border-line-soft px-4 py-3 last:border-0">
                      <div className="flex items-center gap-2">
                        <FileType type={h.contract.ft} size={17} />
                        <span className="truncate text-[12.8px] font-bold text-t1">{h.contract.title}</span>
                        <span className="num text-[10.5px] text-t4">{h.contract.id}</span>
                      </div>
                      {h.clauses.map((c) => (
                        <div key={c.clause.no} className="mt-1.5 rounded-[8px] border-l-[3px] border-l-[var(--red)] bg-surface-2 px-3 py-2">
                          <span className="num text-[10.5px] font-bold text-[var(--accent)]">{c.clause.no} {c.clause.title}</span>
                          <p className="mt-0.5 text-[11.8px] leading-relaxed text-t2">{c.clause.body}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {c.matched.map((m) => <Tag key={m} className="h-[17px] bg-[var(--red-soft)] text-[9.5px] text-[#a52f22]">{m}</Tag>)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 메타 + 등록 */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1">
                <label className="mb-1.5 block text-[11.5px] font-bold text-t3">규칙 이름</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예) 손해배상 한도 미설정"
                  className="h-[38px] w-full rounded-[9px] border border-line bg-white px-3 text-[13px] text-t1 outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11.5px] font-bold text-t3">위험도</label>
                <div className="flex rounded-[9px] bg-surface-3 p-[3px]">
                  {(["crit", "warn"] as const).map((l) => (
                    <button key={l} onClick={() => setLevel(l)} className={cn("h-[32px] rounded-[7px] px-3.5 text-[12.5px] font-bold transition", level === l ? "bg-white shadow-sm" : "text-t3", level === l && l === "crit" && "text-[#a52f22]", level === l && l === "warn" && "text-[#93610a]")}>
                      {LEVEL_META[l].label}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={onCancel} className="h-[38px] rounded-[9px] border border-line bg-surface px-4 text-[13px] font-semibold text-t2 transition hover:bg-surface-2">
                취소
              </button>
              <button
                onClick={() => onCreate({ title: title.trim() || desc.slice(0, 30), desc, level, keywords, mode, source: "manual", applied: true })}
                disabled={keywords.length === 0 || hits.length === 0}
                className="flex h-[38px] items-center gap-1.5 rounded-[9px] bg-[var(--accent)] px-4 text-[13px] font-bold text-white transition hover:bg-[var(--accent-600)] disabled:bg-surface-3 disabled:text-t4"
              >
                <Zap size={15} /> 등록하고 전체 적용 ({hits.length}건)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   규칙 카드 — 적용 토글 + 매칭 계약 + 예외 처리
   ============================================================ */
function RuleCard({
  rule, open, onToggleOpen, onApply, onException, onRemove,
}: {
  rule: RiskRule;
  open: boolean;
  onToggleOpen: () => void;
  onApply: (v: boolean) => void;
  onException: (contractId: string) => void;
  onRemove: () => void;
}) {
  const hits = searchRule(rule);
  const active = hits.filter((h) => !rule.exceptions.includes(h.contract.id));
  const src = SOURCE_META[rule.source];
  const lvl = LEVEL_META[rule.level];

  return (
    <div className={cn("overflow-hidden rounded-[var(--radius)] border bg-surface shadow-[var(--shadow-card)] transition", rule.applied ? "border-[#bcd9e0]" : "border-line")}>
      <div className="flex flex-wrap items-center gap-3 px-5 py-4">
        <span className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px]", rule.level === "crit" ? "bg-[var(--red-soft)] text-[var(--red)]" : "bg-[var(--amber-soft)] text-[var(--amber)]")}>
          <ShieldAlert size={18} />
        </span>
        <button onClick={onToggleOpen} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14.5px] font-bold text-t1">{rule.title}</span>
            <Pill tone={lvl.tone} className="h-[19px] text-[10.5px]">{lvl.label}</Pill>
            <Pill tone={src.tone} className="h-[19px] text-[10.5px]">{src.label}</Pill>
            {rule.sourceRef && <span className="num text-[10.5px] text-t4">← {rule.sourceRef}</span>}
          </div>
          <p className="mt-0.5 line-clamp-1 text-[12px] text-t3">{rule.desc}</p>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <div className="num text-[16px] font-bold leading-none text-t1">
              {active.length}<span className="text-[11px] font-semibold text-t4">/{hits.length}</span>
            </div>
            <div className="text-[10px] text-t4">매칭 계약</div>
          </div>
          {rule.applied ? (
            <button onClick={() => onApply(false)} className="flex h-[34px] items-center gap-1.5 rounded-[8px] border border-[var(--green-line)] bg-[var(--green-soft)] px-3 text-[12.5px] font-bold text-[#0a6b42] transition hover:brightness-95">
              <Check size={14} /> 적용 중
            </button>
          ) : (
            <button onClick={() => onApply(true)} className="flex h-[34px] items-center gap-1.5 rounded-[8px] bg-[var(--accent)] px-3 text-[12.5px] font-bold text-white transition hover:bg-[var(--accent-600)]">
              <Zap size={14} /> 전체 적용
            </button>
          )}
          <button onClick={onToggleOpen} className="flex h-[34px] w-[34px] items-center justify-center rounded-[8px] text-t4 transition hover:bg-surface-2 hover:text-t2">
            <ChevronDown size={17} className={cn("transition", open && "rotate-180")} />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line-soft bg-[#fafcfc] px-5 py-4">
          <p className="text-[12.5px] leading-relaxed text-t2">{rule.desc}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-wide text-t4">탐지 키워드</span>
            {rule.keywords.map((k) => (
              <Tag key={k} className="bg-[var(--accent-soft)] text-[10.5px] text-[var(--accent-text)]">{k}</Tag>
            ))}
            <Tag className="text-[10.5px]">{rule.mode === "all" ? "모두 포함" : "하나라도 포함"}</Tag>
            <span className="num ml-auto text-[10.5px] text-t4">등록 {rule.createdAt}</span>
            {rule.source !== "seed" && (
              <button onClick={onRemove} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-t4 transition hover:bg-[var(--red-soft)] hover:text-[var(--red)]">
                <Trash2 size={12} /> 삭제
              </button>
            )}
          </div>

          <div className="mt-3.5 flex items-center gap-2 text-[12px] font-bold text-t2">
            <Search size={13} className="text-[var(--accent)]" />
            검색된 계약 {hits.length}건
            {rule.exceptions.length > 0 && (
              <span className="text-[11px] font-semibold text-t4">· {rule.exceptions.length}건 무시 중</span>
            )}
            {!rule.applied && <Pill tone="gray" className="h-[18px] text-[10px]">미적용 — 계약에 반영되지 않음</Pill>}
          </div>

          <div className="mt-2 flex flex-col gap-2">
            {hits.map((h) => {
              const ignored = rule.exceptions.includes(h.contract.id);
              return (
                <div key={h.contract.id} className={cn("rounded-[12px] border p-3.5 transition", ignored ? "border-line-soft bg-surface-2 opacity-60" : "border-line bg-surface")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <FileType type={h.contract.ft} size={18} />
                    <Link href={`/contracts/${h.contract.id}`} className="truncate text-[13px] font-bold text-t1 hover:text-[var(--accent)] hover:underline">
                      {h.contract.title}
                    </Link>
                    <span className="num text-[10.5px] text-t4">{h.contract.id}</span>
                    <Pill tone={STATUS_META[h.contract.status].tone} className="h-[18px] text-[10px]">
                      {STATUS_META[h.contract.status].label}
                    </Pill>
                    <span className="text-[11px] text-t4">· {h.contract.party}</span>
                    <button
                      onClick={() => onException(h.contract.id)}
                      className={cn(
                        "ml-auto flex h-[28px] items-center gap-1.5 rounded-[8px] border px-2.5 text-[11.5px] font-bold transition",
                        ignored
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]"
                          : "border-line bg-surface text-t3 hover:border-[var(--amber)] hover:text-[var(--amber)]",
                      )}
                    >
                      {ignored ? <><Eye size={12} /> 다시 포함</> : <><EyeOff size={12} /> 이 계약은 무시</>}
                    </button>
                  </div>
                  {h.clauses.map((c) => (
                    <div key={c.clause.no} className={cn("mt-2 rounded-[9px] border-l-[3px] bg-surface-2 px-3 py-2", ignored ? "border-l-line-strong" : rule.level === "crit" ? "border-l-[var(--red)]" : "border-l-[var(--amber)]")}>
                      <span className="num text-[10.5px] font-bold text-[var(--accent)]">{c.clause.no} {c.clause.title}</span>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-t2">{c.clause.body}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.matched.map((m) => (
                          <Tag key={m} className={cn("h-[17px] text-[9.5px]", ignored ? "" : "bg-[var(--red-soft)] text-[#a52f22]")}>{m}</Tag>
                        ))}
                      </div>
                    </div>
                  ))}
                  {ignored && (
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-t4">
                      <CircleAlert size={12} /> 이 계약에서는 해당 리스크를 무시합니다 — 대장·대시보드 집계에서 제외됩니다.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <Link href="/contracts" className="mt-3 flex items-center justify-center gap-1.5 rounded-[9px] border border-line py-2.5 text-[12.5px] font-semibold text-t2 transition hover:bg-surface-2">
            <FileText size={14} /> 계약 대장에서 전체 보기 <ArrowRight size={13} />
          </Link>
        </div>
      )}
    </div>
  );
}
