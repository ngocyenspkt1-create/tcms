import type { Metadata } from "next";

import { ContractStoreProvider } from "@/components/contracts/contract-store";

import "./globals.css";

export const metadata: Metadata = {
  title: "Quản lý hợp đồng VH1",
  description: "Web quản lý hợp đồng của Phân xưởng Vận hành 1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ContractStoreProvider>
          {children}
        </ContractStoreProvider>
      </body>
    </html>
  );
}
