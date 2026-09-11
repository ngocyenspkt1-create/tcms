import { permissionsForRoles } from "@/lib/security/authorization";
import { withSecurityTransaction } from "@/server/db/security-transaction";
import { apiError } from "@/server/http/api-response";
import { getRequestContext } from "@/server/http/request-context";
import { parseContractorInput,parseContractorVersion } from "@/server/master-data/contractor-service";
import { PostgresContractorRepository } from "@/server/master-data/postgres-contractor-repository";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const context=await getRequestContext(request); const permissions=permissionsForRoles(context.principal.roles);
    if(!context.principal.active||!permissions.has("contract.identity.update")) throw new Error("ACCESS_DENIED");
    const body=await request.json(); const {id}=await params;
    const input=parseContractorInput(body.contractor); const expectedVersion=parseContractorVersion(body.expectedVersion);
    const contractor=await withSecurityTransaction(context,(client)=>new PostgresContractorRepository(client).update(id,expectedVersion,input,context.principal.userId));
    return Response.json({contractor});
  } catch(error) { return apiError(error); }
}
