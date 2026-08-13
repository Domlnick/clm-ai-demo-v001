"use client";

/* ============================================================
   로그인 세션 (프로토타입)
   ------------------------------------------------------------
   실제 인증 서버 대신 데모 계정 목록을 두고, 선택한 계정을
   localStorage 에 유지합니다. store.tsx 와 같은
   "모듈 레벨 스토어 + useSyncExternalStore" 방식이라
   하이드레이션 불일치가 생기지 않습니다.

   POC 범위 — 비밀번호는 검증하지 않습니다(비어 있는지만 확인).
   ============================================================ */

import { useSyncExternalStore } from "react";
/* 타입만 가져옵니다 — permissions.ts 가 auth 를 다시 참조하므로 런타임 순환을 피합니다 */
import type { Role } from "@/lib/permissions";

export type Account = {
  id: string;
  /** 로그인 ID — 사번 또는 사내 메일 */
  loginId: string;
  name: string;
  /** 권한 역할 — 헤더 배지와 화면 권한이 모두 이 값을 따릅니다 */
  role: Role;
  /** 직책 (표시용, 권한과 무관) */
  title: string;
  dept: string;
  team: string;
  email: string;
};

/** 데모 계정 — 첫 번째가 기본 로그인 사용자, 3개 역할을 모두 시연할 수 있게 배정 */
export const ACCOUNTS: Account[] = [
  {
    id: "u-hong",
    loginId: "20180417",
    name: "홍길동",
    role: "legalReviewer",
    title: "변호사",
    dept: "법무실",
    team: "계약심사팀",
    email: "gdhong@gscaltex.com",
  },
  {
    id: "u-kim",
    loginId: "20150902",
    name: "김서연",
    role: "legalAdmin",
    title: "선임 변호사",
    dept: "법무실",
    team: "계약심사팀",
    email: "sykim@gscaltex.com",
  },
  {
    id: "u-park",
    loginId: "20210311",
    name: "박준호",
    role: "legalReviewer",
    title: "계약검토 담당",
    dept: "법무실",
    team: "계약관리팀",
    email: "jhpark@gscaltex.com",
  },
  {
    id: "u-lee",
    loginId: "20190625",
    name: "이지훈",
    role: "business",
    title: "구매 담당",
    dept: "구매실",
    team: "구매기획팀",
    email: "jhlee@gscaltex.com",
  },
];

export const DEFAULT_ACCOUNT = ACCOUNTS[0];

const KEY = "legalai_auth_v1";

type AuthState = { userId: string | null };

/** 데모라서 처음 열면 기본 계정으로 로그인된 상태로 시작합니다 */
const seedAuth = (): AuthState => ({ userId: DEFAULT_ACCOUNT.id });

/* 서버 렌더 / 하이드레이션 때 쓰는 고정 스냅샷 */
const SERVER_STATE: AuthState = seedAuth();

let state: AuthState | null = null;
const listeners = new Set<() => void>();

function load(): AuthState {
  if (typeof window === "undefined") return SERVER_STATE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AuthState>;
      /* 저장된 계정이 목록에서 사라졌으면 로그아웃 상태로 취급 */
      const id = typeof parsed.userId === "string" ? parsed.userId : null;
      return { userId: id && ACCOUNTS.some((a) => a.id === id) ? id : null };
    }
  } catch {
    /* 저장된 값이 깨졌으면 그냥 시드로 시작 */
  }
  return seedAuth();
}

function getSnapshot(): AuthState {
  if (state === null) state = load();
  return state;
}

const getServerSnapshot = (): AuthState => SERVER_STATE;

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function commit(next: AuthState) {
  state = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* 저장 실패해도 화면은 계속 동작 */
    }
  }
  listeners.forEach((l) => l());
}

/* ---------- 액션 ---------- */

export function accountById(id: string | null): Account | null {
  if (!id) return null;
  return ACCOUNTS.find((a) => a.id === id) ?? null;
}

/** 사번 또는 사내 메일로 계정 찾기 (대소문자 무시) */
export function findAccount(loginId: string): Account | null {
  const q = loginId.trim().toLowerCase();
  if (!q) return null;
  return (
    ACCOUNTS.find(
      (a) => a.loginId.toLowerCase() === q || a.email.toLowerCase() === q || a.name === loginId.trim(),
    ) ?? null
  );
}

export type LoginResult = { ok: true; user: Account } | { ok: false; error: string };

/** 사번/메일 + 비밀번호로 로그인 — POC라 비밀번호는 입력 여부만 봅니다 */
export function login(loginId: string, password: string): LoginResult {
  if (!loginId.trim()) return { ok: false, error: "사번 또는 사내 메일을 입력해 주세요" };
  if (!password) return { ok: false, error: "비밀번호를 입력해 주세요" };
  const user = findAccount(loginId);
  if (!user) return { ok: false, error: "등록되지 않은 계정입니다 — 아래 데모 계정을 이용해 주세요" };
  commit({ userId: user.id });
  return { ok: true, user };
}

/** 계정 전환 — 헤더 토글박스의 사용자 목록에서 사용 */
export function switchAccount(id: string): Account | null {
  const user = accountById(id);
  if (!user) return null;
  commit({ userId: user.id });
  return user;
}

export function logout() {
  commit({ userId: null });
}

export function useAuth() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    user: accountById(s.userId),
    signedIn: s.userId !== null,
    accounts: ACCOUNTS,
    login,
    logout,
    switchAccount,
  };
}
