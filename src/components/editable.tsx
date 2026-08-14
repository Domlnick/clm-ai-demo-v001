"use client";

/* ============================================================
   AI 결과를 사람이 고치는 편집 요소
   ------------------------------------------------------------
   분석 결과의 각 항목을 제자리에서 수정하고, 고친 항목에는
   "사람이 수정" 배지와 되돌리기를 붙입니다. 수정값·원본·수정자·시각은
   store 의 edits 에 경로 키로 남습니다.

   편집 권한은 permissions 의 editSummary — 법무 담당자 이상입니다.
   권한이 없으면 편집으로 진입하지 않고 사유를 토스트로 알립니다.
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Pencil, RotateCcw, UserPen, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/lib/permissions";
import { useStore, type AnalysisEdit } from "@/lib/store";
import { cn } from "@/lib/utils";

export type ResultEdits = {
  canEdit: boolean;
  deniedReason: string | null;
  /** 수정된 항목 수 */
  count: number;
  entries: Array<{ key: string; edit: AnalysisEdit }>;
  /** 화면에 보여줄 값 — 사람이 고쳤으면 그 값, 아니면 AI 원본 */
  value: (key: string, original: string) => string;
  isEdited: (key: string) => boolean;
  meta: (key: string) => AnalysisEdit | undefined;
  /** 저장 성공 여부. 권한이 없으면 false 이고 토스트로 사유를 알립니다 */
  save: (key: string, original: string, value: string) => boolean;
  revert: (key: string) => void;
  revertAll: () => void;
};

export function useResultEdits(): ResultEdits {
  const { edits, setEdit, clearEdit, clearAllEdits } = useStore();
  const { allow, guard, reason } = usePermissions();
  const { user } = useAuth();
  const by = user ? `${user.name} ${user.title}` : "알 수 없음";

  return {
    canEdit: allow("editSummary"),
    deniedReason: reason("editSummary"),
    count: Object.keys(edits).length,
    entries: Object.entries(edits).map(([key, edit]) => ({ key, edit })),
    value: (key, original) => edits[key]?.value ?? original,
    isEdited: (key) => Boolean(edits[key]),
    meta: (key) => edits[key],
    save: (key, original, value) => {
      if (!guard("editSummary")) return false;
      setEdit(key, value, original, by);
      return true;
    },
    revert: (key) => {
      if (!guard("editSummary")) return;
      clearEdit(key);
    },
    revertAll: () => {
      if (!guard("editSummary")) return;
      clearAllEdits();
    },
  };
}

/** 수정된 항목 뒤에 붙는 배지 + 되돌리기 */
function EditedMark({ ed, k, compact }: { ed: ResultEdits; k: string; compact?: boolean }) {
  const m = ed.meta(k);
  if (!m) return null;
  return (
    <span className="inline-flex flex-shrink-0 items-center gap-1 align-middle">
      <span
        title={`AI 원본: ${m.original || "(비어 있음)"}\n수정: ${m.by} · ${m.at}`}
        className="inline-flex items-center gap-1 rounded-md bg-[var(--violet-soft)] px-1.5 py-px text-[10px] font-bold text-[var(--violet)]"
      >
        <UserPen size={10} />
        {compact ? "수정" : "사람이 수정"}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          ed.revert(k);
        }}
        title="AI 원본으로 되돌리기"
        className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] text-t4 transition hover:bg-surface-3 hover:text-t2"
      >
        <RotateCcw size={11} />
      </button>
    </span>
  );
}

/** 제자리 텍스트 편집 — 한 줄 입력 또는 여러 줄 */
export function EditableText({
  ed,
  k,
  original,
  multiline,
  className,
  inputClass,
  compactMark,
  placeholder,
}: {
  ed: ResultEdits;
  k: string;
  original: string;
  multiline?: boolean;
  className?: string;
  inputClass?: string;
  compactMark?: boolean;
  placeholder?: string;
}) {
  const current = ed.value(k, original);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(current);
  const box = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  /* 취소 버튼을 누른 blur 는 저장하지 않기 위한 표시 */
  const cancelling = useRef(false);

  useEffect(() => {
    if (editing) {
      box.current?.focus();
      box.current?.select();
    }
  }, [editing]);

  const start = () => {
    if (!ed.canEdit) {
      /* 권한 없으면 저장 단계에서 사유를 알립니다 */
      ed.save(k, original, current);
      return;
    }
    setDraft(current);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    if (draft === current) return;
    ed.save(k, original, draft);
  };

  const cancel = () => {
    cancelling.current = true;
    setEditing(false);
  };

  /* 다른 곳을 누르거나 탭을 옮겨도 입력이 사라지지 않게 저장합니다 */
  const onBlur = () => {
    if (cancelling.current) {
      cancelling.current = false;
      return;
    }
    commit();
  };

  if (editing) {
    const shared = {
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          cancel();
        }
        if (e.key === "Enter" && (!multiline || e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          commit();
        }
      },
      placeholder,
      className: cn(
        "w-full rounded-[8px] border border-[var(--accent)] bg-surface px-2 py-1 outline-none ring-[3px] ring-[var(--accent-soft)]",
        inputClass ?? className,
      ),
    };
    return (
      <span className="flex items-start gap-1.5">
        {multiline ? (
          <textarea {...shared} ref={box as React.Ref<HTMLTextAreaElement>} rows={3} />
        ) : (
          <input {...shared} ref={box as React.Ref<HTMLInputElement>} />
        )}
        <button onClick={commit} title="저장 (Enter)" className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[6px] bg-[var(--accent)] text-white transition hover:bg-[var(--accent-600)]">
          <Check size={13} />
        </button>
        <button onMouseDown={cancel} onClick={cancel} title="취소 (Esc)" className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[6px] border border-line text-t3 transition hover:bg-surface-2">
          <X size={13} />
        </button>
      </span>
    );
  }

  return (
    <span className={cn("group/edit inline-flex flex-wrap items-center gap-1.5", className)}>
      <span>{current || <span className="text-t4">{placeholder ?? "비어 있음"}</span>}</span>
      <button
        onClick={start}
        title={ed.canEdit ? "수정" : (ed.deniedReason ?? undefined)}
        className={cn(
          "flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[5px] text-t4 opacity-0 transition group-hover/edit:opacity-100 hover:bg-surface-3 hover:text-t2",
          !ed.canEdit && "cursor-not-allowed",
        )}
      >
        <Pencil size={11} />
      </button>
      <EditedMark ed={ed} k={k} compact={compactMark} />
    </span>
  );
}

/** 정해진 값 중 하나로 바꾸는 편집 — 분류·리스크 등급 */
export function EditableChoice({
  ed,
  k,
  original,
  options,
  className,
  compactMark,
  children,
}: {
  ed: ResultEdits;
  k: string;
  original: string;
  options: Array<{ value: string; label: string }>;
  className?: string;
  compactMark?: boolean;
  /** 값을 그대로 쓰지 않고 배지 등으로 보여줄 때 */
  children?: (value: string) => React.ReactNode;
}) {
  const current = ed.value(k, original);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  /* 스크롤 컨테이너에 잘리지 않도록 메뉴를 body 로 띄우고 좌표를 직접 계산합니다 */
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const MENU_W = 240;
  const place = useCallback(() => {
    const r = trigger.current?.getBoundingClientRect();
    if (!r) return;
    const h = menu.current?.offsetHeight ?? 8 + options.length * 30;
    const gap = 6;
    /* 아래 공간이 부족하면 위로 뒤집습니다 */
    const below = window.innerHeight - r.bottom;
    const top = below < h + gap && r.top > h + gap ? r.top - h - gap : r.bottom + gap;
    const left = Math.min(Math.max(8, r.left), window.innerWidth - MENU_W - 8);
    setPos({ left, top });
  }, [options.length]);

  useEffect(() => {
    if (!open) return;
    /* 실제 메뉴 높이가 정해진 뒤 한 번 더 맞춥니다 (위로 뒤집는 경우 대비) */
    const raf = requestAnimationFrame(place);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!box.current?.contains(t) && !menu.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    /* 어느 컨테이너가 스크롤되든 따라 움직이게 캡처 단계에서 듣습니다 */
    const onMove = () => place();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, place]);

  const label = options.find((o) => o.value === current)?.label ?? current;

  return (
    <span ref={box} className={cn("group/edit relative inline-flex items-center gap-1.5", className)}>
      {children ? children(current) : <span>{label}</span>}
      <button
        ref={trigger}
        onClick={() => {
          if (!ed.canEdit) {
            ed.save(k, original, current);
            return;
          }
          setOpen((o) => {
            if (!o) place();
            return !o;
          });
        }}
        title={ed.canEdit ? "다시 판정" : (ed.deniedReason ?? undefined)}
        className={cn(
          "flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[5px] text-t4 transition hover:bg-surface-3 hover:text-t2",
          open ? "opacity-100" : "opacity-0 group-hover/edit:opacity-100",
          !ed.canEdit && "cursor-not-allowed",
        )}
      >
        <Pencil size={11} />
      </button>
      <EditedMark ed={ed} k={k} compact={compactMark} />

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menu}
            role="listbox"
            style={{ position: "fixed", left: pos?.left ?? -9999, top: pos?.top ?? -9999, width: MENU_W }}
            className="z-[300] flex flex-col overflow-hidden rounded-[11px] border border-line bg-surface py-1 shadow-[var(--shadow-pop)]"
          >
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => {
                  setOpen(false);
                  if (o.value !== current) ed.save(k, original, o.value);
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-left text-[12.5px] transition hover:bg-surface-2",
                  o.value === current ? "font-bold text-[var(--accent-text)]" : "text-t2",
                )}
              >
                {o.value === current ? <Check size={12} className="flex-shrink-0" /> : <span className="w-3 flex-shrink-0" />}
                {o.label}
                {o.value === original && <span className="ml-auto text-[10px] text-t4">AI 판정</span>}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </span>
  );
}

/** 결과 화면 상단의 수정 현황 — 몇 건 고쳤는지, 무엇을 고쳤는지 */
export function EditSummaryChip({ ed }: { ed: ResultEdits }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (ed.count === 0) return null;

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-1.5 rounded-[8px] border border-[#d9d2f6] bg-[var(--violet-soft)] px-3 text-[12.5px] font-bold text-[var(--violet)] transition hover:brightness-95"
      >
        <UserPen size={14} /> 사람이 수정 <span className="num">{ed.count}</span>건
      </button>

      {open && (
        <div className="absolute right-0 top-[40px] z-[80] w-[340px] overflow-hidden rounded-[13px] border border-line bg-surface shadow-[var(--shadow-pop)]">
          <div className="flex items-center gap-2 border-b border-line-soft px-3.5 py-2.5">
            <span className="text-[12.5px] font-bold text-t1">AI 결과 수정 내역</span>
            <button
              onClick={() => {
                setOpen(false);
                ed.revertAll();
              }}
              className="ml-auto flex items-center gap-1 rounded-[7px] border border-line px-2 py-1 text-[11px] font-semibold text-t3 transition hover:text-t1"
            >
              <RotateCcw size={11} /> 전체 되돌리기
            </button>
          </div>
          <div className="max-h-[260px] overflow-y-auto">
            {ed.entries.map(({ key, edit }) => (
              <div key={key} className="border-b border-line-soft px-3.5 py-2.5 last:border-0">
                <div className="num text-[10.5px] font-semibold text-t4">{EDIT_LABEL(key)}</div>
                <div className="mt-1 text-[11.5px] leading-snug text-t4 line-through">{edit.original || "(비어 있음)"}</div>
                <div className="mt-0.5 text-[12.5px] font-semibold leading-snug text-t1">{edit.value || "(비어 있음)"}</div>
                <div className="num mt-1 text-[10.5px] text-t4">{edit.by} · {edit.at}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** 저장 키를 사람이 읽는 이름으로 */
function EDIT_LABEL(key: string): string {
  if (key === "meta.type") return "계약 유형";
  if (key === "meta.seg") return "업무 영역";
  if (key === "summary1") return "한줄 요약";
  if (key.startsWith("summary2.")) return `핵심 요약 ${Number(key.split(".")[1]) + 1}번째 줄`;
  if (key.startsWith("field.")) return `대장 필드 · ${key.slice("field.".length)}`;
  if (key.startsWith("clause.")) {
    const [, no, what] = key.split(".");
    return `조항 ${no} · ${what === "risk" ? "위험도" : "요약"}`;
  }
  if (key.startsWith("risk.")) return `리스크 등급 · ${key.slice("risk.".length).replace(".level", "")}`;
  return key;
}
