import "server-only";

import type { SecurityPrincipal, Role } from "../../lib/security/authorization";
import { ROLES } from "../../lib/security/authorization";
import { getPool } from "../db/pool";

export type AuthenticatedIdentity = { subject: string; mfaVerified: boolean };

export async function resolvePrincipal(identity: AuthenticatedIdentity): Promise<SecurityPrincipal> {
  const result = await getPool().query({
    text: `SELECT u.id::text, u.active,
      COALESCE(array_agg(DISTINCT urs.role_code) FILTER (WHERE urs.role_code IS NOT NULL), '{}') roles,
      COALESCE(array_agg(DISTINCT urs.department_id::text) FILTER (WHERE urs.department_id IS NOT NULL), '{}') department_ids,
      COALESCE(array_agg(DISTINCT urs.contract_id::text) FILTER (WHERE urs.contract_id IS NOT NULL), '{}') contract_ids,
      COALESCE(bool_or(urs.global_scope), false) global_scope
    FROM tcms.app_users u
    LEFT JOIN tcms.user_role_scopes urs ON urs.user_id = u.id
      AND urs.valid_from <= clock_timestamp()
      AND (urs.valid_until IS NULL OR urs.valid_until > clock_timestamp())
    WHERE u.identity_subject = $1
    GROUP BY u.id`,
    values: [identity.subject],
  });
  const row = result.rows[0];
  if (!row) throw new Error("SSO_USER_NOT_PROVISIONED");
  const validRoles = (row.roles as string[]).filter((role): role is Role => ROLES.includes(role as Role));
  return {
    userId: row.id,
    active: row.active,
    mfaVerified: identity.mfaVerified,
    roles: validRoles,
    departmentIds: row.department_ids,
    assignedContractIds: row.contract_ids,
    globalContractScope: row.global_scope,
  };
}
