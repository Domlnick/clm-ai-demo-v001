"use client";

import { CalendarClock, AlertTriangle } from "lucide-react";
import { nextReviewDate, reviewLabel, reviewState, type Playbook } from "@/lib/playbooks";
import { cn } from "@/lib/utils";

/** 정기 재검토 기한까지 남은 일수 — "재검토 D-36" / "재검토 기한 D+51 초과" */
export function ReviewBadge({ pb, className }: { pb: Playbook; className?: string }) {
  const rs = reviewState(pb);
  const label = reviewLabel(pb);
  const next = nextReviewDate(pb);

  return (
    <span
      className={cn(
        "inline-flex h-[19px] items-center gap-1 whitespace-nowrap rounded-[7px] px-[9px] text-[10.5px] font-bold",
        rs === "overdue"
          ? "bg-[var(--red-soft)] text-[#a52f22]"
          : rs === "due"
            ? "bg-[var(--amber-soft)] text-[#93610a]"
            : rs === "ok"
              ? "bg-surface-3 text-t3"
              : "bg-surface-3 text-t4",
        className,
      )}
      title={next ? `다음 재검토 기한 ${next} · ${pb.reviewCycleMonths}개월 주기` : "아직 확정된 적이 없습니다"}
    >
      {rs === "overdue" ? <AlertTriangle size={11} /> : <CalendarClock size={11} />}
      {label}
    </span>
  );
}
