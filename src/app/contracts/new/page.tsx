import type { Metadata } from "next";

import { ContractForm } from "@/components/contracts/contract-form";

export const metadata: Metadata = {
  title: "Thêm hợp đồng | Quản lý hợp đồng VH1",
};

export default function NewContractPage() {
  return <ContractForm mode="create" />;
}
