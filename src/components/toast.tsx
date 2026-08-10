"use client";

import { useEffect, useState } from "react";

export function toast(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("app-toast", { detail: message }));
}

export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const handler = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail);
      setShow(true);
      clearTimeout(t);
      t = setTimeout(() => setShow(false), 2600);
    };
    window.addEventListener("app-toast", handler);
    return () => {
      window.removeEventListener("app-toast", handler);
      clearTimeout(t);
    };
  }, []);

  if (!msg) return null;
  return (
    <div
      className="fixed left-1/2 z-[9999] max-w-[90vw] -translate-x-1/2 rounded-[11px] bg-[#101828] px-[18px] py-[11px] text-[13px] font-medium text-white shadow-[0_12px_32px_rgba(16,24,40,.3)] transition-all duration-300"
      style={{
        bottom: 26,
        opacity: show ? 1 : 0,
        transform: `translateX(-50%) translateY(${show ? 0 : 20}px)`,
        pointerEvents: "none",
      }}
    >
      {msg}
    </div>
  );
}
