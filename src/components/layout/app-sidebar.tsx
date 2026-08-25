"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type MenuItem = {
  label: string;
  href: string;
  icon: string;
};

const contractMenu: MenuItem[] = [
  {
    label: "Tổng quan",
    href: "/",
    icon: "▦",
  },
  {
    label: "Hợp đồng",
    href: "/contracts",
    icon: "▣",
  },
  {
    label: "Quyết định giám sát",
    href: "/supervision-decisions",
    icon: "✓",
  },
  {
    label: "Tiến độ & Mốc tiến độ",
    href: "/milestones",
    icon: "◷",
  },
  {
    label: "Kiểm tra & Giám sát",
    href: "/inspections",
    icon: "⌕",
  },
  {
    label: "Tồn tại / Vấn đề kỹ thuật",
    href: "/issues",
    icon: "!",
  },
  {
    label: "Nghiệm thu",
    href: "/acceptance",
    icon: "✓",
  },
  {
    label: "Hồ sơ / Tài liệu",
    href: "/documents",
    icon: "▤",
  },
];

const masterDataMenu: MenuItem[] = [
  {
    label: "Đơn vị",
    href: "/departments",
    icon: "◇",
  },
  {
    label: "Nhân sự",
    href: "/personnel",
    icon: "♙",
  },
  {
    label: "Nhà thầu",
    href: "/contractors",
    icon: "▱",
  },
];

function SidebarItem({
  item,
  pathname,
}: {
  item: MenuItem;
  pathname: string;
}) {
  const isActive =
    item.href === "/"
      ? pathname === "/"
      : pathname === item.href ||
        pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      className={[
        "group flex min-h-[34px] items-center gap-2 rounded-lg border px-2.5 py-1.5",
        "text-[11px] font-medium transition-all duration-150",
        isActive
          ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
          : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-md border text-[10px]",
          isActive
            ? "border-blue-200 bg-white text-blue-700"
            : "border-slate-200 bg-white text-slate-500 group-hover:text-slate-700",
        ].join(" ")}
      >
        {item.icon}
      </span>

      <span className="min-w-0 leading-[1.25]">
        {item.label}
      </span>
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[188px] shrink-0 border-r border-slate-200 bg-white lg:block">
      <div className="sticky top-[52px] flex h-[calc(100vh-52px)] flex-col">
        {/* MAIN NAVIGATION */}
        <div className="flex-1 overflow-y-auto px-2 py-3">
          <div className="mb-2 px-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">
              Quản lý hợp đồng
            </p>
          </div>

          <nav className="space-y-1">
            {contractMenu.map((item) => (
              <SidebarItem
                key={item.href}
                item={item}
                pathname={pathname}
              />
            ))}
          </nav>

          {/* DIVIDER */}
          <div className="my-3 border-t border-slate-200" />

          {/* MASTER DATA */}
          <div className="mb-2 px-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">
              Danh mục
            </p>
          </div>

          <nav className="space-y-1">
            {masterDataMenu.map((item) => (
              <SidebarItem
                key={item.href}
                item={item}
                pathname={pathname}
              />
            ))}
          </nav>
        </div>

        {/* SIDEBAR FOOTER */}
        <div className="border-t border-slate-200 p-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[9px] font-bold text-white">
                VH1
              </div>

              <div className="min-w-0">
                <p className="truncate text-[10px] font-semibold text-slate-800">
                  Quản lý hợp đồng VH1
                </p>

                <p className="truncate text-[8px] text-slate-400">
                  Web quản lý hợp đồng
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
