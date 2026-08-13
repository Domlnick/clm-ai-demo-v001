"use client";

import { useEffect, useRef, useState } from "react";
import {
  PenLine, Sparkles, Check, CheckCircle2, ShieldAlert, RotateCcw,
  FileText, Lightbulb, TrendingUp, ArrowRight, Star, ChevronDown, Search,
  Send, Pencil, ClipboardCheck, Layers, CornerDownLeft, GitCompare, ArrowLeft,
} from "lucide-react";
import { Pill, Tag, SectionCard, Bar, ScoreRing } from "@/components/kit";
import {
  DRAFT_SLOTS, DRAFT_BRIEF_BASE, DRAFT_INTAKE_STEPS, DRAFT_MUSTS, DRAFT_REFS,
  type DraftSuggestion, type DraftBrief, type IntakeOption,
} from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";

const RISK_TONE = { crit: "crit", warn: "warn", ok: "ok" } as const;
const RISK_LABEL = { crit: "주의 조항", warn: "선택 유의", ok: "표준·권장" };

type Stage = "intake" | "review" | "editor";
type Turn = { ask: string; answer: string };

/* 자유 입력에서 계약 유형을 추정 */
function guessType(text: string): IntakeOption {
  const opts = DRAFT_INTAKE_STEPS[0].options;
  const t = text.replace(/\s/g, "");
  const rules: [string[], string][] = [
    [["임대차", "부지", "주유소", "임차"], "lease"],
    [["용역", "유지보수", "정비", "위탁용역"], "service"],
    [["비밀유지", "NDA", "기밀"], "nda"],
    [["폴사인", "상표", "위탁운영", "브랜드"], "polesign"],
    [["원유", "용선", "charter", "crude"], "crude"],
    [["구매", "공급", "촉매", "자재", "납품"], "purchase"],
  ];
  for (const [keys, id] of rules) {
    if (keys.some((k) => t.toLowerCase().includes(k.toLowerCase()))) {
      return opts.find((o) => o.id === id)!;
    }
  }
  return opts.find((o) => o.id === "purchase")!;
}

export default function DraftPage() {
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>("intake");

  /* ---------- 인테이크 상태 ---------- */
  const [stepIdx, setStepIdx] = useState(0);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [free, setFree] = useState("");
  const [thinking, setThinking] = useState(false);
  const [brief, setBrief] = useState<DraftBrief>(DRAFT_BRIEF_BASE);
  const [musts, setMusts] = useState<string[]>(DRAFT_MUSTS.filter((m) => m.auto).map((m) => m.id));
  const scroller = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  /* ---------- 에디터 상태 ---------- */
  const [filled, setFilled] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(DRAFT_SLOTS[0].id);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns, thinking, stepIdx]);


  const step = DRAFT_INTAKE_STEPS[stepIdx];

  /* 답변 확정 → 브리프 갱신 → 다음 질문 */
  const answer = (label: string, patch: Partial<DraftBrief>, note?: string) => {
    if (thinking) return;
    const cur = DRAFT_INTAKE_STEPS[stepIdx];
    setTurns((t) => [...t, { ask: cur.ask, answer: label }]);
    setBrief((b) => ({ ...b, ...patch, ...(note ? { note } : {}) }));
    setFree("");
    setThinking(true);
    const next = stepIdx + 1;
    timers.current.push(
      setTimeout(() => {
        setThinking(false);
        setStepIdx(next);
        /* 마지막 질문까지 답했으면 정리 화면으로 */
        if (next >= DRAFT_INTAKE_STEPS.length) setStage("review");
      }, 620),
    );
  };

  const submitFree = () => {
    const t = free.trim();
    if (!t) return;
    const guessed = guessType(t);
    answer(t, guessed.brief, t);
  };

  const restart = () => {
    timers.current.forEach(clearTimeout);
    setStage("intake");
    setStepIdx(0);
    setTurns([]);
    setFree("");
    setThinking(false);
    setBrief(DRAFT_BRIEF_BASE);
    setMusts(DRAFT_MUSTS.filter((m) => m.auto).map((m) => m.id));
    setFilled({});
    setOpen(DRAFT_SLOTS[0].id);
  };

  const goBackOneStep = () => {
    if (stepIdx === 0) return;
    setTurns((t) => t.slice(0, -1));
    setStepIdx((i) => i - 1);
  };

  /* 같은 조항을 겨냥한 필수조건은 서로 배타 */
  const toggleMust = (id: string) => {
    const target = DRAFT_MUSTS.find((m) => m.id === id)!;
    setMusts((ms) =>
      ms.includes(id)
        ? ms.filter((x) => x !== id)
        : [...ms.filter((x) => DRAFT_MUSTS.find((m) => m.id === x)!.slot !== target.slot), id],
    );
  };

  /* 브리프 확정 → 에디터 진입 */
  const confirmBrief = () => {
    setStage("editor");
    const firstMust = DRAFT_SLOTS.find((s) => musts.some((id) => DRAFT_MUSTS.find((m) => m.id === id)!.slot === s.id));
    setOpen(firstMust?.id ?? DRAFT_SLOTS[0].id);
    toast("브리프를 확정했습니다 — 조항별 문안 제안을 시작합니다");
  };

  /* ---------- 에디터 로직 ---------- */
  const doneCount = Object.keys(filled).length;
  const progress = Math.round((doneCount / DRAFT_SLOTS.length) * 100);

  const mustForSlot = (slotId: string) =>
    DRAFT_MUSTS.find((m) => musts.includes(m.id) && m.slot === slotId);

  const mustMetCount = musts.filter((id) => {
    const m = DRAFT_MUSTS.find((x) => x.id === id)!;
    return filled[m.slot] === m.suggestion;
  }).length;

  const insert = (slotId: string, sug: DraftSuggestion) => {
    setFilled((f) => ({ ...f, [slotId]: sug.id }));
    toast(`『${sug.label}』 문안을 삽입했습니다`);
    const idx = DRAFT_SLOTS.findIndex((s) => s.id === slotId);
    const next = DRAFT_SLOTS[idx + 1];
    setOpen(next ? next.id : null);
  };

  /* ============================================================
     1) 인테이크 — 무엇을 쓸지 대화로 좁힌다
     ============================================================ */
  if (stage === "intake") {
    const done = stepIdx >= DRAFT_INTAKE_STEPS.length;

    return (
      <>
        <div>
          <h1 className="text-[23px] font-bold tracking-[-.7px] text-t1">초안 작성 어시스트</h1>
          <p className="mt-1 text-[13px] text-t3">
            무엇을 쓸지부터 함께 정리합니다 — 몇 가지만 답하면 초안 방향을 잡아 드립니다.
          </p>
        </div>

        {/* 진행 표시 */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[.06em] text-t4">브리프</span>
          {DRAFT_INTAKE_STEPS.map((s, i) => (
            <span
              key={s.id}
              className={cn(
                "inline-flex h-[26px] items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] font-semibold transition",
                i < stepIdx
                  ? "border-[#bcd9e0] bg-[var(--accent-soft)] text-[var(--accent-text)]"
                  : i === stepIdx
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-line bg-surface text-t4",
              )}
            >
              {i < stepIdx ? <Check size={12} /> : <span className="num">{i + 1}</span>}
              {s.chipLabel}
            </span>
          ))}
          <span className="num ml-auto text-[11.5px] font-semibold text-t4">
            {Math.min(stepIdx, DRAFT_INTAKE_STEPS.length)} / {DRAFT_INTAKE_STEPS.length}
          </span>
        </div>

        <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4">
          <section className="overflow-hidden rounded-[var(--radius)] border border-line bg-surface shadow-[var(--shadow-card)]">
            {/* 대화 영역 */}
            <div ref={scroller} className="max-h-[440px] overflow-y-auto px-5 py-5">
              <div className="flex flex-col gap-4">
                {/* 인사 */}
                <Bubble>
                  안녕하세요{user ? `, ${user.name} ${user.title}님` : ""}.{" "}
                  <b className="font-bold text-[#0a4e5d]">어떤 계약서를 작성하시나요?</b>
                  <br />
                  유형을 고르셔도 되고, 상황을 문장으로 적어주셔도 제가 유형을 판별해 정리하겠습니다.
                </Bubble>

                {/* 지난 문답 */}
                {turns.map((t, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    {i > 0 && <Bubble>{t.ask}</Bubble>}
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-[13px] rounded-br-[5px] bg-[var(--accent)] px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-white">
                        {t.answer}
                      </div>
                    </div>
                  </div>
                ))}

                {thinking && (
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[9px] bg-[var(--accent-soft)] text-[var(--accent)]">
                      <Sparkles size={14} />
                    </span>
                    <span className="typing inline-flex items-center gap-1 rounded-[12px] bg-surface-2 px-3.5 py-3">
                      <i /><i /><i />
                    </span>
                  </div>
                )}

                {/* 현재 질문 */}
                {!thinking && !done && stepIdx > 0 && (
                  <Bubble>
                    <b className="font-bold text-[#0a4e5d]">{step.ask}</b>
                    <br />
                    <span className="text-t3">{step.sub}</span>
                  </Bubble>
                )}
              </div>
            </div>

            {/* 선택지 + 자유 입력 */}
            {!thinking && !done && (
              <div className="border-t border-line-soft bg-[#fafcfc] px-5 py-4">
                <div className="mb-2.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-t3">
                  <Lightbulb size={13} className="text-[var(--accent)]" />
                  {stepIdx === 0 ? step.sub : "가장 가까운 것을 골라주세요"}
                </div>
                <div className="flex flex-wrap gap-2">
                  {step.options.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => answer(o.label, o.brief)}
                      className="group flex items-center gap-2 rounded-[10px] border border-line bg-surface px-3.5 py-2.5 text-left transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                    >
                      <span className="text-[13px] font-semibold text-t1 group-hover:text-[var(--accent-text)]">{o.label}</span>
                      {o.hint && <span className="num text-[10.5px] font-bold text-t4">{o.hint}</span>}
                      <ArrowRight size={13} className="text-t4 transition group-hover:text-[var(--accent)]" />
                    </button>
                  ))}
                </div>

                {step.free && (
                  <>
                    <div className="my-3 flex items-center gap-3">
                      <span className="h-px flex-1 bg-line-soft" />
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-t4">또는 직접 설명</span>
                      <span className="h-px flex-1 bg-line-soft" />
                    </div>
                    <form
                      onSubmit={(e) => { e.preventDefault(); submitFree(); }}
                      className="flex items-end gap-2"
                    >
                      <textarea
                        value={free}
                        onChange={(e) => setFree(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitFree(); } }}
                        rows={2}
                        placeholder={step.free.placeholder}
                        className="max-h-[110px] flex-1 resize-none rounded-[10px] border border-line bg-white px-3.5 py-2.5 text-[13px] leading-[1.6] text-t1 outline-none transition placeholder:text-t4 focus:border-[var(--accent)]"
                      />
                      <button
                        type="submit"
                        disabled={!free.trim()}
                        className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[10px] bg-[var(--accent)] text-white transition hover:bg-[var(--accent-600)] disabled:bg-surface-3 disabled:text-t4"
                        aria-label="설명 보내기"
                      >
                        <Send size={16} />
                      </button>
                    </form>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10.5px] font-bold text-t4">예시</span>
                      {step.free.examples.map((ex) => (
                        <button
                          key={ex}
                          onClick={() => setFree(ex)}
                          className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-t3 transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        >
                          {ex}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <div className="mt-3 flex items-center gap-3 border-t border-line-soft pt-3 text-[11px] text-t4">
                  <CornerDownLeft size={11} /> Enter 전송
                  {stepIdx > 0 && (
                    <button onClick={goBackOneStep} className="ml-auto flex items-center gap-1 font-semibold text-t3 hover:text-[var(--accent)]">
                      <ArrowLeft size={12} /> 이전 질문으로
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </>
    );
  }

  /* ============================================================
     2) 리뷰 — 정리된 초안의 '느낌'을 확인하고 확정
     ============================================================ */
  if (stage === "review") {
    const previewSlots = DRAFT_SLOTS.map((s) => {
      const must = mustForSlot(s.id);
      const sug = must
        ? s.suggestions.find((x) => x.id === must.suggestion)!
        : s.suggestions.find((x) => x.recommended) ?? s.suggestions[0];
      return { slot: s, sug, must };
    });

    return (
      <>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[23px] font-bold tracking-[-.7px] text-t1">초안 방향 정리</h1>
            <p className="mt-1 text-[13px] text-t3">
              말씀해주신 내용을 이렇게 이해했습니다. 확정하면 이 방향으로 조항별 문안을 제안합니다.
            </p>
          </div>
          <button onClick={restart} className="hidden h-[38px] items-center gap-2 rounded-[8px] border border-line bg-surface px-4 text-[13.5px] font-semibold text-t2 transition hover:bg-surface-2 sm:flex">
            <RotateCcw size={15} /> 처음부터
          </button>
        </div>

        <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <div className="flex flex-col gap-[18px]">
            {/* 브리프 요약 */}
            <div className="overflow-hidden rounded-[var(--radius)] border border-[#cfe6eb] bg-[linear-gradient(180deg,#f2fafb,#fff_42%)] shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-2.5 border-b border-[#dcecef] px-5 py-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[image:var(--accent-grad)] text-white shadow-[0_2px_8px_rgba(15,110,130,.3)]">
                  <ClipboardCheck size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold text-t1">AI가 정리한 초안 브리프</div>
                  <div className="text-[11.5px] text-t3">유사 계약 {brief.refCount.toLocaleString()}건을 참조 범위로 잡았습니다</div>
                </div>
                <Pill tone="accent" dot>확정 대기</Pill>
              </div>

              <div className="px-5 py-4">
                <div className="rounded-[12px] border border-line bg-white p-4">
                  <p className="text-[14.5px] font-medium leading-[1.75] text-t1">
                    <b className="font-bold text-[#0a4e5d]">{brief.party}</b>와 체결하는{" "}
                    <b className="font-bold text-[#0a4e5d]">{brief.type}</b>으로,
                    거래 규모는 {brief.amount}, 계약기간은 {brief.term}({brief.renew})입니다.{" "}
                    협상 기조는 <b className="font-bold text-[#0a4e5d]">{brief.stance}</b> — {brief.stanceNote}
                  </p>
                  {brief.note && (
                    <p className="mt-2.5 flex gap-2 rounded-[9px] bg-surface-2 px-3 py-2.5 text-[12px] leading-relaxed text-t3">
                      <Pencil size={13} className="mt-0.5 flex-shrink-0 text-t4" />
                      입력하신 설명: “{brief.note}”
                    </p>
                  )}
                </div>

                {/* 필드 그리드 */}
                <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {[
                    { k: "계약 유형", v: brief.type, step: 0 },
                    { k: "기준 템플릿", v: brief.base, step: 0 },
                    { k: "상대방", v: brief.party, step: 1 },
                    { k: "거래 규모", v: brief.amount, step: 1 },
                    { k: "계약기간", v: brief.term, step: 2 },
                    { k: "갱신 방식", v: brief.renew, step: 2 },
                    { k: "준거법·분쟁", v: brief.governing, step: 1 },
                    { k: "협상 기조", v: brief.stance, step: 3 },
                  ].map((f) => (
                    <div key={f.k} className="group flex items-start gap-2 rounded-[11px] border border-line bg-white px-3.5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-semibold text-t4">{f.k}</div>
                        <div className="mt-0.5 text-[13px] font-semibold text-t1">{f.v}</div>
                      </div>
                      <button
                        onClick={() => { setStage("intake"); setStepIdx(f.step); setTurns((t) => t.slice(0, f.step)); }}
                        className="flex-shrink-0 rounded-md p-1 text-t4 opacity-0 transition hover:bg-surface-2 hover:text-[var(--accent)] group-hover:opacity-100"
                        title="이 항목 다시 답하기"
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 필수 반영 조건 */}
            <SectionCard
              title="꼭 반영할 조건"
              icon={<ShieldAlert size={17} className="text-[var(--accent)]" />}
              sub="선택한 조건은 해당 조항에서 우선 제안되고, 반영 여부를 추적합니다"
            >
              <div className="flex flex-wrap gap-2">
                {DRAFT_MUSTS.map((m) => {
                  const on = musts.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleMust(m.id)}
                      className={cn(
                        "flex items-start gap-2 rounded-[11px] border px-3.5 py-2.5 text-left transition",
                        on
                          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                          : "border-line bg-surface hover:border-line-strong",
                      )}
                    >
                      <span className={cn("mt-0.5 flex h-[16px] w-[16px] flex-shrink-0 items-center justify-center rounded-[5px] border", on ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-line-strong")}>
                        {on && <Check size={11} />}
                      </span>
                      <span className="min-w-0">
                        <span className={cn("block text-[12.8px] font-bold", on ? "text-[var(--accent-text)]" : "text-t1")}>{m.label}</span>
                        <span className="block text-[11px] text-t3">{m.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            {/* 예상 조항 구성 */}
            <SectionCard
              title="예상 조항 구성"
              icon={<Layers size={17} className="text-[var(--accent)]" />}
              sub={`${DRAFT_SLOTS.length}개 조항 · 확정하면 각 위치에서 문안을 고르게 됩니다`}
              bodyClass="p-0"
            >
              <div className="flex flex-col">
                {previewSlots.map(({ slot, sug, must }) => (
                  <div key={slot.id} className="flex items-start gap-3 border-b border-line-soft px-5 py-3.5 last:border-0">
                    <span className="num mt-0.5 flex h-[26px] flex-shrink-0 items-center rounded-[7px] bg-[var(--accent-soft)] px-2 text-[11px] font-bold text-[var(--accent-text)]">
                      {slot.no}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13.5px] font-bold text-t1">{slot.title}</span>
                        {must ? (
                          <Pill tone="accent" className="h-[19px] text-[10.5px]">브리프 반영 · {must.label}</Pill>
                        ) : (
                          <Pill tone="gray" className="h-[19px] text-[10.5px]">권장안 · {sug.label}</Pill>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-t3">{sug.text}</p>
                    </div>
                    <span className="num flex-shrink-0 pt-1 text-[11px] font-semibold text-t4">제안 {slot.suggestions.length}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          {/* 우측: 확정 + 참조 선례 */}
          <div className="flex flex-col gap-4 xl:sticky xl:top-3">
            <SectionCard title="이 방향으로 진행할까요?" icon={<CheckCircle2 size={16} className="text-[var(--accent)]" />} bodyClass="p-4">
              <div className="flex flex-col gap-2 text-[12.5px]">
                <Row k="계약 유형" v={brief.type} />
                <Row k="필수 조건" v={`${musts.length}개 선택`} />
                <Row k="참조 선례" v={`${brief.refCount.toLocaleString()}건`} />
                <Row k="작성 조항" v={`${DRAFT_SLOTS.length}개`} />
              </div>
              <button
                onClick={confirmBrief}
                className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-[10px] bg-[var(--accent)] py-3 text-[14px] font-bold text-white shadow-[0_4px_12px_-3px_rgba(15,110,130,.5)] transition hover:bg-[var(--accent-600)]"
              >
                <PenLine size={16} /> 확정하고 초안 작성 시작
              </button>
              <button
                onClick={() => { setStage("intake"); setStepIdx(0); setTurns([]); }}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-line py-2.5 text-[12.5px] font-semibold text-t2 transition hover:bg-surface-2"
              >
                <RotateCcw size={14} /> 다시 정리하기
              </button>
            </SectionCard>

            <SectionCard title="참조할 선례" icon={<GitCompare size={16} className="text-[var(--accent)]" />} sub="이 브리프와 가장 가까운 계약" bodyClass="p-4">
              <div className="flex flex-col gap-2.5">
                {DRAFT_REFS.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-[11px] border border-line bg-surface p-3">
                    <ScoreRing value={r.sim} size={42} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-bold text-t1">{r.title}</div>
                      <div className="num mt-0.5 text-[11px] text-t4">{r.id} · {r.party}</div>
                      <div className="mt-1 text-[11.5px] leading-snug text-t3">{r.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      </>
    );
  }

  /* ============================================================
     3) 에디터 — 조항별 문안 선택
     ============================================================ */
  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[23px] font-bold tracking-[-.7px] text-t1">초안 작성 어시스트</h1>
          <p className="mt-1 text-[13px] text-t3">
            확정한 브리프에 맞춰, 조항 위치마다 검증된 표준 문안을 카드로 제안합니다 — 골라 넣으면 초안이 완성됩니다.
          </p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <button onClick={() => setStage("review")} className="flex h-[38px] items-center gap-2 rounded-[8px] border border-line bg-surface px-4 text-[13.5px] font-semibold text-t2 transition hover:bg-surface-2">
            <ClipboardCheck size={15} /> 브리프 수정
          </button>
          <button onClick={restart} className="flex h-[38px] items-center gap-2 rounded-[8px] border border-line bg-surface px-4 text-[13.5px] font-semibold text-t2 transition hover:bg-surface-2">
            <RotateCcw size={15} /> 초기화
          </button>
        </div>
      </div>

      {/* 확정된 브리프 배너 */}
      <div className="flex flex-wrap items-center gap-3.5 rounded-[var(--radius)] border border-line bg-surface px-5 py-4 shadow-[var(--shadow-card)]">
        <span className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-[var(--accent-soft)] text-[var(--accent)]"><FileText size={20} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold text-t1">{brief.type}</div>
          <div className="mt-0.5 text-[12px] text-t3">
            {brief.party} · {brief.amount} · {brief.term}({brief.renew}) · 기조 {brief.stance} · 기준 템플릿 {brief.base}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone="ok" dot>브리프 확정</Pill>
          <Pill tone="accent">필수 조건 {mustMetCount}/{musts.length} 반영</Pill>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        {/* ===== EDITOR (slots) ===== */}
        <div className="flex flex-col gap-3.5">
          {DRAFT_SLOTS.map((slot) => {
            const chosenId = filled[slot.id];
            const chosen = slot.suggestions.find((s) => s.id === chosenId);
            const isOpen = open === slot.id;
            const must = mustForSlot(slot.id);
            /* 브리프에서 지정한 문안을 맨 앞으로 */
            const ordered = must
              ? [...slot.suggestions].sort((a, b) => (a.id === must.suggestion ? -1 : b.id === must.suggestion ? 1 : 0))
              : slot.suggestions;
            return (
              <div key={slot.id} className={cn("overflow-hidden rounded-[var(--radius)] border bg-surface shadow-[var(--shadow-card)] transition", chosen ? "border-[#bcd9e0]" : isOpen ? "border-[var(--accent)]" : "border-line")}>
                {/* slot header */}
                <button
                  onClick={() => setOpen(isOpen ? null : slot.id)}
                  className="flex w-full items-center gap-3 px-5 py-3.5 text-left"
                >
                  <span className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[9px] text-[11px] font-extrabold", chosen ? "bg-[var(--green-soft)] text-[#0a6b42]" : "bg-[var(--accent-soft)] text-[var(--accent-text)]")}>
                    {chosen ? <CheckCircle2 size={18} /> : slot.no.replace("제", "").replace("조", "")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="num text-[12px] font-bold text-[var(--accent)]">{slot.no}</span>
                      <span className="text-[14.5px] font-bold text-t1">{slot.title}</span>
                      {must && (
                        <Pill tone={filled[slot.id] === must.suggestion ? "ok" : "warn"} className="h-[19px] text-[10.5px]">
                          브리프 필수 · {must.label}
                        </Pill>
                      )}
                    </div>
                  </div>
                  {chosen ? <Pill tone="ok">작성됨</Pill> : <Pill tone="gray">제안 {slot.suggestions.length}개</Pill>}
                  <ChevronDown size={17} className={cn("flex-shrink-0 text-t4 transition", isOpen && "rotate-180")} />
                </button>

                {/* inserted content */}
                {chosen && (
                  <div className="border-t border-line-soft px-5 py-4">
                    <div className="rounded-[10px] border border-line-soft border-l-[3px] border-l-[var(--accent)] bg-surface-2 px-4 py-3 text-[13.5px] leading-[1.72] text-t1">
                      {chosen.text}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Tag className="text-[10.5px]">출처 · {chosen.source}</Tag>
                      {chosen.risk && <Pill tone={RISK_TONE[chosen.risk]} className="h-[19px] text-[10.5px]">{RISK_LABEL[chosen.risk]}</Pill>}
                      <button onClick={() => setOpen(slot.id)} className="ml-auto text-[12px] font-semibold text-[var(--accent)] hover:underline">다른 문안으로 변경</button>
                    </div>
                  </div>
                )}

                {/* suggestion cards */}
                {isOpen && (
                  <div className="border-t border-line-soft bg-[#fafcfc] px-5 py-4">
                    <div className="mb-3 flex items-center gap-1.5 text-[12px] text-t3">
                      <Lightbulb size={14} className="text-[var(--accent)]" />
                      {slot.hint}
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {ordered.map((sug) => {
                        const active = chosenId === sug.id;
                        const isMust = must?.suggestion === sug.id;
                        return (
                          <div
                            key={sug.id}
                            className={cn(
                              "group rounded-[12px] border bg-surface p-3.5 transition",
                              active ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : isMust ? "border-[#bcd9e0]" : "border-line hover:border-[#c9dde2] hover:shadow-[0_6px_18px_-12px_rgba(15,110,130,.5)]",
                            )}
                          >
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="text-[13.5px] font-bold text-t1">{sug.label}</span>
                              {isMust && (
                                <span className="inline-flex h-[20px] items-center gap-1 rounded-md bg-[var(--accent)] px-2 text-[10.5px] font-bold text-white">
                                  브리프 필수
                                </span>
                              )}
                              {sug.recommended && !isMust && (
                                <span className="inline-flex h-[20px] items-center gap-1 rounded-md bg-[var(--accent-soft)] px-2 text-[10.5px] font-bold text-[var(--accent-text)]">
                                  <Star size={11} className="fill-[var(--accent)] text-[var(--accent)]" /> 추천
                                </span>
                              )}
                              {sug.risk && <Pill tone={RISK_TONE[sug.risk]} className="h-[20px] text-[10.5px]">{RISK_LABEL[sug.risk]}</Pill>}
                              <span className="num ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-t3">
                                <TrendingUp size={12} className="text-[var(--accent)]" /> 채택률 {sug.freq}%
                              </span>
                            </div>
                            <p className="rounded-[9px] bg-surface-2 px-3 py-2.5 text-[12.8px] leading-[1.68] text-t2">{sug.text}</p>
                            <div className="mt-2.5 flex items-center gap-2">
                              <Tag className="text-[10.5px]">출처 · {sug.source}</Tag>
                              <button
                                onClick={() => insert(slot.id, sug)}
                                className={cn(
                                  "ml-auto flex h-[32px] items-center gap-1.5 rounded-[8px] px-3.5 text-[12.5px] font-bold transition",
                                  active ? "bg-[var(--green-soft)] text-[#0a6b42]" : "bg-[var(--accent)] text-white hover:bg-[var(--accent-600)]",
                                )}
                              >
                                {active ? <><Check size={14} /> 삽입됨</> : <>이 문안 삽입 <ArrowRight size={14} /></>}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ===== RIGHT RAIL ===== */}
        <div className="flex flex-col gap-4 xl:sticky xl:top-3">
          {/* progress */}
          <SectionCard title="초안 완성도" icon={<PenLine size={16} className="text-[var(--accent)]" />} bodyClass="p-4">
            <div className="flex items-end justify-between">
              <span className="num text-[30px] font-bold leading-none tracking-[-1px] text-t1">{progress}<span className="text-[16px] text-t3">%</span></span>
              <span className="num text-[12px] font-semibold text-t3">{doneCount} / {DRAFT_SLOTS.length} 조항</span>
            </div>
            <div className="mt-3"><Bar value={progress} tone={progress === 100 ? "ok" : "accent"} /></div>
            <div className="mt-3.5 flex flex-col gap-1">
              {DRAFT_SLOTS.map((s) => {
                const done = !!filled[s.id];
                return (
                  <button key={s.id} onClick={() => setOpen(s.id)} className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] transition hover:bg-surface-2", open === s.id && "bg-surface-2")}>
                    <span className={cn("flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full", done ? "bg-[var(--green)] text-white" : "border border-line-strong")}>
                      {done && <Check size={11} />}
                    </span>
                    <span className={cn("num text-[11px] font-bold", done ? "text-[var(--accent)]" : "text-t4")}>{s.no}</span>
                    <span className={cn("truncate", done ? "font-semibold text-t1" : "text-t3")}>{s.title}</span>
                  </button>
                );
              })}
            </div>
            {progress === 100 && (
              <button onClick={() => toast("완성된 초안을 문서로 내보냅니다 (프로토타입)")} className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-[9px] bg-[var(--accent)] py-2.5 text-[13px] font-semibold text-white transition hover:bg-[var(--accent-600)]">
                <CheckCircle2 size={15} /> 초안 완성 · 내보내기
              </button>
            )}
          </SectionCard>

          {/* 브리프 필수조건 반영 현황 */}
          <SectionCard title="브리프 반영 현황" icon={<ClipboardCheck size={16} className="text-[var(--accent)]" />} bodyClass="p-4">
            {musts.length === 0 ? (
              <p className="text-[12px] text-t4">선택한 필수 조건이 없습니다.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {musts.map((id) => {
                  const m = DRAFT_MUSTS.find((x) => x.id === id)!;
                  const slot = DRAFT_SLOTS.find((s) => s.id === m.slot)!;
                  const met = filled[m.slot] === m.suggestion;
                  return (
                    <button
                      key={id}
                      onClick={() => setOpen(m.slot)}
                      className={cn("flex items-center gap-2.5 rounded-[10px] border p-2.5 text-left transition", met ? "border-[var(--green-line)] bg-[var(--green-soft)]" : "border-line bg-surface hover:bg-surface-2")}
                    >
                      <span className={cn("flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full", met ? "bg-[var(--green)] text-white" : "border border-line-strong")}>
                        {met && <Check size={11} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] font-bold text-t1">{m.label}</span>
                        <span className="num block text-[10.5px] text-t4">{slot.no} {slot.title}</span>
                      </span>
                      {!met && <span className="text-[10.5px] font-bold text-[var(--amber)]">미반영</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* risk watch */}
          <SectionCard title="문안 리스크 체크" icon={<ShieldAlert size={16} className="text-[var(--amber)]" />} bodyClass="p-4">
            <div className="flex flex-col gap-2.5 text-[12.5px]">
              <p className="leading-relaxed text-t3">선택한 문안이 사내 표준을 벗어나면 여기에 경고가 표시됩니다.</p>
              {Object.entries(filled).map(([slotId, sugId]) => {
                const slot = DRAFT_SLOTS.find((s) => s.id === slotId)!;
                const sug = slot.suggestions.find((s) => s.id === sugId)!;
                if (!sug.risk || sug.risk === "ok") return null;
                return (
                  <div key={slotId} className={cn("flex items-center gap-2 rounded-[10px] border p-2.5", sug.risk === "crit" ? "border-[var(--red-line)] bg-[var(--red-soft)]" : "border-[var(--amber-line)] bg-[var(--amber-soft)]")}>
                    <ShieldAlert size={16} className={sug.risk === "crit" ? "text-[var(--red)]" : "text-[var(--amber)]"} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-bold text-t1">{slot.no} {slot.title}</div>
                      <div className="text-[11px] text-t3">{sug.label} · 검토 권고</div>
                    </div>
                  </div>
                );
              })}
              {!Object.entries(filled).some(([slotId, sugId]) => {
                const slot = DRAFT_SLOTS.find((s) => s.id === slotId);
                const sug = slot?.suggestions.find((s) => s.id === sugId);
                return sug?.risk && sug.risk !== "ok";
              }) && (
                <div className="flex items-center gap-2 rounded-[10px] border border-[var(--green-line)] bg-[var(--green-soft)] p-2.5">
                  <CheckCircle2 size={16} className="text-[#0a6b42]" />
                  <span className="text-[12px] font-semibold text-[#0a6b42]">현재 선택된 문안은 모두 표준 범위입니다.</span>
                </div>
              )}
            </div>
          </SectionCard>

          {/* tip */}
          <div className="overflow-hidden rounded-[var(--radius)] border border-[#cfe6eb] bg-[linear-gradient(180deg,#f2fafb,#fff_50%)] p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2 text-[13.5px] font-bold text-t1">
              <Sparkles size={16} className="text-[var(--accent)]" /> 어떻게 제안하나요?
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-t3">
              각 조항 위치에서 유사 계약 <b className="text-t1">{brief.refCount.toLocaleString()}건</b>을 벡터 검색해, 자주 채택된 문안과 사내 표준 가이드를 비교·정렬합니다. 채택률과 리스크 등급을 함께 보여 <b className="text-t1">근거 있는 선택</b>을 돕습니다.
            </p>
            <a href="/search" className="mt-3 flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--accent)] hover:underline">
              <Search size={14} /> 유사 조항 직접 검색하기
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- 작은 조각들 ---------- */
function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[9px] bg-[var(--accent-soft)] text-[var(--accent)]">
        <Sparkles size={14} />
      </span>
      <div className="max-w-[85%] rounded-[13px] rounded-tl-[5px] border border-line-soft bg-surface-2 px-3.5 py-3 text-[13.2px] leading-[1.75] text-t1">
        {children}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line-soft pb-2 last:border-0 last:pb-0">
      <span className="flex-shrink-0 font-semibold text-t3">{k}</span>
      <span className="text-right font-semibold text-t1">{v}</span>
    </div>
  );
}
