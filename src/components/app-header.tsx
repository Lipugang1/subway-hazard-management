'use client';

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Train, LogOut, Settings } from "lucide-react";
import { usePathname } from "next/navigation";

export function AppHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const navItems = [
    { href: "/dashboard", label: "首页" },
    { href: "/hazards", label: "隐患管理" },
    { href: "/risk-database", label: "风险数据库" },
    { href: "/analytics", label: "数据分析" },
  ];

  const isActive = (href: string) => pathname?.startsWith(href) || false;

  return (
    <>
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Train className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-semibold">隐患排查治理系统</h1>
                <p className="text-xs text-muted-foreground">物资后勤中心</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.inspection_department} / {user?.inspection_position}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                退出
              </Button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-1 h-12">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={"px-4 py-2 text-sm font-medium " + (isActive(item.href) ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-600 hover:text-blue-600")}
              >
                {item.label}
              </Link>
            ))}
            {(user?.role === "admin" || user?.role === "reviewer") && (
              <Link
                href="/admin"
                className={"px-4 py-2 text-sm font-medium " + (isActive("/admin") ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-600 hover:text-blue-600")}
              >
                <Settings className="w-4 h-4 inline mr-1" />
                管理
              </Link>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
