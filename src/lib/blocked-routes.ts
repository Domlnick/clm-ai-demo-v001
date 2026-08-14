/* ============================================================
   접근을 막아 둔 화면
   ------------------------------------------------------------
이번 프로토타입 범위 밖인 화면입니다. 공개 대상은
   대시보드와 계약서 분석·요약 두 화면입니다.

   화면 안에서 누른 링크  → 이동하지 않고 토스트로 안내 (app-shell)
   주소창 직접 입력·새 탭 → 범위 밖 안내 화면 (proxy)

   열 준비가 되면 아래 목록에서 해당 줄만 지우면 원래 화면이 돌아옵니다.
   ============================================================ */

export const BLOCKED_ROUTES: Array<{ prefix: string; label: string }> = [
  { prefix: "/contracts", label: "계약 대장" },
  { prefix: "/playbook", label: "협상 플레이북" },
  { prefix: "/risk", label: "리스크 관리" },
  { prefix: "/search", label: "계약서 검색" },
  { prefix: "/draft", label: "초안 작성 어시스트" },
];

/** 이 경로가 막혀 있으면 화면 이름을, 아니면 null */
export function blockedLabel(path: string): string | null {
  /* 절대 URL·쿼리·해시가 붙어 와도 경로만 봅니다 */
  const p = path.replace(/^https?:\/\/[^/]+/, "").split(/[?#]/)[0];
  const hit = BLOCKED_ROUTES.find((b) => p === b.prefix || p.startsWith(`${b.prefix}/`));
  return hit ? hit.label : null;
}
