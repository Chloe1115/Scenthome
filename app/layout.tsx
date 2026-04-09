import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";

import "@/app/globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "乡忆 ScentHome",
  description: "用 AI 将记忆线索转译成可体验的故乡气味方案。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${newsreader.variable} ${manrope.variable} bg-background font-body text-foreground antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
