"use client";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 h-[52px] border-b border-slate-200 bg-white">
      <div className="flex h-full items-center">
        {/* =====================================================
            LOGO / BRAND
        ===================================================== */}
        <div className="flex w-[188px] shrink-0 items-center gap-2 border-r border-slate-200 px-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-[9px] font-bold text-white shadow-sm">
            VH1
          </div>

          <div className="min-w-0">
            <div className="truncate text-[13px] font-bold leading-none text-slate-900">
              Quản lý hợp đồng VH1
            </div>

            <div className="mt-1 truncate text-[8px] text-slate-400">
              Web quản lý hợp đồng
            </div>
          </div>
        </div>

        {/* =====================================================
            HEADER CONTENT
        ===================================================== */}
        <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
          {/* MENU BUTTON */}
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            title="Menu"
          >
            <span className="text-[16px] leading-none">☰</span>
          </button>

          {/* GLOBAL SEARCH */}
          <div className="relative hidden w-full max-w-[420px] md:block">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <span className="text-[12px] text-slate-400">
                ⌕
              </span>
            </div>

            <input
              type="text"
              placeholder="Tìm hợp đồng, nhân sự, nhà thầu..."
              className="
                h-8
                w-full
                rounded-lg
                border
                border-slate-200
                bg-slate-50
                pl-8
                pr-12
                text-[10px]
                text-slate-700
                outline-none
                transition
                placeholder:text-slate-400
                focus:border-blue-300
                focus:bg-white
                focus:ring-2
                focus:ring-blue-100
              "
            />

            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
              <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[8px] text-slate-400">
                Ctrl K
              </span>
            </div>
          </div>

          {/* =====================================================
              RIGHT ACTIONS
          ===================================================== */}
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {/* NOTIFICATION */}
            <button
              type="button"
              className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-[13px] text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              title="Thông báo"
            >
              ♢

              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>

            {/* QUICK ACTION */}
            <button
              type="button"
              className="hidden h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 lg:flex"
            >
              <span className="text-blue-600">＋</span>
              Thao tác nhanh
            </button>

            {/* SETTINGS */}
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-[13px] text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              title="Cài đặt"
            >
              ⚙
            </button>

            {/* DIVIDER */}
            <div className="mx-1 h-6 w-px bg-slate-200" />

            {/* USER */}
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition hover:bg-slate-50"
            >
              {/* USER INFORMATION */}
              <div className="hidden text-right sm:block">
                <p className="max-w-[130px] truncate text-[10px] font-semibold leading-tight text-slate-800">
                  Người dùng VH1
                </p>

                <p className="mt-0.5 text-[8px] leading-tight text-slate-400">
                  Quản lý kỹ thuật
                </p>
              </div>

              {/* AVATAR */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white bg-blue-100 text-[9px] font-bold text-blue-700 shadow-sm">
                VH1
              </div>

              {/* DROPDOWN */}
              <span className="hidden text-[9px] text-slate-400 lg:block">
                ▾
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
