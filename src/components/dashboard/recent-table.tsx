"use client";

/* ============================================================
   최근 처리 계약
   ------------------------------------------------------------
   행을 누르면 계약 대장 상세로 갑니다. 표에 나오는 id 는 모두
   계약 대장 코퍼스(contracts.ts)에 실재하는 계약입니다.
   ============================================================ */

import Link from "next/link";
import { FileText, ChevronRight } from "lucide-react";
import { SectionCard, Pill, Tag, FileType } from "@/components/kit";
import { RECENT, type DeptId } from "@/lib/data";

const HEADS = ["계약", "유형", "상대방", "금액", "분류 신뢰도", "상태", ""];

export function RecentTable({ dept }: { dept: DeptId }) {
  const rows = RECENT.filter((r) => dept === "all" || r.dept === dept);

  return (
    <SectionCard
      title="최근 처리 계약"
      icon={<FileText size={17} className="text-[var(--accent)]" />}
      sub="AI가 분류·요약을 마치고 대장에 반영된 최신 문서"
      right={
        <Link
          href="/contracts"
          className="flex items-center gap-1 text-[13px] font-semibold text-t3 transition hover:text-[var(--accent)]"
        >
          계약 대장 전체 <ChevronRight size={14} />
        </Link>
      }
      bodyClass="p-0"
    >
      {rows.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-t4">해당 부문에 최근 처리된 계약이 없습니다</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-[13.5px]">
            <thead>
              <tr>
                {HEADS.map((h, i) => (
                  <th
                    key={h || i}
                    className="whitespace-nowrap border-b border-line-soft bg-surface-2 px-4 py-[11px] text-left text-[12px] font-bold uppercase tracking-[.04em] text-t4 first:pl-5"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="group cursor-pointer transition hover:bg-surface-2">
                  <td className="border-b border-line-soft px-4 py-3 pl-5">
                    <Link href={`/contracts/${r.id}`} className="flex items-center gap-3">
                      <FileType type={r.ft} size={30} />
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-bold text-t1">{r.title}</span>
                        <span className="num mt-0.5 block text-[12px] text-t4">
                          {r.id} · {r.when}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="border-b border-line-soft px-4 py-3">
                    <Link href={`/contracts/${r.id}`} className="flex items-center gap-1.5">
                      <span className="text-t2">{r.type}</span>
                      <Tag className="text-[10.5px]">{r.seg}</Tag>
                    </Link>
                  </td>
                  <td className="border-b border-line-soft px-4 py-3 text-t2">
                    <Link href={`/contracts/${r.id}`}>{r.party}</Link>
                  </td>
                  <td className="num border-b border-line-soft px-4 py-3 font-semibold text-t1">
                    <Link href={`/contracts/${r.id}`}>{r.amount}</Link>
                  </td>
                  <td className="border-b border-line-soft px-4 py-3">
                    <Link href={`/contracts/${r.id}`} className="flex items-center gap-2">
                      <span className="h-[6px] w-12 overflow-hidden rounded-full bg-[#eceef2]">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${r.conf}%`, background: r.conf >= 90 ? "#1e7a52" : "#b0740b" }}
                        />
                      </span>
                      <span className="num text-[12px] font-semibold text-t3">{r.conf}%</span>
                    </Link>
                  </td>
                  <td className="border-b border-line-soft px-4 py-3">
                    <Link href={`/contracts/${r.id}`}>
                      {r.status === "요약완료" ? (
                        <Pill tone="ok">요약완료</Pill>
                      ) : (
                        <Pill tone="warn">검토필요</Pill>
                      )}
                    </Link>
                  </td>
                  <td className="border-b border-line-soft px-4 py-3">
                    <ChevronRight
                      size={16}
                      className="text-line-strong transition group-hover:text-[var(--accent)]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
