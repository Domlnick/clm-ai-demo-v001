/* ============================================================
   브랜드 마크
   ------------------------------------------------------------
   공식 CI 에셋으로 교체하려면 `public/brand/gs-caltex.svg`를 넣고
   BrandMark 내부를 <img src="/brand/gs-caltex.svg" .../> 로 바꾸면 됩니다.
   (아래 마크는 GS칼텍스 브랜드 컬러를 사용한 프로토타입용 대체 마크입니다)
   ============================================================ */

export const BRAND = {
  red: "#E8380D",
  orange: "#F7A823",
  deep: "#A8121B",
  grad: "linear-gradient(135deg,#F7A823 0%,#EE3124 54%,#A8121B 100%)",
};

export function BrandMark({ size = 28, radius = 9 }: { size?: number; radius?: number }) {
  return (
    <span
      className="flex flex-shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: BRAND.grad,
        boxShadow: "0 2px 8px rgba(232,56,13,.35)",
      }}
    >
      <svg width={size * 0.66} height={size * 0.66} viewBox="0 0 24 24" fill="none" aria-hidden>
        {/* GS 심볼을 단순화한 원형 스트로크 + 하이라이트 */}
        <circle cx="12" cy="12" r="8.4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="40 12" transform="rotate(-38 12 12)" />
        <circle cx="12" cy="12" r="3.1" fill="#fff" />
      </svg>
    </span>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark size={28} />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[14.5px] font-extrabold tracking-[-.3px] text-t1">
            GS<span style={{ color: BRAND.red }}>칼텍스</span>{" "}
            <span className="grad-accent">법무 AI</span>
          </span>
          <span className="mt-[3px] text-[10px] font-medium text-t3">계약서 지능형 분류·요약 시스템</span>
        </span>
      )}
    </span>
  );
}
