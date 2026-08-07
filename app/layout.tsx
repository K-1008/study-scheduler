import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/app/Nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "復習スケジュール管理",
  description: "FSRSアルゴリズムによる復習日管理アプリ",
  // ホーム画面に追加したときにブラウザUIを隠して全画面表示する(iOS)
  appleWebApp: { capable: true, title: "復習", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#18181b",
  // スマホでの誤操作ズームを防ぐが、拡大自体は許可する
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Nav />
        {children}
      </body>
    </html>
  );
}
