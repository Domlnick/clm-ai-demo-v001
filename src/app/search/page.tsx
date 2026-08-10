"use client";

import { useState } from "react";
import {
  Search, Sparkles, ArrowRight, Hash, FileText, FolderTree, Compass,
  Quote, ChevronRight, Clock, X, Layers, Database, Paperclip, Check,
} from "lucide-react";
import { Pill, Tag, FileType, ScoreRing, SectionCard } from "@/components/kit";
import { ContractChat } from "@/components/contract-chat";
import {
  SEARCH_SCOPES, HASHTAGS, SEARCH_SUGGESTIONS, SEARCH_ANSWER,
  SEARCH_RESULTS, SEG_LABEL, SEARCH_QA, SEARCH_QA_SUGGESTIONS,
} from "@/lib/data";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";

const SCOPE_ICON: Record<string, React.ReactNode> = {
  similar: <Compass size={14} />,
  clause: <Layers size={14} />,
  doc: <FileText size={14} />,
  project: <FolderTree size={14} />,
  hashtag: <Hash size={14} />,
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [scopes, setScopes] = useState<string[]>(["similar", "clause", "doc"]);
  const [recent, setRecent] = useState<string[]>([]);
  /* AI 챗에 첨부한 계약서 */
  const [attached, setAttached] = useState<string[]>([]);

  const toggleAttach = (id: string) =>
    setAttached((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const attachments = SEARCH_RESULTS.filter((r) => attached.includes(r.id)).map((r) => ({
    id: r.id,
    title: r.title,
    ft: r.ft,
  }));

  const runSearch = (q: string) => {
    const t = q.trim();
    if (!t) return;
    setQuery(t);
    setSubmitted(t);
    setRecent((r) => [t, ...r.filter((x) => x !== t)].slice(0, 6));
  };

  const toggleScope = (id: string) =>
    setScopes((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const hashtagActive = scopes.includes("hashtag");

  return (
    <>
      {/* ===== HERO ===== */}
      <div className="relative overflow-hidden rounded-[var(--radius)] bg-[linear-gradient(120deg,#0b5566_0%,#0f6e82_46%,#1a9ab0_100%)] px-6 pb-5 pt-[22px] shadow-[0_14px_34px_-18px_rgba(15,110,130,.75)]">
        <div className="pointer-events-none absolute -right-[70px] -top-[90px] h-[330px] w-[330px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,.17),transparent_62%)]" />
        <div className="relative z-10 mb-3.5 flex items-center gap-2.5">
          <span className="inline-flex h-6 items-center gap-1.5 rounded-[7px] bg-white/[.16] px-2.5 text-[11.5px] font-bold text-white">
            <Sparkles size={13} /> AI 시맨틱 검색 · RAG
          </span>
          <span className="text-[12.5px] font-medium text-white/75">248,391건의 계약서를 의미로 검색합니다 — 조항·유사사례·해쉬태그까지</span>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); runSearch(query); }}
          className="relative z-10 flex items-center gap-2.5 rounded-[13px] bg-white p-2 pl-4 shadow-[0_10px_26px_-14px_rgba(12,50,60,.6)]"
        >
          <Search size={19} className="flex-shrink-0 text-[var(--accent)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="자연어로 검색 — 예: 손해배상 한도가 계약금액을 초과하는 용역계약"
            className="h-[34px] min-w-0 flex-1 bg-transparent text-[15px] font-medium text-t1 outline-none placeholder:font-normal placeholder:text-t4"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(""); setSubmitted(""); }} className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-t4 hover:bg-surface-3 hover:text-t2">
              <X size={16} />
            </button>
          )}
          <button type="submit" className="flex h-[38px] flex-shrink-0 items-center gap-1.5 rounded-[10px] bg-[var(--accent)] px-[18px] text-[13.5px] font-bold text-white transition hover:bg-[var(--accent-600)]">
            <Search size={15} /> 검색
          </button>
        </form>

        <div className="relative z-10 mt-3.5 flex flex-wrap items-center gap-2">
          <span className="mr-0.5 text-[11.5px] font-bold tracking-wide text-white/60">추천 질의</span>
          {SEARCH_SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => runSearch(s)} className="h-7 whitespace-nowrap rounded-full border border-white/30 bg-white/10 px-3 text-[12px] font-semibold text-white transition hover:border-white hover:bg-white hover:text-[var(--accent-text)]">
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ===== SCOPE CHIPS ===== */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="mr-0.5 text-[11px] font-bold uppercase tracking-[.06em] text-t4">검색 범위</span>
        {SEARCH_SCOPES.map((sc) => {
          const on = scopes.includes(sc.id);
          return (
            <button
              key={sc.id}
              onClick={() => toggleScope(sc.id)}
              className={cn(
                "inline-flex h-[30px] items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold transition",
                on ? "border-[#bcd9e0] bg-[var(--accent-soft)] text-[var(--accent-text)]" : "border-line bg-surface text-t3 hover:border-line-strong hover:text-t1",
              )}
            >
              <span className="h-2 w-2 rounded-[3px]" style={{ background: sc.sw }} />
              {SCOPE_ICON[sc.id]}
              {sc.label}
              <span className={cn("num rounded-[5px] px-1.5 text-[10.5px] font-bold leading-[15px]", on ? "bg-[#cbe5ea] text-[var(--accent-text)]" : "bg-surface-3 text-t4")}>
                {sc.n.toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>

      {/* ===== HASHTAG ROW (when hashtag scope on) ===== */}
      {hashtagActive && (
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-line bg-surface px-4 py-3.5 shadow-[var(--shadow-card)]">
          <span className="mr-1 flex items-center gap-1.5 text-[11.5px] font-bold text-t4"><Hash size={13} /> 인기 해쉬태그</span>
          {HASHTAGS.map((h) => (
            <button
              key={h}
              onClick={() => runSearch(`#${h}`)}
              className={cn(
                "inline-flex h-[26px] items-center gap-0.5 rounded-full border px-[10px] text-[12px] font-semibold transition",
                submitted === `#${h}` ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[#d3e8ec] bg-[var(--accent-soft)] text-[var(--accent-text)] hover:bg-[var(--accent)] hover:text-white",
              )}
            >
              <span className="opacity-60">#</span>{h}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1fr)_336px] xl:items-start">
        {/* ===== MAIN COLUMN ===== */}
        <div className="flex flex-col gap-[18px]">
          {submitted ? (
            <>
              {/* AI answer */}
              <div className="overflow-hidden rounded-[var(--radius)] border border-[#cfe6eb] bg-[linear-gradient(180deg,#f2fafb,#fff_38%)] shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-2.5 border-b border-[#dcecef] px-5 py-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[image:var(--accent-grad)] text-white shadow-[0_2px_8px_rgba(15,110,130,.3)]">
                    <Sparkles size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[14px] font-bold text-t1">AI 요약 답변</div>
                    <div className="text-[11.5px] text-t3">&ldquo;{submitted}&rdquo; · 근거 {SEARCH_ANSWER.evidence.length}건 인용</div>
                  </div>
                  <Pill tone="accent" dot>RAG 생성</Pill>
                </div>
                <div className="px-5 pb-4 pt-4">
                  <p className="text-[14px] font-medium leading-[1.72] text-t1" dangerouslySetInnerHTML={{ __html: mdBold(SEARCH_ANSWER.lead) }} />
                  <div className="mt-3.5 flex flex-col gap-2.5">
                    {SEARCH_ANSWER.evidence.map((ev) => (
                      <div key={ev.n} className="flex cursor-pointer gap-3 rounded-[11px] border border-line bg-white p-3 transition hover:border-[#c9dde2] hover:shadow-[0_4px_14px_-8px_rgba(15,110,130,.4)]">
                        <span className="num flex h-[21px] w-[21px] flex-shrink-0 items-center justify-center rounded-md bg-[var(--accent)] text-[11px] font-bold text-white">{ev.n}</span>
                        <div className="min-w-0 flex-1">
                          <p className="flex gap-1.5 text-[12.8px] leading-relaxed text-t2"><Quote size={13} className="mt-1 flex-shrink-0 text-t4" />{ev.q}</p>
                          <div className="num mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-t4">
                            <span className="font-bold text-t3">{ev.file}</span> · {ev.loc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 border-t border-[#eaf1f2] bg-[#fbfdfd] px-5 py-3 text-[11.5px] text-t4">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-t3">
                    신뢰도
                    <span className="h-[5px] w-[66px] overflow-hidden rounded-full bg-[#e2ecee]">
                      <span className="block h-full rounded-full bg-[linear-gradient(90deg,#0f6e82,#1e7a52)]" style={{ width: `${SEARCH_ANSWER.confidence}%` }} />
                    </span>
                    <span className="num font-bold text-t2">{SEARCH_ANSWER.confidence}%</span>
                  </span>
                  <span>·</span>
                  <span>답변은 인용된 원문에 근거해 생성되었습니다</span>
                  <button onClick={() => toast("원문 계약서를 새 탭에서 엽니다 (프로토타입)")} className="ml-auto inline-flex items-center gap-1 font-semibold text-[var(--accent)]">
                    원문 확인 <ArrowRight size={12} />
                  </button>
                </div>
              </div>

              {/* result list */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 px-0.5 pt-0.5">
                  <div className="flex items-baseline gap-2 text-[14.5px] font-bold text-t1">
                    검색 결과 <em className="num text-[15px] not-italic text-[var(--accent)]">{SEARCH_RESULTS.length}</em>건
                    <span className="text-[11.5px] font-medium text-t4">· 벡터 유사도순</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() =>
                        setAttached((a) =>
                          a.length === SEARCH_RESULTS.length ? [] : SEARCH_RESULTS.map((r) => r.id),
                        )
                      }
                      className="flex h-[30px] items-center gap-1.5 rounded-[8px] border border-line bg-surface px-3 text-[12px] font-semibold text-t2 transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      <Paperclip size={13} />
                      {attached.length === SEARCH_RESULTS.length ? "첨부 전체 해제" : "AI에 전체 첨부"}
                    </button>
                    <span className="num text-[11.5px] text-t4">0.42초</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-2.5">
                  {SEARCH_RESULTS.map((r, i) => {
                    const on = attached.includes(r.id);
                    return (
                    <div key={r.id} className={cn("group relative flex cursor-pointer gap-3.5 overflow-hidden rounded-[var(--radius-md)] border bg-surface p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-[#c9dde2] hover:shadow-[0_10px_26px_-16px_rgba(15,110,130,.5)]", on ? "border-[var(--accent)]" : "border-line")}>
                      <span className={cn("absolute inset-y-0 left-0 w-[3px] bg-[var(--accent)] transition", on ? "opacity-100" : "opacity-0 group-hover:opacity-100")} />
                      <div className="flex w-[52px] flex-shrink-0 flex-col items-center gap-1.5">
                        <ScoreRing value={r.score} />
                        <span className="num text-[10px] font-bold uppercase tracking-wide text-t4">#{i + 1}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <FileType type={r.ft} size={19} />
                          <span className="text-[14px] font-bold leading-snug tracking-[-.25px] text-t1">{r.title}</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-t4">
                          <Pill tone="accent" className="h-[19px] text-[10.5px]">{r.type}</Pill>
                          <Tag className="h-[19px] text-[10px]">{r.seg} · {SEG_LABEL[r.seg]}</Tag>
                          <span>· {r.party}</span>
                          <span className="num">· {r.date}</span>
                          <span className="num inline-flex items-center gap-1 text-t4">· <FolderTree size={11} /> {r.path}</span>
                        </div>
                        <div className="mt-2.5 rounded-[0_9px_9px_0] border border-line-soft border-l-[3px] border-l-[#bcd9e0] bg-surface-2 px-3 py-2.5 text-[12.7px] leading-[1.66] text-t2">
                          <span className="num mr-1.5 rounded-[5px] border border-line bg-white px-1.5 py-px text-[10.5px] font-bold text-t4">{r.page}</span>
                          <span dangerouslySetInnerHTML={{ __html: r.snippet }} />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {r.tags.map((t) => (
                            <button key={t} onClick={(e) => { e.stopPropagation(); runSearch(`#${t}`); }} className="inline-flex h-[22px] items-center gap-0.5 rounded-full bg-[var(--accent-soft)] px-2 text-[11px] font-semibold text-[var(--accent-text)] transition hover:bg-[var(--accent)] hover:text-white">
                              <span className="opacity-60">#</span>{t}
                            </button>
                          ))}
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleAttach(r.id); }}
                            className={cn(
                              "ml-auto inline-flex h-[26px] items-center gap-1.5 rounded-[8px] border px-2.5 text-[11.5px] font-bold transition",
                              on
                                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                                : "border-line bg-surface text-t3 hover:border-[var(--accent)] hover:text-[var(--accent)]",
                            )}
                            title={on ? "AI 챗 첨부 해제" : "AI 챗에 이 계약서 첨부"}
                          >
                            {on ? <><Check size={12} /> 첨부됨</> : <><Paperclip size={12} /> AI에 첨부</>}
                          </button>
                          <span className="num flex items-center gap-1 text-[11px] font-semibold text-t3 transition group-hover:text-[var(--accent)]">
                            청크 {r.chunks}개 <ChevronRight size={13} />
                          </span>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* idle: folder browse */
            <SectionCard title="계약 코퍼스 둘러보기" icon={<Database size={17} className="text-[var(--accent)]" />} sub="검색어를 입력하거나, 폴더·해쉬태그로 탐색을 시작하세요">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { id: "구매", nm: "구매·원자재", desc: "원유·촉매·설비 등 공급계약", n: "12,380", c: "#0f6e82" },
                  { id: "임대차", nm: "주유소 임대차", desc: "부지·건물 임대차 및 갱신", n: "4,820", c: "#1a9ab0" },
                  { id: "용역", nm: "용역·유지보수", desc: "IT·설비·보안 위탁 용역", n: "8,510", c: "#3bb4c7" },
                  { id: "폴사인", nm: "폴사인·상표", desc: "브랜드 사용·위탁운영", n: "5,850", c: "#6dccdb" },
                  { id: "NDA", nm: "비밀유지(NDA)", desc: "기밀유지 및 정보보호", n: "2,210", c: "#8a5cc0" },
                  { id: "고액", nm: "원유·용선·EPC", desc: "소량 고액 비정형 계약", n: "249", c: "#c8892b" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => runSearch(f.nm)}
                    className="flex flex-col gap-2.5 rounded-[var(--radius-md)] border border-line bg-surface p-4 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-[#c9dde2] hover:shadow-[0_10px_26px_-16px_rgba(15,110,130,.5)]"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] text-white" style={{ background: f.c }}>
                        <FolderTree size={18} />
                      </span>
                      <div>
                        <div className="text-[14px] font-bold tracking-[-.25px] text-t1">{f.nm}</div>
                        <div className="num text-[10.5px] font-bold text-t4">{f.n}건</div>
                      </div>
                    </div>
                    <div className="text-[12px] leading-snug text-t3">{f.desc}</div>
                  </button>
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        {/* ===== RIGHT RAIL ===== */}
        <div className="flex flex-col gap-4 [&>*]:shrink-0 xl:sticky xl:top-3 xl:max-h-[calc(100vh-24px)] xl:overflow-y-auto xl:pr-0.5">
          {/* AI 챗 — 검색 결과를 첨부해 이어서 추론 */}
          <ContractChat
            title="AI와 이어서 추론하기"
            sub={attached.length ? `계약서 ${attached.length}건 첨부됨` : "결과에서 계약서를 첨부해 보세요"}
            greeting={
              "검색 결과에서 계약서를 첨부하시면 그 문서들을 근거로 답하겠습니다.\n" +
              "여러 건을 함께 올리면 조항끼리 비교해서 정리해 드립니다."
            }
            bank={SEARCH_QA}
            suggestions={SEARCH_QA_SUGGESTIONS}
            attachments={attachments}
            onRemoveAttachment={(id) => toggleAttach(id)}
            attachHint="아래 결과의 ‘AI에 첨부’를 눌러 추가하세요"
            height={360}
            compact
          />

          {/* stats */}
          <SectionCard title="인덱스 현황" icon={<Database size={16} className="text-[var(--accent)]" />} bodyClass="p-4">
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { l: "인덱싱 문서", v: "248,391" },
                { l: "조항 청크", v: "3.8M" },
                { l: "벡터 차원", v: "1,024" },
                { l: "평균 응답", v: "0.4s" },
              ].map((s) => (
                <div key={s.l} className="rounded-[10px] border border-line-soft bg-surface-2 px-3 py-2.5">
                  <div className="text-[10.5px] font-semibold text-t4">{s.l}</div>
                  <div className="num mt-0.5 text-[17px] font-bold tracking-[-.5px] text-t1">{s.v}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* scope breakdown */}
          <SectionCard title="검색 범위별 매칭" icon={<Layers size={16} className="text-[var(--accent)]" />} bodyClass="p-4">
            <div className="flex flex-col gap-3">
              {SEARCH_SCOPES.map((sc) => {
                const on = scopes.includes(sc.id);
                const pct = Math.min(100, Math.round((sc.n / 248391) * 100 * 60));
                return (
                  <div key={sc.id} className={cn("cursor-pointer", !on && "opacity-45")} onClick={() => toggleScope(sc.id)}>
                    <div className="mb-1 flex items-center justify-between text-[12px]">
                      <span className="flex items-center gap-1.5 font-semibold text-t2">{SCOPE_ICON[sc.id]}{sc.label}</span>
                      <span className="num font-bold text-t3">{sc.n.toLocaleString()}</span>
                    </div>
                    <div className="h-[5px] overflow-hidden rounded-full bg-[#eef2f3]">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(8, pct)}%`, background: sc.sw }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* hashtag cloud */}
          <SectionCard title="자주 쓰는 해쉬태그" icon={<Hash size={16} className="text-[var(--accent)]" />} bodyClass="p-4">
            <div className="flex flex-wrap gap-1.5">
              {HASHTAGS.slice(0, 10).map((h) => (
                <button key={h} onClick={() => runSearch(`#${h}`)} className="inline-flex h-[26px] items-center gap-0.5 rounded-full border border-[#d3e8ec] bg-[var(--accent-soft)] px-[10px] text-[12px] font-semibold text-[var(--accent-text)] transition hover:bg-[var(--accent)] hover:text-white">
                  <span className="opacity-60">#</span>{h}
                </button>
              ))}
            </div>
          </SectionCard>

          {/* recent queries */}
          <SectionCard title="최근 검색" icon={<Clock size={16} className="text-[var(--accent)]" />} bodyClass="p-3">
            {recent.length ? (
              <div className="flex flex-col">
                {recent.map((q) => (
                  <button key={q} onClick={() => runSearch(q)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-[12.3px] text-t2 transition hover:bg-surface-2 hover:text-t1">
                    <Clock size={13} className="flex-shrink-0 text-t4" />
                    <span className="truncate">{q}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-1 py-1 text-[11.5px] text-t4">검색 기록이 여기에 표시됩니다.</p>
            )}
          </SectionCard>
        </div>
      </div>
    </>
  );
}

function mdBold(s: string) {
  return s.replace(/\*\*(.+?)\*\*/g, '<b class="font-bold text-[#0a4e5d]">$1</b>');
}
