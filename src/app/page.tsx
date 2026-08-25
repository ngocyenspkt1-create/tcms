"use client";

import Link from "next/link";

import { useContracts } from "@/components/contracts/contract-store";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  formatRemainingDays,
  getContractWarning,
  getRemainingDays,
} from "@/lib/contract-utils";

const issues = [
  {
    id: "ISS-2026-001",
    description: "Chưa hoàn thành báo cáo kết quả thí nghiệm",
    contract: "203/HĐ-NĐDH-NPCETC-HADETECH.26",
    owner: "Nhà thầu",
    dueDate: "28/08/2026",
    severity: "Cao",
  },
  {
    id: "ISS-2026-002",
    description: "Nhân sự giám sát cần bổ sung theo quyết định mới",
    contract: "215/HĐ-NĐDH.26",
    owner: "PXVH1",
    dueDate: "30/08/2026",
    severity: "Trung bình",
  },
];

function AssessmentBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    "Bình thường": "bg-emerald-50 text-emerald-700",
    "Theo dõi": "bg-blue-50 text-blue-700",
    "Sắp hết hạn": "bg-amber-50 text-amber-700",
    Khẩn: "bg-orange-50 text-orange-700",
    "Đã hết hạn": "bg-red-50 text-red-700",
    "Đã hoàn thành": "bg-slate-100 text-slate-700",
  };

  const style = styles[value] ?? styles["Theo dõi"];

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style}`}
    >
      {value}
    </span>
  );
}

export default function Home() {
  const { contracts, error } = useContracts();
  const activeContracts = contracts.filter((contract) =>
    ["ACTIVE", "IN_PROGRESS", "TECHNICAL_COMPLETION"].includes(contract.status)
  );
  const attentionContracts = contracts.filter((contract) =>
    ["Theo dõi", "Sắp hết hạn", "Khẩn", "Đã hết hạn"].includes(
      getContractWarning(contract)
    )
  );
  const priorityContracts = [...contracts]
    .filter((contract) => !["COMPLETED", "CLOSED", "CANCELLED"].includes(contract.status))
    .sort(
      (first, second) =>
        (getRemainingDays(first) ?? Number.POSITIVE_INFINITY) -
        (getRemainingDays(second) ?? Number.POSITIVE_INFINITY)
    )
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-100">
      <AppHeader />

      <div className="flex">
        <AppSidebar />

        <main className="min-w-0 flex-1 p-4">
          <div className="mx-auto max-w-[1800px]">
            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                Không tải được dữ liệu tập trung: {error}
              </div>
            )}
            {/* Tiêu đề */}
            <div className="mb-4">
              <h1 className="text-xl font-bold text-slate-900">
                Tổng quan quản lý hợp đồng
              </h1>

              <p className="mt-1 text-xs text-slate-500">
                Theo dõi tình trạng thực hiện, tiến độ và các vấn đề kỹ thuật
                cần xử lý.
              </p>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">
                  Tổng hợp đồng
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {contracts.length}
                </p>

                <p className="mt-1 text-[10px] text-slate-400">
                  Hợp đồng đang theo dõi
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">
                  Đang thực hiện
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {activeContracts.length}
                </p>

                <p className="mt-1 text-[10px] text-slate-400">
                  Hợp đồng đang triển khai
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">
                  Cần chú ý
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {attentionContracts.length}
                </p>

                <p className="mt-1 text-[10px] text-slate-400">
                  Tiến độ hoặc thời hạn gần
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">
                  Tồn tại đang mở
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {issues.length}
                </p>

                <p className="mt-1 text-[10px] text-slate-400">
                  Yêu cầu đang chờ xử lý
                </p>
              </div>
            </div>

            {/* Hợp đồng cần theo dõi */}
            <section className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold">
                    Hợp đồng cần theo dõi
                  </h2>

                  <p className="mt-0.5 text-[10px] text-slate-500">
                    Ưu tiên các hợp đồng có rủi ro tiến độ hoặc tồn tại.
                  </p>
                </div>

                <Link
                  href="/contracts"
                  className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                >
                  Xem tất cả hợp đồng
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-[9px] uppercase text-slate-500">
                    <tr>
                      <th className="border-r border-slate-200 px-2 py-2">
                        Số hợp đồng
                      </th>

                      <th className="border-r border-slate-200 px-2 py-2">
                        Gói thầu
                      </th>

                      <th className="border-r border-slate-200 px-2 py-2">
                        Đơn vị chủ trì
                      </th>

                      <th className="border-r border-slate-200 px-2 py-2">
                        Đơn vị giám sát
                      </th>

                      <th className="border-r border-slate-200 px-2 py-2">
                        Tiến độ
                      </th>

                      <th className="border-r border-slate-200 px-2 py-2">
                        Còn lại
                      </th>

                      <th className="px-2 py-2">
                        Đánh giá
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {priorityContracts.map((contract) => (
                      <tr
                        key={contract.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="border-r border-slate-200 px-2 py-2 font-medium">
                          <Link
                            href={`/contracts/${contract.id}`}
                            className="text-blue-700 hover:underline"
                          >
                            {contract.contractNumber}
                          </Link>
                        </td>

                        <td className="border-r border-slate-200 px-2 py-2">
                          {contract.packageName}
                        </td>

                        <td className="border-r border-slate-200 px-2 py-2">
                          {contract.leadDepartment}
                        </td>

                        <td className="border-r border-slate-200 px-2 py-2">
                          {Array.from(
                            new Set(
                              contract.supervisors.map(
                                (supervisor) => supervisor.department
                              )
                            )
                          ).join(" + ") || "-"}
                        </td>

                        <td className="border-r border-slate-200 px-2 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full bg-slate-800"
                                style={{
                                  width: `${contract.progressPercent}%`,
                                }}
                              />
                            </div>

                            <span>
                              {contract.progressPercent}%
                            </span>
                          </div>
                        </td>

                        <td className="border-r border-slate-200 px-2 py-2">
                          {formatRemainingDays(contract)}
                        </td>

                        <td className="px-2 py-2">
                          <AssessmentBadge
                            value={getContractWarning(contract)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Vấn đề cần xử lý */}
            <section className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-sm font-semibold">
                  Vấn đề cần xử lý
                </h2>

                <p className="mt-0.5 text-[10px] text-slate-500">
                  Các tồn tại kỹ thuật và nghĩa vụ đang mở.
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="grid gap-2 px-4 py-3 text-[11px] md:grid-cols-[110px_1fr_100px_90px_80px]"
                  >
                    <div>
                      <p className="text-[9px] text-slate-400">
                        Mã tồn tại
                      </p>

                      <p className="font-medium">
                        {issue.id}
                      </p>
                    </div>

                    <div>
                      <p className="font-medium">
                        {issue.description}
                      </p>

                      <p className="mt-0.5 text-[9px] text-slate-500">
                        {issue.contract}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] text-slate-400">
                        Phụ trách
                      </p>

                      <p>
                        {issue.owner}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] text-slate-400">
                        Hạn xử lý
                      </p>

                      <p>
                        {issue.dueDate}
                      </p>
                    </div>

                    <div>
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-700">
                        {issue.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
