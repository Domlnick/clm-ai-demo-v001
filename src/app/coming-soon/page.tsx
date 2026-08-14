"use client";

/* ============================================================
   프로토타입 범위 밖 안내
   ------------------------------------------------------------
   "계약 자산" 메뉴(계약 대장·협상 플레이북·리스크 관리 등)는 아직
   설계 확정 전이라 화면 접근을 막아 두었습니다. proxy.ts 가 해당
   경로를 이 화면으로 돌립니다.
   ============================================================ */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Construction, LayoutGrid, ScanText } from "lucide-react";
import { blockedLabel } from "@/lib/blocked-routes";
import { topicParticle } from "@/lib/utils";

const SHORTCUTS = [
  { href: "/analyze", label: "계약서 분석·요약", desc: "샘플 계약서로 OCR·분류·플레이북 대조·요약을 시연합니다", ico: <ScanText size={17} /> },
  { href: "/", label: "대시보드", desc: "처리 파이프라인과 계약 현황 요약", ico: <LayoutGrid size={17} /> },
];

export default function ComingSoonPage() {
  const pathname = usePathname();
  /* 주소는 그대로 유지되므로 경로에서 화면 이름을 읽습니다 */
  const from = blockedLabel(pathname);

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col items-center gap-5 rounded-[var(--radius)] border border-line bg-surface px-6 py-14 text-center shadow-[var(--shadow-card)]">
      <span className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-surface-3 text-t3">
        <Construction size={30} />
      </span>

      <div>
        <h1 className="text-[19px] font-bold tracking-[-.4px] text-t1">
          {from ? `${from}${topicParticle(from)} 프로토타입 범위 밖입니다` : "프로토타입 범위 밖의 화면입니다"}
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-t3">
          이번 프로토타입은 계약서 한 건을 처리하는 흐름에 집중했습니다.
          <br />
          아래 화면에서 그 과정을 확인하실 수 있습니다.
        </p>
      </div>

      <div className="mt-1 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
        {SHORTCUTS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex flex-col gap-1.5 rounded-[12px] border border-line bg-surface-2 px-4 py-3.5 text-left transition hover:border-[var(--accent)] hover:bg-surface"
          >
            <span className="flex items-center gap-2 text-[var(--accent)]">{s.ico}</span>
            <span className="flex items-center gap-1 text-[13.5px] font-bold text-t1">
              {s.label} <ArrowRight size={13} className="text-t4" />
            </span>
            <span className="text-[11.5px] leading-snug text-t4">{s.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
