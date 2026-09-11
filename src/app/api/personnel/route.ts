import { permissionsForRoles } from "@/lib/security/authorization";
import { withSecurityTransaction } from "@/server/db/security-transaction";
import { apiError } from "@/server/http/api-response";
import { getRequestContext } from "@/server/http/request-context";
import { parseCreatePersonnelInput } from "@/server/master-data/personnel-service";
import { PostgresPersonnelRepository } from "@/server/master-data/postgres-personnel-repository";

function requirePersonnelManager(context: Awaited<ReturnType<typeof getRequestContext>>) {
  const permissions = permissionsForRoles(context.principal.roles);
  if (!context.principal.active || !context.principal.mfaVerified || !permissions.has("user.manage") || !permissions.has("role.manage")) {
    throw new Error("ACCESS_DENIED");
  }
}

export async function GET(request: Request) {
  try {
    const context = await getRequestContext(request);
    requirePersonnelManager(context);
    const result = await withSecurityTransaction(context, async (client) => {
      const repository = new PostgresPersonnelRepository(client);
      return { personnel: await repository.list(), options: await repository.options() };
    });
    return Response.json({ ...result, capabilities: { canManage: true, currentUserId: context.principal.userId } }, { headers: { "cache-control": "no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const context = await getRequestContext(request);
    requirePersonnelManager(context);
    const input = parseCreatePersonnelInput(await request.json());
    const personnel = await withSecurityTransaction(context, (client) => new PostgresPersonnelRepository(client).create(input, context.principal.userId));
    return Response.json({ personnel }, { status: 201 });
  } catch (error) { return apiError(error); }
}
