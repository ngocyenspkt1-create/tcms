import { permissionsForRoles } from "@/lib/security/authorization";
import { apiError } from "@/server/http/api-response";
import { getRequestContext } from "@/server/http/request-context";
import { withSecurityTransaction } from "@/server/db/security-transaction";
import { parseDepartmentInput, parseDepartmentVersion } from "@/server/master-data/department-service";
import { PostgresDepartmentRepository } from "@/server/master-data/postgres-department-repository";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequestContext(request);
    const permissions = permissionsForRoles(context.principal.roles);
    if (!context.principal.active || !context.principal.mfaVerified || !permissions.has("system.configure")) throw new Error("ACCESS_DENIED");
    const body = await request.json(); const { id } = await params;
    const input = parseDepartmentInput(body.department); const expectedVersion = parseDepartmentVersion(body.expectedVersion);
    const department = await withSecurityTransaction(context, (client) => new PostgresDepartmentRepository(client).update(id, expectedVersion, input));
    return Response.json({ department });
  } catch (error) { return apiError(error); }
}
