"use client";

/* ============================================================
   로그인 (프로토타입)
   ------------------------------------------------------------
   실제 SSO/AD 연동 대신 데모 계정 목록으로 세션을 만듭니다.
   비밀번호는 검증하지 않고 입력 여부만 확인합니다.
   ============================================================ */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Lock, ShieldCheck, User } from "lucide-react";
import { BrandLockup } from "@/components/brand";
import { toast } from "@/components/toast";
import { ACCOUNTS, useAuth } from "@/lib/auth";
import { ROLE_DESC, ROLE_LABEL } from "@/lib/permissions";

export default function LoginPage() {
  const { user, signedIn, login } = useAuth();
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const res = login(loginId, pw);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setErr(null);
    setBusy(true);
    toast(`${res.user.name} ${res.user.title}님, 환영합니다 — ${ROLE_LABEL[res.user.role]} 권한`);
    router.push("/");
  };

  /* 데모 계정 클릭 — 사번/비밀번호를 채워 넣기만 합니다 */
  const fill = (id: string) => {
    setLoginId(id);
    setPw("demo1234");
    setErr(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="flex w-full max-w-[420px] flex-col gap-4">
        {/* 브랜드 */}
        <div className="flex flex-col items-center gap-3 pb-1">
          <Link href="/">
            <BrandLockup />
          </Link>
          <div className="text-[12.5px] text-t3">사내 계정으로 로그인해 주세요</div>
        </div>

        {/* 이미 로그인된 경우 */}
        {signedIn && user && (
          <div className="flex items-center gap-2.5 rounded-[12px] border border-[var(--accent-soft-2)] bg-[var(--accent-soft)] px-3.5 py-2.5 text-[12px] text-[var(--accent-text)]">
            <ShieldCheck size={16} className="flex-shrink-0" />
            <span className="flex-1">
              이미 <b className="font-bold">{user.name}</b> {user.title}({ROLE_LABEL[user.role]})으로
              로그인되어 있습니다
            </span>
            <Link href="/" className="whitespace-nowrap font-bold underline underline-offset-2">
              워크스페이스
            </Link>
          </div>
        )}

        {/* 로그인 카드 */}
        <form
          onSubmit={submit}
          className="flex flex-col gap-3.5 rounded-[var(--radius)] border border-line bg-surface px-6 py-6 shadow-[var(--shadow-card)]"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-t2">사번 또는 사내 메일</span>
            <span className="relative flex items-center">
              <User size={16} className="absolute left-3 text-t4" />
              <input
                value={loginId}
                onChange={(e) => {
                  setLoginId(e.target.value);
                  setErr(null);
                }}
                autoFocus
                autoComplete="username"
                placeholder="20180417 또는 gdhong@gscaltex.com"
                className="h-11 w-full rounded-[11px] border border-line bg-surface pl-9 pr-3 text-[13.5px] text-t1 outline-none transition placeholder:text-t4 focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent-soft)]"
              />
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-t2">비밀번호</span>
            <span className="relative flex items-center">
              <Lock size={16} className="absolute left-3 text-t4" />
              <input
                type="password"
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value);
                  setErr(null);
                }}
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-11 w-full rounded-[11px] border border-line bg-surface pl-9 pr-3 text-[13.5px] text-t1 outline-none transition placeholder:text-t4 focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent-soft)]"
              />
            </span>
          </label>

          {err && (
            <div className="rounded-[10px] border border-[var(--red-line)] bg-[var(--red-soft)] px-3 py-2 text-[12px] font-medium text-[var(--red)]">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-0.5 flex h-11 items-center justify-center gap-2 rounded-[11px] bg-[image:var(--accent-grad)] text-[14px] font-bold text-white shadow-[0_6px_16px_-6px_rgba(15,110,130,.6)] transition hover:opacity-95 disabled:opacity-60"
          >
            로그인
            <ArrowRight size={16} />
          </button>

          <div className="text-center text-[11px] text-t4">
            비밀번호 초기화·SSO 연동은 프로토타입 범위 밖입니다
          </div>
        </form>

        {/* 데모 계정 */}
        <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-line bg-surface-2 px-4 py-3.5">
          <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-t4">데모 계정</div>
          {ACCOUNTS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => fill(a.loginId)}
              className="flex items-center gap-2.5 rounded-[9px] border border-transparent px-2 py-1.5 text-left transition hover:border-line hover:bg-surface"
            >
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[8px] bg-surface-3 text-[11.5px] font-bold text-t2">
                {a.name.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-semibold text-t1">
                  {a.name} <span className="font-medium text-t3">{a.title}</span>
                  <span className="ml-1.5 rounded bg-[#101828] px-[5px] py-px text-[9.5px] font-semibold text-white">
                    {ROLE_LABEL[a.role]}
                  </span>
                </span>
                <span className="block text-[10.5px] text-t4">
                  <span className="num">{a.loginId}</span> · {a.dept} {a.team} · {ROLE_DESC[a.role]}
                </span>
              </span>
              <span className="whitespace-nowrap text-[10.5px] font-semibold text-[var(--accent)]">
                채우기
              </span>
            </button>
          ))}
        </div>

        <div className="text-center text-[11px] text-t4">
          GS칼텍스 법무 계약서 AI · POC 프로토타입 v0.1
        </div>
      </div>
    </div>
  );
}
