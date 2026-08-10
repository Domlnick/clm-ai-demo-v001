/* ============================================================
   브랜드 마크 — GS칼텍스 공식 CI 에셋 사용
   ------------------------------------------------------------
   원본: public/brand/gs-caltex.jpeg (738x216, 흰 배경)
   심볼 영역은 좌측 216x216 정사각 구간이라, BrandMark는 그 부분만
   잘라 쓰고 BrandLockup은 심볼+워드마크 전체를 씁니다.
   ============================================================ */

import Image from "next/image";

const SRC = "/brand/gs-caltex.jpeg";
const W = 738;
const H = 216;
/** 워드마크를 뺀 심볼 영역의 가로 비율 */
const SYMBOL_RATIO = 216 / W;

export const BRAND = {
  blue: "#1a52a8",
  orange: "#ef7d00",
  green: "#3aa935",
};

/** 심볼만 (사이드바·아바타 등 좁은 자리) */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <span
      className="relative flex flex-shrink-0 overflow-hidden bg-white"
      style={{ width: size, height: size }}
    >
      <Image
        src={SRC}
        alt=""
        width={W}
        height={H}
        priority
        style={{ width: size / SYMBOL_RATIO, height: "auto", maxWidth: "none" }}
      />
    </span>
  );
}

/** 헤더용 — 공식 로고 + 제품명 */
export function BrandLockup({ compact = false }: { compact?: boolean }) {
  if (compact) return <BrandMark size={28} />;
  return (
    <span className="flex items-center gap-2.5">
      <Image
        src={SRC}
        alt="GS칼텍스"
        width={W}
        height={H}
        priority
        className="h-[26px] w-auto"
      />
      <span className="h-[26px] w-px bg-line" />
      <span className="flex flex-col leading-none">
        <span className="text-[14.5px] font-extrabold tracking-[-.3px] text-t1">
          <span className="grad-accent">법무 AI</span>
        </span>
        <span className="mt-[3px] text-[10px] font-medium text-t3">
          계약서 지능형 분류·요약 시스템
        </span>
      </span>
    </span>
  );
}
