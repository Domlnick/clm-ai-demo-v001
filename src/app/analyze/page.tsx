"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  UploadCloud, Sparkles, ListChecks,
  CheckCircle2, Loader2, RotateCcw, Download, ArrowRight, ScanText, Quote,
  Database, FolderTree, Users, Clock, X, ShieldCheck, AlertTriangle, Zap,
  BookCheck, Check,
} from "lucide-react";
import { Pill, Tag, SectionCard, FileType, ScoreRing, Bar } from "@/components/kit";
import { ContractChat } from "@/components/contract-chat";
import { DocumentViewer } from "@/components/document-viewer";
import {
  ANALYSIS, ANALYSIS_OCR, PIPELINE, PIPELINE_TOTAL_MS, SEG_LABEL, CONTRACT_TYPES, ANALYZE_QA, ANALYZE_QA_SUGGESTIONS, LEDGER_TARGET,
  type Seg,
} from "@/lib/data";
import { searchRule } from "@/lib/risk";
import { getContract } from "@/lib/contracts";
import {
  PB_ITEM_STATE_META, evaluateContract, playbookForContract, reviewLabel,
  summarizeEval, ruleKeywordsFor,
} from "@/lib/playbooks";
import { useStore } from "@/lib/store";
import { usePermissions } from "@/lib/permissions";
import { EditSummaryChip, EditableChoice, EditableText, useResultEdits } from "@/components/editable";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";

type DetectedRisk = (typeof ANALYSIS.risks)[number];

type Phase = "idle" | "ready" | "processing" | "done";
type Ledger = "idle" | "confirm" | "running" | "done";
const RISK_TONE = { crit: "crit", warn: "warn", ok: "ok" } as const;

/* 사람이 다시 판정할 때 고르는 값들 */
const TYPE_OPTIONS = CONTRACT_TYPES.map((t) => ({ value: t.name, label: t.name })).concat(
  CONTRACT_TYPES.some((t) => t.name === ANALYSIS.meta.type)
    ? []
    : [{ value: ANALYSIS.meta.type, label: ANALYSIS.meta.type }],
);
const SEG_OPTIONS = (Object.keys(SEG_LABEL) as Seg[]).map((sg) => ({ value: sg, label: `${sg} · ${SEG_LABEL[sg]}` }));
const RISK_LEVEL_OPTIONS = [
  { value: "crit", label: "고위험" },
  { value: "warn", label: "주의" },
  { value: "ok", label: "표준" },
];
const RISK_LABEL = { crit: "고위험", warn: "주의", ok: "표준" };
/* 조항 카드 배경 — 플레이북 대비 차이 카드와 같은 색 규칙 */
const RISK_CARD = {
  crit: "border-[var(--red-line)] bg-[var(--red-soft)]",
  warn: "border-[var(--amber-line)] bg-[var(--amber-soft)]",
  ok: "border-[var(--green-line)] bg-[var(--green-soft)]",
} as const;
const RISK_TAG = {
  crit: "bg-white/70 text-[#a52f22]",
  warn: "bg-white/70 text-[#93610a]",
  ok: "bg-white/70 text-[#0a6b42]",
} as const;

export default function AnalyzePage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  const [drag, setDrag] = useState(false);
  const [tab, setTab] = useState<"one" | "key" | "clause">("one");
  const [ledger, setLedger] = useState<Ledger>("idle");
  const [ledgerStep, setLedgerStep] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { addRule, setApplied, playbooks } = useStore();
  /* AI 결과를 사람이 고친 값 — 화면 전체가 이 실효값을 씁니다 */
  const ed = useResultEdits();
  /* 권한 — 리스크 등록·대장 등록은 법무 담당자 이상, 리포트 내보내기는 현업은 확정 후에만 */
  const { allow, guard, reason } = usePermissions();
  const canEdit = allow("editSummary");
  const canConfirm = allow("confirmResult");
  /* 리스크 등급은 사람이 조정할 수 있어, 집계도 실효 등급 기준으로 냅니다 */
  const edValue = ed.value;
  const riskLevel = useCallback(
    (r: DetectedRisk) => edValue(`risk.${r.label}.level`, r.level) as "crit" | "warn" | "ok",
    [edValue],
  );
  /* 사람이 "표준"으로 내린 항목은 미해소 리스크에서 빠집니다 */
  const openRisks = ANALYSIS.risks.filter((r) => riskLevel(r) !== "ok");

  /* 분석 대상은 코퍼스의 C-24817 — 실제 조항 원문으로 플레이북과 대조한다 */
  const pbTarget = getContract("C-24817");
  const activePb = pbTarget ? playbookForContract(pbTarget, playbooks) : undefined;
  const pbEvals = useMemo(
    () => (activePb && pbTarget ? evaluateContract(activePb, pbTarget) : []),
    [activePb, pbTarget],
  );
  const pbSummary = summarizeEval(pbEvals);

  const registerPbDeviations = useCallback(() => {
    if (!guard("editSummary")) return;
    const devs = pbEvals.filter((e) => e.state === "deviation");
    let total = 0;
    for (const e of devs) {
      const res = addRule({
        title: `${e.item.title} — 플레이북 기준 이탈`,
        desc: `${activePb?.title} ${e.item.no}: ${e.item.standard}`,
        level: e.item.level,
        keywords: ruleKeywordsFor(e.item),
        mode: "all",
        source: "playbook",
        sourceRef: `${activePb?.id} · ${e.item.no}`,
        applied: true,
      });
      if (!res.created && !res.rule.applied) setApplied(res.rule.id, true);
      total += searchRule(res.rule).length;
    }
    toast(`이탈 ${devs.length}건을 리스크 규칙으로 등록했습니다 — 계약 ${total}건에 적용`);
  }, [pbEvals, activePb, addRule, setApplied, guard]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /* 파일 선택·드롭 — 프로토타입이라 실제 파일 대신 샘플 계약서를 첨부한 상태로 만듭니다 */
  const attachSample = useCallback(() => {
    setPhase("ready");
    toast("프로토타입에서는 샘플 계약서로 시연합니다 — 샘플 파일을 첨부했습니다");
  }, []);

  const run = useCallback((name?: string) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase("processing");
    setStep(0);
    if (name) toast(`${name} 분석을 시작합니다`);
    /* 단계마다 PIPELINE[i].ms 만큼 머문다 — 마지막 단계가 끝나면 결과 화면 */
    let at = 0;
    PIPELINE.forEach((p, i) => {
      at += p.ms;
      const when = at;
      const last = i === PIPELINE.length - 1;
      timers.current.push(
        setTimeout(() => {
          setStep(i + 1);
          if (last) setPhase("done");
        }, when),
      );
    });
  }, []);

  const progress = Math.round((Math.min(step + 1, PIPELINE.length) / PIPELINE.length) * 100);

  const reset = () => {
    timers.current.forEach(clearTimeout);
    setPhase("idle");
    setStep(0);
    setTab("one");
    setLedger("idle");
    setLedgerStep(0);
  };

  /* ---------- 계약 대장 등록 ---------- */
  /* 배너·우측 카드 두 진입점이 같은 액션이라 권한 검사도 한 곳에서 합니다 */
  const openLedgerConfirm = () => {
    if (!guard("confirmResult")) return;
    setLedger("confirm");
  };

  const startRegister = () => {
    if (!guard("confirmResult")) return;
    setLedger("running");
    setLedgerStep(0);
    LEDGER_TARGET.steps.forEach((_, i) => {
      timers.current.push(setTimeout(() => setLedgerStep(i + 1), (i + 1) * 560));
    });
    timers.current.push(
      setTimeout(() => {
        setLedger("done");
        toast(`계약 대장에 등록되었습니다 — ${LEDGER_TARGET.newId}`);
      }, LEDGER_TARGET.steps.length * 560 + 400),
    );
  };

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[23px] font-bold tracking-[-.7px] text-t1">계약서 분석·요약</h1>
          <p className="mt-1 text-[13px] text-t3">
            계약서 파일을 올리면 AI가 유형을 분류하고, 협상 플레이북 기준과 대조한 뒤 3층 요약으로 정리합니다.
          </p>
        </div>
        {phase === "done" && (
          <button onClick={reset} className="hidden h-[38px] items-center gap-2 rounded-[8px] border border-line bg-surface px-4 text-[13.5px] font-semibold text-t2 transition hover:bg-surface-2 sm:flex">
            <RotateCcw size={15} /> 새 파일 분석
          </button>
        )}
      </div>

      {/* ===== IDLE / READY: dropzone ===== */}
      {(phase === "idle" || phase === "ready") && (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            /* 실제 업로드는 프로토타입 범위 밖 — 무엇을 놓아도 샘플 계약서를 첨부합니다 */
            onDrop={(e) => { e.preventDefault(); setDrag(false); attachSample(); }}
            className={cn(
              "flex flex-col items-center justify-center gap-4 rounded-[var(--radius)] border-2 border-dashed bg-surface px-6 py-16 text-center transition",
              drag
                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                : phase === "ready"
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]/40"
                  : "border-line-strong",
            )}
          >
            {phase === "ready" ? (
              <>
                {/* 첨부된 것처럼 보이는 샘플 파일 카드 */}
                <div className="flex w-full max-w-[520px] items-center gap-3.5 rounded-[14px] border border-line bg-surface px-4 py-3.5 text-left shadow-[var(--shadow-card)]">
                  <FileType type={ANALYSIS.file.ft} size={42} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10.5px] font-bold uppercase tracking-[.07em] text-[var(--accent)]">
                      분석 준비 완료
                    </div>
                    <div className="truncate text-[14px] font-bold text-t1">{ANALYSIS.file.name}</div>
                    <div className="num mt-0.5 text-[11.5px] text-t4">
                      {ANALYSIS.file.pages}페이지 · {ANALYSIS.file.size} · 시연용 샘플 계약서
                    </div>
                  </div>
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--green-soft)] text-[#0a6b42]">
                    <Check size={17} />
                  </span>
                </div>
                <div className="text-[12.5px] text-t3">
                  프로토타입은 검수된 샘플 계약서로 시연합니다 — 실제 파일 업로드·OCR은 PoC 단계에서 연결합니다.
                </div>
                <div className="mt-1 flex items-center gap-2.5">
                  <button
                    onClick={() => run(ANALYSIS.file.name)}
                    className="flex h-[42px] items-center gap-2 rounded-[10px] bg-[var(--accent)] px-5 text-[14px] font-semibold text-white shadow-[0_4px_12px_-3px_rgba(15,110,130,.5)] transition hover:bg-[var(--accent-600)]"
                  >
                    <ScanText size={17} /> AI 분석 시작 <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={() => setPhase("idle")}
                    className="flex h-[42px] items-center gap-2 rounded-[10px] border border-line bg-surface px-5 text-[14px] font-semibold text-t2 transition hover:bg-surface-2"
                  >
                    <X size={16} /> 첨부 취소
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-[var(--accent-soft)] text-[var(--accent)]">
                  <UploadCloud size={30} />
                </span>
                <div>
                  <div className="text-[17px] font-bold text-t1">계약서 파일을 여기에 끌어다 놓으세요</div>
                  <div className="mt-1.5 text-[13px] text-t3">PDF · HWP · DOCX · 스캔 이미지 지원 · 최대 50MB · 한국어 OCR 자동 적용</div>
                </div>
                <div className="mt-1 flex items-center gap-2.5">
                  <button onClick={() => run(ANALYSIS.file.name)} className="flex h-[42px] items-center gap-2 rounded-[10px] bg-[var(--accent)] px-5 text-[14px] font-semibold text-white shadow-[0_4px_12px_-3px_rgba(15,110,130,.5)] transition hover:bg-[var(--accent-600)]">
                    <ScanText size={17} /> 샘플 계약서로 시연
                  </button>
                  <button onClick={attachSample} className="flex h-[42px] items-center gap-2 rounded-[10px] border border-line bg-surface px-5 text-[14px] font-semibold text-t2 transition hover:bg-surface-2">
                    파일 선택
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                ico: <ScanText size={18} />,
                t: "OCR 판독",
                d: "스캔된 계약서의 문장과 표를 텍스트 데이터로 변환합니다.",
              },
              {
                ico: <FolderTree size={18} />,
                t: "자동 분류",
                d: "계약 특성과 업무 영역을 파악해 적합한 유형으로 분류합니다.",
              },
              {
                ico: <BookCheck size={18} />,
                t: "플레이북 매칭",
                d: "확정된 협상 플레이북 기준과 조항을 대조해 이탈 항목을 찾습니다.",
              },
              {
                ico: <Sparkles size={18} />,
                t: "핵심 요약",
                d: "기간·금액·의무와 중요 조건을 검토 가능한 형태로 정리합니다.",
              },
            ].map((c) => (
              <div key={c.t} className="rounded-[var(--radius)] border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
                <span className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-[var(--accent-soft)] text-[var(--accent)]">{c.ico}</span>
                <div className="mt-3 text-[14.5px] font-bold text-t1">{c.t}</div>
                <div className="mt-1.5 text-[12.5px] leading-relaxed text-t3">{c.d}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ===== PROCESSING ===== */}
      {phase === "processing" && (
        <SectionCard
          title="계약서를 분석하고 있습니다"
          icon={<Loader2 size={17} className="animate-spin text-[var(--accent)]" />}
          sub={`OCR 판독 결과를 바탕으로 유형·플레이북 대조·요약을 정리합니다 · 약 ${(PIPELINE_TOTAL_MS / 1000).toFixed(1)}초`}
        >
          <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[240px_minmax(0,1fr)]">
            {/* 분석 대상 문서 */}
            <aside className="flex flex-col items-center gap-3 rounded-[14px] border border-line-soft bg-surface-2 px-4 py-5 text-center">
              <FileType type={ANALYSIS.file.ft} size={46} />
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-[.07em] text-t4">분석 대상</div>
                <div className="mt-0.5 text-[13px] font-bold leading-snug text-t1">{ANALYSIS.file.name}</div>
                <div className="num mt-1 text-[11.5px] text-t4">
                  {ANALYSIS.file.pages}페이지 · {ANALYSIS.file.size}
                </div>
              </div>
              <Tag className="text-[10.5px]">{ANALYSIS.meta.language} · 스캔 PDF</Tag>
            </aside>

            {/* 진행률 + 단계 */}
            <div className="flex flex-col gap-3.5">
              <div>
                <div className="flex items-end justify-between">
                  <span className="text-[12px] font-semibold text-t3">AI 분석 진행률</span>
                  <span className="num text-[15px] font-bold text-[var(--accent)]">{progress}%</span>
                </div>
                <div className="mt-1.5">
                  <Bar value={progress} />
                </div>
              </div>

              <ol className="flex flex-col gap-2.5">
                {PIPELINE.map((p, i) => {
                  const state = i < step ? "done" : i === step ? "active" : "wait";
                  return (
                    <li
                      key={p.key}
                      className={cn(
                        "flex items-center gap-3.5 rounded-[12px] border px-4 py-3 transition",
                        state === "active"
                          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                          : state === "done"
                            ? "border-line-soft bg-surface-2"
                            : "border-line-soft opacity-55",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] text-[11px] font-extrabold",
                          state === "done"
                            ? "bg-[var(--green-soft)] text-[#0a6b42]"
                            : state === "active"
                              ? "bg-white text-[var(--accent)]"
                              : "bg-surface-3 text-t4",
                        )}
                      >
                        {state === "done" ? <CheckCircle2 size={18} /> : state === "active" ? <Loader2 size={16} className="animate-spin" /> : i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-bold text-t1">{p.label}</div>
                        <div className="text-[12px] text-t3">{p.detail}</div>
                        <div className="mt-0.5 text-[11px] text-t4">{p.meta}</div>
                      </div>
                      {state === "done" ? (
                        <Pill tone="ok">완료</Pill>
                      ) : state === "active" ? (
                        <span className="flex items-center gap-2">
                          <span className="typing"><i /><i /><i /></span>
                          <span className="text-[11.5px] font-semibold text-[var(--accent-text)]">처리 중</span>
                        </span>
                      ) : (
                        <span className="text-[11.5px] font-medium text-t4">대기</span>
                      )}
                    </li>
                  );
                })}
              </ol>

            </div>
          </div>
        </SectionCard>
      )}

      {/* ===== DONE: results ===== */}
      {phase === "done" && (
        <>
          {/* file banner */}
          <div className="flex flex-wrap items-center gap-3.5 rounded-[var(--radius)] border border-line bg-surface px-5 py-4 shadow-[var(--shadow-card)]">
            <FileType type={ANALYSIS.file.ft} size={40} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-[15px] font-bold text-t1">{ANALYSIS.file.name}</span>
                {ledger === "done" && (
                  <Pill tone="ok" dot>대장 등록됨 · {LEDGER_TARGET.newId}</Pill>
                )}
                {activePb && (
                  <button
                    onClick={() => document.getElementById("pb-diff")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    title="플레이북 대비 차이로 이동"
                  >
                    <Pill tone={pbSummary.deviation > 0 ? "crit" : "ok"} dot>
                      플레이북 {pbSummary.deviation > 0 ? `이탈 ${pbSummary.deviation}` : "전부 준수"}
                    </Pill>
                  </button>
                )}
              </div>
              <div className="num mt-0.5 text-[12px] text-t4">{ANALYSIS.file.size} · {ANALYSIS.file.pages}p · {ANALYSIS.meta.language}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="accent">{ANALYSIS.meta.type}</Pill>
              <Tag>{ANALYSIS.meta.seg} · {SEG_LABEL[ANALYSIS.meta.seg]}</Tag>
              <div className="flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5">
                <span className="text-[11.5px] font-semibold text-t3">분류 신뢰도</span>
                <span className="num text-[13px] font-bold text-[var(--accent)]">{ANALYSIS.meta.confidence}%</span>
              </div>
              <EditSummaryChip ed={ed} />
              <button
                onClick={() => {
                  if (!guard("copySummary", ledger === "done" ? "confirmed" : "aiGenerated")) return;
                  toast("OCR 판독 텍스트를 내려받습니다 (프로토타입)");
                }}
                aria-disabled={!allow("copySummary", ledger === "done" ? "confirmed" : "aiGenerated")}
                title={reason("copySummary", ledger === "done" ? "confirmed" : "aiGenerated") ?? undefined}
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-[8px] border border-line bg-surface px-3 text-[12.5px] font-semibold text-t2 transition hover:bg-surface-2",
                  !allow("copySummary", ledger === "done" ? "confirmed" : "aiGenerated") && "cursor-not-allowed opacity-50",
                )}
              >
                <ScanText size={14} /> OCR 내려받기
              </button>
              <button
                onClick={() => {
                  if (!guard("copySummary", ledger === "done" ? "confirmed" : "aiGenerated")) return;
                  toast("요약 리포트를 PDF로 내보냅니다 (프로토타입)");
                }}
                aria-disabled={!allow("copySummary", ledger === "done" ? "confirmed" : "aiGenerated")}
                title={reason("copySummary", ledger === "done" ? "confirmed" : "aiGenerated") ?? undefined}
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-[8px] border border-line bg-surface px-3 text-[12.5px] font-semibold text-t2 transition hover:bg-surface-2",
                  !allow("copySummary", ledger === "done" ? "confirmed" : "aiGenerated") && "cursor-not-allowed opacity-50",
                )}
              >
                <Download size={14} /> 리포트
              </button>
              {ledger === "done" ? (
                <button onClick={() => toast("계약 대장에서 문서를 엽니다 (프로토타입)")} className="flex h-9 items-center gap-1.5 rounded-[8px] border border-[var(--green-line)] bg-[var(--green-soft)] px-3.5 text-[12.5px] font-bold text-[#0a6b42] transition hover:brightness-95">
                  <CheckCircle2 size={15} /> 대장에서 보기
                </button>
              ) : (
                <button
                  onClick={openLedgerConfirm}
                  aria-disabled={!canConfirm}
                  title={reason("confirmResult") ?? undefined}
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-[8px] bg-[var(--accent)] px-3.5 text-[12.5px] font-bold text-white shadow-[0_3px_10px_-3px_rgba(15,110,130,.6)] transition hover:bg-[var(--accent-600)]",
                    !canConfirm && "cursor-not-allowed opacity-50",
                  )}
                >
                  <Database size={15} /> 계약 대장에 등록
                </button>
              )}
            </div>
          </div>

          {/* 배너 아래 — 좌: 계약서 원문 / 우: 분석 결과 */}
          <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,620px)_minmax(0,1fr)] xl:items-start">
            <DocumentViewer
              file={ANALYSIS.file}
              ocrText={ANALYSIS_OCR}
              previewUrl={ANALYSIS.file.previewUrl}
              className="min-h-[880px] xl:h-[calc(100vh-210px)] xl:min-h-[720px]"
            />

            {/* 좌측 원문 패널과 같은 높이로 두고, 내용은 이 안에서 스크롤합니다 */}
            <div className="flex flex-col gap-[18px] xl:h-[calc(100vh-210px)] xl:min-h-[720px] xl:overflow-y-auto xl:pr-1.5 [&>*]:flex-shrink-0">
              {/* 계약 유형 분류 */}
              <SectionCard
                title="계약 유형 분류"
                icon={<ScanText size={17} className="text-[var(--accent)]" />}
                sub="업무와 계약 특성을 기준으로 판정한 유형과 신뢰도"
                bodyClass="p-4"
              >
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3">
                    <ScoreRing value={ANALYSIS.meta.confidence} size={52} />
                    <div>
                      <div className="text-[11.5px] font-semibold text-t4">분류 신뢰도</div>
                      <div className="text-[13px] font-bold text-t1">11개 유형 중 판정</div>
                    </div>
                  </div>
                  <div className="grid min-w-[260px] flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                    <MetaCell ico={<ScanText size={13} />} k="계약 유형">
                      <EditableChoice
                        ed={ed}
                        k="meta.type"
                        original={ANALYSIS.meta.type}
                        options={TYPE_OPTIONS}
                        compactMark
                      />
                    </MetaCell>
                    <MetaCell ico={<FolderTree size={13} />} k="업무 영역">
                      <EditableChoice
                        ed={ed}
                        k="meta.seg"
                        original={ANALYSIS.meta.seg}
                        options={SEG_OPTIONS}
                        compactMark
                      >
                        {(v) => <span>{v} · {SEG_LABEL[v as Seg] ?? ""}</span>}
                      </EditableChoice>
                    </MetaCell>
                    <MetaCell ico={<ScanText size={13} />} k="문서 언어">{ANALYSIS.meta.language}</MetaCell>
                    <MetaCell ico={<ShieldCheck size={13} />} k="준거법">{ANALYSIS.meta.governing}</MetaCell>
                  </div>
                </div>
              </SectionCard>

              {/* AI Summary — 3층 요약 + 대장 필드를 한 섹션으로 */}
              <SectionCard
                title={
                  <span className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-[.09em] text-t4">AI Summary</span>
                    <span>핵심 요약</span>
                  </span>
                }
                icon={<Sparkles size={17} className="text-[var(--accent)]" />}
                sub="한줄 → 핵심 → 조항별로 깊이를 조절해 읽고, 추출된 대장 필드로 근거를 확인하세요"
                bodyClass="p-0"
                right={
                  <div className="flex rounded-[9px] bg-surface-3 p-[3px]">
                    {[
                      { k: "one", l: "한줄" },
                      { k: "key", l: "핵심" },
                      { k: "clause", l: "조항별" },
                    ].map((t) => (
                      <button key={t.k} onClick={() => setTab(t.k as typeof tab)} className={cn("h-[30px] rounded-[7px] px-3.5 text-[12.5px] font-bold transition", tab === t.k ? "bg-white text-[var(--accent-text)] shadow-sm" : "text-t3 hover:text-t1")}>
                        {t.l}
                      </button>
                    ))}
                  </div>
                }
              >
                <div className="p-5">
                  {tab === "one" && (
                    <div className="flex gap-3 rounded-[12px] border border-[#cfe6eb] bg-[linear-gradient(180deg,#f2fafb,#fff)] p-4">
                      <Quote size={20} className="flex-shrink-0 text-[var(--accent)]" />
                      <EditableText
                        ed={ed}
                        k="summary1"
                        original={ANALYSIS.summary1}
                        multiline
                        className="text-[14.5px] font-medium leading-relaxed text-t1"
                        inputClass="text-[14px] leading-relaxed text-t1"
                      />
                    </div>
                  )}
                  {tab === "key" && (
                    <ul className="flex flex-col gap-2.5">
                      {ANALYSIS.summary2.map((s, i) => (
                        <li key={i} className="flex gap-3 text-[13.5px] leading-relaxed text-t2">
                          <span className="num mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[10px] font-bold text-[var(--accent-text)]">{i + 1}</span>
                          <EditableText
                            ed={ed}
                            k={`summary2.${i}`}
                            original={s}
                            multiline
                            className="flex-1 text-[13.5px] leading-relaxed text-t2"
                            inputClass="text-[13px] leading-relaxed text-t2"
                            compactMark
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                  {tab === "clause" && (
                    <div className="flex flex-col gap-2.5">
                      {ANALYSIS.clauses.map((c) => {
                        const lv = ed.value(`clause.${c.no}.risk`, c.risk) as keyof typeof RISK_CARD;
                        return (
                        <div key={c.no} className={cn("rounded-[12px] border p-3.5", RISK_CARD[lv] ?? RISK_CARD.ok)}>
                          <div className="mb-1.5 flex items-center gap-2">
                            <span className="num text-[12px] font-bold text-[var(--accent)]">{c.no}</span>
                            <span className="text-[13.5px] font-bold text-t1">{c.title}</span>
                            <span className="ml-auto flex items-center gap-1.5">
                              <EditableChoice
                                ed={ed}
                                k={`clause.${c.no}.risk`}
                                original={c.risk}
                                options={RISK_LEVEL_OPTIONS}
                                compactMark
                              >
                                {(v) => (
                                  <Pill tone={RISK_TONE[v as keyof typeof RISK_TONE]}>
                                    {RISK_LABEL[v as keyof typeof RISK_LABEL]}
                                  </Pill>
                                )}
                              </EditableChoice>
                            </span>
                          </div>
                          <EditableText
                            ed={ed}
                            k={`clause.${c.no}.body`}
                            original={c.body}
                            multiline
                            className="text-[12.8px] leading-relaxed text-t2"
                            inputClass="text-[12.5px] leading-relaxed text-t2"
                            compactMark
                          />
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {c.tags.map((t) => (
                              <Tag key={t} className={cn("text-[10.5px]", RISK_TAG[lv] ?? RISK_TAG.ok)}>#{t}</Tag>
                            ))}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 추출된 대장 필드 — 요약의 근거 데이터 */}
                <div className="border-t border-line-soft">
                  <div className="flex flex-wrap items-center gap-2 bg-surface-2 px-5 py-2.5">
                    <ListChecks size={14} className="text-[var(--accent)]" />
                    <span className="text-[12.5px] font-bold text-t1">추출된 계약 대장 필드</span>
                    <span className="num rounded-md bg-surface px-1.5 py-px text-[10.5px] font-bold text-t3">
                      {ANALYSIS.fields.length}개
                    </span>
                    <span className="ml-auto text-[11px] text-t4">근거 위치 확인 · 검증 후 대장 반영</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2">
                    {ANALYSIS.fields.map((f, i) => (
                      <div key={f.k} className={cn("flex items-start gap-3 border-line-soft px-5 py-3.5", i < ANALYSIS.fields.length - 1 && "border-b", i % 2 === 0 && "sm:border-r")}>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11.5px] font-semibold text-t4">{f.k}</div>
                          <EditableText
                            ed={ed}
                            k={`field.${f.k}`}
                            original={f.v}
                            className="mt-0.5 text-[13.5px] font-semibold text-t1"
                            compactMark
                          />
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1.5 pt-0.5">
                          <div className="h-[5px] w-9 overflow-hidden rounded-full bg-[#eceef2]">
                            <div className="h-full rounded-full" style={{ width: `${f.conf}%`, background: f.conf >= 95 ? "#1e7a52" : "#0f6e82" }} />
                          </div>
                          <span className="num text-[10.5px] font-bold text-t4">{f.conf}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>

              {/* 플레이북 대비 차이 */}
              <div id="pb-diff">
                <SectionCard
                  title="플레이북 대비 차이"
                  icon={<BookCheck size={17} className="text-[var(--accent)]" />}
                  sub={
                    activePb
                      ? `${activePb.dept} ${activePb.title} ${activePb.versions[activePb.versions.length - 1].v} 기준 · ${reviewLabel(activePb)}`
                      : "이 계약 유형에 맞는 확정 플레이북이 없습니다"
                  }
                  bodyClass="p-0"
                  right={
                    activePb && (
                      <Link href={`/playbook/${activePb.id}`} className="flex h-[30px] items-center gap-1 rounded-[8px] border border-line px-2.5 text-[11.5px] font-bold text-t2 transition hover:bg-surface-2">
                        플레이북 <ArrowRight size={12} />
                      </Link>
                    )
                  }
                >
                  {!activePb || !pbTarget ? (
                    <p className="px-5 py-8 text-center text-[12.5px] text-t4">
                      대조할 확정 플레이북이 없습니다. 협상 플레이북에서 먼저 기준을 확정해 주세요.
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-3 border-b border-line-soft px-5 py-3.5">
                        <div className="flex items-baseline gap-1">
                          <span className="num text-[26px] font-bold leading-none tracking-[-1px] text-[var(--red)]">{pbSummary.deviation}</span>
                          <span className="text-[12px] text-t3">개 항목이 플레이북과 다릅니다</span>
                        </div>
                        <div className="ml-auto flex flex-wrap items-center gap-2">
                          <Pill tone="crit" dot>다름 {pbSummary.deviation}</Pill>
                          <Pill tone="ok" dot>준수 {pbSummary.ok}</Pill>
                          <Pill tone="warn" dot>미규정 {pbSummary.missing}</Pill>
                        </div>
                      </div>
                      {pbEvals.map((e) => (
                        <div key={e.item.id} className="border-b border-line-soft px-5 py-3.5 last:border-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="num flex h-[24px] items-center rounded-[7px] bg-surface-3 px-2 text-[11px] font-extrabold text-t3">{e.item.no}</span>
                            <span className="text-[13.5px] font-bold text-t1">{e.item.title}</span>
                            <Pill tone={PB_ITEM_STATE_META[e.state].tone} className="h-[19px] text-[10.5px]">{PB_ITEM_STATE_META[e.state].label}</Pill>
                            <span className="num ml-auto text-[11px] text-t4">
                              {e.clause ? `${e.clause.no} ${e.clause.title}` : "해당 조항 없음"}
                            </span>
                          </div>
                          {e.state === "ok" ? (
                            <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-t3">
                              <Check size={13} className="text-[var(--green)]" /> 기준 충족 — {e.item.standard}
                            </p>
                          ) : e.state === "missing" ? (
                            <div className="mt-2 rounded-[11px] border border-[var(--amber-line)] bg-[var(--amber-soft)] p-3">
                              <span className="text-[10px] font-bold uppercase tracking-wide text-[#93610a]/80">이 계약에는 대응 조항이 없습니다</span>
                              <p className="mt-1 text-[12.5px] leading-[1.7] text-t2">권장 문안 · {e.item.standard}</p>
                            </div>
                          ) : (
                            /* 폭이 좁아 좌우 비교가 어려워, 문장을 위아래로 붙여 대조합니다 */
                            <div className="mt-2 overflow-hidden rounded-[11px] border border-line-soft">
                              <div className="flex items-start gap-2.5 border-b border-line-soft bg-[var(--red-soft)] px-3 py-2.5">
                                <span className="mt-px flex-shrink-0 rounded-[6px] bg-white/80 px-1.5 py-px text-[10px] font-bold text-[#a52f22]">
                                  이 계약
                                </span>
                                <div className="min-w-0 flex-1">
                                  <span className="num text-[10.5px] font-semibold text-[#a52f22]/85">
                                    {e.clause?.no} {e.clause?.title}
                                  </span>
                                  <p className="mt-0.5 text-[12.5px] leading-[1.7] text-t2">{e.clause?.body}</p>
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {e.deviated.map((d) => (
                                      <Tag key={d} className="h-[17px] bg-white/70 text-[9.5px] text-[#a52f22]">{d}</Tag>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-start gap-2.5 bg-[var(--accent-soft)] px-3 py-2.5">
                                <span className="mt-px flex-shrink-0 rounded-[6px] bg-white/80 px-1.5 py-px text-[10px] font-bold text-[var(--accent-text)]">
                                  플레이북
                                </span>
                                <div className="min-w-0 flex-1">
                                  <span className="num text-[10.5px] font-semibold text-[var(--accent-text)]/75">{e.item.no} 기준</span>
                                  <p className="mt-0.5 text-[12.5px] font-semibold leading-[1.7] text-[var(--accent-text)]">{e.item.standard}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {pbSummary.deviation > 0 && (
                        <div className="flex flex-wrap items-center gap-2.5 border-t border-line-soft bg-surface-2 px-5 py-3">
                          <span className="min-w-0 flex-1 text-[11.5px] text-t3">
                            이탈 항목을 리스크 규칙으로 등록하면 같은 조항이 있는 다른 계약에도 적용됩니다.
                          </span>
                          <button
                            onClick={registerPbDeviations}
                            aria-disabled={!canEdit}
                            title={reason("editSummary") ?? undefined}
                            className={cn(
                              "flex h-[32px] items-center gap-1.5 rounded-[8px] bg-[var(--accent)] px-3.5 text-[12.5px] font-bold text-white transition hover:bg-[var(--accent-600)]",
                              !canEdit && "cursor-not-allowed opacity-50",
                            )}
                          >
                            <Zap size={14} /> 이탈 {pbSummary.deviation}건 리스크로 등록
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </SectionCard>
              </div>

              {/* 선례 비교 채팅 */}
              <ContractChat
                title="선례 비교 Q&A"
                sub={`${ANALYSIS.file.name} ↔ 저장된 계약 248,391건`}
                greeting="이 계약서를 읽고 저장된 계약들과 대조해 두었습니다. 궁금한 점을 물어보시면 선례와 비교해 답하겠습니다."
                bank={ANALYZE_QA}
                suggestions={ANALYZE_QA_SUGGESTIONS}
                height={440}
              />

            </div>
          </div>
        </>
      )}

      {/* ===== 등록 확인·진행 모달 ===== */}
      {(ledger === "confirm" || ledger === "running") && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0d1b1f]/45 px-4 py-8 backdrop-blur-[2px]"
          onClick={() => ledger === "confirm" && setLedger("idle")}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-full w-full max-w-[520px] overflow-y-auto rounded-[var(--radius)] border border-line bg-surface shadow-[0_24px_60px_-20px_rgba(12,50,60,.5)]"
          >
            <div className="flex items-center gap-3 border-b border-line-soft px-5 py-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--accent-soft)] text-[var(--accent)]">
                <Database size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold text-t1">
                  {ledger === "running" ? "계약 대장에 등록하는 중" : "계약 대장에 등록할까요?"}
                </div>
                <div className="text-[11.5px] text-t3">
                  {ledger === "running"
                    ? "필드 검증 → 중복 확인 → 대장 반영 → 인덱싱 → 통지 순서로 진행합니다"
                    : "등록하면 대장·검색 인덱스에 반영되고 관계자에게 통지됩니다"}
                </div>
              </div>
              {ledger === "confirm" && (
                <button onClick={() => setLedger("idle")} className="flex h-8 w-8 items-center justify-center rounded-lg text-t4 transition hover:bg-surface-2 hover:text-t2" aria-label="닫기">
                  <X size={17} />
                </button>
              )}
            </div>

            {ledger === "running" ? (
              <div className="flex flex-col gap-2 px-5 py-4">
                {LEDGER_TARGET.steps.map((s, i) => {
                  const st = i < ledgerStep ? "done" : i === ledgerStep ? "active" : "wait";
                  return (
                    <div
                      key={s.key}
                      className={cn(
                        "flex items-center gap-2.5 rounded-[10px] border px-3 py-2.5 transition",
                        st === "active"
                          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                          : st === "done"
                            ? "border-line-soft bg-surface-2"
                            : "border-line-soft opacity-50",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[8px] text-[10px] font-extrabold",
                          st === "done"
                            ? "bg-[var(--green-soft)] text-[#0a6b42]"
                            : st === "active"
                              ? "bg-white text-[var(--accent)]"
                              : "bg-surface-3 text-t4",
                        )}
                      >
                        {st === "done" ? <CheckCircle2 size={15} /> : st === "active" ? <Loader2 size={13} className="animate-spin" /> : s.key}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-bold text-t1">{s.label}</div>
                        <div className="text-[10.5px] text-t4">{s.detail}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
            <div className="flex flex-col gap-3 px-5 py-4">
              <div className="flex items-center gap-3 rounded-[11px] border border-line bg-surface-2 p-3">
                <FileType type={ANALYSIS.file.ft} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-bold text-t1">{ANALYSIS.file.name}</div>
                  <div className="num text-[11px] text-t4">{ANALYSIS.meta.type} · {ANALYSIS.file.pages}p · 신뢰도 {ANALYSIS.meta.confidence}%</div>
                </div>
                <Pill tone="accent">{LEDGER_TARGET.newId}</Pill>
              </div>

              <div className={cn("rounded-[11px] border p-3", openRisks.length > 0 ? "border-[var(--amber-line)] bg-[var(--amber-soft)]" : "border-[var(--green-line)] bg-[var(--green-soft)]")}>
                <div className={cn("flex items-center gap-2 text-[12.5px] font-bold", openRisks.length > 0 ? "text-[#93610a]" : "text-[#0a6b42]")}>
                  {openRisks.length > 0 ? (
                    <><AlertTriangle size={15} /> 미해소 리스크 {openRisks.length}건이 있는 상태로 등록됩니다</>
                  ) : (
                    <><ShieldCheck size={15} /> 탐지된 리스크가 모두 표준으로 정리되었습니다</>
                  )}
                </div>
                <ul className="mt-1.5 flex flex-col gap-1 pl-[22px] text-[11.5px] text-[#93610a]">
                  {openRisks.map((r) => (
                    <li key={r.label} className="list-disc">{r.label} — {r.note}</li>
                  ))}
                </ul>
                <p className="mt-1.5 pl-[22px] text-[11px] text-[#93610a]/85">
                  등록 후 리스크 큐에 자동 편입되어 분기 재검토 대상이 됩니다.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <InfoRow ico={<FolderTree size={13} />} k="저장 위치" v={LEDGER_TARGET.path} />
                <InfoRow ico={<ListChecks size={13} />} k="반영 필드" v={`${ANALYSIS.fields.length}개 (검증 완료)`} />
                <InfoRow ico={<Users size={13} />} k="담당·요청" v={`${LEDGER_TARGET.owner} / ${LEDGER_TARGET.requester}`} />
                <InfoRow ico={<Users size={13} />} k="열람 권한" v={LEDGER_TARGET.access} />
                <InfoRow ico={<Clock size={13} />} k="보존 기간" v={LEDGER_TARGET.retention} />
              </div>
            </div>
            )}

            {ledger === "confirm" && (
            <div className="flex items-center gap-2.5 border-t border-line-soft bg-surface-2 px-5 py-3.5">
              <span className="flex-1 text-[11px] text-t4">프로토타입 — 실제 저장소에는 반영되지 않습니다</span>
              <button onClick={() => setLedger("idle")} className="h-[38px] rounded-[9px] border border-line bg-surface px-4 text-[13px] font-semibold text-t2 transition hover:bg-surface-3">
                취소
              </button>
              <button
                onClick={startRegister}
                aria-disabled={!canConfirm}
                title={reason("confirmResult") ?? undefined}
                className={cn(
                  "flex h-[38px] items-center gap-1.5 rounded-[9px] bg-[var(--accent)] px-4 text-[13px] font-bold text-white transition hover:bg-[var(--accent-600)]",
                  !canConfirm && "cursor-not-allowed opacity-50",
                )}
              >
                <Database size={15} /> 등록 실행
              </button>
            </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * 분류 카드의 항목 한 칸.
 * 값 옆에 "수정" 배지·되돌리기가 붙어도 줄이 흐트러지지 않도록
 * 라벨을 위에, 값을 아래에 두는 대장 필드와 같은 형태로 맞췄습니다.
 */
function MetaCell({ ico, k, children }: { ico: React.ReactNode; k: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-line-soft bg-surface-2 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-t4">
        <span className="flex-shrink-0">{ico}</span>
        {k}
      </div>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] font-semibold leading-[1.5] text-t1">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ ico, k, v, warn }: { ico: React.ReactNode; k: string; v: string; warn?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-[9px] bg-surface-2 px-3 py-2">
      <span className="flex flex-shrink-0 items-center gap-1.5 text-[11.5px] font-semibold text-t3">
        <span className="text-t4">{ico}</span>
        {k}
      </span>
      <span className={cn("text-right text-[11.8px] font-semibold", warn ? "text-[#93610a]" : "text-t1")}>{v}</span>
    </div>
  );
}
