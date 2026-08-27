import { requireContractPermission } from "@/server/contracts/contract-api";
import { summarizeContractItems } from "@/server/contracts/contract-item-service";
import { PostgresContractItemRepository } from "@/server/contracts/postgres-contract-item-repository";
import { PostgresContractRepository } from "@/server/contracts/postgres-contract-repository";
import { withSecurityTransaction } from "@/server/db/security-transaction";
import { apiError } from "@/server/http/api-response";
import { getRequestContext } from "@/server/http/request-context";
import { parseContractItemImport } from "@/server/pdf/contract-item-import";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequestContext(request);
    const { id } = await params;
    const inputs = parseContractItemImport(await request.json());
    const result = await withSecurityTransaction(context, async (client) => {
      const contract = await new PostgresContractRepository(client).findById(id);
      if (!contract) return null;
      requireContractPermission(context.principal, "contract.identity.update", contract);

      const repository = new PostgresContractItemRepository(client);
      const created = [];
      for (const input of inputs) created.push(await repository.create(id, input, context.principal.userId));
      const items = await repository.list(id);
      return { created, summary: summarizeContractItems(items) };
    });

    return result
      ? Response.json(result, { status: 201, headers: { "cache-control": "no-store" } })
      : Response.json({ error: "NOT_FOUND" }, { status: 404 });
  } catch (error) {
    return apiError(error);
  }
}
