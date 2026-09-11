"use client";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 h-[72px] border-b border-slate-200/80 bg-white/95 shadow-[0_1px_14px_rgba(15,23,42,0.04)] backdrop-blur">
      <div className="flex h-full items-center">
        <div className="flex w-[268px] shrink-0 items-center px-3">
          <div className="flex h-[52px] w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-[#263d84] via-[#3554a5] to-[#647fb3] px-3 text-white shadow-lg shadow-blue-900/15">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-black text-blue-800 shadow-sm">VH1</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-extrabold tracking-wide">VẬN HÀNH 1</p>
              <p className="mt-0.5 truncate text-[8px] font-semibold tracking-[0.16em] text-blue-100">QUẢN LÝ HỢP ĐỒNG</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-300/60 bg-amber-300/15 text-amber-200">ϟ</span>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-4 px-4">
          <button type="button" title="Menu" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-lg text-white shadow-lg shadow-emerald-200 transition hover:-translate-y-0.5">☰</button>
          <label className="relative hidden w-full max-w-[480px] md:block">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">⌕</span>
            <input type="search" aria-label="Tìm kiếm toàn hệ thống" placeholder="Tìm hợp đồng, nhân sự, nhà thầu..." className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-11 pr-16 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100/60" />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center"><kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[8px] text-slate-400 shadow-sm">Ctrl K</kbd></span>
          </label>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button type="button" title="Thông báo" className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5">♢<span className="absolute -right-1 -top-1 rounded-full border-2 border-white bg-red-500 px-1 text-[8px] font-bold">3</span></button>
            <button type="button" title="Ứng dụng" className="hidden h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-200 sm:flex">▦</button>
            <button type="button" title="Toàn màn hình" className="hidden h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-700 text-white shadow-lg shadow-blue-200 lg:flex">⌗</button>
            <button type="button" title="Giao diện" className="hidden h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-white shadow-lg shadow-slate-300 lg:flex">◔</button>
            <div className="mx-1 hidden h-9 w-px bg-slate-200 sm:block" />
            <button type="button" className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-slate-50">
              <div className="hidden text-right sm:block"><p className="max-w-[150px] truncate text-[11px] font-bold text-slate-800">Người dùng VH1</p><p className="mt-0.5 text-[8px] font-medium uppercase tracking-wide text-slate-400">Quản lý kỹ thuật</p></div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-blue-100 to-indigo-200 text-[10px] font-extrabold text-blue-800 shadow-md">VH1</div>
              <span className="hidden text-[10px] text-slate-400 lg:block">⌄</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
