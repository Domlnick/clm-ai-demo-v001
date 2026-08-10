import { cn } from "@/lib/utils";

/* ============ Pill / status badge ============ */
type Tone = "accent" | "ok" | "warn" | "crit" | "info" | "violet" | "gray" | "solid";
const TONE: Record<Tone, string> = {
  accent: "bg-[var(--accent-soft)] text-[var(--accent-text)]",
  ok: "bg-[var(--green-soft)] text-[#0a6b42]",
  warn: "bg-[var(--amber-soft)] text-[#93610a]",
  crit: "bg-[var(--red-soft)] text-[#a52f22]",
  info: "bg-[var(--blue-soft)] text-[#1a5a82]",
  violet: "bg-[var(--violet-soft)] text-[#4f3fb0]",
  gray: "bg-surface-3 text-t3",
  solid: "bg-[var(--accent)] text-white",
};

export function Pill({
  children,
  tone = "gray",
  dot = false,
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-[7px] px-[9px] text-[11.5px] font-bold tracking-[-.1px]",
        TONE[tone],
        className,
      )}
    >
      {dot && <span className="h-[6px] w-[6px] rounded-full bg-current opacity-90" />}
      {children}
    </span>
  );
}

/* ============ Tag (soft, small) ============ */
export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-[21px] items-center rounded-md bg-surface-3 px-2 text-[11px] font-semibold text-t3",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ============ Hashtag chip ============ */
export function Hashtag({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-[26px] items-center gap-1 rounded-full border border-[#d3e8ec] bg-[var(--accent-soft)] px-[10px] text-[12px] font-semibold text-[var(--accent-text)] transition hover:bg-[var(--accent)] hover:text-white"
    >
      <span className="opacity-60">#</span>
      {label}
    </button>
  );
}

/* ============ File-type square ============ */
const FT: Record<string, string> = {
  pdf: "ft-pdf",
  hwp: "ft-hwp",
  docx: "ft-docx",
  xlsx: "ft-xlsx",
  txt: "ft-txt",
  img: "ft-img",
};
export function FileType({ type, size = 19 }: { type: string; size?: number }) {
  const t = type.toLowerCase();
  return (
    <span
      className={cn("ft rounded-[5px]", FT[t] ?? "ft-txt")}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {t.slice(0, 4).toUpperCase()}
    </span>
  );
}

/* ============ Score ring ============ */
export function ScoreRing({ value, size = 46 }: { value: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - value / 100);
  const color = value >= 85 ? "#1e7a52" : value >= 70 ? "#0f6e82" : "#b0740b";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8eef0" strokeWidth={4} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <span className="num absolute inset-0 flex items-center justify-center text-[12.5px] font-bold tracking-[-.4px] text-t1">
        {value}
      </span>
    </div>
  );
}

/* ============ Section card ============ */
export function SectionCard({
  title,
  icon,
  sub,
  right,
  children,
  className,
  bodyClass,
}: {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  sub?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[var(--radius)] border border-line bg-surface shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-line-soft px-5 py-[15px]">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2.5 text-[15px] font-bold tracking-[-.3px] text-t1">
              {icon}
              {title}
            </h3>
            {sub && <p className="mt-0.5 text-[12px] font-medium text-t3">{sub}</p>}
          </div>
          {right && <div className="flex flex-shrink-0 items-center gap-2.5">{right}</div>}
        </div>
      )}
      <div className={cn("p-5", bodyClass)}>{children}</div>
    </section>
  );
}

/* ============ Progress bar (thin) ============ */
export function Bar({ value, tone = "accent" }: { value: number; tone?: "accent" | "ok" | "warn" | "crit" }) {
  const bg =
    tone === "ok"
      ? "linear-gradient(90deg,#22a869,#158a4e)"
      : tone === "warn"
        ? "linear-gradient(90deg,#e0a52a,#c07c0b)"
        : tone === "crit"
          ? "linear-gradient(90deg,#e06a5a,#c0392b)"
          : "var(--accent-grad)";
  return (
    <div className="h-[6px] overflow-hidden rounded-full bg-[#eceef2]">
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${value}%`, background: bg }} />
    </div>
  );
}
