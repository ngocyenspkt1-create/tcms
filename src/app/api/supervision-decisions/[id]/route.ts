import { parseSupervisionDecisionInput,parseSupervisionDecisionVersion } from "@/server/supervision/supervision-decision-service";
import { PostgresSupervisionDecisionRepository } from "@/server/supervision/postgres-supervision-decision-repository";
import { PostgresContractRepository } from "@/server/contracts/postgres-contract-repository";
import { requireContractPermission } from "@/server/contracts/contract-api";
import { withSecurityTransaction } from "@/server/db/security-transaction";
import { apiError } from "@/server/http/api-response";
import { getRequestContext } from "@/server/http/request-context";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const context=await getRequestContext(request); const {id}=await params;
    const body=await request.json(); const input=parseSupervisionDecisionInput(body.decision);
    const expectedVersion=parseSupervisionDecisionVersion(body.expectedVersion);
    const decision=await withSecurityTransaction(context,async(client)=>{
      const repository=new PostgresSupervisionDecisionRepository(client); const current=await repository.findById(id);
      if(!current) throw new Error("SUPERVISION_DECISION_NOT_FOUND");
      const currentContract=await new PostgresContractRepository(client).findById(current.contractId);
      if(!currentContract) throw new Error("SUPERVISION_CONTRACT_NOT_FOUND");
      requireContractPermission(context.principal,"contract.assignment.manage",currentContract);
      if(input.contractId!==current.contractId) {
        const target=await new PostgresContractRepository(client).findById(input.contractId);
        if(!target) throw new Error("SUPERVISION_CONTRACT_NOT_FOUND");
        requireContractPermission(context.principal,"contract.assignment.manage",target);
      }
      return repository.update(id,expectedVersion,input,context.principal.userId);
    });
    return Response.json({decision},{headers:{"cache-control":"no-store"}});
  } catch(error) { return apiError(error); }
}
