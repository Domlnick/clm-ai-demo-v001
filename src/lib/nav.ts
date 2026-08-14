import {
  LayoutGrid,
  Inbox,
  ScanText,
  Search,
  PenLine,
  BookText,
  BellRing,
  ShieldAlert,
  Settings,
  Compass,
  Handshake,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  badge?: string;
  warn?: boolean;
};

export type NavGroup = { group: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    group: "워크스페이스",
    items: [
      { id: "dashboard", label: "대시보드", icon: LayoutGrid, href: "/" },
      { id: "mytasks", label: "내 검토함", icon: Inbox, badge: "6" },
    ],
  },
  {
    group: "계약 AI",
    items: [
      { id: "analyze", label: "계약서 분석·요약", icon: ScanText, href: "/analyze" },
      { id: "search", label: "계약서 검색", icon: Search },
      { id: "draft", label: "초안 작성 어시스트", icon: PenLine },
    ],
  },
  {
    group: "계약 자산",
    items: [
      { id: "ledger", label: "계약 대장", icon: BookText },
      { id: "playbook", label: "협상 플레이북", icon: Handshake, warn: true },
      { id: "renewal", label: "만료·갱신 관리", icon: BellRing, badge: "3", warn: true },
      { id: "risk", label: "리스크 관리", icon: ShieldAlert },
      { id: "similar", label: "유사 계약 탐색", icon: Compass },
    ],
  },
  {
    group: "관리",
    items: [{ id: "settings", label: "설정", icon: Settings }],
  },
];
