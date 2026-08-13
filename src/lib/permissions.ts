"use client";

/* ============================================================
   역할별 권한
   ------------------------------------------------------------
   기획 단계에서 정의한 3개 역할을 그대로 옮겼습니다.
   (원본: contractPermissions.ts — business / legalReviewer / legalAdmin)

     현업 담당자   분석 요청 및 확정 결과 활용
     법무 담당자   AI 결과 검토·수정·확정
     법무 관리자   전체 처리 및 확정 취소

   상태(ReviewStatus)는 "확정 전(aiGenerated)" / "확정됨(confirmed)"
   두 가지입니다. 확정된 산출물은 법무 관리자만 되돌릴 수 있습니다.
   ============================================================ */

import { useAuth } from "@/lib/auth";
import { toast } from "@/components/toast";

export type Role = "business" | "legalReviewer" | "legalAdmin";

export type ReviewStatus = "aiGenerated" | "confirmed";

export type Action =
  /** 분석 요청·재분석 — 전원 */
  | "requestAnalysis"
  /** 결과 조회 — 전원 */
  | "viewResult"
  /** 요약 복사·내보내기 — 현업은 확정본만 */
  | "copySummary"
  /** AI 결과 수정 (리스크 규칙 등록·적용, 플레이북 항목 수정) — 법무 담당자 이상 */
  | "editSummary"
  /** 확정 (대장 등록, 버전 확정, 상태 확정) — 법무 담당자 이상 */
  | "confirmResult"
  /** 확정 취소·되돌리기·초기화 — 법무 관리자만 */
  | "reopenResult";

export const ROLE_LABEL: Record<Role, string> = {
  business: "현업 담당자",
  legalReviewer: "법무 담당자",
  legalAdmin: "법무 관리자",
};

export const ROLE_DESC: Record<Role, string> = {
  business: "분석 요청 및 확정 결과 활용",
  legalReviewer: "AI 결과 검토·수정·확정",
  legalAdmin: "전체 처리 및 확정 취소",
};

export function can(role: Role, action: Action, status: ReviewStatus = "aiGenerated"): boolean {
  if (action === "requestAnalysis" || action === "viewResult") return true;
  if (action === "copySummary") {
    return role !== "business" || status === "confirmed";
  }
  if (action === "editSummary" || action === "confirmResult") {
    return role !== "business" && status === "aiGenerated";
  }
  /* reopenResult */
  return role === "legalAdmin" && status === "confirmed";
}

export function permissionReason(
  role: Role | null,
  action: Action,
  status: ReviewStatus = "aiGenerated",
): string | null {
  if (role === null) return "로그인이 필요합니다 — 우측 상단에서 로그인해 주세요";
  if (can(role, action, status)) return null;
  if (action === "copySummary") {
    return "법무 검토 확정 후 사용할 수 있습니다";
  }
  if ((action === "editSummary" || action === "confirmResult") && status === "confirmed") {
    return "확정된 결과는 수정할 수 없습니다 — 법무 관리자만 확정을 취소할 수 있습니다";
  }
  if (action === "reopenResult") {
    return role === "legalAdmin"
      ? "확정된 결과에만 쓸 수 있습니다"
      : "법무 관리자 권한이 필요합니다";
  }
  return "법무 담당자 권한이 필요합니다";
}

/** 계약 상태 → 검토 상태 (체결본은 확정으로 봅니다) */
export function contractReviewStatus(status: string): ReviewStatus {
  return status === "signed" ? "confirmed" : "aiGenerated";
}

/** 플레이북 상태 → 검토 상태 */
export function playbookReviewStatus(status: string): ReviewStatus {
  return status === "confirmed" ? "confirmed" : "aiGenerated";
}

export type Permissions = {
  role: Role | null;
  /** 허용 여부만 — 버튼 비활성화 표시에 사용 */
  allow: (action: Action, status?: ReviewStatus) => boolean;
  /** 막히면 사유를 토스트로 알리고 false — 핸들러 앞단에 둡니다 */
  guard: (action: Action, status?: ReviewStatus) => boolean;
  /** 비활성 버튼의 title 문구 */
  reason: (action: Action, status?: ReviewStatus) => string | null;
};

export function usePermissions(): Permissions {
  const { user } = useAuth();
  const role = user?.role ?? null;

  const allow = (action: Action, status: ReviewStatus = "aiGenerated") =>
    role !== null && can(role, action, status);

  const reason = (action: Action, status: ReviewStatus = "aiGenerated") =>
    permissionReason(role, action, status);

  const guard = (action: Action, status: ReviewStatus = "aiGenerated") => {
    if (allow(action, status)) return true;
    const why = reason(action, status);
    if (why) toast(why);
    return false;
  };

  return { role, allow, guard, reason };
}
