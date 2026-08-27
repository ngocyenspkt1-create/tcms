import { requireContractPermission } from "@/server/contracts/contract-api";
import { parseChecklistCompletionInput } from "@/server/contracts/contract-item-service";
import { PostgresContractItemRepository } from "@/server/contracts/postgres-contract-item-repository";
import { PostgresContractRepository } from "@/server/contracts/postgres-contract-repository";
import { withSecurityTransaction } from "@/server/db/security-transaction";
import { apiError } from "@/server/http/api-response";
import { getRequestContext } from "@/server/http/request-context";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string; checklistItemId: string }> },
) {
  try {
    const context = await getRequestContext(request);
    const { id, itemId, checklistItemId } = await params;
    const input = parseChecklistCompletionInput(await request.json());
    const item = await withSecurityTransaction(context, async (client) => {
      const contract = await new PostgresContractRepository(client).findById(id);
      if (!contract) return null;
      requireContractPermission(context.principal, "contract.progress.update", contract);
      return new PostgresContractItemRepository(client).updateChecklistCompletion(
        id,
        itemId,
        checklistItemId,
        input.expectedVersion,
        input.isCompleted,
        context.principal.userId,
      );
    });
    return item ? Response.json({ item }) : Response.json({ error: "NOT_FOUND" }, { status: 404 });
  } catch (error) {
    return apiError(error);
  }
}
