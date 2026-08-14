"use client";

/* ============================================================
   계약서 원문 패널
   ------------------------------------------------------------
   결과 화면 좌측에서 분석 대상 문서를 보여줍니다.
   PDF 원문과 OCR 판독문을 탭으로 전환해, AI가 뽑아낸 값을
   담당자가 원문과 대조할 수 있게 합니다.

   previewUrl 이 있으면 원본 PDF 를 그대로 띄우고, 없으면 문서 정보
   카드와 OCR 판독문으로 대체합니다.
   (구 MVP 설계의 "PDF 미리보기 실패 시 대체" 방침과 같습니다)
   ============================================================ */

import { useState } from "react";
import { ExternalLink, FileText, ScanText, Search } from "lucide-react";
import { FileType } from "@/components/kit";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";

export function DocumentViewer({
  file,
  ocrText,
  previewUrl,
  className,
}: {
  file: { name: string; size: string; pages: number; ft: string };
  ocrText: string;
  previewUrl?: string;
  className?: string;
}) {
  const [tab, setTab] = useState<"pdf" | "ocr">("pdf");
  const [q, setQ] = useState("");

  const lines = ocrText.split("\n\n");
  const hit = (t: string) => q.trim() !== "" && t.includes(q.trim());
  const hitCount = q.trim() === "" ? 0 : lines.filter(hit).length;

  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-[var(--radius)] border border-line bg-surface shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {/* 헤더 + 탭 */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-line-soft px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[.09em] text-t4">Source Document</div>
          <div className="truncate text-[14px] font-bold text-t1">{file.name}</div>
          <div className="num mt-0.5 text-[11px] text-t4">
            {file.pages}페이지 · {file.size} · 스캔 PDF
          </div>
        </div>
        <div className="flex rounded-[9px] bg-surface-3 p-[3px]">
          {([
            { k: "pdf", l: "PDF 원문", ico: <FileText size={13} /> },
            { k: "ocr", l: "OCR 텍스트", ico: <ScanText size={13} /> },
          ] as const).map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={cn(
                "flex h-[30px] items-center gap-1.5 rounded-[7px] px-3 text-[12px] font-bold transition",
                tab === t.k ? "bg-white text-[var(--accent-text)] shadow-sm" : "text-t3 hover:text-t1",
              )}
            >
              {t.ico} {t.l}
            </button>
          ))}
        </div>
      </div>

      {tab === "pdf" ? (
        previewUrl ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <iframe
              title="계약서 원문 미리보기"
              src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`}
              className="min-h-0 w-full flex-1 bg-surface-2"
            />
            <div className="flex items-center gap-2 border-t border-line-soft bg-surface-2 px-4 py-2">
              <span className="num text-[11px] text-t4">{file.pages}페이지 · 스크롤해 전체 확인</span>
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-auto flex h-7 items-center gap-1.5 rounded-[7px] border border-line bg-surface px-2.5 text-[11.5px] font-semibold text-t2 transition hover:text-t1"
              >
                <ExternalLink size={12} /> 새 탭에서 열기
              </a>
              <button
                onClick={() => setTab("ocr")}
                className="flex h-7 items-center gap-1.5 rounded-[7px] border border-line bg-surface px-2.5 text-[11.5px] font-semibold text-t2 transition hover:text-t1"
              >
                <ScanText size={12} /> OCR 텍스트
              </button>
            </div>
          </div>
        ) : (
          /* 원본 파일이 없을 때 — 문서 정보와 조항 미리보기로 대체 */
          <div className="flex flex-1 flex-col items-center gap-4 bg-surface-2 px-5 py-8">
            <FileType type={file.ft} size={58} />
            <div className="text-center">
              <div className="text-[14px] font-bold text-t1">{file.name}</div>
              <div className="num mt-1 text-[12px] text-t4">{file.pages}페이지 · {file.size}</div>
            </div>
            <p className="max-w-[320px] text-center text-[12px] leading-relaxed text-t3">
              프로토타입에는 원본 PDF가 포함되어 있지 않습니다. 실제 연동 시 이 자리에 스캔 원문이
              표시되며, 지금은 <b className="font-bold text-t2">OCR 텍스트</b> 탭에서 판독 결과를 확인할 수 있습니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setTab("ocr")}
                className="flex h-9 items-center gap-1.5 rounded-[9px] bg-[var(--accent)] px-3.5 text-[12.5px] font-bold text-white transition hover:bg-[var(--accent-600)]"
              >
                <ScanText size={14} /> OCR 텍스트 보기
              </button>
              <button
                onClick={() => toast("원본 파일 열람은 프로토타입 범위 밖입니다")}
                className="flex h-9 items-center gap-1.5 rounded-[9px] border border-line bg-surface px-3.5 text-[12.5px] font-semibold text-t2 transition hover:bg-surface-3"
              >
                <FileText size={14} /> 원본 열기
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-line-soft bg-surface-2 px-4 py-2">
            <Search size={13} className="flex-shrink-0 text-t4" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="판독문에서 찾기 — 예: 손해배상"
              className="h-7 min-w-0 flex-1 bg-transparent text-[12px] text-t1 outline-none placeholder:text-t4"
            />
            <span className="num flex-shrink-0 text-[11px] text-t4">
              {q.trim() === "" ? `${lines.length}개 문단` : `${hitCount}건 일치`}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {lines.map((t, i) => (
              <p
                key={i}
                className={cn(
                  "mb-2.5 rounded-[8px] px-2 py-1.5 text-[12.5px] leading-relaxed transition",
                  hit(t) ? "bg-[var(--accent-soft)] text-[var(--accent-text)]" : "text-t2",
                  i === 0 && "text-[13.5px] font-bold text-t1",
                )}
              >
                {t}
              </p>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
