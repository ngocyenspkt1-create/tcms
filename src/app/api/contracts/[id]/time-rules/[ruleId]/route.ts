import { apiError } from "@/server/http/api-response";
import { getRequestContext } from "@/server/http/request-context";
import { requireContractPermission } from "@/server/contracts/contract-api";
import { parseContractTimeRuleInput, parseExpectedVersion } from "@/server/contracts/contract-structure-service";
import { PostgresContractRepository } from "@/server/contracts/postgres-contract-repository";
import { PostgresContractStructureRepository } from "@/server/contracts/postgres-contract-structure-repository";
import { withSecurityTransaction } from "@/server/db/security-transaction";

type Params = { params: Promise<{ id: string; ruleId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const context = await getRequestContext(request); const { id, ruleId } = await params;
    const body = await request.json() as { rule?: unknown; expectedVersion?: unknown };
    const input = parseContractTimeRuleInput(body.rule); const expectedVersion = parseExpectedVersion(body.expectedVersion);
    const rule = await withSecurityTransaction(context, async (client) => {
      const contract = await new PostgresContractRepository(client).findById(id); if (!contract) return null;
      requireContractPermission(context.principal, "contract.identity.update", contract);
      return new PostgresContractStructureRepository(client).updateTimeRule(id, ruleId, expectedVersion, input, context.principal.userId);
    });
    return rule ? Response.json({ rule }) : Response.json({ error: "NOT_FOUND" }, { status: 404 });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const context = await getRequestContext(request); const { id, ruleId } = await params;
    const expectedVersion = parseExpectedVersion((await request.json() as { expectedVersion?: unknown }).expectedVersion);
    const found = await withSecurityTransaction(context, async (client) => {
      const contract = await new PostgresContractRepository(client).findById(id); if (!contract) return false;
      requireContractPermission(context.principal, "contract.identity.update", contract);
      await new PostgresContractStructureRepository(client).deleteTimeRule(id, ruleId, expectedVersion); return true;
    });
    return found ? new Response(null, { status: 204 }) : Response.json({ error: "NOT_FOUND" }, { status: 404 });
  } catch (error) { return apiError(error); }
}
