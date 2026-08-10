"use client";

/* ============================================================
   화면 간 공유 상태
   ------------------------------------------------------------
   /analyze 에서 등록한 리스크 → /risk 에 나타나고,
   /risk 에서 전체 적용하면 → /contracts 의 각 계약에 반영되며,
   /contracts/[id] 의 버전 변경을 리스크로 체크하면 → /risk 에 규칙으로 등록된다.

   모듈 레벨 스토어 + useSyncExternalStore 로 구현해서
   localStorage 에 유지하면서도 하이드레이션 불일치가 생기지 않게 했습니다.
   ============================================================ */

import { useSyncExternalStore } from "react";
import { CONTRACTS, type ContractStatus } from "./contracts";
import { SEED_RULES, type RiskRule, type RiskLevel, type RuleSource, type MatchMode } from "./risk";

const KEY = "legalai_state_v1";

export type NewRule = {
  title: string;
  desc: string;
  level: RiskLevel;
  keywords: string[];
  mode: MatchMode;
  source: RuleSource;
  sourceRef?: string;
  applied?: boolean;
};

type State = {
  rules: RiskRule[];
  statuses: Record<string, ContractStatus>;
  /** 버전 변경 항목 id → 등록된 리스크 규칙 id */
  flaggedChanges: Record<string, string>;
};

const seedState = (): State => ({
  rules: SEED_RULES,
  statuses: Object.fromEntries(CONTRACTS.map((c) => [c.id, c.status])),
  flaggedChanges: {},
});

/* 서버 렌더 / 하이드레이션 때 쓰는 고정 스냅샷 */
const SERVER_STATE: State = seedState();

let state: State | null = null;
const listeners = new Set<() => void>();

function load(): State {
  if (typeof window === "undefined") return SERVER_STATE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<State>;
      const base = seedState();
      return {
        rules: Array.isArray(parsed.rules) && parsed.rules.length ? parsed.rules : base.rules,
        statuses: { ...base.statuses, ...(parsed.statuses ?? {}) },
        flaggedChanges: parsed.flaggedChanges ?? {},
      };
    }
  } catch {
    /* 저장된 값이 깨졌으면 그냥 시드로 시작 */
  }
  return seedState();
}

function getSnapshot(): State {
  if (state === null) state = load();
  return state;
}

const getServerSnapshot = (): State => SERVER_STATE;

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function commit(next: State) {
  state = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* 용량 초과 등 — 저장 실패해도 화면은 계속 동작 */
    }
  }
  listeners.forEach((l) => l());
}

function update(fn: (s: State) => State) {
  commit(fn(getSnapshot()));
}

/* ---------- 액션 ---------- */
let seq = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(seq++).toString(36)}`;

const sameKeywords = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  const na = [...a].map((x) => x.replace(/\s/g, "")).sort();
  const nb = [...b].map((x) => x.replace(/\s/g, "")).sort();
  return na.every((x, i) => x === nb[i]);
};

/** 규칙 추가 — 같은 키워드 조합이 이미 있으면 그 규칙을 돌려준다 */
export function addRule(r: NewRule): { rule: RiskRule; created: boolean } {
  const cur = getSnapshot();
  const dup = cur.rules.find((x) => sameKeywords(x.keywords, r.keywords) && x.mode === r.mode);
  if (dup) return { rule: dup, created: false };

  const rule: RiskRule = {
    id: nextId("r"),
    title: r.title,
    desc: r.desc,
    level: r.level,
    keywords: r.keywords,
    mode: r.mode,
    source: r.source,
    sourceRef: r.sourceRef,
    createdAt: new Date().toISOString().slice(0, 10),
    applied: r.applied ?? false,
    exceptions: [],
  };
  commit({ ...cur, rules: [rule, ...cur.rules] });
  return { rule, created: true };
}

export function updateRule(id: string, patch: Partial<RiskRule>) {
  update((s) => ({ ...s, rules: s.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
}

export function removeRule(id: string) {
  update((s) => ({ ...s, rules: s.rules.filter((r) => r.id !== id) }));
}

export function setApplied(id: string, applied: boolean) {
  update((s) => ({ ...s, rules: s.rules.map((r) => (r.id === id ? { ...r, applied } : r)) }));
}

export function toggleException(ruleId: string, contractId: string) {
  update((s) => ({
    ...s,
    rules: s.rules.map((r) =>
      r.id === ruleId
        ? {
            ...r,
            exceptions: r.exceptions.includes(contractId)
              ? r.exceptions.filter((x) => x !== contractId)
              : [...r.exceptions, contractId],
          }
        : r,
    ),
  }));
}

export function setStatus(contractId: string, st: ContractStatus) {
  update((s) => ({ ...s, statuses: { ...s.statuses, [contractId]: st } }));
}

export function flagChange(changeId: string, ruleId: string) {
  update((s) => ({ ...s, flaggedChanges: { ...s.flaggedChanges, [changeId]: ruleId } }));
}

export function unflagChange(changeId: string) {
  update((s) => {
    const next = { ...s.flaggedChanges };
    delete next[changeId];
    return { ...s, flaggedChanges: next };
  });
}

/** 시드 상태로 되돌리기 (데모 초기화용) */
export function resetStore() {
  if (typeof window !== "undefined") {
    try { window.localStorage.removeItem(KEY); } catch { /* noop */ }
  }
  commit(seedState());
}

/* ---------- Provider는 더 이상 상태를 들고 있지 않지만,
   기존 구조를 유지하기 위해 그대로 둡니다 ---------- */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/* 액션은 모듈 레벨 고정 함수라 그대로 넘겨도 참조가 바뀌지 않습니다 */
export function useStore() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    rules: s.rules,
    statuses: s.statuses,
    flaggedChanges: s.flaggedChanges,
    addRule,
    updateRule,
    removeRule,
    setApplied,
    toggleException,
    setStatus,
    flagChange,
    unflagChange,
    resetStore,
  };
}
