import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ContractStoreProvider } from "@/components/contracts/contract-store";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ContractStoreProvider>
          {children}
        </ContractStoreProvider>
      </body>
    </html>
  );
}