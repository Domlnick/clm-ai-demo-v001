/* ============================================================
   협상 플레이북 — 부서별 현업과 법무팀이 주고받는 협상 기준 문서
   ------------------------------------------------------------
   각 항목은 기준 문구(standard)와 함께 탐지 키워드를 들고 있어서,
   계약 코퍼스를 실제로 검색해 "이 계약이 기준과 어디가 다른지"를 계산합니다.
   ============================================================ */

import { CONTRACTS, type Contract, type ContractClause } from "./contracts";
import { matchClauses, type ContractHit, type RiskLevel } from "./risk";

/* ---------- 상태 ---------- */
export type PbStatus = "submitted" | "review" | "confirmed" | "change_requested";

export const PB_STATUS_META: Record<
  PbStatus,
  { label: string; tone: "gray" | "info" | "ok" | "warn"; desc: string }
> = {
  submitted: { label: "현업 제출", tone: "gray", desc: "현업이 올린 초안 — 법무 검토 대기" },
  review: { label: "법무 검토 중", tone: "info", desc: "법무팀이 AI와 함께 문안을 정비하는 중" },
  confirmed: { label: "확정", tone: "ok", desc: "확정본 — 계약 검토 기준으로 적용" },
  change_requested: { label: "수정 요청", tone: "warn", desc: "현업이 개정을 요청 — 재검토 필요" },
};

/** 스테퍼에 표시되는 진행 단계 (수정 요청은 검토 단계로 되돌아간 것으로 봅니다) */
export const PB_STATUS_ORDER: PbStatus[] = ["submitted", "review", "confirmed"];

/* ---------- 항목 ---------- */
export type PbItemState = "ok" | "deviation" | "missing";

export const PB_ITEM_STATE_META: Record<
  PbItemState,
  { label: string; tone: "ok" | "crit" | "warn" }
> = {
  ok: { label: "준수", tone: "ok" },
  deviation: { label: "다름", tone: "crit" },
  missing: { label: "미규정", tone: "warn" },
};

export type PlaybookItem = {
  id: string;
  no: string;
  title: string;
  /** 사람이 읽는 기준 문구 */
  standard: string;
  /** 왜 이 기준인지 */
  rationale: string;
  /** 관련 조항을 찾는 키워드 (모두 포함) */
  detect: string[];
  /** 기준에서 벗어났음을 알리는 키워드 (하나라도 걸리면 이탈) */
  deviation: string[];
  level: RiskLevel;
};

/* ---------- 버전 / 수정요청 ---------- */
export type PbChange = { id: string; field: string; before: string; after: string };

export type PbVersion = {
  v: string;
  when: string;
  author: string;
  note: string;
  status: PbStatus;
  changes: PbChange[];
};

export type ChangeRequest = {
  id: string;
  when: string;
  from: string;
  itemId?: string;
  body: string;
  resolved: boolean;
};

export type Playbook = {
  id: string;
  dept: string;
  title: string;
  /** 적용 계약 유형 — CONTRACTS의 type 값 */
  scope: string[];
  owner: string;
  status: PbStatus;
  items: PlaybookItem[];
  versions: PbVersion[];
  requests: ChangeRequest[];
  /** 채택했지만 아직 버전으로 커밋하지 않은 변경 */
  pending: PbChange[];
  /** 무시한 AI 제안 id */
  dismissed: string[];
  /** 마지막으로 확정·재확인한 날 (없으면 아직 첫 확정 전) */
  lastReviewedAt?: string;
  /** 재검토 주기(개월) — 기본 12개월 */
  reviewCycleMonths: number;
};

/* ============================================================
   정기 재검토 — 확정본은 최소 1년마다 다시 들여다본다
   ============================================================ */
export const DEFAULT_REVIEW_CYCLE = 12;
/** 기한이 이만큼 남으면 "임박"으로 본다 */
export const REVIEW_DUE_SOON_DAYS = 60;

export type ReviewState = "none" | "ok" | "due" | "overdue";

export const REVIEW_META: Record<ReviewState, { label: string; tone: "gray" | "ok" | "warn" | "crit" }> = {
  none: { label: "첫 확정 전", tone: "gray" },
  ok: { label: "재검토 여유", tone: "ok" },
  due: { label: "재검토 임박", tone: "warn" },
  overdue: { label: "재검토 기한 초과", tone: "crit" },
};

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** 다음 재검토 기한 (YYYY-MM-DD). 아직 확정된 적이 없으면 null */
export function nextReviewDate(pb: Playbook): string | null {
  if (!pb.lastReviewedAt) return null;
  const [y, m, d] = pb.lastReviewedAt.split("-").map(Number);
  const next = new Date(y, m - 1 + pb.reviewCycleMonths, d);
  const mm = String(next.getMonth() + 1).padStart(2, "0");
  const dd = String(next.getDate()).padStart(2, "0");
  return `${next.getFullYear()}-${mm}-${dd}`;
}

/** 기한까지 남은 일수. 음수면 초과. 확정 이력이 없으면 null */
export function daysUntilReview(pb: Playbook, today = new Date()): number | null {
  const next = nextReviewDate(pb);
  if (!next) return null;
  const [y, m, d] = next.split("-").map(Number);
  return Math.round((startOfDay(new Date(y, m - 1, d)) - startOfDay(today)) / DAY);
}

export function reviewState(pb: Playbook, today = new Date()): ReviewState {
  const left = daysUntilReview(pb, today);
  if (left === null) return "none";
  if (left < 0) return "overdue";
  if (left <= REVIEW_DUE_SOON_DAYS) return "due";
  return "ok";
}

/** "재검토 D-36" / "재검토 기한 D+51 초과" / "첫 확정 전" */
export function reviewLabel(pb: Playbook, today = new Date()): string {
  const left = daysUntilReview(pb, today);
  if (left === null) return "첫 확정 전";
  if (left < 0) return `재검토 기한 D+${-left} 초과`;
  if (left === 0) return "재검토 기한 오늘";
  return `재검토 D-${left}`;
}

/* ---------- 리스크 규칙화 ---------- */
/** 이탈 키워드가 있어야 "무엇이 잘못됐는지"를 규칙으로 표현할 수 있다 */
export function canBecomeRule(item: PlaybookItem): boolean {
  return item.deviation.length > 0;
}

/** 항목 → 리스크 규칙 탐지 조건 (detect + deviation 을 모두 만족하는 조항) */
export function ruleKeywordsFor(item: PlaybookItem): string[] {
  return [...item.detect, ...item.deviation];
}

/* ---------- AI 제안 ---------- */
export type PbSuggestion = {
  id: string;
  playbookId: string;
  itemId: string;
  /** 제안하는 기준 문구 */
  after: string;
  rationale: string;
  cites: { id: string; loc: string; quote: string }[];
  detect?: string[];
  deviation?: string[];
};

/* ============================================================
   평가 — 계약 하나를 플레이북 기준으로 채점
   ============================================================ */
export type PlaybookEval = {
  item: PlaybookItem;
  state: PbItemState;
  clause?: ContractClause;
  matched: string[];
  deviated: string[];
};

const norm = (s: string) => s.replace(/\s/g, "").toLowerCase();

export function evaluateItem(item: PlaybookItem, c: Contract): PlaybookEval {
  const hits = matchClauses({ keywords: item.detect, mode: "all" }, c);
  if (hits.length === 0) {
    return { item, state: "missing", matched: [], deviated: [] };
  }
  /* 이탈이 확인되는 조항을 우선 보여준다 */
  for (const h of hits) {
    const text = norm(h.clause.title + h.clause.body);
    const deviated = item.deviation.filter((d) => text.includes(norm(d)));
    if (deviated.length > 0) {
      return { item, state: "deviation", clause: h.clause, matched: h.matched, deviated };
    }
  }
  const first = hits[0];
  return { item, state: "ok", clause: first.clause, matched: first.matched, deviated: [] };
}

export function evaluateContract(pb: Playbook, c: Contract): PlaybookEval[] {
  return pb.items.map((item) => evaluateItem(item, c));
}

export function summarizeEval(evals: PlaybookEval[]) {
  return {
    ok: evals.filter((e) => e.state === "ok").length,
    deviation: evals.filter((e) => e.state === "deviation").length,
    missing: evals.filter((e) => e.state === "missing").length,
  };
}

/** 계약 유형에 맞는 플레이북 — 확정본을 우선 */
export function playbookForContract(c: Contract, pbs: Playbook[]): Playbook | undefined {
  const matched = pbs.filter((p) => p.scope.includes(c.type));
  return matched.find((p) => p.status === "confirmed") ?? matched[0];
}

/** 이 항목의 탐지 키워드로 코퍼스를 검색 — 항목 카드의 "매칭 N건" */
export function itemHits(item: PlaybookItem, corpus: Contract[] = CONTRACTS): ContractHit[] {
  return corpus
    .map((contract) => ({ contract, clauses: matchClauses({ keywords: item.detect, mode: "all" }, contract) }))
    .filter((h) => h.clauses.length > 0);
}

/** 이 항목의 기준에서 실제로 벗어난 계약만 */
export function itemDeviations(item: PlaybookItem, corpus: Contract[] = CONTRACTS) {
  return corpus
    .map((c) => evaluateItem(item, c))
    .map((e, i) => ({ contract: corpus[i], evalResult: e }))
    .filter((x) => x.evalResult.state === "deviation");
}

/** 미해결 수정요청 수 */
export function openRequests(pb: Playbook): ChangeRequest[] {
  return pb.requests.filter((r) => !r.resolved);
}

/** v1.2 → v1.3 */
export function bumpVersion(v: string): string {
  const m = v.match(/^v(\d+)\.(\d+)$/);
  if (!m) return `${v}.1`;
  return `v${m[1]}.${Number(m[2]) + 1}`;
}

export function getPlaybook(id: string, pbs: Playbook[]): Playbook | undefined {
  return pbs.find((p) => p.id === id);
}

/* ============================================================
   시드 데이터
   ============================================================ */
export const PLAYBOOKS: Playbook[] = [
  /* ---------- 구매팀 · 확정본 — /analyze 가 C-24817 비교에 쓰는 기준 ---------- */
  {
    id: "PB-PURCHASE",
    dept: "구매팀",
    title: "원자재 구매 협상 플레이북",
    scope: ["일반 구매"],
    owner: "홍길동 변호사",
    status: "confirmed",
    pending: [],
    dismissed: [],
    lastReviewedAt: "2025-09-15",
    reviewCycleMonths: DEFAULT_REVIEW_CYCLE,
    items: [
      {
        id: "pbi-pur-1", no: "1항", title: "손해배상 한도", level: "crit",
        standard: "공급자의 손해배상 총액은 계약금액의 30%를 상한으로 한다. 고의·중과실은 예외로 한다.",
        rationale: "사내 표준 가이드. 100% 한도는 노출액이 계약금액 전체로 열려 재협상 대상입니다.",
        detect: ["손해배상", "한도"], deviation: ["100%"],
      },
      {
        id: "pbi-pur-2", no: "2항", title: "지연배상 총액 상한", level: "warn",
        standard: "지연배상 요율과 별개로 지연배상금 총액은 계약금액의 10%를 초과하지 아니한다.",
        rationale: "요율만 있고 상한이 없으면 장기 지연 시 배상액이 계약금액을 넘어섭니다.",
        detect: ["지연배상"], deviation: ["상한은 정하지"],
      },
      {
        id: "pbi-pur-3", no: "3항", title: "품질보증 기간", level: "warn",
        standard: "납품일로부터 24개월 이상 품질을 보증하고, 하자 발생 시 무상 교체한다.",
        rationale: "촉매·설비 자재는 1회 운전 주기가 18개월 이상이라 24개월이 최소선입니다.",
        detect: ["품질보증"], deviation: ["12개월"],
      },
      {
        id: "pbi-pur-4", no: "4항", title: "비밀유지 존속기간", level: "warn",
        standard: "비밀유지 의무는 계약 종료 후 3년간 존속한다.",
        rationale: "공정 정보의 경쟁 가치가 유지되는 기간을 3년으로 봅니다.",
        detect: ["비밀유지"], deviation: ["1년간"],
      },
      {
        id: "pbi-pur-5", no: "5항", title: "준거법·전속관할", level: "warn",
        standard: "대한민국 법률에 따르고 서울중앙지방법원을 전속 관할법원으로 한다.",
        rationale: "국내 공급사와의 계약은 법원 전속 관할이 표준입니다. 중재는 비용·기간 부담이 큽니다.",
        detect: ["준거법"], deviation: ["중재"],
      },
      {
        id: "pbi-pur-6", no: "6항", title: "불가항력 범위", level: "warn",
        standard: "불가항력 사유에 감염병의 세계적 유행과 국제 경제제재·수출통제 조치를 포함한다.",
        rationale: "2023년 이후 신규 계약의 표준. 조항 자체가 없으면 분쟁 시 다툼의 여지가 큽니다.",
        detect: ["불가항력"], deviation: [],
      },
      {
        id: "pbi-pur-7", no: "7항", title: "지식재산권 귀속", level: "crit",
        standard: "본 계약 수행 과정에서 발생한 결과물의 지식재산권은 발주자에게 귀속한다.",
        rationale: "공동 개발 성과가 공급자에게 귀속되면 후속 조달에서 종속됩니다.",
        detect: ["지식재산권"], deviation: ["수급인에게 귀속"],
      },
    ],
    versions: [
      { v: "v1.0", when: "2025-03-04", author: "구매팀 김현수", note: "구매팀 초안 제출", status: "submitted", changes: [] },
      { v: "v2.0", when: "2025-06-15", author: "법무실 홍길동", note: "법무 검토 반영 — 손배·지연배상 상한 명문화", status: "review", changes: [
        { id: "pc1", field: "1항 손해배상 한도", before: "계약금액의 50%", after: "계약금액의 30%" },
        { id: "pc2", field: "2항 지연배상 총액 상한", before: "미규정", after: "계약금액의 10%" },
      ] },
      { v: "v2.1", when: "2025-09-15", author: "법무실 홍길동", note: "확정본 — 불가항력·IP 귀속 항목 추가", status: "confirmed", changes: [
        { id: "pc3", field: "6항 불가항력 범위", before: "미규정", after: "감염병·경제제재 포함" },
        { id: "pc4", field: "7항 지식재산권 귀속", before: "미규정", after: "발주자 귀속" },
      ] },
    ],
    requests: [],
  },

  /* ---------- 영업기획팀 · 수정 요청 상태 — 데모의 주역 ---------- */
  {
    id: "PB-SALES",
    dept: "영업기획팀",
    title: "주유소 임대차 협상 플레이북",
    scope: ["주유소 임대차", "임대차"],
    owner: "홍길동 변호사",
    status: "change_requested",
    pending: [],
    dismissed: [],
    lastReviewedAt: "2025-06-20",
    reviewCycleMonths: DEFAULT_REVIEW_CYCLE,
    items: [
      {
        id: "pbi-sal-1", no: "1항", title: "갱신 통지기한", level: "crit",
        standard: "임대차 기간 만료 90일 전까지 서면 통지로 갱신 여부를 정한다. 통지가 없어도 자동 연장되지 아니한다.",
        rationale: "무통지 자동연장은 원치 않는 기간이 늘어나는 가장 흔한 사고 유형입니다.",
        detect: ["자동", "연장"], deviation: ["통지 없이"],
      },
      {
        id: "pbi-sal-2", no: "2항", title: "손해배상 한도", level: "crit",
        standard: "임차인의 손해배상 총액은 연 임대료의 30%를 상한으로 한다.",
        rationale: "한도를 정하지 않으면 사고 발생 시 노출액이 무제한입니다.",
        detect: ["손해배상", "한도"], deviation: ["정하지 아니한다"],
      },
      {
        id: "pbi-sal-3", no: "3항", title: "원상회복 비용 분담", level: "warn",
        standard: "원상회복 비용은 통상 마모분을 제외하고 임차인이 부담한다.",
        rationale: "전액 임차인 부담 조항은 노후 부지에서 협상 결렬 원인이 됩니다.",
        detect: ["원상회복"], deviation: ["전액 임차인"],
      },
      {
        id: "pbi-sal-4", no: "4항", title: "임대차 기간", level: "warn",
        standard: "임대차 기간은 5년 이내로 한다.",
        rationale: "부지 활용 계획 변경 주기를 고려한 상한입니다.",
        detect: ["임대차 기간"], deviation: ["10년"],
      },
      {
        id: "pbi-sal-5", no: "5항", title: "준거법·전속관할", level: "warn",
        standard: "대한민국 법률에 따르고 서울중앙지방법원을 전속 관할법원으로 한다.",
        rationale: "국내 임대차 표준 조항입니다. 누락 시 관할 다툼이 생깁니다.",
        detect: ["준거법"], deviation: ["중재"],
      },
    ],
    versions: [
      { v: "v1.0", when: "2025-02-18", author: "영업기획팀 박지훈", note: "영업기획팀 초안 제출", status: "submitted", changes: [] },
      { v: "v1.1", when: "2025-04-30", author: "법무실 홍길동", note: "법무 검토 반영 — 손배 한도·통지기한 명문화", status: "review", changes: [
        { id: "ps1", field: "1항 갱신 통지기한", before: "만료 30일 전 통지", after: "만료 90일 전 통지 · 무통지 자동연장 배제" },
        { id: "ps2", field: "2항 손해배상 한도", before: "미규정", after: "연 임대료의 30%" },
      ] },
      { v: "v1.2", when: "2025-06-20", author: "법무실 홍길동", note: "확정본", status: "confirmed", changes: [
        { id: "ps3", field: "3항 원상회복 비용 분담", before: "미규정", after: "통상 마모분 제외" },
      ] },
    ],
    requests: [
      {
        id: "req-1", when: "2026-08-07", from: "영업기획팀 박지훈", itemId: "pbi-sal-1", resolved: false,
        body: "주유소 임대차는 현장 사정상 만료 90일 전 통지가 현실적으로 어렵습니다. 임대인이 개인 사업자인 경우가 많아 협의 시작 자체가 늦습니다. 60일로 완화해 주실 수 있을까요?",
      },
      {
        id: "req-2", when: "2026-08-08", from: "영업기획팀 박지훈", itemId: "pbi-sal-3", resolved: false,
        body: "폐점 예정 부지에서 원상회복 비용을 두고 협상이 계속 막힙니다. 노후 설비까지 임차인이 떠안는 구조로 읽혀서요. 분담 기준을 좀 더 명확히 써주실 수 있을까요?",
      },
    ],
  },

  /* ---------- 설비운영팀 · 검토 중 ---------- */
  {
    id: "PB-FACILITY",
    dept: "설비운영팀",
    title: "용역·유지보수 협상 플레이북",
    scope: ["용역", "유지보수"],
    owner: "홍길동 변호사",
    status: "review",
    pending: [],
    dismissed: [],
    reviewCycleMonths: DEFAULT_REVIEW_CYCLE,
    items: [
      {
        id: "pbi-fac-1", no: "1항", title: "손해배상 한도", level: "crit",
        standard: "수급인의 손해배상 총액은 계약금액의 30%를 상한으로 한다.",
        rationale: "사내 표준 가이드와 동일한 기준을 적용합니다.",
        detect: ["손해배상", "한도"], deviation: ["100%"],
      },
      {
        id: "pbi-fac-2", no: "2항", title: "지연배상 총액 상한", level: "warn",
        standard: "지연배상금 총액은 계약금액의 10%를 초과하지 아니한다.",
        rationale: "요율만 있고 상한이 없는 계약이 반복 확인됩니다.",
        detect: ["지연배상"], deviation: ["상한은 정하지"],
      },
      {
        id: "pbi-fac-3", no: "3항", title: "책임 한도의 예외", level: "crit",
        standard: "비밀정보 유출을 손해배상 한도의 예외로 두지 아니한다.",
        rationale: "예외를 두면 설정한 상한이 사실상 무력화됩니다.",
        detect: ["비밀정보"], deviation: ["예외로 한다"],
      },
      {
        id: "pbi-fac-4", no: "4항", title: "지식재산권 귀속", level: "crit",
        standard: "용역 결과물의 지식재산권은 발주자에게 귀속한다.",
        rationale: "산출물이 수급인에게 귀속되면 유지보수 업체 교체가 막힙니다.",
        detect: ["지식재산권"], deviation: ["수급인에게 귀속"],
      },
      {
        id: "pbi-fac-5", no: "5항", title: "갱신 통지기한", level: "warn",
        standard: "만료 60일 전까지 서면 통지로 갱신 여부를 정한다.",
        rationale: "무통지 자동연장은 불필요한 용역이 연장되는 원인입니다.",
        detect: ["자동", "연장"], deviation: ["통지 없이"],
      },
    ],
    versions: [
      { v: "v0.9", when: "2026-07-22", author: "설비운영팀 이승우", note: "설비운영팀 초안 제출", status: "submitted", changes: [] },
      { v: "v1.0", when: "2026-08-05", author: "법무실 홍길동", note: "법무 1차 검토 착수 — 책임 한도 예외 항목 신설", status: "review", changes: [
        { id: "pf1", field: "3항 책임 한도의 예외", before: "미규정", after: "비밀정보 예외 금지" },
      ] },
    ],
    requests: [],
  },
];

/* ============================================================
   AI 제안 — 수정요청을 반영한 문안
   ============================================================ */
export const PB_SUGGESTIONS: PbSuggestion[] = [
  {
    id: "sug-1", playbookId: "PB-SALES", itemId: "pbi-sal-1",
    after: "임대차 기간 만료 60일 전까지 서면 통지로 갱신 여부를 정한다. 통지가 없는 경우에도 자동으로 연장되지 아니하며, 기간 만료로 종료한다.",
    rationale: "영업기획팀 요청대로 통지기한을 90일에서 60일로 완화하되, 무통지 자동연장 배제는 유지했습니다. 통지기한 단축보다 자동연장 조항이 실제 사고의 원인이라, 완화 대상을 분리하는 편이 안전합니다. 코퍼스에서 무통지 자동연장으로 걸린 계약은 4건이고, 통지기한이 60일인 계약에서는 갱신 사고가 확인되지 않았습니다.",
    cites: [
      { id: "C-24816", loc: "제3조", quote: "임대차 기간은 5년으로 하며, 만료 시 별도 통지 없이 동일 조건으로 1년 자동 연장된다." },
      { id: "C-23990", loc: "제4조", quote: "계약기간은 2년으로 하며 만료 90일 전 서면 통지가 없으면 1년 자동 연장된다." },
    ],
  },
  {
    id: "sug-2", playbookId: "PB-SALES", itemId: "pbi-sal-3",
    after: "원상회복 비용은 통상적인 마모·경년 변화에 따른 부분을 제외하고 임차인이 부담한다. 구조물 및 매설 설비의 노후에 기인한 비용은 임대인이 부담한다.",
    rationale: "\"통상 마모분 제외\"만으로는 노후 설비 처리가 불명확해 현장에서 계속 다툼이 됩니다. 부담 주체를 마모·노후로 나눠 명시했습니다. 폐점 부지 협상에서 가장 자주 걸리는 항목이라 기준 자체를 구체화하는 편이 협상 시간을 줄입니다.",
    cites: [
      { id: "C-24816", loc: "제10조", quote: "임차인은 계약 종료 시 시설물을 원상회복하여야 하며, 비용은 전액 임차인이 부담한다." },
    ],
    deviation: ["전액 임차인", "전액 부담"],
  },
  {
    id: "sug-3", playbookId: "PB-FACILITY", itemId: "pbi-fac-3",
    after: "비밀정보 유출로 인한 손해를 손해배상 한도의 예외로 두지 아니한다. 다만 고의에 의한 유출은 예외로 한다.",
    rationale: "현재 문구는 예외를 전면 금지해 상대방이 수용하기 어렵습니다. 고의만 예외로 남기면 상한의 실효성은 지키면서 협상 저항을 낮출 수 있습니다. 코퍼스에서 이 예외 조항이 걸린 계약은 2건입니다.",
    cites: [
      { id: "C-24810", loc: "제11조", quote: "수급인의 배상책임은 계약금액의 100%를 한도로 하며, 비밀정보 유출로 인한 손해는 한도의 예외로 한다." },
      { id: "C-24756", loc: "제9조", quote: "당사자의 손해배상 총액은 본 계약 총액을 상한으로 한다. 단, 비밀정보 유출에 따른 손해는 예외로 한다." },
    ],
  },
];

export function suggestionsFor(pb: Playbook): PbSuggestion[] {
  return PB_SUGGESTIONS.filter(
    (s) => s.playbookId === pb.id && !pb.dismissed.includes(s.id) && !pb.pending.some((p) => p.id === s.id),
  );
}
