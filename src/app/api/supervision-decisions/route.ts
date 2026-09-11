import { permissionsForRoles } from "@/lib/security/authorization";
import { parseSupervisionDecisionInput } from "@/server/supervision/supervision-decision-service";
import { PostgresSupervisionDecisionRepository } from "@/server/supervision/postgres-supervision-decision-repository";
import { PostgresContractRepository } from "@/server/contracts/postgres-contract-repository";
import { requireContractPermission,requireRolePermission } from "@/server/contracts/contract-api";
import { withSecurityTransaction } from "@/server/db/security-transaction";
import { apiError } from "@/server/http/api-response";
import { getRequestContext } from "@/server/http/request-context";

export async function GET(request: Request) {
  try {
    const context=await getRequestContext(request); requireRolePermission(context.principal,"contract.read");
    const canManage=permissionsForRoles(context.principal.roles).has("contract.assignment.manage");
    const result=await withSecurityTransaction(context,async(client)=>{
      const repository=new PostgresSupervisionDecisionRepository(client);
      return {decisions:await repository.list(),options:canManage?await repository.options():{contracts:[],personnel:[],workScopes:[]}};
    });
    return Response.json({...result,capabilities:{canManage}},{headers:{"cache-control":"no-store"}});
  } catch(error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const context=await getRequestContext(request); const input=parseSupervisionDecisionInput(await request.json());
    const decision=await withSecurityTransaction(context,async(client)=>{
      const contract=await new PostgresContractRepository(client).findById(input.contractId);
      if(!contract) throw new Error("SUPERVISION_CONTRACT_NOT_FOUND");
      requireContractPermission(context.principal,"contract.assignment.manage",contract);
      return new PostgresSupervisionDecisionRepository(client).create(input,context.principal.userId);
    });
    return Response.json({decision},{status:201,headers:{"cache-control":"no-store"}});
  } catch(error) { return apiError(error); }
}
