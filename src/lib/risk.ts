/* ============================================================
   리스크 규칙 — 자연어로 정의하고, 계약 코퍼스를 실제로 검색해
   매칭되는 조항을 찾아 전체 적용/예외 처리한다.
   ============================================================ */
import { CONTRACTS, type Contract, type ContractClause } from "./contracts";

export type RiskLevel = "crit" | "warn";
export type MatchMode = "all" | "any";
export type RuleSource = "seed" | "manual" | "analysis" | "version";

export const SOURCE_META: Record<RuleSource, { label: string; tone: "gray" | "accent" | "info" | "violet" }> = {
  seed: { label: "사내 표준", tone: "gray" },
  manual: { label: "직접 등록", tone: "accent" },
  analysis: { label: "분석 자동등록", tone: "info" },
  version: { label: "버전 변경", tone: "violet" },
};

export const LEVEL_META: Record<RiskLevel, { label: string; tone: "crit" | "warn" }> = {
  crit: { label: "고위험", tone: "crit" },
  warn: { label: "주의", tone: "warn" },
};

export type RiskRule = {
  id: string;
  title: string;
  desc: string;
  level: RiskLevel;
  keywords: string[];
  mode: MatchMode;
  source: RuleSource;
  /** 이 규칙이 만들어진 계기가 된 계약 */
  sourceRef?: string;
  createdAt: string;
  /** 전체 적용 여부 — 적용해야 계약별 리스크로 잡힌다 */
  applied: boolean;
  /** 무시하기로 한 계약 ID */
  exceptions: string[];
};

/* ---------- 자연어에서 탐지 키워드 뽑기 ---------- */
const DOMAIN_TERMS = [
  "손해배상", "지연배상", "배상책임", "위약벌", "무한책임", "연대보증",
  "자동갱신", "자동 연장", "통지 없이", "무통지", "갱신",
  "비밀유지", "비밀정보", "불가항력", "준거법", "관할", "중재", "해지",
  "하자담보", "품질보증", "지식재산권", "귀속", "수출통제", "제재", "반부패",
  "원상회복", "안전관리", "감액", "면책", "예외로", "정하지",
  "상한", "한도", "정하지 아니한다",
  "100%", "50%", "30%", "10%",
];

const STOPWORDS = new Set([
  "이런", "저런", "그런", "내용의", "내용", "것", "경우", "관련", "대한", "대해",
  "전체적으로", "전체", "모든", "우리", "회사", "계약", "계약서", "조항", "리스크",
  "위험", "이다", "입니다", "하는", "되는", "있는", "없는", "해야", "한다", "된다",
  "그리고", "또는", "및", "등", "때", "수", "좀", "너무", "매우",
]);

/** 코퍼스 전체 조항 텍스트 (키워드가 실제로 쓰이는지 확인용) */
let CLAUSE_TEXTS: string[] | null = null;
function clauseTexts(): string[] {
  if (!CLAUSE_TEXTS) {
    CLAUSE_TEXTS = CONTRACTS.flatMap((c) =>
      c.clauses.map((cl) => (cl.title + cl.body).replace(/\s/g, "").toLowerCase()),
    );
  }
  return CLAUSE_TEXTS;
}

/** 이 표현이 코퍼스의 몇 개 조항에 실제로 등장하는지 */
export function keywordCoverage(k: string): number {
  const n = k.replace(/\s/g, "").toLowerCase();
  if (!n) return 0;
  return clauseTexts().filter((t) => t.includes(n)).length;
}

export type Extracted = {
  /** 실제로 코퍼스에 등장하는 탐지 키워드 */
  keywords: string[];
  /** 뽑혔지만 코퍼스에 한 번도 안 나와 제외된 표현 */
  dropped: string[];
};

/**
 * 자연어 설명에서 탐지 키워드를 뽑는다.
 * 도메인 용어를 우선 쓰고, 코퍼스에 실제로 등장하지 않는 표현은 제외한다
 * (안 그러면 "모두 포함" 조건에서 아무 계약도 걸리지 않는다).
 */
export function extractKeywords(text: string): Extracted {
  const found: string[] = [];
  const flat = text.replace(/\s/g, "");

  for (const term of DOMAIN_TERMS) {
    if (flat.includes(term.replace(/\s/g, "")) && !found.includes(term)) found.push(term);
  }

  if (found.length < 2) {
    const tokens = text
      .split(/[\s,.·"'“”‘’()[\]{}<>/\\|!?~\-—:;]+/)
      .map((t) =>
        t
          .replace(/(되는|하는|되어|하여|되지|하지|한다|된다|되고|하고|되기|하기)$/, "")
          .replace(/(을|를|이|가|은|는|에|의|로|으로|와|과|도|만|까지|부터)$/, ""),
      )
      .filter((t) => t.length >= 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
    for (const t of tokens) {
      if (found.length >= 4) break;
      if (!found.includes(t)) found.push(t);
    }
  }

  const capped = found.slice(0, 6);
  const keywords = capped.filter((k) => keywordCoverage(k) > 0);
  const dropped = capped.filter((k) => keywordCoverage(k) === 0);
  /* 전부 걸러졌으면 원본이라도 돌려준다 — 사용자가 직접 고칠 수 있게 */
  return keywords.length > 0 ? { keywords, dropped } : { keywords: capped, dropped: [] };
}

/* ---------- 매칭 엔진 ---------- */
const norm = (s: string) => s.replace(/\s/g, "").toLowerCase();

export type ClauseHit = { clause: ContractClause; matched: string[] };
export type ContractHit = { contract: Contract; clauses: ClauseHit[] };

/** 한 계약 안에서 규칙에 걸리는 조항들 */
export function matchClauses(rule: RiskRule, c: Contract): ClauseHit[] {
  if (rule.keywords.length === 0) return [];
  const hits: ClauseHit[] = [];
  for (const clause of c.clauses) {
    const text = norm(clause.title + clause.body);
    const matched = rule.keywords.filter((k) => text.includes(norm(k)));
    const ok = rule.mode === "all" ? matched.length === rule.keywords.length : matched.length > 0;
    if (ok) hits.push({ clause, matched });
  }
  return hits;
}

/** 코퍼스 전체 검색 — 예외 계약도 포함해서 돌려준다 */
export function searchRule(rule: RiskRule, corpus: Contract[] = CONTRACTS): ContractHit[] {
  return corpus
    .map((contract) => ({ contract, clauses: matchClauses(rule, contract) }))
    .filter((h) => h.clauses.length > 0);
}

/** 예외를 뺀, 실제로 리스크로 잡히는 계약 */
export function activeHits(rule: RiskRule, corpus: Contract[] = CONTRACTS): ContractHit[] {
  return searchRule(rule, corpus).filter((h) => !rule.exceptions.includes(h.contract.id));
}

/** 특정 계약에 걸린 규칙들 (적용됐고, 예외가 아니고, 실제 매칭되는 것) */
export function rulesForContract(contractId: string, rules: RiskRule[]) {
  const c = CONTRACTS.find((x) => x.id === contractId);
  if (!c) return [];
  return rules
    .filter((r) => r.applied && !r.exceptions.includes(contractId))
    .map((r) => ({ rule: r, clauses: matchClauses(r, c) }))
    .filter((x) => x.clauses.length > 0);
}

/** 규칙이 걸리지만 예외 처리되어 무시 중인 것 */
export function excludedRulesForContract(contractId: string, rules: RiskRule[]) {
  const c = CONTRACTS.find((x) => x.id === contractId);
  if (!c) return [];
  return rules
    .filter((r) => r.applied && r.exceptions.includes(contractId))
    .map((r) => ({ rule: r, clauses: matchClauses(r, c) }))
    .filter((x) => x.clauses.length > 0);
}

/* ---------- 시드 규칙 (사내 표준 가이드) ---------- */
export const SEED_RULES: RiskRule[] = [
  {
    id: "r-liab100",
    title: "손해배상 한도 표준 초과",
    desc: "손해배상 한도가 계약금액의 100%로 설정된 계약. 사내 표준은 30%입니다.",
    level: "crit",
    keywords: ["손해배상", "100%"],
    mode: "all",
    source: "seed",
    createdAt: "2026-01-15",
    applied: true,
    exceptions: [],
  },
  {
    id: "r-liab-none",
    title: "손해배상 한도 미설정 (무한책임)",
    desc: "손해배상 한도를 아예 정하지 않아 노출액이 무제한인 계약.",
    level: "crit",
    keywords: ["손해배상", "정하지 아니한다"],
    mode: "all",
    source: "seed",
    createdAt: "2026-01-15",
    applied: true,
    exceptions: [],
  },
  {
    id: "r-autorenew",
    title: "무통지 자동갱신",
    desc: "만료 시 통지 없이 자동 연장되어, 놓치면 원치 않는 기간이 연장되는 계약.",
    level: "warn",
    keywords: ["통지 없이", "자동"],
    mode: "all",
    source: "seed",
    createdAt: "2026-02-03",
    applied: true,
    exceptions: [],
  },
  {
    id: "r-delaycap",
    title: "지연배상 상한 미설정",
    desc: "지연배상 요율만 있고 총액 상한(cap)이 없어 배상액이 계약금액을 넘어설 수 있는 계약.",
    level: "warn",
    keywords: ["지연배상", "상한은 정하지"],
    mode: "all",
    source: "seed",
    createdAt: "2026-02-03",
    applied: false,
    exceptions: [],
  },
];
