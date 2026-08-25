import type { Metadata } from "next";

import { ContractForm } from "@/components/contracts/contract-form";

export const metadata: Metadata = {
  title: "Chỉnh sửa hợp đồng | Quản lý hợp đồng VH1",
};

export default async function EditContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContractForm mode="edit" contractId={id} />;
}
