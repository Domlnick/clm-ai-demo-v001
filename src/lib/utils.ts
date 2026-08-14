import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 한글 받침에 따라 주격/주제 조사를 골라 줍니다.
 *   topicParticle("계약 대장") → "은"   (받침 있음)
 *   topicParticle("리스크 관리") → "는"  (받침 없음)
 * 화면 이름을 문장에 끼워 넣을 때 씁니다.
 */
export function topicParticle(word: string): "은" | "는" {
  const last = word.trim().at(-1) ?? "";
  const code = last.charCodeAt(0);
  /* 한글 음절이 아니면 받침 없는 쪽으로 둡니다 */
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return "는";
  return (code - 0xac00) % 28 === 0 ? "는" : "은";
}
