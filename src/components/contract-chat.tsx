"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles, Send, Quote, Paperclip, X, ArrowRight,
  ArrowDown, ArrowUp, Minus, CornerDownLeft,
} from "lucide-react";
import { Pill, FileType } from "@/components/kit";
import type { ChatAnswer, ChatCompare, ChatCite } from "@/lib/data";
import { cn } from "@/lib/utils";

/* ---------- 첨부된 계약서 ---------- */
export type ChatAttachment = { id: string; title: string; ft: string; meta?: string };

type Msg =
  | { role: "user"; text: string }
  | { role: "ai"; text: string; compare?: ChatCompare; cites?: ChatCite[]; follow?: string[] }
  | { role: "typing" };

/* 질문 → 준비된 답변 매칭 (키워드 스코어) */
function pick(q: string, bank: ChatAnswer[]): ChatAnswer | null {
  const t = q.replace(/\s/g, "");
  let best: ChatAnswer | null = null;
  let top = 0;
  for (const a of bank) {
    let score = a.q.replace(/\s/g, "") === t ? 100 : 0;
    for (const k of a.keys) if (t.includes(k.replace(/\s/g, ""))) score += 1;
    if (score > top) { top = score; best = a; }
  }
  return top > 0 ? best : null;
}

/** **볼드** 마크업만 지원하는 최소 렌더러 */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) =>
        line.trim() === "" ? (
          <span key={i} className="block h-2" />
        ) : (
          <p
            key={i}
            className={cn("text-[13.2px] leading-[1.75] text-t1", i > 0 && "mt-1.5")}
            dangerouslySetInnerHTML={{
              __html: line.replace(
                /\*\*(.+?)\*\*/g,
                '<b class="font-bold text-[#0a4e5d]">$1</b>',
              ),
            }}
          />
        ),
      )}
    </>
  );
}

const VERDICT = {
  worse: { ico: <ArrowUp size={11} />, cls: "bg-[var(--red-soft)] text-[#a52f22]", label: "불리" },
  same: { ico: <Minus size={11} />, cls: "bg-surface-3 text-t3", label: "동일" },
  better: { ico: <ArrowDown size={11} />, cls: "bg-[var(--green-soft)] text-[#0a6b42]", label: "유리" },
} as const;

function CompareTable({ c }: { c: ChatCompare }) {
  return (
    <div className="mt-3 overflow-hidden rounded-[11px] border border-line bg-white">
      <div className="flex items-center gap-2 border-b border-line-soft bg-surface-2 px-3 py-2">
        <span className="text-[11px] font-bold text-t2">선례 대비 비교</span>
        <span className="num text-[10.5px] text-t4">기준 · {c.refId}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line-soft text-[10.5px] font-bold uppercase tracking-wide text-t4">
              <th className="px-3 py-2 font-bold">항목</th>
              <th className="px-3 py-2 font-bold text-[var(--accent-text)]">{c.mineLabel}</th>
              <th className="px-3 py-2 font-bold">{c.refTitle}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {c.rows.map((r) => {
              const v = VERDICT[r.verdict];
              return (
                <tr key={r.label} className="border-b border-line-soft last:border-0">
                  <td className="px-3 py-2 text-[11.8px] font-semibold text-t2">{r.label}</td>
                  <td className="px-3 py-2 text-[11.8px] font-bold text-t1">{r.mine}</td>
                  <td className="px-3 py-2 text-[11.8px] text-t3">{r.ref}</td>
                  <td className="px-3 py-2">
                    <span className={cn("inline-flex h-[19px] items-center gap-1 rounded-md px-1.5 text-[10px] font-bold", v.cls)}>
                      {v.ico} {v.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** 좁은 폭(우측 레일)에서는 표 대신 항목별로 쌓아서 보여준다 */
function CompareStack({ c }: { c: ChatCompare }) {
  return (
    <div className="mt-3 overflow-hidden rounded-[11px] border border-line bg-white">
      <div className="flex items-center gap-2 border-b border-line-soft bg-surface-2 px-3 py-2">
        <span className="text-[11px] font-bold text-t2">선례 대비 비교</span>
        <span className="num text-[10.5px] text-t4">기준 · {c.refId}</span>
      </div>
      <div className="flex flex-col">
        {c.rows.map((r) => {
          const v = VERDICT[r.verdict];
          return (
            <div key={r.label} className="border-b border-line-soft px-3 py-2.5 last:border-0">
              <div className="flex items-start gap-2">
                <span className="min-w-0 flex-1 text-[11.8px] font-bold text-t1">{r.label}</span>
                <span className={cn("inline-flex h-[18px] flex-shrink-0 items-center gap-1 rounded-md px-1.5 text-[10px] font-bold", v.cls)}>
                  {v.ico} {v.label}
                </span>
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <div className="rounded-[7px] bg-[var(--accent-soft)] px-2 py-1.5">
                  <span className="block text-[9.5px] font-bold uppercase tracking-wide text-[var(--accent-text)]/70">{c.mineLabel}</span>
                  <span className="block text-[11.5px] font-bold text-[var(--accent-text)]">{r.mine}</span>
                </div>
                <div className="rounded-[7px] bg-surface-2 px-2 py-1.5">
                  <span className="block text-[9.5px] font-bold uppercase tracking-wide text-t4">기준 선례</span>
                  <span className="block text-[11.5px] font-semibold text-t3">{r.ref}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Cites({ cites }: { cites: ChatCite[] }) {
  return (
    <div className="mt-3 flex flex-col gap-1.5">
      <div className="text-[10.5px] font-bold uppercase tracking-wide text-t4">근거 원문</div>
      {cites.map((c, i) => (
        <div key={i} className="rounded-[10px] border border-line bg-white p-2.5">
          <p className="flex gap-1.5 text-[11.8px] leading-relaxed text-t2">
            <Quote size={12} className="mt-0.5 flex-shrink-0 text-t4" />
            {c.quote}
          </p>
          <div className="num mt-1.5 flex flex-wrap items-center gap-1.5 text-[10.5px] text-t4">
            <span className="font-bold text-[var(--accent)]">{c.id}</span>
            <span className="truncate">{c.title}</span>
            <span>· {c.loc}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ContractChat({
  title = "AI에게 물어보기",
  sub,
  greeting,
  bank,
  suggestions,
  attachments = [],
  onRemoveAttachment,
  attachHint,
  height = 460,
  compact = false,
  className,
}: {
  title?: string;
  sub?: string;
  greeting: string;
  bank: ChatAnswer[];
  suggestions: string[];
  attachments?: ChatAttachment[];
  onRemoveAttachment?: (id: string) => void;
  attachHint?: string;
  height?: number;
  /** 좁은 폭(우측 레일)용 — 비교 결과를 표 대신 쌓아서 표시 */
  compact?: boolean;
  className?: string;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "ai", text: greeting }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const ask = (raw: string) => {
    const q = raw.trim();
    if (!q || busy) return;
    setInput("");
    setBusy(true);
    setMsgs((m) => [...m, { role: "user", text: q }, { role: "typing" }]);

    const hit = pick(q, bank);
    const delay = 620 + Math.min(q.length, 40) * 12;
    timers.current.push(
      setTimeout(() => {
        setMsgs((m) => {
          const base = m.filter((x) => x.role !== "typing");
          if (hit) {
            return [...base, { role: "ai", text: hit.text, compare: hit.compare, cites: hit.cites, follow: hit.follow }];
          }
          const names = attachments.length
            ? attachments.map((a) => a.title).slice(0, 2).join(", ") +
              (attachments.length > 2 ? ` 외 ${attachments.length - 2}건` : "")
            : "현재 문서";
          return [
            ...base,
            {
              role: "ai",
              text: `**${names}**를 기준으로 코퍼스 248,391건을 조회했지만, 그 질문에 답할 만한 근거 조항을 충분히 찾지 못했습니다.\n\n프로토타입에서는 아래 질문에 대해 실제 비교 결과를 보여드립니다.`,
              follow: suggestions.slice(0, 3),
            },
          ];
        });
        setBusy(false);
      }, delay),
    );
  };

  const started = msgs.length > 1;

  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-[var(--radius)] border border-line bg-surface shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {/* header */}
      <div className="flex items-center gap-2.5 border-b border-line-soft bg-[linear-gradient(180deg,#f2fafb,#fff)] px-4 py-3">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] bg-[image:var(--accent-grad)] text-white shadow-[0_2px_8px_rgba(15,110,130,.3)]">
          <Sparkles size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold tracking-[-.3px] text-t1">{title}</div>
          {sub && <div className="truncate text-[11.5px] text-t3">{sub}</div>}
        </div>
        <Pill tone="accent" dot>
          선례 대조
        </Pill>
      </div>

      {/* attachments */}
      {(attachments.length > 0 || attachHint) && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-line-soft bg-surface-2 px-3 py-2">
          <span className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide text-t4">
            <Paperclip size={11} /> 첨부 {attachments.length}
          </span>
          {attachments.map((a) => (
            <span
              key={a.id}
              className="inline-flex h-[24px] max-w-[200px] items-center gap-1.5 rounded-full border border-[#d3e8ec] bg-[var(--accent-soft)] pl-1.5 pr-1 text-[11px] font-semibold text-[var(--accent-text)]"
            >
              <FileType type={a.ft} size={14} />
              <span className="truncate">{a.title}</span>
              {onRemoveAttachment && (
                <button
                  onClick={() => onRemoveAttachment(a.id)}
                  className="flex h-[17px] w-[17px] flex-shrink-0 items-center justify-center rounded-full text-[var(--accent-text)] transition hover:bg-[var(--accent)] hover:text-white"
                  aria-label={`${a.title} 첨부 해제`}
                >
                  <X size={11} />
                </button>
              )}
            </span>
          ))}
          {attachments.length === 0 && attachHint && (
            <span className="text-[11px] text-t4">{attachHint}</span>
          )}
        </div>
      )}

      {/* messages */}
      <div ref={scroller} className="overflow-y-auto px-4 py-3.5" style={{ height }}>
        <div className="flex flex-col gap-3.5">
          {msgs.map((m, i) => {
            if (m.role === "typing") {
              return (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[9px] bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Sparkles size={14} />
                  </span>
                  <span className="typing inline-flex items-center gap-1 rounded-[12px] bg-surface-2 px-3.5 py-3">
                    <i /><i /><i />
                  </span>
                </div>
              );
            }
            if (m.role === "user") {
              return (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-[13px] rounded-br-[5px] bg-[var(--accent)] px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-white">
                    {m.text}
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className="flex gap-2.5">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[9px] bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Sparkles size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="rounded-[13px] rounded-tl-[5px] border border-line-soft bg-surface-2 px-3.5 py-3">
                    <RichText text={m.text} />
                    {m.compare && (compact ? <CompareStack c={m.compare} /> : <CompareTable c={m.compare} />)}
                    {m.cites && m.cites.length > 0 && <Cites cites={m.cites} />}
                  </div>
                  {m.follow && m.follow.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.follow.map((f) => (
                        <button
                          key={f}
                          onClick={() => ask(f)}
                          className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-[11.5px] font-semibold text-t2 transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        >
                          {f} <ArrowRight size={11} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* 첫 진입 추천 질문 */}
          {!started && (
            <div className="ml-[38px] flex flex-col gap-1.5">
              <div className="text-[10.5px] font-bold uppercase tracking-wide text-t4">이렇게 물어보세요</div>
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="group flex items-center gap-2 rounded-[10px] border border-line bg-surface px-3 py-2 text-left text-[12.3px] font-medium text-t2 transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-text)]"
                >
                  <Sparkles size={12} className="flex-shrink-0 text-t4 transition group-hover:text-[var(--accent)]" />
                  <span className="flex-1">{s}</span>
                  <ArrowRight size={12} className="flex-shrink-0 text-t4 transition group-hover:text-[var(--accent)]" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* composer */}
      <form
        onSubmit={(e) => { e.preventDefault(); ask(input); }}
        className="flex items-end gap-2 border-t border-line-soft bg-surface px-3 py-2.5"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); }
          }}
          rows={1}
          placeholder="이 계약서에 대해 물어보세요 — 선례와 비교해 답합니다"
          className="max-h-[96px] min-h-[38px] flex-1 resize-none rounded-[10px] border border-line bg-surface-2 px-3 py-2.5 text-[13px] leading-[1.5] text-t1 outline-none transition placeholder:text-t4 focus:border-[var(--accent)] focus:bg-white"
        />
        <button
          type="submit"
          disabled={!input.trim() || busy}
          className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[10px] bg-[var(--accent)] text-white transition hover:bg-[var(--accent-600)] disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-t4"
          aria-label="질문 보내기"
        >
          <Send size={16} />
        </button>
      </form>
      <div className="flex items-center gap-1.5 border-t border-line-soft bg-[#fbfdfd] px-3.5 py-1.5 text-[10.5px] text-t4">
        <CornerDownLeft size={10} /> Enter 전송 · Shift+Enter 줄바꿈 · 답변은 인용된 원문에 근거해 생성됩니다
      </div>
    </section>
  );
}
