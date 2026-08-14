/* ============================================================
   GS칼텍스 법무 계약서 AI — Mock data
   (실데이터 없이 업종 통례 기반으로 구성한 프로토타입용 샘플)
   ============================================================ */

export type Seg = "S1" | "S2" | "S3";
export const SEG_LABEL: Record<Seg, string> = {
  S1: "대량 정형",
  S2: "중량 반정형",
  S3: "소량 고액",
};

/* ---------- 계약 유형 ---------- */
export const CONTRACT_TYPES = [
  { id: "lease", name: "주유소 임대차", seg: "S1" as Seg, count: 4820 },
  { id: "operate", name: "위탁운영", seg: "S1" as Seg, count: 3110 },
  { id: "polesign", name: "폴사인·상표사용", seg: "S1" as Seg, count: 2740 },
  { id: "purchase", name: "일반 구매", seg: "S2" as Seg, count: 6190 },
  { id: "service", name: "용역", seg: "S2" as Seg, count: 4530 },
  { id: "maint", name: "유지보수", seg: "S2" as Seg, count: 3980 },
  { id: "nda", name: "비밀유지(NDA)", seg: "S2" as Seg, count: 2210 },
  { id: "crude", name: "원유 장기도입", seg: "S3" as Seg, count: 86 },
  { id: "charter", name: "용선(Charter)", seg: "S3" as Seg, count: 74 },
  { id: "epc", name: "EPC·건설", seg: "S3" as Seg, count: 58 },
  { id: "jv", name: "JV·M&A", seg: "S3" as Seg, count: 31 },
];

/* ============================================================
   대시보드
   ------------------------------------------------------------
   기획서 F-LDG-005(대시보드·집계)를 따라 구성했습니다.

     기본 지표      총 건수 · 금액 합계 · 만료 임박
     리스크 지표    불리 조항 보유 수 · 특정 조항 부재 수
     품질 지표      미확정 필드 비율 · 검토 대기 건수
     뷰             조직·부문별, 기간 필터

   같은 스펙의 예외 규칙 — "미확정 데이터가 포함된 집계는 그 비율을
   함께 표시한다" — 을 지키려고 모든 집계에 확정/미확정을 병기합니다.
   숫자는 프로토타입용 가상값이지만 부문 합계가 전사 합계와 맞도록
   맞춰두었습니다.
   ============================================================ */

/* ---------- 부문 · 기간 필터 ---------- */
export type DeptId = "all" | "purchase" | "plant" | "sales" | "admin";

export const DEPTS: { id: DeptId; label: string }[] = [
  { id: "all", label: "전사" },
  { id: "purchase", label: "구매실" },
  { id: "plant", label: "생산본부" },
  { id: "sales", label: "영업본부" },
  { id: "admin", label: "관리본부" },
];

/** 로그인 계정의 dept 문자열 → 필터 id. 매칭이 없으면 부문 고정이 불가능합니다 */
export const DEPT_BY_NAME: Record<string, DeptId> = {
  구매실: "purchase",
  생산본부: "plant",
  영업본부: "sales",
  관리본부: "admin",
};

export type PeriodId = "30d" | "quarter" | "year";

/** 기간은 누적 자산(총 건수·금액)이 아니라 증감 기준을 바꿉니다 */
export const PERIODS: { id: PeriodId; label: string; deltaLabel: string; factor: number }[] = [
  { id: "30d", label: "최근 30일", deltaLabel: "전월 대비", factor: 1 },
  { id: "quarter", label: "분기", deltaLabel: "전분기 대비", factor: 2.8 },
  { id: "year", label: "연간", deltaLabel: "전년 대비", factor: 9.4 },
];

/* ---------- KPI ---------- */
export type KpiTone = "accent" | "ok" | "warn" | "crit";

export type Kpi = {
  key: string;
  label: string;
  value: string;
  unit: string;
  /** 확정/미확정 구간을 알리는 캡션 — F-LDG-005 예외 규칙 */
  caption: string;
  delta: string;
  up: boolean;
  tone: KpiTone;
  spark: number[];
  /** 진행률 바를 그릴 때만 사용 */
  pct?: number;
  href?: string;
};

type DeptNumbers = {
  done: number;
  total: number;
  fieldPct: number;
  fieldOpen: number;
  queue: number;
  amount: string;
  gained: number;
};

/* 부문 합계 = 전사 합계.
   done 71,204+58,930+84,610+33,647 = 248,391
   total 76,800+62,100+88,300+35,200 = 262,400
   fieldOpen 11,930+6,740+8,320+5,857 = 32,847
   queue 2+2+1+1 = 6 (사이드바 '내 검토함' 뱃지와 같은 값)
   gained 412+288+389+115 = 1,204 */
const DEPT_NUMBERS: Record<DeptId, DeptNumbers> = {
  all: { done: 248391, total: 262400, fieldPct: 87.3, fieldOpen: 32847, queue: 6, amount: "4.7조", gained: 1204 },
  purchase: { done: 71204, total: 76800, fieldPct: 84.1, fieldOpen: 11930, queue: 2, amount: "1.9조", gained: 412 },
  plant: { done: 58930, total: 62100, fieldPct: 88.6, fieldOpen: 6740, queue: 2, amount: "1.3조", gained: 288 },
  sales: { done: 84610, total: 88300, fieldPct: 90.2, fieldOpen: 8320, queue: 1, amount: "0.9조", gained: 389 },
  admin: { done: 33647, total: 35200, fieldPct: 85.4, fieldOpen: 5857, queue: 1, amount: "0.6조", gained: 115 },
};

const n = (v: number) => v.toLocaleString("ko-KR");

export function kpisFor(dept: DeptId, period: PeriodId): Kpi[] {
  const d = DEPT_NUMBERS[dept];
  const p = PERIODS.find((x) => x.id === period) ?? PERIODS[0];
  const gained = Math.round(d.gained * p.factor);
  const pct = (d.done / d.total) * 100;

  return [
    {
      key: "digitized",
      label: "데이터화 완료",
      value: n(d.done),
      unit: `/ ${n(d.total)}건`,
      caption: `미처리 ${n(d.total - d.done)}건`,
      delta: `+${n(gained)}`,
      up: true,
      tone: "accent",
      spark: [22, 30, 28, 40, 44, 52, 60],
      pct,
    },
    {
      key: "field",
      label: "대장 필드 확정률",
      value: d.fieldPct.toFixed(1),
      unit: "%",
      caption: `미확정 ${(100 - d.fieldPct).toFixed(1)}% · ${n(d.fieldOpen)}개 필드`,
      delta: "+2.1%p",
      up: true,
      tone: "ok",
      spark: [70, 74, 78, 80, 85, 86, 87],
      pct: d.fieldPct,
    },
    {
      key: "queue",
      label: "검토 대기",
      value: String(d.queue),
      unit: "건",
      caption: "분류 신뢰도 90% 미만",
      delta: "+1",
      up: false,
      tone: "warn",
      spark: [3, 4, 4, 5, 4, 6, 6],
      href: "/contracts",
    },
    {
      key: "amount",
      label: "계약금액 총계",
      value: d.amount,
      unit: "원",
      caption: "미확정 금액 필드 제외",
      delta: `+${(0.12 * p.factor).toFixed(2)}조`,
      up: true,
      tone: "crit",
      spark: [30, 33, 38, 41, 45, 47, 52],
    },
  ];
}

/* ---------- 조항 노출 ---------- */
/* 기획서 P1(조항 검색 불가) · P5(리스크 집계 불가)에 답하는 블록.
   '보유'는 risk.ts 의 SEED_RULES 와 같은 축이고,
   '부재'는 F-LDG-005 가 요구하는 "특정 조항 부재 계약 수" 입니다.
   조항이 있는지 없는지는 육안 검토로만 확인할 수 있던 항목이라
   대장이 필드화됐을 때 가장 크게 달라지는 지점입니다. */
export type ClauseRow = {
  id: string;
  kind: "present" | "absent";
  title: string;
  desc: string;
  level: "crit" | "warn";
  /** 전사 건수 */
  total: number;
  /** 그중 사람이 확정한 건수. 나머지는 미확정 */
  confirmed: number;
  /** S1 · S2 · S3 비중(%) — 부문을 좁혀도 비중은 유지합니다 */
  segShare: [number, number, number];
  byDept: Record<Exclude<DeptId, "all">, number>;
  /** risk.ts 의 규칙 id — 행을 누르면 해당 규칙으로 이동 */
  ruleId?: string;
  action: string;
};

export const CLAUSE_EXPOSURE: ClauseRow[] = [
  {
    id: "ce-liab100",
    kind: "present",
    title: "손해배상 한도 표준 초과",
    desc: "한도가 계약금액의 100% — 사내 표준 30%",
    level: "crit",
    total: 43,
    confirmed: 37,
    segShare: [12, 64, 24],
    byDept: { purchase: 19, plant: 14, sales: 6, admin: 4 },
    ruleId: "r-liab100",
    action: "재협상 검토",
  },
  {
    id: "ce-liab-none",
    kind: "present",
    title: "손해배상 한도 미설정 (무한책임)",
    desc: "한도를 정하지 않아 노출액이 무제한",
    level: "crit",
    total: 11,
    confirmed: 9,
    segShare: [9, 73, 18],
    byDept: { purchase: 5, plant: 3, sales: 2, admin: 1 },
    ruleId: "r-liab-none",
    action: "즉시 조치",
  },
  {
    id: "ce-autorenew",
    kind: "present",
    title: "무통지 자동갱신",
    desc: "통지 없이 자동 연장 — 놓치면 기간 연장",
    level: "warn",
    total: 28,
    confirmed: 24,
    segShare: [61, 32, 7],
    byDept: { purchase: 6, plant: 5, sales: 13, admin: 4 },
    ruleId: "r-autorenew",
    action: "통지기한 등록",
  },
  {
    id: "ce-delaycap",
    kind: "present",
    title: "지연배상 상한 미설정",
    desc: "요율만 있고 총액 상한이 없음",
    level: "warn",
    total: 19,
    confirmed: 15,
    segShare: [16, 68, 16],
    byDept: { purchase: 9, plant: 7, sales: 2, admin: 1 },
    ruleId: "r-delaycap",
    action: "플레이북 반영",
  },
  {
    id: "ce-no-nda",
    kind: "absent",
    title: "비밀유지 조항 없음",
    desc: "기술·거래 정보를 다루는데 비밀유지 조항 부재",
    level: "crit",
    total: 34,
    confirmed: 26,
    segShare: [47, 44, 9],
    byDept: { purchase: 12, plant: 8, sales: 10, admin: 4 },
    action: "추가 협의",
  },
  {
    id: "ce-no-law",
    kind: "absent",
    title: "준거법 미기재",
    desc: "분쟁 시 적용 법률을 특정할 수 없음",
    level: "warn",
    total: 22,
    confirmed: 16,
    segShare: [55, 36, 9],
    byDept: { purchase: 7, plant: 5, sales: 7, admin: 3 },
    action: "변경계약 검토",
  },
  {
    id: "ce-no-cap",
    kind: "absent",
    title: "손해배상 상한 조항 자체 없음",
    desc: "배상 조항은 있으나 상한 규정이 누락",
    level: "crit",
    total: 17,
    confirmed: 12,
    segShare: [24, 59, 17],
    byDept: { purchase: 7, plant: 6, sales: 3, admin: 1 },
    action: "즉시 조치",
  },
];

/* ---------- 만료·갱신 타임라인 ---------- */
/* 구간은 기획서 F-LDG-004 의 알림 시점(120/90/60/30/7일 전)과 같습니다.
   자동갱신은 '통지기한', 재계약은 '만료일'이 기준이라 성격이 다릅니다.
   cid 가 있는 항목은 계약 대장 코퍼스에 실재하는 계약입니다. */
export type ExpiringItem = {
  id: string;
  title: string;
  party: string;
  dept: Exclude<DeptId, "all">;
  /** 조치 기한까지 남은 일수 */
  dday: number;
  kind: "notice" | "expiry";
  renew: string;
  amount: string;
  /** 마커 크기 기준 — 억 단위 환산 */
  weight: number;
  risk: "crit" | "warn" | "ok";
  note: string;
  /** 계약 대장 코퍼스 id. 없으면 대장 목록으로 보냅니다 */
  cid?: string;
};

export const EXPIRING_TOTAL = 137;

export const EXPIRING: ExpiringItem[] = [
  {
    id: "x1", title: "울산 물류창고 임대차", party: "KCTC", dept: "admin",
    dday: 10, kind: "notice", renew: "자동갱신", amount: "3.8억/년", weight: 3.8, risk: "crit",
    note: "미통지 시 동일 조건으로 1년 자동연장", cid: "C-24801",
  },
  {
    id: "x2", title: "본사 사옥 청소 용역", party: "에스원", dept: "admin",
    dday: 18, kind: "expiry", renew: "재계약 협의", amount: "2.1억", weight: 2.1, risk: "crit",
    note: "재계약 단가 협의 미착수",
  },
  {
    id: "x3", title: "OO주유소 부지 임대차", party: "대성에너지", dept: "sales",
    dday: 27, kind: "notice", renew: "자동갱신", amount: "6.4억/년", weight: 6.4, risk: "crit",
    note: "갱신 조건 재검토 필요 — 임대료 인상 요구", cid: "C-24816",
  },
  {
    id: "x4", title: "충전소 브랜드 폴사인 사용", party: "지에스칼텍스판매", dept: "sales",
    dday: 38, kind: "notice", renew: "자동갱신", amount: "0.9억/년", weight: 0.9, risk: "warn",
    note: "표준 조건 · 자동처리 가능", cid: "C-24813",
  },
  {
    id: "x5", title: "설비 예방정비 위탁 용역", party: "GS이엔알", dept: "plant",
    dday: 46, kind: "notice", renew: "자동갱신", amount: "12.0억", weight: 12, risk: "warn",
    note: "SLA 감액률 조정 협의 중", cid: "C-24810",
  },
  {
    id: "x6", title: "정보보안 관제 용역", party: "안랩", dept: "admin",
    dday: 63, kind: "expiry", renew: "재계약 협의", amount: "7.2억", weight: 7.2, risk: "warn",
    note: "SLA 조건 재검토 권고", cid: "C-22140",
  },
  {
    id: "x7", title: "여수공장 촉매 운반 물류계약", party: "한진", dept: "plant",
    dday: 71, kind: "expiry", renew: "재계약 협의", amount: "5.4억", weight: 5.4, risk: "warn",
    note: "운송 단가 상승분 반영 필요",
  },
  {
    id: "x8", title: "IT 인프라 유지보수 기술용역", party: "GS ITM", dept: "admin",
    dday: 79, kind: "expiry", renew: "재계약 협의", amount: "9.6억", weight: 9.6, risk: "warn",
    note: "변경계약 진행 중 — 만료일 확인 필요", cid: "C-24756",
  },
  {
    id: "x9", title: "촉매제 연간 단가계약", party: "BASF코리아", dept: "purchase",
    dday: 89, kind: "expiry", renew: "재계약 협의", amount: "24.0억", weight: 24, risk: "warn",
    note: "가격 재협상 필요 · 단가 상승 리스크", cid: "C-23990",
  },
  {
    id: "x10", title: "사택 임대차 (3건 묶음)", party: "롯데자산개발", dept: "admin",
    dday: 104, kind: "expiry", renew: "재계약 협의", amount: "4.2억/년", weight: 4.2, risk: "ok",
    note: "표준 조건 · 자동처리 가능",
  },
  {
    id: "x11", title: "윤활유 원료 연간 공급계약", party: "SK엔무브", dept: "purchase",
    dday: 117, kind: "notice", renew: "자동갱신", amount: "31.0억", weight: 31, risk: "ok",
    note: "표준 조건 · 통지기한 등록 완료",
  },
];

/* ---------- 최근 처리 계약 ---------- */
/* id 는 모두 계약 대장 코퍼스(contracts.ts)에 실재하는 계약입니다 */
export const RECENT = [
  { id: "C-24817", title: "여수2공장 촉매 공급계약 (최종본 v3)", type: "일반 구매", seg: "S2" as Seg, party: "한화솔루션", dept: "purchase" as DeptId, amount: "38.2억", status: "요약완료", ft: "pdf", when: "12분 전", conf: 96 },
  { id: "C-24816", title: "OO주유소 부지 임대차계약서 (갱신)", type: "주유소 임대차", seg: "S1" as Seg, party: "대성에너지", dept: "sales" as DeptId, amount: "6.4억/년", status: "검토필요", ft: "hwp", when: "38분 전", conf: 88 },
  { id: "C-24810", title: "설비 예방정비 위탁 용역계약", type: "유지보수", seg: "S2" as Seg, party: "GS이엔알", dept: "plant" as DeptId, amount: "12.0억", status: "요약완료", ft: "pdf", when: "1시간 전", conf: 94 },
  { id: "C-24814", title: "Crude Oil Term Supply Agreement", type: "원유 장기도입", seg: "S3" as Seg, party: "Saudi Aramco", dept: "purchase" as DeptId, amount: "USD 620M", status: "요약완료", ft: "pdf", when: "2시간 전", conf: 81 },
  { id: "C-24813", title: "충전소 브랜드 폴사인 사용계약", type: "폴사인·상표사용", seg: "S1" as Seg, party: "지에스칼텍스판매", dept: "sales" as DeptId, amount: "0.9억/년", status: "요약완료", ft: "docx", when: "3시간 전", conf: 97 },
  { id: "C-24756", title: "IT 인프라 유지보수 기술용역", type: "용역", seg: "S2" as Seg, party: "GS ITM", dept: "admin" as DeptId, amount: "9.6억", status: "검토필요", ft: "hwp", when: "4시간 전", conf: 85 },
];

/* ---------- 파이프라인 스테이지 ---------- */
/* 처리 단계 — 상위 폴더 MVP(clm-ai-demo-mvp)의 ProcessingStage 구성을 따랐습니다.
   단계마다 무엇을 하는지 한 줄로 설명하고, 초기화면 3축(분류 · 플레이북 매칭 · 요약)이
   각각 별도 단계로 드러나게 배치했습니다.

   ms = 그 단계가 화면에 머무는 시간. 합계 4,800ms 로 상위 폴더와 같습니다. */
export const PIPELINE = [
  {
    key: "OCR",
    label: "OCR 텍스트 판독",
    detail: "스캔 이미지에서 계약 문장을 인식합니다",
    meta: "한국어 OCR · 조·항·호 구조 분절",
    ms: 1300,
  },
  {
    key: "CLS",
    label: "계약 유형 분류",
    detail: "업무와 계약 특성을 기준으로 유형을 판정합니다",
    meta: "11개 유형 · 92.4% · 세그먼트 S1~S3",
    ms: 1100,
  },
  {
    key: "PBK",
    label: "플레이북 기준 대조",
    detail: "확정된 협상 플레이북 항목과 조항을 비교합니다",
    meta: "기준 이탈 · 준수 판정",
    ms: 1100,
  },
  {
    key: "SUM",
    label: "핵심 내용 요약",
    detail: "기간·금액·의무와 주요 조건을 정리합니다",
    meta: "3층 요약 · 대장 필드 추출",
    ms: 1300,
  },
];

/** 처리 단계 총 소요(ms) */
export const PIPELINE_TOTAL_MS = PIPELINE.reduce((n, p) => n + p.ms, 0);

/* ============================================================
   분석 결과 (파일 업로드 데모용)
   ============================================================ */

/** OCR 판독 원문 — 좌측 원본 패널에서 보여줍니다 (코퍼스 C-24817 조항과 같은 문서) */
export const ANALYSIS_OCR = [
  "촉매 공급계약서",
  "문서번호 C-24817 · 여수2공장 수첨탈황 촉매 (최종본 v3)",
  "제1조(목적) 본 계약은 발주자의 여수 제2공장 수첨탈황 설비에 사용되는 촉매의 공급에 관한 사항을 정함을 목적으로 한다.",
  "제2조(당사자) 발주자는 GS칼텍스 주식회사, 공급자는 한화솔루션 주식회사로 한다.",
  "제3조(계약기간) 계약기간은 2026년 9월 1일부터 2029년 8월 31일까지 3년으로 하며, 자동갱신 조항은 두지 아니한다.",
  "제4조(계약금액) 총 계약금액은 금 삼십팔억이천만원정(3,820,000,000원)으로 하고 부가가치세는 별도로 한다. 연간 단가는 원자재 시세에 연동하되 변동폭은 ±5%를 넘지 아니한다.",
  "제5조(납품 및 검수) 공급자는 발주자가 지정한 일정에 따라 납품하며, 발주자의 검수 완료일을 인도일로 본다.",
  "제6조(대금지급) 발주자는 검수 완료 후 익월 말일에 현금으로 대금을 지급한다.",
  "제8조(손해배상) 공급자의 손해배상 한도는 본 계약금액의 100%를 초과하지 아니한다. 다만 고의 또는 중과실의 경우에는 그러하지 아니하다.",
  "제9조(비밀정보) 비밀정보 유출로 인한 손해는 제8조의 한도 적용에서 예외로 한다.",
  "제12조(지연배상) 납품 지연 시 지연일수 1일당 계약금액의 0.1%를 배상한다. 지연배상금의 상한은 정하지 아니한다.",
  "제15조(품질보증) 납품일로부터 24개월간 품질을 보증하며, 하자 발생 시 무상 교체한다.",
  "제19조(비밀유지) 계약 종료 후 3년간 비밀유지 의무가 존속한다.",
  "제22조(준거법·분쟁해결) 대한민국 법률에 따르며 서울중앙지방법원을 전속 관할법원으로 한다.",
].join("\n\n");

export const ANALYSIS = {
  file: {
    name: "여수2공장_촉매공급계약_최종본_v3.pdf",
    size: "1.2 MB",
    pages: 12,
    ft: "pdf",
    /* 좌측 원문 패널이 읽는 실제 파일 — scripts/generate_sample_contract.py 로 생성 */
    previewUrl: "/samples/catalyst-supply-contract.pdf",
  },
  meta: {
    type: "일반 구매 · 원자재 공급",
    seg: "S2" as Seg,
    confidence: 96,
    language: "국문",
    governing: "대한민국 법",
  },
  summary1: "GS칼텍스가 한화솔루션으로부터 여수 제2공장용 수첨탈황 촉매를 3년간 총 38.2억 원 규모로 공급받는 정형 구매계약으로, 손해배상 한도가 계약금액의 100%로 설정되어 표준 대비 높습니다.",
  summary2: [
    "계약기간 2026-09-01 ~ 2029-08-31 (3년), 자동갱신 조항 없음.",
    "총액 38.2억 원(연 단가 변동, ±5% 캡). 대금 지급은 검수 후 익월 말 현금.",
    "손해배상 한도가 계약금액의 100%로 설정 — 사내 표준(계약금액의 30%) 초과.",
    "품질보증 24개월, 하자 발생 시 무상 교체 및 지연배상 일 0.1%.",
    "분쟁 관할은 서울중앙지방법원 전속. 준거법은 대한민국 법.",
  ],
  fields: [
    { k: "계약 유형", v: "일반 구매 (수첨탈황 촉매)", conf: 98 },
    { k: "발주자", v: "GS칼텍스 주식회사", conf: 99 },
    { k: "공급자", v: "한화솔루션 주식회사", conf: 99 },
    { k: "계약금액", v: "3,820,000,000원 (VAT 별도)", conf: 95 },
    { k: "계약기간", v: "2026-09-01 ~ 2029-08-31", conf: 97 },
    { k: "자동갱신", v: "없음", conf: 92 },
    { k: "대금지급", v: "검수 후 익월 말 현금 지급", conf: 90 },
    { k: "품질보증", v: "납품일로부터 24개월", conf: 93 },
    { k: "준거법·관할", v: "대한민국 법 · 서울중앙지법 전속", conf: 96 },
  ],
  clauses: [
    { no: "제8조", title: "손해배상", risk: "crit", body: "손해배상 한도를 계약금액의 100%로 규정. 사내 표준 가이드(30%)를 크게 상회하여 재협상 권고.", tags: ["손해배상한도", "표준초과"] },
    { no: "제12조", title: "지연배상", risk: "warn", body: "납품 지연 시 일 0.1%(연 환산 36.5%) 배상. 상한(cap) 미설정 — 상한 조항 삽입 권고.", tags: ["지연배상", "cap미설정"] },
    { no: "제15조", title: "품질보증·하자담보", risk: "ok", body: "보증기간 24개월, 무상 교체. 표준 조건에 부합.", tags: ["품질보증"] },
    { no: "제19조", title: "비밀유지", risk: "ok", body: "계약 종료 후 3년간 존속. 표준 조항.", tags: ["비밀유지"] },
    { no: "제22조", title: "준거법·분쟁해결", risk: "ok", body: "대한민국 법, 서울중앙지법 전속 관할. 표준.", tags: ["준거법", "관할"] },
  ],
  /* keywords/mode — 리스크 관리에 규칙으로 등록할 때 쓰는 탐지 조건 */
  risks: [
    { level: "crit", label: "손해배상 한도 100%", note: "표준 30% 대비 3.3배", keywords: ["손해배상", "100%"], mode: "all" as const },
    { level: "warn", label: "지연배상 상한 미설정", note: "무한 노출 가능", keywords: ["지연배상", "상한은 정하지"], mode: "all" as const },
    { level: "crit", label: "비밀정보 유출 시 한도 예외", note: "책임 상한이 사실상 무력화", keywords: ["비밀정보", "예외로 한다"], mode: "all" as const },
    { level: "warn", label: "단가 변동 ±5% 캡", note: "원자재가 급등 시 부족", keywords: ["단가", "±5%"], mode: "all" as const },
  ],
  similar: [
    { id: "C-19004", title: "여수1공장 촉매 공급계약(2023)", sim: 94, party: "한화솔루션", note: "손배 한도 30% · 참고 기준" },
    { id: "C-21120", title: "탈황촉매 연간단가계약(2024)", sim: 89, party: "BASF코리아", note: "지연배상 상한 계약금 10% 명시" },
    { id: "C-17755", title: "촉매 재생 위탁계약(2022)", sim: 82, party: "GS이엔알", note: "품질보증 동일 조건" },
  ],
};

/* ============================================================
   검색 (RAG / Vector) 데모용
   ============================================================ */
export const SEARCH_SCOPES = [
  { id: "similar", label: "유사사례", n: 128, sw: "#0f6e82" },
  { id: "clause", label: "계약내용·조항", n: 1943, sw: "#1a9ab0" },
  { id: "doc", label: "문서", n: 248391, sw: "#3bb4c7" },
  { id: "project", label: "프로젝트", n: 412, sw: "#6dccdb" },
  { id: "hashtag", label: "해쉬태그", n: 86, sw: "#c8892b" },
];

export const HASHTAGS = [
  "손해배상한도", "자동갱신", "지연배상", "비밀유지", "준거법", "관할합의",
  "불가항력", "지식재산권", "해지권", "하자담보", "위약벌", "수출통제", "반부패",
];

export const SEARCH_SUGGESTIONS = [
  "손해배상 한도가 계약금액을 초과하는 계약",
  "90일 내 자동갱신 통지 필요 계약",
  "여수공장 촉매 공급 유사계약",
  "#불가항력 조항이 포함된 용역계약",
];

export const SEARCH_ANSWER = {
  lead: "검색 코퍼스에서 **손해배상 한도가 계약금액의 100% 이상**으로 설정된 계약은 총 **43건**이며, 이 중 표준 가이드(30%) 초과분에 대한 재협상이 완료되지 않은 계약은 **11건**입니다. 대부분 S2(중량 반정형) 구매·용역 계약에 집중되어 있습니다.",
  evidence: [
    { n: 1, q: "손해배상 한도는 본 계약금액의 100%를 초과하지 아니한다.", file: "여수2공장_촉매공급계약_v3.pdf", loc: "제8조 · p.6" },
    { n: 2, q: "수급인의 배상책임은 계약금액의 100%를 한도로 한다.", file: "설비예방정비_위탁용역계약.pdf", loc: "제11조 · p.4" },
    { n: 3, q: "당사자의 손해배상 총액은 본 계약 총액을 상한으로 한다.", file: "IT인프라_유지보수_기술용역.hwp", loc: "제9조 · p.3" },
  ],
  confidence: 91,
};

export type SearchResult = {
  id: string;
  score: number;
  title: string;
  ft: string;
  type: string;
  seg: Seg;
  party: string;
  date: string;
  path: string;
  snippet: string;
  page: string;
  tags: string[];
  chunks: number;
};

export const SEARCH_RESULTS: SearchResult[] = [
  {
    id: "C-24817", score: 96, title: "여수2공장 촉매 공급계약 (최종본 v3)", ft: "pdf", type: "일반 구매", seg: "S2",
    party: "한화솔루션", date: "2026-08-08", path: "계약DB / 구매 / 원자재 / 2026",
    snippet: "제8조(손해배상) 공급자의 <mark>손해배상 한도</mark>는 본 계약금액의 <mark>100%</mark>를 초과하지 아니한다. 다만 고의 또는 중과실의 경우…",
    page: "p.6", tags: ["손해배상한도", "표준초과", "촉매"], chunks: 4,
  },
  {
    id: "C-24810", score: 91, title: "설비 예방정비 위탁 용역계약", ft: "pdf", type: "유지보수", seg: "S2",
    party: "GS이엔알", date: "2026-08-05", path: "계약DB / 용역 / 유지보수 / 2026",
    snippet: "제11조 수급인의 배상책임은 <mark>계약금액의 100%</mark>를 한도로 하며, 지연배상은 일 0.1%로 한다…",
    page: "p.4", tags: ["손해배상한도", "지연배상"], chunks: 3,
  },
  {
    id: "C-24756", score: 88, title: "IT 인프라 유지보수 기술용역", ft: "hwp", type: "용역", seg: "S2",
    party: "GS ITM", date: "2026-07-30", path: "계약DB / 용역 / IT / 2026",
    snippet: "당사자의 <mark>손해배상</mark> 총액은 본 계약 총액을 상한으로 한다. 단, 비밀정보 유출에 따른 손해는 예외로 한다…",
    page: "p.3", tags: ["손해배상한도", "비밀유지"], chunks: 5,
  },
  {
    id: "C-23990", score: 84, title: "촉매제 연간 단가계약 (2024)", ft: "pdf", type: "일반 구매", seg: "S2",
    party: "BASF코리아", date: "2024-11-12", path: "계약DB / 구매 / 원자재 / 2024",
    snippet: "제9조 손해배상은 계약금액의 <mark>30%</mark>를 한도로 하고, 지연배상의 상한은 계약금액의 10%로 한다…",
    page: "p.5", tags: ["손해배상한도", "표준부합", "지연배상"], chunks: 2,
  },
  {
    id: "C-22140", score: 79, title: "정보보안 관제 용역계약", ft: "docx", type: "용역", seg: "S2",
    party: "안랩", date: "2025-03-20", path: "계약DB / 용역 / 보안 / 2025",
    snippet: "제14조(책임의 제한) 각 당사자의 <mark>손해배상</mark> 책임은 직전 12개월 지급액을 상한으로 한다…",
    page: "p.7", tags: ["손해배상한도", "책임제한", "SLA"], chunks: 3,
  },
];

/* ============================================================
   초안 작성 어시스트 데모용
   ============================================================ */
export type DraftSuggestion = {
  id: string;
  label: string;
  text: string;
  source: string;
  freq: number; // 유사계약 채택률 %
  risk?: "ok" | "warn" | "crit";
  recommended?: boolean;
};

export type DraftSlot = {
  id: string;
  no: string;
  title: string;
  hint: string;
  placeholder: string;
  suggestions: DraftSuggestion[];
};

export const DRAFT_META = {
  type: "일반 구매 계약 (원자재 공급)",
  base: "GS칼텍스 표준 구매계약 템플릿 v4",
  refCount: 4820,
};

/* ---------- 초안 브리프 (인테이크 → 확정) ---------- */
export type DraftBrief = {
  type: string;
  base: string;
  refCount: number;
  seg: Seg;
  party: string;
  amount: string;
  term: string;
  renew: string;
  stance: string;
  stanceNote: string;
  governing: string;
  note: string;
};

export type IntakeOption = {
  id: string;
  label: string;
  hint?: string;
  brief: Partial<DraftBrief>;
};

export type IntakeStep = {
  id: string;
  ask: string;
  sub: string;
  chipLabel: string;
  free?: { placeholder: string; examples: string[] };
  options: IntakeOption[];
};

export const DRAFT_BRIEF_BASE: DraftBrief = {
  type: "일반 구매 계약 (원자재 공급)",
  base: "GS칼텍스 표준 구매계약 템플릿 v4",
  refCount: 4820,
  seg: "S2",
  party: "국내 대기업 공급사",
  amount: "10억 원 이상",
  term: "3년",
  renew: "자동갱신 · 만료 90일 전 통지",
  stance: "균형",
  stanceNote: "사내 표준을 기준으로 하되 일부 협상 여지를 둡니다.",
  governing: "대한민국 법 · 서울중앙지방법원 전속",
  note: "",
};

export const DRAFT_INTAKE_STEPS: IntakeStep[] = [
  {
    id: "type",
    ask: "어떤 계약서를 작성하시나요?",
    sub: "유형을 고르거나, 상황을 그대로 적어주세요. 문장으로 적으면 제가 유형을 판별합니다.",
    chipLabel: "계약 유형",
    free: {
      placeholder: "예) 여수2공장에 들어갈 촉매를 한화솔루션에서 3년간 공급받는 계약",
      examples: [
        "여수2공장 촉매를 3년간 공급받는 구매계약",
        "폐점 예정 주유소 부지 임대차 갱신 계약",
        "설비 예방정비를 위탁하는 용역계약",
      ],
    },
    options: [
      { id: "purchase", label: "일반 구매 · 원자재 공급", hint: "6,190건", brief: { type: "일반 구매 계약 (원자재 공급)", base: "GS칼텍스 표준 구매계약 템플릿 v4", refCount: 4820, seg: "S2" } },
      { id: "lease", label: "주유소 임대차", hint: "4,820건", brief: { type: "주유소 부지 임대차 계약", base: "GS칼텍스 표준 임대차 템플릿 v3", refCount: 4820, seg: "S1" } },
      { id: "service", label: "용역 · 유지보수", hint: "8,510건", brief: { type: "용역 · 유지보수 위탁 계약", base: "GS칼텍스 표준 용역계약 템플릿 v5", refCount: 3980, seg: "S2" } },
      { id: "nda", label: "비밀유지(NDA)", hint: "2,210건", brief: { type: "비밀유지 계약 (NDA)", base: "GS칼텍스 표준 NDA 템플릿 v2", refCount: 2210, seg: "S2" } },
      { id: "polesign", label: "위탁운영 · 폴사인", hint: "5,850건", brief: { type: "위탁운영 · 폴사인 사용 계약", base: "GS칼텍스 표준 위탁운영 템플릿 v3", refCount: 2740, seg: "S1" } },
      { id: "crude", label: "원유 · 용선 (고액 비정형)", hint: "160건", brief: { type: "원유 장기도입 계약", base: "국제 표준 Term Supply 템플릿", refCount: 86, seg: "S3", governing: "영국법 · KCAB 중재" } },
    ],
  },
  {
    id: "party",
    ask: "상대방과 거래 규모는 어떻게 되나요?",
    sub: "규모에 따라 참조할 선례 풀과 권장 조항 강도가 달라집니다.",
    chipLabel: "상대방·규모",
    options: [
      { id: "big", label: "국내 대기업 · 10억 원 이상", brief: { party: "국내 대기업 공급사", amount: "10억 원 이상", governing: "대한민국 법 · 서울중앙지방법원 전속" } },
      { id: "sme", label: "국내 중소·협력사 · 10억 원 미만", brief: { party: "국내 중소 협력사", amount: "10억 원 미만", governing: "대한민국 법 · 서울중앙지방법원 전속" } },
      { id: "overseas", label: "해외 공급사 · 외화 거래", brief: { party: "해외 공급사", amount: "USD 표시 금액", governing: "대한민국 법 · KCAB 국제중재(서울)" } },
      { id: "affiliate", label: "GS 계열사 · 내부거래", brief: { party: "GS 계열사", amount: "내부거래 기준가", governing: "대한민국 법 · 서울중앙지방법원 전속" } },
    ],
  },
  {
    id: "term",
    ask: "계약기간과 갱신 방식은 어떻게 가져갈까요?",
    sub: "자동갱신 설정은 만료·갱신 리스크와 직결됩니다.",
    chipLabel: "기간·갱신",
    options: [
      { id: "t3auto", label: "3년 · 자동갱신 (통지 90일)", brief: { term: "3년", renew: "자동갱신 · 만료 90일 전 통지" } },
      { id: "t3fixed", label: "3년 · 자동갱신 없음", brief: { term: "3년", renew: "자동갱신 없음 · 만료 60일 전 재계약 협의" } },
      { id: "t1", label: "1년 · 매년 재계약", brief: { term: "1년", renew: "매년 재계약 · 단가 재협상" } },
      { id: "tbd", label: "아직 미정 — 권장안으로", brief: { term: "3년 (권장)", renew: "자동갱신 · 만료 90일 전 통지 (권장)" } },
    ],
  },
  {
    id: "stance",
    ask: "이번 계약에서 우리 입장은 어느 쪽에 가깝나요?",
    sub: "제안 문안의 우선순위와 리스크 경고 기준이 달라집니다.",
    chipLabel: "협상 기조",
    options: [
      { id: "strict", label: "리스크 최소 — 사내 표준 엄격 적용", brief: { stance: "보수", stanceNote: "사내 표준을 벗어나는 문안은 전부 경고로 표시하고, 표준 문안만 우선 제안합니다." } },
      { id: "balanced", label: "균형 — 표준 기준, 일부 협상 여지", brief: { stance: "균형", stanceNote: "사내 표준을 기준으로 하되, 채택률이 높은 대안 문안도 함께 제안합니다." } },
      { id: "fast", label: "신속 체결 — 상대방 표준 폭넓게 수용", brief: { stance: "신속", stanceNote: "체결 속도를 우선하되, 고위험 조항(손해배상·지연배상)만 강하게 경고합니다." } },
    ],
  },
];

/* ---------- 브리프에서 확정하는 필수 반영 조건 ---------- */
export type DraftMust = {
  id: string;
  label: string;
  desc: string;
  slot: string;
  suggestion: string;
  auto?: boolean;
};

export const DRAFT_MUSTS: DraftMust[] = [
  { id: "m-liab30", label: "손해배상 30% 상한", desc: "사내 표준 가이드 준수", slot: "s-liability", suggestion: "l1", auto: true },
  { id: "m-liab12m", label: "직전 12개월 지급액 한도", desc: "용역계약 통례", slot: "s-liability", suggestion: "l2" },
  { id: "m-renew90", label: "자동갱신 통지기한 90일", desc: "만료 리스크 사전 통제", slot: "s-term", suggestion: "t1", auto: true },
  { id: "m-norenew", label: "자동갱신 배제", desc: "고액계약 통례", slot: "s-term", suggestion: "t2" },
  { id: "m-fmext", label: "불가항력에 제재·팬데믹 포함", desc: "2023년 이후 신규계약 반영", slot: "s-fm", suggestion: "f2" },
  { id: "m-court", label: "서울중앙지법 전속관할", desc: "국내 계약 표준", slot: "s-law", suggestion: "j1", auto: true },
  { id: "m-arb", label: "대한상사중재원 중재", desc: "해외 당사자 계약", slot: "s-law", suggestion: "j2" },
];

export const DRAFT_REFS = [
  { id: "C-19004", title: "여수1공장 촉매 공급계약 (2023)", party: "한화솔루션", sim: 94, note: "손배 30% · 지연배상 상한 10% 반영된 표준 선례" },
  { id: "C-23990", title: "촉매제 연간 단가계약 (2024)", party: "BASF코리아", sim: 89, note: "단가 조정식과 상한 조항 참고" },
  { id: "C-17755", title: "촉매 재생 위탁계약 (2022)", party: "GS이엔알", sim: 82, note: "품질보증 24개월 동일 조건" },
];

export const DRAFT_SLOTS: DraftSlot[] = [
  {
    id: "s-purpose",
    no: "제1조",
    title: "계약의 목적",
    hint: "공급 대상·목적을 특정하세요. 유사 구매계약 4,820건에서 추출한 표준 문안입니다.",
    placeholder: "본 계약은 발주자가 필요로 하는 …의 공급에 관하여 …",
    suggestions: [
      {
        id: "p1", label: "표준 목적 조항", recommended: true, freq: 92, source: "표준템플릿 v4 · 4,820건",
        text: "본 계약은 발주자(GS칼텍스)가 필요로 하는 [공급품목]의 공급 및 이에 부수하는 제반 사항에 관하여 발주자와 공급자 간의 권리·의무를 정함을 목적으로 한다.",
      },
      {
        id: "p2", label: "품질기준 명시형", freq: 61, source: "촉매 공급계약 3건 유사",
        text: "본 계약은 발주자의 여수공장 운전에 사용될 [공급품목]을(를) 발주자가 정한 규격 및 품질기준에 따라 공급함을 목적으로 하며, 세부 규격은 별첨1에 따른다.",
      },
    ],
  },
  {
    id: "s-term",
    no: "제3조",
    title: "계약기간 및 갱신",
    hint: "자동갱신 여부는 만료·갱신 리스크와 직결됩니다. 통지기한을 반드시 명시하세요.",
    placeholder: "본 계약의 유효기간은 … 부터 … 까지로 한다 …",
    suggestions: [
      {
        id: "t1", label: "자동갱신 + 통지기한(권장)", recommended: true, freq: 74, risk: "ok", source: "표준템플릿 v4",
        text: "본 계약의 유효기간은 2026-09-01부터 2029-08-31까지로 한다. 기간 만료 90일 전까지 어느 일방의 서면 통지가 없는 경우 동일 조건으로 1년간 자동 연장되며, 이후에도 같다.",
      },
      {
        id: "t2", label: "자동갱신 배제형", freq: 48, risk: "warn", source: "고액계약 통례",
        text: "본 계약의 유효기간은 체결일로부터 3년으로 하며, 자동갱신되지 아니한다. 갱신을 원하는 당사자는 만료 60일 전까지 서면으로 재계약을 요청하여야 한다.",
      },
      {
        id: "t3", label: "무통지 자동연장(비권장)", freq: 12, risk: "crit", source: "레거시 계약 다수",
        text: "본 계약은 만료 시 자동으로 1년 연장된다.",
      },
    ],
  },
  {
    id: "s-liability",
    no: "제8조",
    title: "손해배상 한도",
    hint: "사내 표준은 계약금액의 30%입니다. 100% 초과 조항은 재협상 대상으로 분류됩니다.",
    placeholder: "일방의 귀책으로 손해가 발생한 경우 … 를 한도로 배상한다 …",
    suggestions: [
      {
        id: "l1", label: "표준 한도 30%(권장)", recommended: true, freq: 68, risk: "ok", source: "사내 표준 가이드",
        text: "일방의 귀책사유로 상대방에게 손해가 발생한 경우, 배상책임의 총액은 본 계약금액의 30%를 한도로 한다. 다만 고의 또는 중대한 과실의 경우 그러하지 아니하다.",
      },
      {
        id: "l2", label: "직전 12개월 지급액 한도", freq: 35, risk: "ok", source: "용역계약 통례",
        text: "각 당사자의 손해배상 책임은 청구 발생 직전 12개월간 지급된 대금 총액을 상한으로 한다.",
      },
      {
        id: "l3", label: "계약금액 100% 한도(주의)", freq: 22, risk: "crit", source: "공급자 선호 · 표준초과",
        text: "공급자의 손해배상 한도는 본 계약금액의 100%를 초과하지 아니한다.",
      },
    ],
  },
  {
    id: "s-fm",
    no: "제17조",
    title: "불가항력",
    hint: "정유·화학 계약에서 필수 조항입니다. 원자재 수급 중단 사유를 포함하세요.",
    placeholder: "천재지변, 전쟁 … 등 당사자의 통제를 벗어난 사유로 …",
    suggestions: [
      {
        id: "f1", label: "표준 불가항력(권장)", recommended: true, freq: 88, risk: "ok", source: "표준템플릿 v4",
        text: "천재지변, 전쟁, 내란, 정부의 법령·처분, 노동쟁의, 원료 공급중단 등 당사자의 합리적 통제를 벗어난 사유로 계약 이행이 불가능한 경우, 해당 당사자는 그 범위 내에서 책임을 면한다. 다만 지체 없이 상대방에게 통지하여야 한다.",
      },
      {
        id: "f2", label: "감염병·제재 포함 확장형", freq: 57, risk: "ok", source: "2023년 이후 신규계약",
        text: "위 사유에 더하여 감염병의 세계적 유행(팬데믹), 국제 경제제재 및 수출통제 조치를 불가항력 사유에 포함한다.",
      },
    ],
  },
  {
    id: "s-law",
    no: "제22조",
    title: "준거법 및 분쟁해결",
    hint: "국내 계약은 서울중앙지법 전속 관할이 표준입니다. 국제계약은 중재를 권장합니다.",
    placeholder: "본 계약은 대한민국 법에 따라 해석되며 …",
    suggestions: [
      {
        id: "j1", label: "국내·법원 전속(권장)", recommended: true, freq: 81, risk: "ok", source: "표준템플릿 v4",
        text: "본 계약은 대한민국 법률에 따라 규율되고 해석되며, 본 계약에 관한 분쟁은 서울중앙지방법원을 전속적 관할법원으로 한다.",
      },
      {
        id: "j2", label: "국제·중재(대한상사중재원)", freq: 44, risk: "ok", source: "해외 당사자 계약",
        text: "본 계약에 관한 분쟁은 대한상사중재원(KCAB)의 국제중재규칙에 따라 서울에서 중재로 최종 해결한다. 중재 언어는 영어로 한다.",
      },
    ],
  },
];

/* ============================================================
   AI 채팅 (분석 화면 · 검색 화면 공용)
   ============================================================ */
export type ChatCite = { id: string; title: string; loc: string; quote: string };
export type ChatCompareRow = {
  label: string;
  mine: string;
  ref: string;
  verdict: "worse" | "same" | "better";
};
export type ChatCompare = {
  refId: string;
  refTitle: string;
  mineLabel: string;
  rows: ChatCompareRow[];
};
export type ChatAnswer = {
  id: string;
  q: string;
  keys: string[];
  text: string;
  compare?: ChatCompare;
  cites?: ChatCite[];
  follow?: string[];
};

/* ---------- 분석 화면: 이 계약서 ↔ 저장된 계약서 비교 Q&A ---------- */
export const ANALYZE_QA: ChatAnswer[] = [
  {
    id: "a-compare",
    q: "기존 촉매 공급계약과 조건이 어떻게 다른가요?",
    keys: ["기존", "선례", "비교", "차이", "다른", "이전", "과거"],
    text: "가장 유사한 선례인 **여수1공장 촉매 공급계약(C-19004, 유사도 94%)**과 비교하면, 금액·기간·품질보증은 사실상 동일하지만 **책임 조항에서만 크게 벌어집니다**. 특히 손해배상 한도가 30%에서 100%로 올라갔고, 선례에 있던 지연배상 상한이 이번 계약에서는 빠졌습니다.",
    compare: {
      refId: "C-19004",
      refTitle: "여수1공장 촉매 공급계약 (2023)",
      mineLabel: "이번 계약",
      rows: [
        { label: "손해배상 한도", mine: "계약금액의 100%", ref: "계약금액의 30%", verdict: "worse" },
        { label: "지연배상 상한", mine: "상한 없음 (일 0.1%)", ref: "계약금액의 10%", verdict: "worse" },
        { label: "품질보증", mine: "24개월", ref: "24개월", verdict: "same" },
        { label: "계약기간", mine: "3년 · 자동갱신 없음", ref: "3년 · 자동갱신 없음", verdict: "same" },
        { label: "단가 조정", mine: "±5% 캡", ref: "캡 없음 (연 협의)", verdict: "better" },
      ],
    },
    cites: [
      { id: "C-19004", title: "여수1공장 촉매 공급계약(2023)", loc: "제9조 · p.5", quote: "공급자의 손해배상 한도는 본 계약금액의 30%를 초과하지 아니한다." },
      { id: "C-24817", title: "여수2공장 촉매공급계약 v3 (이번 계약)", loc: "제8조 · p.6", quote: "손해배상 한도는 본 계약금액의 100%를 초과하지 아니한다." },
    ],
    follow: ["지연배상 상한을 넣은 선례가 있나요?", "재협상 문구를 제안해줘"],
  },
  {
    id: "a-worst",
    q: "이 계약에서 우리가 가장 불리한 조항은?",
    keys: ["불리", "위험", "리스크", "문제", "주의", "가장"],
    text: "**제8조 손해배상 한도(계약금액의 100%)**가 단연 가장 불리합니다. 사내 표준 30% 대비 3.3배이고, 코퍼스 전체에서 이 조건을 수용한 구매계약은 **22%뿐**입니다. 두 번째는 **제12조 지연배상에 상한(cap)이 없다**는 점으로, 이론상 배상액이 계약금액을 넘어설 수 있습니다.\n\n노출액으로 환산하면 최악의 경우 **38.2억 원**까지 열려 있고, 표준 조건이었다면 **11.5억 원**에서 막힙니다.",
    cites: [
      { id: "C-24817", title: "여수2공장 촉매공급계약 v3", loc: "제8조 · p.6", quote: "손해배상 한도는 본 계약금액의 100%를 초과하지 아니한다." },
      { id: "C-24817", title: "여수2공장 촉매공급계약 v3", loc: "제12조 · p.8", quote: "납품 지연 시 지연일수 1일당 계약금액의 0.1%를 배상한다." },
    ],
    follow: ["지연배상 상한을 넣은 선례가 있나요?", "재협상 문구를 제안해줘"],
  },
  {
    id: "a-cap",
    q: "지연배상 상한을 넣은 선례가 있나요?",
    keys: ["지연배상", "상한", "cap", "캡", "선례"],
    text: "네, **3건** 있습니다. 가장 가까운 건 **촉매제 연간 단가계약(C-23990, BASF코리아)**으로, 지연배상 상한을 계약금액의 10%로 명시했습니다. 같은 공급자(한화솔루션)와 체결한 C-19004에도 동일한 10% 상한이 들어가 있어, **상대방이 이미 수용한 전례가 있는 조건**입니다. 협상 근거로 쓰기 좋습니다.",
    cites: [
      { id: "C-23990", title: "촉매제 연간 단가계약(2024)", loc: "제9조 · p.5", quote: "지연배상의 상한은 계약금액의 10%로 한다." },
      { id: "C-19004", title: "여수1공장 촉매 공급계약(2023)", loc: "제11조 · p.6", quote: "지연배상금의 총액은 계약금액의 10%를 초과하지 아니한다." },
    ],
    follow: ["재협상 문구를 제안해줘", "기존 촉매 공급계약과 조건이 어떻게 다른가요?"],
  },
  {
    id: "a-redraft",
    q: "재협상 문구를 제안해줘",
    keys: ["재협상", "문구", "수정", "제안", "대안", "바꾸"],
    text: "선례에서 이미 상대방이 수용한 문안을 기준으로 두 조항을 이렇게 제안합니다.\n\n**제8조 (손해배상)** — 일방의 귀책사유로 상대방에게 손해가 발생한 경우, 배상책임의 총액은 본 계약금액의 30%를 한도로 한다. 다만 고의 또는 중대한 과실, 비밀유지의무 위반의 경우에는 그러하지 아니하다.\n\n**제12조 (지연배상)** — 납품 지연 시 지연일수 1일당 계약금액의 0.1%를 배상하되, 지연배상금의 총액은 계약금액의 10%를 초과하지 아니한다.\n\n두 문안 모두 **C-19004에서 한화솔루션이 이미 수용한 조건**이라 협상 저항이 낮을 것으로 봅니다.",
    cites: [
      { id: "C-19004", title: "여수1공장 촉매 공급계약(2023)", loc: "제9조·제11조", quote: "손해배상 한도 30% / 지연배상 총액 10% 상한 — 동일 공급자 수용 이력" },
    ],
    follow: ["이 조건으로 체결하면 대장 리스크 등급은?"],
  },
  {
    id: "a-grade",
    q: "이 조건으로 체결하면 대장 리스크 등급은?",
    keys: ["등급", "대장", "점수", "체결", "스코어"],
    text: "현재 조건 그대로 등록하면 종합 리스크 **62/100 · 등급 B-(주의 관리)**로 분류되어, 계약 대장에서 **분기별 재검토 대상**으로 자동 편입됩니다. 제안한 재협상 문구가 반영되면 **28/100 · 등급 A(표준)**로 내려가 별도 관리 대상에서 빠집니다.",
    follow: ["재협상 문구를 제안해줘"],
  },
];

export const ANALYZE_QA_SUGGESTIONS = [
  "기존 촉매 공급계약과 조건이 어떻게 다른가요?",
  "이 계약에서 우리가 가장 불리한 조항은?",
  "지연배상 상한을 넣은 선례가 있나요?",
  "재협상 문구를 제안해줘",
];

/* ---------- 검색 화면: 첨부한 계약서로 이어가는 추론 ---------- */
export const SEARCH_QA: ChatAnswer[] = [
  {
    id: "s-diff",
    q: "첨부한 계약서들의 손해배상 조건을 비교해줘",
    keys: ["비교", "차이", "손해배상", "조건", "다른"],
    text: "첨부하신 계약서들의 책임 조항을 나란히 놓고 보면, **표준(30%)을 지킨 건 BASF코리아 건 하나뿐**입니다. 나머지는 모두 계약금액 100% 또는 총액 상한 방식으로, 사내 가이드를 벗어나 있습니다. 안랩 건만 '직전 12개월 지급액' 방식이라 실질 노출은 가장 작습니다.",
    compare: {
      refId: "C-23990",
      refTitle: "촉매제 연간 단가계약 (표준 준수 기준선)",
      mineLabel: "첨부 계약",
      rows: [
        { label: "여수2공장 촉매공급 (C-24817)", mine: "계약금액 100%", ref: "계약금액 30%", verdict: "worse" },
        { label: "설비 예방정비 위탁 (C-24810)", mine: "계약금액 100%", ref: "계약금액 30%", verdict: "worse" },
        { label: "IT 인프라 유지보수 (C-24756)", mine: "계약 총액 상한", ref: "계약금액 30%", verdict: "worse" },
        { label: "정보보안 관제 (C-22140)", mine: "직전 12개월 지급액", ref: "계약금액 30%", verdict: "better" },
      ],
    },
    cites: [
      { id: "C-23990", title: "촉매제 연간 단가계약(2024)", loc: "제9조 · p.5", quote: "손해배상은 계약금액의 30%를 한도로 하고, 지연배상의 상한은 계약금액의 10%로 한다." },
    ],
    follow: ["이 중 우리 표준에 가장 가까운 계약은?", "재협상 우선순위를 정해줘"],
  },
  {
    id: "s-closest",
    q: "이 중 우리 표준에 가장 가까운 계약은?",
    keys: ["표준", "가까운", "기준", "모범", "best"],
    text: "**촉매제 연간 단가계약(C-23990, BASF코리아)**입니다. 손해배상 30% · 지연배상 상한 10%로 사내 가이드를 그대로 지켰고, 유형(일반 구매·원자재)까지 같아 **재협상 때 근거로 제시하기 가장 좋은 선례**입니다. 다음으로는 정보보안 관제 용역(C-22140)이 책임 제한 방식 면에서 참고할 만합니다.",
    cites: [
      { id: "C-23990", title: "촉매제 연간 단가계약(2024)", loc: "제9조 · p.5", quote: "손해배상은 계약금액의 30%를 한도로 하고, 지연배상의 상한은 계약금액의 10%로 한다." },
    ],
    follow: ["재협상 우선순위를 정해줘", "이 계약들의 공통 리스크는?"],
  },
  {
    id: "s-common",
    q: "이 계약들의 공통 리스크는?",
    keys: ["공통", "리스크", "패턴", "경향", "묶어"],
    text: "세 가지가 반복됩니다.\n\n**1. 지연배상 상한 미설정** — 첨부 건 중 2건에서 일 0.1% 요율만 있고 총액 상한이 없습니다. 장기 지연 시 배상액이 계약금액을 넘어설 수 있습니다.\n\n**2. 책임 한도의 기준이 제각각** — 계약금액 100%, 계약 총액, 직전 12개월 지급액이 혼재합니다. 대장에서 노출액을 집계할 수 없는 상태입니다.\n\n**3. 비밀정보 유출 예외의 무한책임** — 2건에서 비밀유지 위반을 한도 예외로 두어, 사실상 상한이 무력화됩니다.",
    follow: ["재협상 우선순위를 정해줘"],
  },
  {
    id: "s-priority",
    q: "재협상 우선순위를 정해줘",
    keys: ["우선순위", "순서", "먼저", "재협상", "액션"],
    text: "노출액 × 갱신 임박도로 계산하면 이 순서입니다.\n\n**1순위 · 여수2공장 촉매공급 (C-24817)** — 노출 38.2억, 아직 미체결이라 지금이 유일한 협상 시점입니다.\n**2순위 · 설비 예방정비 위탁 (C-24810)** — 노출 12.0억, 동일 조항 구조라 1순위와 묶어 같은 문안으로 처리 가능합니다.\n**3순위 · IT 인프라 유지보수 (C-24756)** — 노출 9.6억이지만 갱신까지 여유가 있어 다음 갱신 시점에 정리하는 편이 낫습니다.\n\n1·2순위를 한 건의 표준 문안 개정으로 함께 처리하면 **약 50억 원의 노출을 15억 원 수준으로** 낮출 수 있습니다.",
    follow: ["이 중 우리 표준에 가장 가까운 계약은?"],
  },
];

export const SEARCH_QA_SUGGESTIONS = [
  "첨부한 계약서들의 손해배상 조건을 비교해줘",
  "이 중 우리 표준에 가장 가까운 계약은?",
  "이 계약들의 공통 리스크는?",
  "재협상 우선순위를 정해줘",
];

/* ============================================================
   계약 대장 등록 (분석 완료 → 저장소 반영)
   ============================================================ */
export const LEDGER_TARGET = {
  newId: "C-24818",
  path: "계약DB / 구매 / 원자재 / 2026",
  owner: "홍길동 변호사 · 계약심사팀",
  requester: "구매팀 김현수",
  retention: "계약 종료 후 10년 보존",
  access: "법무실 · 구매팀 · 여수공장 설비운영팀",
  notify: ["구매팀 김현수", "여수공장 설비운영팀"],
  steps: [
    { key: "VAL", label: "필드 검증", detail: "추출 9개 필드 · 대장 스키마 정합성 확인" },
    { key: "DUP", label: "중복 확인", detail: "코퍼스 248,391건 대조 · 동일 문서 여부" },
    { key: "REG", label: "대장 반영", detail: "계약번호 발번 · 메타데이터 기록" },
    { key: "IDX", label: "검색 인덱싱", detail: "조항 청크 분할 · 벡터 임베딩" },
    { key: "NOTI", label: "관계자 알림", detail: "담당자 2명 통지 · 갱신 알림 예약" },
  ],
};

/* ---------- 플레이북 화면: 법무팀이 AI와 기준을 다듬는 대화 ---------- */
export const PLAYBOOK_QA: ChatAnswer[] = [
  {
    id: "p-req",
    q: "현업 수정요청을 받아들여도 될까요?",
    keys: ["수정요청", "요청", "현업", "받아", "수용", "완화"],
    text: "요청 두 건 중 **하나는 받아들이고 하나는 조건부로 다듬는 것**을 권합니다.\n\n**통지기한 90일 → 60일**은 받아들여도 됩니다. 코퍼스에서 갱신 사고가 난 계약 4건은 전부 *무통지 자동연장* 조항 때문이었고, 통지기한 길이 자체가 원인이었던 건은 없습니다. 완화하되 자동연장 배제는 반드시 유지하십시오.\n\n**원상회복 전액 부담**은 문구를 바꾸는 쪽이 낫습니다. 지금 기준(\"통상 마모분 제외\")은 노후 설비 처리가 불명확해 현장에서 계속 다툼이 됩니다. 부담 주체를 마모·노후로 나눠 쓰면 협상 시간이 줄어듭니다.\n\n두 문안 모두 **AI 제안 탭**에 올려두었습니다.",
    cites: [
      { id: "C-24816", title: "OO주유소 부지 임대차계약서(갱신)", loc: "제3조", quote: "임대차 기간은 5년으로 하며, 만료 시 별도 통지 없이 동일 조건으로 1년 자동 연장된다." },
      { id: "C-24816", title: "OO주유소 부지 임대차계약서(갱신)", loc: "제10조", quote: "임차인은 계약 종료 시 시설물을 원상회복하여야 하며, 비용은 전액 임차인이 부담한다." },
    ],
    follow: ["이 기준을 적용하면 기존 계약 몇 건이 걸리나요?", "확정 전에 남은 게 있나요?"],
  },
  {
    id: "p-impact",
    q: "이 기준을 적용하면 기존 계약 몇 건이 걸리나요?",
    keys: ["기존", "몇 건", "적용", "걸리", "영향", "코퍼스"],
    text: "각 항목의 탐지 키워드로 코퍼스를 검색한 결과입니다.\n\n**손해배상 한도** — 매칭 5건 중 **4건이 이탈**입니다. 한도를 아예 정하지 않은 계약(무한책임)이 3건, 100%로 연 계약이 1건입니다.\n**무통지 자동갱신** — 매칭 4건 전부 이탈입니다. 통지 없이 자동 연장되는 조항이 그대로 살아 있습니다.\n**원상회복** — 매칭 1건, 이탈 1건입니다.\n\n항목 카드를 펼치면 어느 계약의 몇 조가 걸렸는지 조항 원문까지 볼 수 있습니다. 기준을 고치면 그 숫자가 즉시 다시 계산됩니다.",
    follow: ["가장 먼저 손봐야 할 항목은?", "확정 전에 남은 게 있나요?"],
  },
  {
    id: "p-priority",
    q: "가장 먼저 손봐야 할 항목은?",
    keys: ["먼저", "우선", "중요", "손봐", "순서"],
    text: "**손해배상 한도 항목**입니다. 이탈 4건 중 3건이 한도를 아예 정하지 않은 계약이라, 사고가 나면 노출액에 상한이 없습니다. 나머지 항목의 이탈은 금액이 정해져 있어 최악의 경우가 계산됩니다.\n\n그다음이 **무통지 자동갱신**입니다. 손해 규모는 작지만 4건 전부가 이탈이고, 통지 한 번을 놓쳐 원치 않는 기간이 연장되는 구조라 실수로 발생하는 빈도가 가장 높습니다.\n\n두 항목 모두 **리스크 규칙으로 등록**해 두면 새 계약이 들어올 때 자동으로 걸립니다.",
    follow: ["이 기준을 적용하면 기존 계약 몇 건이 걸리나요?"],
  },
  {
    id: "p-confirm",
    q: "확정 전에 남은 게 있나요?",
    keys: ["확정", "남은", "체크", "마무리", "배포"],
    text: "확정 전에 세 가지만 확인하시면 됩니다.\n\n**1. 미확인 AI 제안** — 채택하지 않은 제안이 남아 있으면 그 상태로 확정됩니다. 무시할 것은 무시로 표시해 두는 편이 이력이 깔끔합니다.\n**2. 미해결 수정요청** — 확정하면 요청은 모두 처리 완료로 정리됩니다. 반영하지 않기로 한 요청이 있다면 사유를 남겨두십시오.\n**3. 재검토 기한** — 확정 시점부터 다시 1년이 잡힙니다. 지금 확정하면 기한이 오늘 기준으로 갱신됩니다.\n\n내용을 바꿀 것이 없다면 **『변경 없이 재확인』**만 눌러도 기한은 연장됩니다.",
    follow: ["가장 먼저 손봐야 할 항목은?"],
  },
  {
    id: "p-review",
    q: "재검토 기한이 지나면 어떻게 되나요?",
    keys: ["재검토", "기한", "지나", "만료", "갱신", "오래"],
    text: "기한이 지나도 기준이 자동으로 무효가 되지는 않습니다. 다만 **확정본이 1년 넘게 손대지 않은 상태**라는 뜻이라, 목록과 상세 화면에서 붉게 표시되고 재검토 대상으로 집계됩니다.\n\n실무에서 문제가 되는 건 두 가지입니다. 그사이 사내 표준이 바뀌었는데 플레이북이 옛 기준을 그대로 들고 있는 경우, 그리고 그 기준으로 계약을 검토해 놓고 나중에 \"그때 기준이 이미 낡았다\"는 지적을 받는 경우입니다.\n\n내용을 바꿀 필요가 없다면 **『변경 없이 재확인』**으로 기한만 연장하면 됩니다. 그 사실도 개정 이력에 남습니다.",
    follow: ["확정 전에 남은 게 있나요?"],
  },
];

export const PLAYBOOK_QA_SUGGESTIONS = [
  "현업 수정요청을 받아들여도 될까요?",
  "이 기준을 적용하면 기존 계약 몇 건이 걸리나요?",
  "가장 먼저 손봐야 할 항목은?",
  "재검토 기한이 지나면 어떻게 되나요?",
];
