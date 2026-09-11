"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type MenuItem = { label: string; href: string; icon: string };
const contractMenu: MenuItem[] = [
  { label: "Tổng quan", href: "/", icon: "▦" },
  { label: "Hợp đồng", href: "/contracts", icon: "▣" },
  { label: "Quyết định giám sát", href: "/supervision-decisions", icon: "✓" },
  { label: "Tiến độ & Mốc tiến độ", href: "/milestones", icon: "◷" },
  { label: "Kiểm tra & Giám sát", href: "/inspections", icon: "⌕" },
  { label: "Tồn tại / Vấn đề kỹ thuật", href: "/issues", icon: "!" },
  { label: "Nghiệm thu", href: "/acceptance", icon: "✓" },
  { label: "Hồ sơ / Tài liệu", href: "/documents", icon: "▤" },
];
const masterDataMenu: MenuItem[] = [
  { label: "Đơn vị", href: "/departments", icon: "◇" },
  { label: "Nhân sự", href: "/personnel", icon: "♙" },
  { label: "Nhà thầu", href: "/contractors", icon: "▱" },
];

function SidebarItem({ item, pathname }: { item: MenuItem; pathname: string }) {
  const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
  return (
    <Link href={item.href} className={`group relative flex min-h-[42px] items-center gap-3 rounded-xl border px-3 py-2 text-[11px] font-semibold transition-all ${active ? "border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 shadow-sm" : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"}`}>
      {active && <span className="absolute -left-[9px] h-7 w-1 rounded-r-full bg-gradient-to-b from-amber-300 to-yellow-500" />}
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[11px] transition ${active ? "border-blue-500 bg-gradient-to-br from-blue-500 to-indigo-700 text-white shadow-md shadow-blue-200" : "border-slate-200 bg-white text-slate-500 group-hover:border-blue-200 group-hover:text-blue-700"}`}>{item.icon}</span>
      <span className="min-w-0 leading-tight">{item.label}</span>
      {active && <span className="ml-auto text-[9px] text-blue-400">›</span>}
    </Link>
  );
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 mt-1 flex items-center gap-2 px-2"><span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_0_4px_rgba(252,211,77,0.16)]" /><p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-500">{children}</p><span className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" /></div>;
}

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-[268px] shrink-0 border-r border-slate-200/80 bg-white lg:block">
      <div className="sticky top-[72px] flex h-[calc(100vh-72px)] flex-col">
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <GroupTitle>Quản lý hợp đồng</GroupTitle>
          <nav className="space-y-1">{contractMenu.map((item) => <SidebarItem key={item.href} item={item} pathname={pathname} />)}</nav>
          <div className="my-4 border-t border-slate-100" />
          <GroupTitle>Danh mục dùng chung</GroupTitle>
          <nav className="space-y-1">{masterDataMenu.map((item) => <SidebarItem key={item.href} item={item} pathname={pathname} />)}</nav>
        </div>
        <div className="border-t border-slate-100 p-3">
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-3 shadow-sm">
            <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 text-xs font-bold text-white shadow-md">VH1</span><div className="min-w-0"><p className="truncate text-[10px] font-bold text-slate-800">Phân xưởng Vận hành 1</p><p className="mt-1 text-[8px] text-emerald-600">● Hệ thống DEV đang hoạt động</p></div></div>
          </div>
        </div>
      </div>
    </aside>
  );
}
