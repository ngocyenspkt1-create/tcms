import { permissionsForRoles } from "@/lib/security/authorization";
import { withSecurityTransaction } from "@/server/db/security-transaction";
import { apiError } from "@/server/http/api-response";
import { getRequestContext } from "@/server/http/request-context";
import { parseContractorInput } from "@/server/master-data/contractor-service";
import { PostgresContractorRepository } from "@/server/master-data/postgres-contractor-repository";

function capabilities(context: Awaited<ReturnType<typeof getRequestContext>>) {
  const permissions = permissionsForRoles(context.principal.roles);
  if (!context.principal.active || !permissions.has("contract.read")) throw new Error("ACCESS_DENIED");
  return { canManage:permissions.has("contract.identity.update") };
}

export async function GET(request: Request) {
  try {
    const context=await getRequestContext(request); const access=capabilities(context);
    const contractors=await withSecurityTransaction(context,(client)=>new PostgresContractorRepository(client).list(access.canManage,access.canManage));
    return Response.json({contractors,capabilities:access},{headers:{"cache-control":"no-store"}});
  } catch(error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const context=await getRequestContext(request); const access=capabilities(context);
    if(!access.canManage) throw new Error("ACCESS_DENIED");
    const input=parseContractorInput(await request.json());
    const contractor=await withSecurityTransaction(context,(client)=>new PostgresContractorRepository(client).create(input,context.principal.userId));
    return Response.json({contractor},{status:201});
  } catch(error) { return apiError(error); }
}
