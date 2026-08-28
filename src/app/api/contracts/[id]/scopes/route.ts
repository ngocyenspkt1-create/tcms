import { apiError } from "@/server/http/api-response";
import { getRequestContext } from "@/server/http/request-context";
import { canContractPermission, requireContractPermission } from "@/server/contracts/contract-api";
import { buildWorkScopeTree, parseWorkScopeInput } from "@/server/contracts/contract-structure-service";
import { PostgresContractRepository } from "@/server/contracts/postgres-contract-repository";
import { PostgresContractStructureRepository } from "@/server/contracts/postgres-contract-structure-repository";
import { withSecurityTransaction } from "@/server/db/security-transaction";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequestContext(request); const { id } = await params;
    const result = await withSecurityTransaction(context, async (client) => {
      const contract = await new PostgresContractRepository(client).findById(id); if (!contract) return null;
      requireContractPermission(context.principal, "contract.read", contract);
      const scopes = await new PostgresContractStructureRepository(client).listWorkScopes(id);
      return { scopes, tree: buildWorkScopeTree(scopes), capabilities: { canUpdate: canContractPermission(context.principal, "contract.identity.update", contract) } };
    });
    return result ? Response.json(result, { headers: { "cache-control": "no-store" } }) : Response.json({ error: "NOT_FOUND" }, { status: 404 });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequestContext(request); const { id } = await params; const input = parseWorkScopeInput(await request.json());
    const scope = await withSecurityTransaction(context, async (client) => {
      const contract = await new PostgresContractRepository(client).findById(id); if (!contract) return null;
      requireContractPermission(context.principal, "contract.identity.update", contract);
      return new PostgresContractStructureRepository(client).createWorkScope(id, input, context.principal.userId);
    });
    return scope ? Response.json({ scope }, { status: 201 }) : Response.json({ error: "NOT_FOUND" }, { status: 404 });
  } catch (error) { return apiError(error); }
}
