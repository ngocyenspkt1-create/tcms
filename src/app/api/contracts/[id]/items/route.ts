import { apiError } from "@/server/http/api-response";
import { getRequestContext } from "@/server/http/request-context";
import { parseContractItemInput, summarizeContractItems } from "@/server/contracts/contract-item-service";
import { canContractPermission, requireContractPermission } from "@/server/contracts/contract-api";
import { PostgresContractRepository } from "@/server/contracts/postgres-contract-repository";
import { PostgresContractItemRepository } from "@/server/contracts/postgres-contract-item-repository";
import { withSecurityTransaction } from "@/server/db/security-transaction";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequestContext(request); const { id } = await params;
    const result = await withSecurityTransaction(context, async (client) => {
      const contract = await new PostgresContractRepository(client).findById(id);
      if (!contract) return null;
      requireContractPermission(context.principal,"contract.read",contract);
      const items = await new PostgresContractItemRepository(client).list(id);
      return {
        items,
        summary: summarizeContractItems(items),
        capabilities: {
          canUpdateIdentity: canContractPermission(context.principal, "contract.identity.update", contract),
          canUpdateProgress: canContractPermission(context.principal, "contract.progress.update", contract),
        },
      };
    });
    return result ? Response.json(result,{headers:{"cache-control":"no-store"}}) : Response.json({error:"NOT_FOUND"},{status:404});
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequestContext(request); const { id } = await params; const input = parseContractItemInput(await request.json());
    const item = await withSecurityTransaction(context, async (client) => {
      const contract = await new PostgresContractRepository(client).findById(id);
      if (!contract) return null;
      requireContractPermission(context.principal,"contract.identity.update",contract);
      return new PostgresContractItemRepository(client).create(id,input,context.principal.userId);
    });
    return item ? Response.json({item},{status:201}) : Response.json({error:"NOT_FOUND"},{status:404});
  } catch (error) { return apiError(error); }
}
