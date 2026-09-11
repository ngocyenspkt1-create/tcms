import { permissionsForRoles } from "@/lib/security/authorization";
import { apiError } from "@/server/http/api-response";
import { getRequestContext } from "@/server/http/request-context";
import { withSecurityTransaction } from "@/server/db/security-transaction";
import { parseDepartmentInput } from "@/server/master-data/department-service";
import { PostgresDepartmentRepository } from "@/server/master-data/postgres-department-repository";

function capabilities(context: Awaited<ReturnType<typeof getRequestContext>>) {
  const permissions = permissionsForRoles(context.principal.roles);
  if (!context.principal.active || (!permissions.has("contract.read") && !permissions.has("system.configure") && !permissions.has("user.manage"))) throw new Error("ACCESS_DENIED");
  return { canManage: permissions.has("system.configure") && context.principal.mfaVerified };
}

export async function GET(request: Request) {
  try {
    const context = await getRequestContext(request); const access = capabilities(context);
    const departments = await withSecurityTransaction(context, (client) => new PostgresDepartmentRepository(client).list(access.canManage));
    return Response.json({ departments, capabilities: access }, { headers: { "cache-control": "no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const context = await getRequestContext(request); const access = capabilities(context);
    if (!access.canManage) throw new Error("ACCESS_DENIED");
    const input = parseDepartmentInput(await request.json());
    const department = await withSecurityTransaction(context, (client) => new PostgresDepartmentRepository(client).create(input));
    return Response.json({ department }, { status: 201 });
  } catch (error) { return apiError(error); }
}
