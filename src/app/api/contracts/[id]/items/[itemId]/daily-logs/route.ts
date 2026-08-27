import { requireContractPermission } from "@/server/contracts/contract-api";
import { parseDailyLogInput } from "@/server/contracts/contract-item-service";
import { PostgresContractItemRepository } from "@/server/contracts/postgres-contract-item-repository";
import { PostgresContractRepository } from "@/server/contracts/postgres-contract-repository";
import { withSecurityTransaction } from "@/server/db/security-transaction";
import { apiError } from "@/server/http/api-response";
import { getRequestContext } from "@/server/http/request-context";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  try {
    const context = await getRequestContext(request);
    const { id, itemId } = await params;
    const input = parseDailyLogInput(await request.json());
    const log = await withSecurityTransaction(context, async (client) => {
      const contract = await new PostgresContractRepository(client).findById(id);
      if (!contract) return null;
      requireContractPermission(context.principal, "contract.progress.update", contract);
      return new PostgresContractItemRepository(client).appendDailyLog(
        id,
        itemId,
        input.logDate,
        input.note,
        context.principal.userId,
      );
    });
    return log ? Response.json({ log }, { status: 201 }) : Response.json({ error: "NOT_FOUND" }, { status: 404 });
  } catch (error) {
    return apiError(error);
  }
}
