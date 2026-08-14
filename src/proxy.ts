import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { blockedLabel } from "@/lib/blocked-routes";

/* ============================================================
   "계약 자산" 메뉴 접근 차단
   ------------------------------------------------------------
   주소창 직접 입력·새 탭으로 들어오는 경우를 범위 밖 안내로 돌립니다.
   화면 안에서 누른 링크는 이동 없이 토스트로 막습니다 (app-shell).

   막는 경로 목록은 lib/blocked-routes.ts 한 곳에 있습니다.
   ============================================================ */


export function proxy(request: NextRequest) {
  if (!blockedLabel(request.nextUrl.pathname)) return NextResponse.next();

  /* 주소는 그대로 두고 화면만 안내로 바꿉니다 (안내 문구는 경로로 판별) */
  const url = request.nextUrl.clone();
  url.pathname = "/coming-soon";
  url.search = "";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/contracts/:path*", "/playbook/:path*", "/risk/:path*", "/search/:path*", "/draft/:path*"],
};
