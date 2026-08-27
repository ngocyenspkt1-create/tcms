import { canContractPermission, requireContractPermission } from "@/server/contracts/contract-api";
import { PostgresContractItemRepository } from "@/server/contracts/postgres-contract-item-repository";
import { PostgresContractRepository } from "@/server/contracts/postgres-contract-repository";
import { withSecurityTransaction } from "@/server/db/security-transaction";
import { apiError } from "@/server/http/api-response";
import { getRequestContext } from "@/server/http/request-context";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  try {
    const context = await getRequestContext(request);
    const { id, itemId } = await params;
    const result = await withSecurityTransaction(context, async (client) => {
      const contract = await new PostgresContractRepository(client).findById(id);
      if (!contract) return null;
      requireContractPermission(context.principal, "contract.read", contract);
      const tracking = await new PostgresContractItemRepository(client).getTracking(id, itemId);
      if (!tracking) return null;
      return {
        tracking,
        capabilities: {
          canUpdateProgress: canContractPermission(context.principal, "contract.progress.update", contract),
        },
      };
    });
    return result
      ? Response.json(result, { headers: { "cache-control": "no-store" } })
      : Response.json({ error: "NOT_FOUND" }, { status: 404 });
  } catch (error) {
    return apiError(error);
  }
}
