import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/hooks/use-auth";

export const metadata: Metadata = {
  title: {
    default: '城市轨道交通隐患排查治理系统',
    template: '%s | 城市轨道交通隐患排查治理系统',
  },
  description: '城市轨道交通运营风险隐患排查与治理管理系统',
  keywords: ['隐患排查', '风险管理', '城市轨道交通', '安全管理'],
  authors: [{ name: '物资后勤中心' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
