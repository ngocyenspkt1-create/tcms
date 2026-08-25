import { apiError } from "@/server/http/api-response";
import { getRequestContext } from "@/server/http/request-context";
import { parseContractInput, requireRolePermission } from "@/server/contracts/contract-api";
import { PostgresContractRepository } from "@/server/contracts/postgres-contract-repository";
import { withSecurityTransaction } from "@/server/db/security-transaction";

export async function GET(request: Request) {
  try {
    const context = await getRequestContext(request);
    requireRolePermission(context.principal, "contract.read");
    const contracts = await withSecurityTransaction(context, (client) => new PostgresContractRepository(client).list());
    return Response.json({ contracts }, { headers: { "cache-control": "no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const context = await getRequestContext(request);
    requireRolePermission(context.principal, "contract.create");
    const input = parseContractInput(await request.json());
    const contract = await withSecurityTransaction(context, (client) => new PostgresContractRepository(client).create(input, context.principal.userId));
    return Response.json({ contract }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) { return apiError(error); }
}
