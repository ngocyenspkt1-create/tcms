import type { Contract } from "../../types/contract";
import { authorize, permissionsForRoles, type Permission, type SecurityPrincipal } from "../../lib/security/authorization";

export type ContractInput = Omit<Contract, "id" | "stt" | "version">;

export function parseContractInput(value: unknown): ContractInput {
  if (!value || typeof value !== "object") throw new SyntaxError("INVALID_JSON");
  const input = value as Partial<ContractInput>;
  if (!input.contractNumber?.trim() || !input.packageName?.trim() || !input.leadDepartment?.trim() || !input.contractorName?.trim()) throw new SyntaxError("MISSING_REQUIRED_FIELDS");
  if (!Array.isArray(input.supervisors) || typeof input.progressPercent !== "number" || input.progressPercent < 0 || input.progressPercent > 100) throw new SyntaxError("INVALID_CONTRACT_FIELDS");
  return input as ContractInput;
}

export function requireRolePermission(principal: SecurityPrincipal, permission: Permission) {
  if (!principal.active || !permissionsForRoles(principal.roles).has(permission)) throw new Error("ACCESS_DENIED");
}

export function requireContractPermission(principal: SecurityPrincipal, permission: Permission, contract: Contract) {
  if (!canContractPermission(principal, permission, contract)) throw new Error("ACCESS_DENIED");
}

export function canContractPermission(principal: SecurityPrincipal, permission: Permission, contract: Contract) {
  const decision = authorize(principal, permission, {
    id: contract.id,
    departmentIds: principal.departmentIds,
    status: contract.status,
  });
  return decision.allowed;
}
