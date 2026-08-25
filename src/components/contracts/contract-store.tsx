"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Contract } from "@/types/contract";

export type ContractInput = Omit<Contract, "id" | "stt" | "version">;

type ContractStoreValue = {
  contracts: Contract[];
  ready: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addContract: (input: ContractInput) => Promise<Contract>;
  updateContract: (id: string, input: ContractInput) => Promise<Contract | undefined>;
  getContract: (id: string) => Contract | undefined;
};

const ContractStoreContext = createContext<ContractStoreValue | null>(null);

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init?.headers }, cache: "no-store" });
  const body = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) throw new Error(body.message ?? `Yêu cầu thất bại (${response.status}).`);
  return body as T;
}

export function ContractStoreProvider({ children }: { children: React.ReactNode }) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const result = await api<{ contracts: Contract[] }>("/api/contracts");
      setContracts(result.contracts);
    } catch (requestError) {
      setContracts([]);
      setError(requestError instanceof Error ? requestError.message : "Không thể tải dữ liệu hợp đồng.");
    } finally { setReady(true); }
  }, []);

  useEffect(() => {
    let active = true;
    api<{ contracts: Contract[] }>("/api/contracts")
      .then((result) => { if (active) setContracts(result.contracts); })
      .catch((requestError) => {
        if (active) {
          setContracts([]);
          setError(requestError instanceof Error ? requestError.message : "Không thể tải dữ liệu hợp đồng.");
        }
      })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  const addContract = useCallback(async (input: ContractInput) => {
    const result = await api<{ contract: Contract }>("/api/contracts", { method: "POST", body: JSON.stringify(input) });
    setContracts((current) => [...current, result.contract]);
    return result.contract;
  }, []);

  const updateContract = useCallback(async (id: string, input: ContractInput) => {
    const current = contracts.find((contract) => contract.id === id);
    if (!current) return undefined;
    const result = await api<{ contract: Contract }>(`/api/contracts/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ contract: input, expectedVersion: current.version }),
    });
    setContracts((items) => items.map((item) => item.id === id ? result.contract : item));
    return result.contract;
  }, [contracts]);

  const getContract = useCallback((id: string) => contracts.find((contract) => contract.id === id), [contracts]);
  const value = useMemo(() => ({ contracts, ready, error, refresh, addContract, updateContract, getContract }), [contracts, ready, error, refresh, addContract, updateContract, getContract]);
  return <ContractStoreContext.Provider value={value}>{children}</ContractStoreContext.Provider>;
}

export function useContracts() {
  const context = useContext(ContractStoreContext);
  if (!context) throw new Error("useContracts must be used inside ContractStoreProvider");
  return context;
}
