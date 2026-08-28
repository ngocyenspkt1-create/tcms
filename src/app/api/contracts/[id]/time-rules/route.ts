import { apiError } from "@/server/http/api-response";
import { getRequestContext } from "@/server/http/request-context";
import { canContractPermission, requireContractPermission } from "@/server/contracts/contract-api";
import { parseContractTimeRuleInput } from "@/server/contracts/contract-structure-service";
import { PostgresContractRepository } from "@/server/contracts/postgres-contract-repository";
import { PostgresContractStructureRepository } from "@/server/contracts/postgres-contract-structure-repository";
import { withSecurityTransaction } from "@/server/db/security-transaction";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequestContext(request); const { id } = await params;
    const result = await withSecurityTransaction(context, async (client) => {
      const contract = await new PostgresContractRepository(client).findById(id); if (!contract) return null;
      requireContractPermission(context.principal, "contract.read", contract);
      return { rules: await new PostgresContractStructureRepository(client).listTimeRules(id),
        capabilities: { canUpdate: canContractPermission(context.principal, "contract.identity.update", contract) } };
    });
    return result ? Response.json(result, { headers: { "cache-control": "no-store" } }) : Response.json({ error: "NOT_FOUND" }, { status: 404 });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequestContext(request); const { id } = await params; const input = parseContractTimeRuleInput(await request.json());
    const rule = await withSecurityTransaction(context, async (client) => {
      const contract = await new PostgresContractRepository(client).findById(id); if (!contract) return null;
      requireContractPermission(context.principal, "contract.identity.update", contract);
      return new PostgresContractStructureRepository(client).createTimeRule(id, input, context.principal.userId);
    });
    return rule ? Response.json({ rule }, { status: 201 }) : Response.json({ error: "NOT_FOUND" }, { status: 404 });
  } catch (error) { return apiError(error); }
}
