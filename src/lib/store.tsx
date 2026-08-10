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
import {
  PLAYBOOKS, bumpVersion, ruleKeywordsFor,
  type PbChange, type PbStatus, type PbSuggestion, type Playbook, type PlaybookItem,
} from "./playbooks";

const KEY = "legalai_state_v2";

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
  playbooks: Playbook[];
  /** 플레이북 항목 id → 등록된 리스크 규칙 id */
  pbRules: Record<string, string>;
};

const seedState = (): State => ({
  rules: SEED_RULES,
  statuses: Object.fromEntries(CONTRACTS.map((c) => [c.id, c.status])),
  flaggedChanges: {},
  playbooks: PLAYBOOKS,
  pbRules: {},
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
        playbooks:
          Array.isArray(parsed.playbooks) && parsed.playbooks.length ? parsed.playbooks : base.playbooks,
        pbRules: parsed.pbRules ?? {},
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

/* ============================================================
   플레이북
   ============================================================ */
const today = () => new Date().toISOString().slice(0, 10);

function patchPb(pbId: string, fn: (p: Playbook) => Playbook) {
  update((s) => ({ ...s, playbooks: s.playbooks.map((p) => (p.id === pbId ? fn(p) : p)) }));
}

/** 항목 수정 — 무엇이 바뀌었는지 대기 변경으로 기록한다 */
export function updatePbItem(pbId: string, itemId: string, patch: Partial<PlaybookItem>, note?: string) {
  patchPb(pbId, (p) => {
    const item = p.items.find((i) => i.id === itemId);
    if (!item) return p;
    const changes: PbChange[] = [];
    if (patch.standard && patch.standard !== item.standard) {
      changes.push({ id: nextId("pc"), field: `${item.no} ${item.title} · 기준 문구`, before: item.standard, after: patch.standard });
    }
    if (patch.detect && patch.detect.join() !== item.detect.join()) {
      changes.push({ id: nextId("pc"), field: `${item.no} ${item.title} · 탐지 키워드`, before: item.detect.join(", "), after: patch.detect.join(", ") });
    }
    if (patch.deviation && patch.deviation.join() !== item.deviation.join()) {
      changes.push({ id: nextId("pc"), field: `${item.no} ${item.title} · 이탈 키워드`, before: item.deviation.join(", ") || "없음", after: patch.deviation.join(", ") || "없음" });
    }
    if (changes.length === 0) return p;
    if (note) changes[0] = { ...changes[0], field: `${changes[0].field} (${note})` };
    return {
      ...p,
      items: p.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
      pending: [...p.pending, ...changes],
      /* 확정본을 손대면 다시 검토 단계로 돌아간다 */
      status: p.status === "confirmed" || p.status === "change_requested" ? "review" : p.status,
    };
  });
}

/** AI 제안 채택 */
export function acceptPbSuggestion(pbId: string, sug: PbSuggestion) {
  const pb = getSnapshot().playbooks.find((p) => p.id === pbId);
  const item = pb?.items.find((i) => i.id === sug.itemId);
  if (!pb || !item) return;
  updatePbItem(
    pbId,
    sug.itemId,
    {
      standard: sug.after,
      ...(sug.detect ? { detect: sug.detect } : {}),
      ...(sug.deviation ? { deviation: sug.deviation } : {}),
    },
    "AI 제안 채택",
  );
  /* 채택한 제안은 다시 뜨지 않도록 */
  patchPb(pbId, (p) => ({ ...p, dismissed: [...p.dismissed, sug.id] }));
}

export function dismissPbSuggestion(pbId: string, sugId: string) {
  patchPb(pbId, (p) => ({ ...p, dismissed: [...p.dismissed, sugId] }));
}

export function setPbStatus(pbId: string, status: PbStatus) {
  patchPb(pbId, (p) => ({ ...p, status }));
}

export function resolvePbRequest(pbId: string, reqId: string) {
  patchPb(pbId, (p) => ({
    ...p,
    requests: p.requests.map((r) => (r.id === reqId ? { ...r, resolved: true } : r)),
  }));
}

/** 대기 중 변경을 새 버전으로 커밋하고 확정 — 재검토 기한도 여기서 갱신된다 */
export function commitPbVersion(pbId: string, note: string, author = "법무실 정연우") {
  patchPb(pbId, (p) => {
    const last = p.versions[p.versions.length - 1];
    const when = today();
    return {
      ...p,
      versions: [
        ...p.versions,
        { v: bumpVersion(last?.v ?? "v1.0"), when, author, note, status: "confirmed" as PbStatus, changes: p.pending },
      ],
      pending: [],
      status: "confirmed",
      lastReviewedAt: when,
      requests: p.requests.map((r) => ({ ...r, resolved: true })),
    };
  });
}

/** 내용 변경 없이 "지금도 유효하다"고 재확인 — 기한만 연장 */
export function revalidatePlaybook(pbId: string, author = "법무실 정연우") {
  patchPb(pbId, (p) => {
    const last = p.versions[p.versions.length - 1];
    const when = today();
    return {
      ...p,
      versions: [
        ...p.versions,
        {
          v: bumpVersion(last?.v ?? "v1.0"),
          when,
          author,
          note: "정기 재검토 — 내용 변경 없이 유효성 재확인",
          status: "confirmed" as PbStatus,
          changes: [],
        },
      ],
      status: "confirmed",
      lastReviewedAt: when,
    };
  });
}

/** 플레이북 항목을 리스크 규칙으로 등록 */
export function registerPbItemRule(pbId: string, itemId: string) {
  const pb = getSnapshot().playbooks.find((p) => p.id === pbId);
  const item = pb?.items.find((i) => i.id === itemId);
  if (!pb || !item || item.deviation.length === 0) return null;

  const res = addRule({
    title: `${item.title} — 플레이북 기준 이탈`,
    desc: `${pb.title} ${item.no}: ${item.standard}`,
    level: item.level,
    keywords: ruleKeywordsFor(item),
    mode: "all",
    source: "playbook",
    sourceRef: `${pb.id} · ${item.no}`,
    applied: true,
  });
  if (!res.created && !res.rule.applied) setApplied(res.rule.id, true);
  update((s) => ({ ...s, pbRules: { ...s.pbRules, [itemId]: res.rule.id } }));
  return res;
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
    playbooks: s.playbooks,
    pbRules: s.pbRules,
    addRule,
    updateRule,
    removeRule,
    setApplied,
    toggleException,
    setStatus,
    flagChange,
    unflagChange,
    resetStore,
    updatePbItem,
    acceptPbSuggestion,
    dismissPbSuggestion,
    setPbStatus,
    resolvePbRequest,
    commitPbVersion,
    revalidatePlaybook,
    registerPbItemRule,
  };
}
