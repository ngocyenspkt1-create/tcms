import { apiError } from "@/server/http/api-response";
import { getRequestContext } from "@/server/http/request-context";
import { parseContractItemInput } from "@/server/contracts/contract-item-service";
import { requireContractPermission } from "@/server/contracts/contract-api";
import { PostgresContractRepository } from "@/server/contracts/postgres-contract-repository";
import { PostgresContractItemRepository } from "@/server/contracts/postgres-contract-item-repository";
import { withSecurityTransaction } from "@/server/db/security-transaction";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  try {
    const context=await getRequestContext(request); const {id,itemId}=await params;
    const body=await request.json() as {item?:unknown;expectedVersion?:unknown}; const input=parseContractItemInput(body.item);
    if (!Number.isInteger(body.expectedVersion)) throw new SyntaxError("EXPECTED_VERSION_REQUIRED");
    const item=await withSecurityTransaction(context,async(client)=>{
      const contracts=new PostgresContractRepository(client); const contract=await contracts.findById(id); if(!contract)return null;
      const items=new PostgresContractItemRepository(client); const current=await items.findById(id,itemId); if(!current)return null;
      const identityChanged=["itemCode","groupCode","groupName","workScopeId","serviceDescription","workContent","quantity","unit","serviceLocation","completionDurationDays","weightPercent","plannedStartDate","plannedEndDate"].some((key)=>current[key as keyof typeof current]!==input[key as keyof typeof input]);
      if(identityChanged)requireContractPermission(context.principal,"contract.identity.update",contract);
      requireContractPermission(context.principal,"contract.progress.update",contract);
      return items.update(id,itemId,body.expectedVersion as number,input,context.principal.userId);
    });
    return item?Response.json({item}):Response.json({error:"NOT_FOUND"},{status:404});
  } catch(error){return apiError(error);}
}
