import Link from "next/link";
import {
  ScanText, TrendingUp, TrendingDown, FileText, AlertTriangle,
  ArrowRight, Sparkles, ShieldCheck, Clock, ChevronRight, Layers,
} from "lucide-react";
import { Pill, Tag, SectionCard, FileType, Bar } from "@/components/kit";
import { KPIS, RECENT, EXPIRING, TYPE_DIST, PIPELINE, SEG_LABEL } from "@/lib/data";
import { cn } from "@/lib/utils";

function Spark({ data, color }: { data: number[]; color: string }) {
  const w = 76, h = 30, max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const d = "M" + pts.join(" L");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={color} opacity={0.08} />
    </svg>
  );
}

const KPI_ACCENT: Record<string, { ring: string; ico: string }> = {
  accent: { ring: "#0f6e82", ico: "bg-[var(--accent-soft)] text-[var(--accent)]" },
  ok: { ring: "#1e7a52", ico: "bg-[var(--green-soft)] text-[#0a8d3d]" },
  warn: { ring: "#b0740b", ico: "bg-[var(--amber-soft)] text-[#c47a00]" },
  crit: { ring: "#c0392b", ico: "bg-[var(--red-soft)] text-[#d01016]" },
};

export default function DashboardPage() {
  return (
    <>
      {/* header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[23px] font-bold tracking-[-.7px] text-t1">계약 인텔리전스 대시보드</h1>
          <p className="mt-1 text-[13px] text-t3">
            수십만 건의 계약서를 구조화된 데이터로 — 분류·요약·검색 현황을 한눈에 봅니다.
          </p>
        </div>
        <Link
          href="/analyze"
          className="hidden h-[38px] items-center gap-2 rounded-[8px] bg-[var(--accent)] px-4 text-[13.5px] font-semibold text-white shadow-[0_4px_12px_-3px_rgba(15,110,130,.5)] transition hover:bg-[var(--accent-600)] sm:flex"
        >
          <ScanText size={16} /> 계약서 분석 시작
        </Link>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPIS.map((k) => {
          const a = KPI_ACCENT[k.tone];
          return (
            <div key={k.label} className="relative overflow-hidden rounded-[var(--radius)] border border-line bg-surface px-5 py-[18px] shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)]">
              <div className="mb-3 flex items-center gap-2.5 text-[12.5px] font-semibold text-t3">
                <span className={cn("flex h-[30px] w-[30px] items-center justify-center rounded-[9px]", a.ico)}>
                  {k.tone === "warn" ? <Clock size={17} /> : k.tone === "crit" ? <AlertTriangle size={17} /> : k.tone === "ok" ? <ShieldCheck size={17} /> : <FileText size={17} />}
                </span>
                {k.label}
              </div>
              <div className="num text-[27px] font-bold leading-none tracking-[-1px] text-t1">
                {k.value}
                <span className="ml-1 text-[15px] font-semibold text-t3">{k.unit}</span>
              </div>
              <div className="mt-2.5 flex items-center gap-1.5 text-[12px] font-semibold">
                <span className={cn("num inline-flex items-center gap-0.5", k.up ? "text-[#0a9b46]" : "text-[#e0444a]")}>
                  {k.up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {k.delta}
                </span>
                <span className="font-medium text-t4">전월 대비</span>
              </div>
              <div className="absolute bottom-3 right-3.5 opacity-90">
                <Spark data={k.spark} color={a.ring} />
              </div>
            </div>
          );
        })}
      </div>

      {/* alert strip */}
      <div className="flex items-center gap-3.5 rounded-[var(--radius-md)] border border-[var(--red-line)] bg-[linear-gradient(100deg,#fdf1ef,#fdf8f2)] px-[18px] py-3.5">
        <span className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[11px] bg-[var(--red-soft)] text-[var(--red)]">
          <AlertTriangle size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold text-[#a52f22]">울산 물류창고 임대차 — 자동갱신 통지기한 D-14</div>
          <div className="mt-0.5 text-[12.5px] text-t3">기한 내 미통지 시 동일 조건으로 1년 자동연장됩니다. 담당자 확인이 필요합니다.</div>
        </div>
        <button className="flex h-8 items-center gap-1 rounded-[8px] border border-[var(--red-line)] bg-white px-3 text-[12.5px] font-semibold text-[var(--red)] transition hover:bg-[var(--red-soft)]">
          바로 확인 <ArrowRight size={14} />
        </button>
      </div>

      {/* main grid */}
      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* left column */}
        <div className="flex flex-col gap-[18px]">
          {/* pipeline */}
          <SectionCard
            title="AI 처리 파이프라인"
            icon={<Layers size={17} className="text-[var(--accent)]" />}
            sub={`입력 문서가 구조화 데이터로 변환되는 ${PIPELINE.length}단계`}
            right={<Pill tone="ok" dot>실시간 가동</Pill>}
          >
            <div className="flex items-center gap-0 overflow-x-auto pb-1">
              {PIPELINE.map((p, i) => (
                <div key={p.key} className="flex flex-shrink-0 items-center">
                  <div className="flex flex-col items-center gap-1.5 px-1">
                    <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[var(--accent-soft)] text-[12px] font-extrabold text-[var(--accent-text)]">
                      {p.key}
                    </span>
                    <div className="text-center">
                      <div className="text-[12.5px] font-bold text-t1">{p.label}</div>
                      <div className="mt-0.5 whitespace-nowrap text-[11px] text-t4">{p.meta}</div>
                    </div>
                  </div>
                  {i < PIPELINE.length - 1 && <ChevronRight size={18} className="mx-1.5 mb-6 flex-shrink-0 text-line-strong" />}
                </div>
              ))}
            </div>
          </SectionCard>

          {/* recent contracts */}
          <SectionCard
            title="최근 처리 계약"
            icon={<FileText size={17} className="text-[var(--accent)]" />}
            sub="AI가 분류·요약을 완료한 최신 문서"
            right={<Link href="/search" className="flex items-center gap-1 text-[12.5px] font-semibold text-t3 transition hover:text-[var(--accent)]">전체 보기 <ChevronRight size={14} /></Link>}
            bodyClass="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0 text-[13px]">
                <thead>
                  <tr>
                    {["계약", "유형", "상대방", "금액", "신뢰도", "상태"].map((h) => (
                      <th key={h} className="whitespace-nowrap border-b border-line-soft bg-surface-2 px-4 py-[11px] text-left text-[11px] font-bold uppercase tracking-[.04em] text-t4 first:pl-5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RECENT.map((r) => (
                    <tr key={r.id} className="cursor-pointer transition hover:bg-surface-2">
                      <td className="border-b border-line-soft px-4 py-3 pl-5">
                        <div className="flex items-center gap-3">
                          <FileType type={r.ft} size={30} />
                          <div className="min-w-0">
                            <div className="truncate text-[13.5px] font-bold text-t1">{r.title}</div>
                            <div className="num mt-0.5 text-[11.5px] text-t4">{r.id} · {r.when}</div>
                          </div>
                        </div>
                      </td>
                      <td className="border-b border-line-soft px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-t2">{r.type}</span>
                          <Tag className="text-[10px]">{r.seg}</Tag>
                        </div>
                      </td>
                      <td className="border-b border-line-soft px-4 py-3 text-t2">{r.party}</td>
                      <td className="num border-b border-line-soft px-4 py-3 font-semibold text-t1">{r.amount}</td>
                      <td className="border-b border-line-soft px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-[5px] w-12 overflow-hidden rounded-full bg-[#eceef2]">
                            <div className="h-full rounded-full" style={{ width: `${r.conf}%`, background: r.conf >= 90 ? "#1e7a52" : "#b0740b" }} />
                          </div>
                          <span className="num text-[11.5px] font-semibold text-t3">{r.conf}%</span>
                        </div>
                      </td>
                      <td className="border-b border-line-soft px-4 py-3">
                        {r.status === "요약완료" ? <Pill tone="ok">요약완료</Pill> : <Pill tone="warn">검토필요</Pill>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* type distribution */}
          <SectionCard
            title="계약 유형 분포"
            icon={<Layers size={17} className="text-[var(--accent)]" />}
            sub="세그먼트별 자동 분류 결과 (S1 대량정형 · S2 중량반정형 · S3 소량고액)"
          >
            <div className="flex flex-col gap-3">
              <div className="flex h-3 overflow-hidden rounded-full">
                {TYPE_DIST.map((t) => (
                  <div key={t.name} style={{ width: `${t.pct}%`, background: t.color }} title={`${t.name} ${t.pct}%`} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-3">
                {TYPE_DIST.map((t) => (
                  <div key={t.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 flex-shrink-0 rounded-[3px]" style={{ background: t.color }} />
                    <span className="truncate text-[12.5px] text-t2">{t.name}</span>
                    <span className="ml-auto flex items-center gap-1.5">
                      <Tag className="text-[9.5px]">{t.seg}</Tag>
                      <span className="num text-[12px] font-bold text-t1">{t.pct}%</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

        {/* right rail */}
        <div className="flex flex-col gap-[18px]">
          {/* expiring */}
          <SectionCard
            title="만료·갱신 임박"
            icon={<Clock size={17} className="text-[var(--amber)]" />}
            sub="D-90 이내 조치 필요 계약"
            bodyClass="p-0"
          >
            <div className="flex flex-col">
              {EXPIRING.map((e) => (
                <div key={e.title} className="flex cursor-pointer items-start gap-3 border-b border-line-soft px-5 py-3.5 transition last:border-0 hover:bg-surface-2">
                  <div className={cn(
                    "num flex h-11 w-11 flex-shrink-0 flex-col items-center justify-center rounded-[11px] text-center",
                    e.risk === "crit" ? "bg-[var(--red-soft)] text-[var(--red)]" : e.risk === "warn" ? "bg-[var(--amber-soft)] text-[var(--amber)]" : "bg-[var(--green-soft)] text-[#0a6b42]",
                  )}>
                    <span className="text-[9px] font-bold leading-none opacity-70">D-</span>
                    <span className="text-[15px] font-extrabold leading-none">{e.dday}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-bold text-t1">{e.title}</span>
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-t3">{e.party} · {e.renew}</div>
                    <div className="mt-1 text-[11.5px] leading-snug text-t4">{e.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* AI insight */}
          <div className="overflow-hidden rounded-[var(--radius)] border border-[#cfe6eb] bg-[linear-gradient(180deg,#f2fafb,#fff_45%)] shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2.5 border-b border-[#dcecef] px-5 py-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[image:var(--accent-grad)] text-white shadow-[0_2px_8px_rgba(15,110,130,.3)]">
                <Sparkles size={17} />
              </span>
              <div>
                <div className="text-[14px] font-bold text-t1">AI 인사이트</div>
                <div className="text-[11px] font-medium text-t3">코퍼스 전체 스캔 · 08-08 09:41</div>
              </div>
            </div>
            <div className="flex flex-col gap-3 p-5 text-[13px] leading-relaxed text-t2">
              <p>
                손해배상 한도가 계약금액의 <b className="font-bold text-[#a52f22]">100%를 초과</b>하는 계약이 <b className="num font-bold text-t1">43건</b> 발견되었습니다. 사내 표준(30%) 대비 과도한 노출로 재협상 검토를 권고합니다.
              </p>
              <div className="rounded-[10px] border border-line bg-white/70 p-3">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-t4">이번 주 자동 분류 요약</div>
                {[
                  { l: "신규 인입", v: "1,204건", w: 100, t: "accent" as const },
                  { l: "고신뢰 자동확정(≥90%)", v: "1,038건", w: 86, t: "ok" as const },
                  { l: "휴먼 검토 대기(<90%)", v: "166건", w: 14, t: "warn" as const },
                ].map((row) => (
                  <div key={row.l} className="mb-2.5 last:mb-0">
                    <div className="mb-1 flex justify-between text-[11.5px]">
                      <span className="text-t3">{row.l}</span>
                      <span className="num font-bold text-t1">{row.v}</span>
                    </div>
                    <Bar value={row.w} tone={row.t} />
                  </div>
                ))}
              </div>
              <Link href="/search" className="flex items-center justify-center gap-1.5 rounded-[9px] bg-[var(--accent)] py-2.5 text-[13px] font-semibold text-white transition hover:bg-[var(--accent-600)]">
                리스크 계약 검색하기 <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
