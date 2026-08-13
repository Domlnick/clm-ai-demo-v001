/* ============================================================
   계약 대장 코퍼스 — 리스크 규칙이 실제로 "검색"되도록
   조항 본문까지 포함한 프로토타입용 샘플
   ============================================================ */
import type { Seg } from "./data";

export type ContractStatus = "predraft" | "review" | "signed" | "amending";

export const STATUS_META: Record<
  ContractStatus,
  { label: string; tone: "gray" | "info" | "ok" | "violet"; desc: string }
> = {
  predraft: { label: "계약 전", tone: "gray", desc: "초안 작성·조건 협의 단계" },
  review: { label: "검토 중", tone: "info", desc: "법무 검토 진행 중" },
  signed: { label: "계약 완료", tone: "ok", desc: "체결 완료·이행 중" },
  amending: { label: "추가 계약 중", tone: "violet", desc: "변경·추가 계약 협의 중" },
};

export const STATUS_ORDER: ContractStatus[] = ["predraft", "review", "signed", "amending"];

export type ContractClause = { no: string; title: string; body: string };

export type VersionChange = {
  id: string;
  field: string;
  before: string;
  after: string;
};

export type ContractVersion = {
  v: string;
  when: string;
  author: string;
  note: string;
  status: ContractStatus;
  changes: VersionChange[];
};

export type Contract = {
  id: string;
  title: string;
  type: string;
  seg: Seg;
  party: string;
  amount: string;
  ft: string;
  path: string;
  signed: string;
  expires: string;
  status: ContractStatus;
  clauses: ContractClause[];
  versions: ContractVersion[];
};

export const CONTRACTS: Contract[] = [
  {
    id: "C-24817",
    title: "여수2공장 촉매 공급계약 (최종본 v3)",
    type: "일반 구매", seg: "S2", party: "한화솔루션", amount: "38.2억",
    ft: "pdf", path: "계약DB / 구매 / 원자재 / 2026",
    signed: "2026-08-08", expires: "2029-08-31", status: "review",
    clauses: [
      { no: "제8조", title: "손해배상", body: "공급자의 손해배상 한도는 본 계약금액의 100%를 초과하지 아니한다. 다만 고의 또는 중과실의 경우에는 그러하지 아니하다." },
      { no: "제12조", title: "지연배상", body: "납품 지연 시 지연일수 1일당 계약금액의 0.1%를 배상한다. 지연배상금의 상한은 정하지 아니한다." },
      { no: "제15조", title: "품질보증", body: "납품일로부터 24개월간 품질을 보증하며, 하자 발생 시 무상 교체한다." },
      { no: "제19조", title: "비밀유지", body: "계약 종료 후 3년간 비밀유지 의무가 존속한다." },
      { no: "제22조", title: "준거법·분쟁해결", body: "대한민국 법률에 따르며 서울중앙지방법원을 전속 관할법원으로 한다." },
    ],
    versions: [
      { v: "v1.0", when: "2026-06-12", author: "구매팀 김현수", note: "공급자 초안 접수", status: "predraft", changes: [] },
      { v: "v2.0", when: "2026-07-20", author: "법무실 홍길동", note: "1차 법무 검토 반영", status: "review", changes: [
        { id: "c1", field: "제15조 품질보증", before: "12개월", after: "24개월" },
        { id: "c2", field: "제19조 비밀유지 존속기간", before: "1년", after: "3년" },
      ] },
      { v: "v3.0", when: "2026-08-08", author: "구매팀 김현수", note: "공급자 역제안 반영 — 책임 조항 후퇴", status: "review", changes: [
        { id: "c3", field: "제8조 손해배상 한도", before: "계약금액의 30%", after: "계약금액의 100%" },
        { id: "c4", field: "제12조 지연배상 상한", before: "계약금액의 10%", after: "상한 없음" },
      ] },
    ],
  },
  {
    id: "C-24810",
    title: "설비 예방정비 위탁 용역계약",
    type: "유지보수", seg: "S2", party: "GS이엔알", amount: "12.0억",
    ft: "pdf", path: "계약DB / 용역 / 유지보수 / 2026",
    signed: "2026-08-05", expires: "2028-08-04", status: "signed",
    clauses: [
      { no: "제11조", title: "손해배상", body: "수급인의 배상책임은 계약금액의 100%를 한도로 하며, 비밀정보 유출로 인한 손해는 한도의 예외로 한다." },
      { no: "제13조", title: "지연배상", body: "지연배상은 일 0.1%로 하며 총액 상한은 정하지 아니한다." },
      { no: "제5조", title: "계약기간", body: "본 계약은 2년으로 하며, 만료 시 별도 통지 없이 동일 조건으로 1년 자동 연장된다." },
      { no: "제20조", title: "준거법·분쟁해결", body: "대한민국 법률에 따르며 서울중앙지방법원을 전속 관할법원으로 한다." },
    ],
    versions: [
      { v: "v1.0", when: "2026-05-30", author: "설비운영팀", note: "표준 템플릿 기반 작성", status: "predraft", changes: [] },
      { v: "v1.1", when: "2026-08-05", author: "법무실 홍길동", note: "체결본", status: "signed", changes: [
        { id: "c5", field: "제5조 갱신 방식", before: "통지 후 갱신", after: "무통지 자동연장" },
      ] },
    ],
  },
  {
    id: "C-24756",
    title: "IT 인프라 유지보수 기술용역",
    type: "용역", seg: "S2", party: "GS ITM", amount: "9.6억",
    ft: "hwp", path: "계약DB / 용역 / IT / 2026",
    signed: "2026-07-30", expires: "2027-07-29", status: "amending",
    clauses: [
      { no: "제9조", title: "손해배상", body: "당사자의 손해배상 총액은 본 계약 총액을 상한으로 한다. 단, 비밀정보 유출에 따른 손해는 예외로 한다." },
      { no: "제6조", title: "계약기간", body: "계약기간은 1년으로 하고 만료 60일 전 서면 통지로 갱신 여부를 정한다." },
      { no: "제17조", title: "지식재산권", body: "본 용역의 결과물에 대한 지식재산권은 수급인에게 귀속한다." },
      { no: "제21조", title: "준거법·분쟁해결", body: "대한민국 법률에 따르며 서울중앙지방법원을 전속 관할법원으로 한다." },
    ],
    versions: [
      { v: "v1.0", when: "2026-07-01", author: "IT기획팀", note: "신규 체결", status: "predraft", changes: [] },
      { v: "v1.1", when: "2026-07-30", author: "법무실 홍길동", note: "체결본", status: "signed", changes: [] },
      { v: "v2.0", when: "2026-08-09", author: "IT기획팀", note: "범위 추가 협의 — 산출물 IP 귀속 변경", status: "amending", changes: [
        { id: "c6", field: "제17조 지식재산권 귀속", before: "발주자 귀속", after: "수급인 귀속" },
      ] },
    ],
  },
  {
    id: "C-23990",
    title: "촉매제 연간 단가계약 (2024)",
    type: "일반 구매", seg: "S2", party: "BASF코리아", amount: "24.0억",
    ft: "pdf", path: "계약DB / 구매 / 원자재 / 2024",
    signed: "2024-11-12", expires: "2026-11-11", status: "signed",
    clauses: [
      { no: "제9조", title: "손해배상", body: "손해배상은 계약금액의 30%를 한도로 하고, 지연배상의 상한은 계약금액의 10%로 한다." },
      { no: "제4조", title: "계약기간", body: "계약기간은 2년으로 하며 만료 90일 전 서면 통지가 없으면 1년 자동 연장된다." },
      { no: "제18조", title: "준거법·분쟁해결", body: "대한민국 법률에 따르며 서울중앙지방법원을 전속 관할법원으로 한다." },
    ],
    versions: [
      { v: "v1.0", when: "2024-11-12", author: "구매팀", note: "체결본", status: "signed", changes: [] },
    ],
  },
  {
    id: "C-22140",
    title: "정보보안 관제 용역계약",
    type: "용역", seg: "S2", party: "안랩", amount: "7.2억",
    ft: "docx", path: "계약DB / 용역 / 보안 / 2025",
    signed: "2025-03-20", expires: "2026-10-16", status: "amending",
    clauses: [
      { no: "제14조", title: "책임의 제한", body: "각 당사자의 손해배상 책임은 직전 12개월 지급액을 상한으로 한다." },
      { no: "제5조", title: "계약기간", body: "계약기간은 1년으로 하며 만료 시 별도 통지 없이 자동 연장된다." },
      { no: "제10조", title: "서비스 수준", body: "월 가동률 99.5% 미만 시 해당 월 대금의 10%를 감액한다." },
    ],
    versions: [
      { v: "v1.0", when: "2025-03-20", author: "정보보안팀", note: "체결본", status: "signed", changes: [] },
      { v: "v1.1", when: "2026-08-01", author: "법무실 홍길동", note: "SLA 조건 재협의 착수", status: "amending", changes: [
        { id: "c7", field: "제10조 SLA 감액률", before: "20%", after: "10%" },
      ] },
    ],
  },
  {
    id: "C-24816",
    title: "OO주유소 부지 임대차계약서 (갱신)",
    type: "주유소 임대차", seg: "S1", party: "대성에너지", amount: "6.4억/년",
    ft: "hwp", path: "계약DB / 임대차 / 주유소 / 2026",
    signed: "2026-08-08", expires: "2031-08-07", status: "review",
    clauses: [
      { no: "제3조", title: "계약기간", body: "임대차 기간은 5년으로 하며, 만료 시 별도 통지 없이 동일 조건으로 1년 자동 연장된다." },
      { no: "제10조", title: "원상회복", body: "임차인은 계약 종료 시 시설물을 원상회복하여야 하며, 비용은 전액 임차인이 부담한다." },
      { no: "제14조", title: "손해배상", body: "임차인의 귀책으로 인한 손해배상 한도는 정하지 아니한다." },
    ],
    versions: [
      { v: "v1.0", when: "2021-08-01", author: "부동산팀", note: "최초 체결", status: "signed", changes: [] },
      { v: "v2.0", when: "2026-08-08", author: "부동산팀", note: "갱신 협의본", status: "review", changes: [
        { id: "c8", field: "제14조 손해배상 한도", before: "계약금액의 30%", after: "한도 없음(무한책임)" },
        { id: "c9", field: "제3조 갱신 방식", before: "통지 후 갱신", after: "무통지 자동연장" },
      ] },
    ],
  },
  {
    id: "C-24813",
    title: "충전소 브랜드 폴사인 사용계약",
    type: "폴사인·상표사용", seg: "S1", party: "지에스칼텍스판매", amount: "0.9억/년",
    ft: "docx", path: "계약DB / 폴사인 / 2026",
    signed: "2026-08-08", expires: "2029-08-07", status: "signed",
    clauses: [
      { no: "제7조", title: "상표 사용", body: "사용자는 발주자가 정한 디자인 가이드에 따라서만 상표를 사용한다." },
      { no: "제12조", title: "손해배상", body: "손해배상은 연간 사용료의 30%를 한도로 한다." },
      { no: "제4조", title: "계약기간", body: "계약기간은 3년으로 하며 만료 90일 전 서면 통지로 갱신 여부를 정한다." },
    ],
    versions: [
      { v: "v1.0", when: "2026-08-08", author: "브랜드팀", note: "체결본", status: "signed", changes: [] },
    ],
  },
  {
    id: "C-24814",
    title: "Crude Oil Term Supply Agreement",
    type: "원유 장기도입", seg: "S3", party: "Saudi Aramco", amount: "USD 620M",
    ft: "pdf", path: "계약DB / 원유 / 2026",
    signed: "2026-08-08", expires: "2031-12-31", status: "signed",
    clauses: [
      { no: "Art.14", title: "Liability", body: "당사자의 손해배상 책임은 상한을 정하지 아니한다." },
      { no: "Art.19", title: "Governing Law", body: "본 계약은 영국법에 따르며 분쟁은 런던국제중재법원(LCIA) 중재로 해결한다." },
      { no: "Art.22", title: "Sanctions", body: "당사자는 국제 경제제재 및 수출통제 법령을 준수한다." },
    ],
    versions: [
      { v: "v1.0", when: "2026-08-08", author: "원유도입팀", note: "체결본", status: "signed", changes: [] },
    ],
  },
  {
    id: "C-24801",
    title: "울산 물류창고 임대차계약",
    type: "임대차", seg: "S1", party: "KCTC", amount: "3.8억/년",
    ft: "pdf", path: "계약DB / 임대차 / 물류 / 2024",
    signed: "2024-09-01", expires: "2026-08-24", status: "amending",
    clauses: [
      { no: "제3조", title: "계약기간", body: "본 계약은 만료 시 별도 통지 없이 동일 조건으로 1년 자동 연장된다." },
      { no: "제11조", title: "손해배상", body: "손해배상 한도는 계약금액의 30%로 한다." },
    ],
    versions: [
      { v: "v1.0", when: "2024-09-01", author: "물류팀", note: "체결본", status: "signed", changes: [] },
      { v: "v1.1", when: "2026-08-05", author: "법무실 홍길동", note: "갱신 통지기한 임박 — 조건 재검토", status: "amending", changes: [] },
    ],
  },
  {
    id: "C-24780",
    title: "여수공장 배관 보수 EPC 계약",
    type: "EPC·건설", seg: "S3", party: "삼성E&A", amount: "142.0억",
    ft: "pdf", path: "계약DB / EPC / 2026",
    signed: "2026-06-15", expires: "2028-06-14", status: "signed",
    clauses: [
      { no: "제16조", title: "손해배상", body: "시공자의 손해배상 한도는 계약금액의 100%로 한다." },
      { no: "제18조", title: "지연배상", body: "준공 지연 시 일 0.15%를 배상하며 지연배상금의 상한은 계약금액의 10%로 한다." },
      { no: "제24조", title: "불가항력", body: "천재지변, 전쟁, 감염병의 세계적 유행 및 국제 경제제재를 불가항력 사유에 포함한다." },
    ],
    versions: [
      { v: "v1.0", when: "2026-04-02", author: "설비기술팀", note: "입찰 제안본", status: "predraft", changes: [] },
      { v: "v2.0", when: "2026-06-15", author: "법무실 홍길동", note: "체결본", status: "signed", changes: [
        { id: "c10", field: "제16조 손해배상 한도", before: "계약금액의 50%", after: "계약금액의 100%" },
      ] },
    ],
  },
  {
    id: "C-24770",
    title: "윤활유 공동 브랜드 개발 NDA",
    type: "비밀유지(NDA)", seg: "S2", party: "SK엔무브", amount: "-",
    ft: "docx", path: "계약DB / NDA / 2026",
    signed: "2026-05-11", expires: "2029-05-10", status: "signed",
    clauses: [
      { no: "제4조", title: "비밀유지", body: "비밀유지 의무는 계약 종료 후 3년간 존속한다." },
      { no: "제7조", title: "위약벌", body: "비밀유지 의무 위반 시 위약벌로 5억 원을 지급하며 이는 손해배상과 별도로 한다." },
      { no: "제9조", title: "준거법", body: "대한민국 법률에 따르며 서울중앙지방법원을 전속 관할법원으로 한다." },
    ],
    versions: [
      { v: "v1.0", when: "2026-05-11", author: "신사업팀", note: "체결본", status: "signed", changes: [] },
    ],
  },
  {
    id: "C-24825",
    title: "수소충전소 운영 위탁계약 (초안)",
    type: "위탁운영", seg: "S1", party: "미정 (3사 검토 중)", amount: "4.5억/년",
    ft: "docx", path: "계약DB / 위탁운영 / 2026",
    signed: "-", expires: "-", status: "predraft",
    clauses: [
      { no: "제6조", title: "계약기간", body: "계약기간은 3년으로 하며 만료 90일 전 서면 통지로 갱신 여부를 정한다." },
      { no: "제13조", title: "손해배상", body: "수탁자의 손해배상 한도는 정하지 아니한다." },
      { no: "제15조", title: "안전관리", body: "수탁자는 고압가스 안전관리법령을 준수하고 사고 발생 시 즉시 통지한다." },
    ],
    versions: [
      { v: "v0.1", when: "2026-08-02", author: "신에너지팀", note: "표준 템플릿 기반 초안", status: "predraft", changes: [] },
    ],
  },
];

export function getContract(id: string): Contract | undefined {
  return CONTRACTS.find((c) => c.id === id);
}
