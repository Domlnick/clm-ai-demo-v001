import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { Toaster } from "@/components/toast";

export const metadata: Metadata = {
  title: "GS칼텍스 법무 AI · 계약서 분류·요약 시스템",
  description:
    "수십만 건의 계약서를 AI로 분류·요약·검색하고 초안 작성을 지원하는 POC 프로토타입",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  );
}
