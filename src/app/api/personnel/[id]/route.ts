import { permissionsForRoles } from "@/lib/security/authorization";
import { withSecurityTransaction } from "@/server/db/security-transaction";
import { apiError } from "@/server/http/api-response";
import { getRequestContext } from "@/server/http/request-context";
import { parsePersonnelVersion, parseUpdatePersonnelInput } from "@/server/master-data/personnel-service";
import { PostgresPersonnelRepository } from "@/server/master-data/postgres-personnel-repository";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequestContext(request);
    const permissions = permissionsForRoles(context.principal.roles);
    if (!context.principal.active || !context.principal.mfaVerified || !permissions.has("user.manage") || !permissions.has("role.manage")) throw new Error("ACCESS_DENIED");
    const body = await request.json();
    const input = parseUpdatePersonnelInput(body.personnel);
    const expectedVersion = parsePersonnelVersion(body.expectedVersion);
    const { id } = await params;
    const personnel = await withSecurityTransaction(context, (client) => new PostgresPersonnelRepository(client).update(id, expectedVersion, input, context.principal.userId));
    return Response.json({ personnel });
  } catch (error) { return apiError(error); }
}
