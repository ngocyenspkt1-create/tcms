import {requireContractPermission} from "@/server/contracts/contract-api";
import {PostgresContractRepository} from "@/server/contracts/postgres-contract-repository";
import {withSecurityTransaction} from "@/server/db/security-transaction";
import {apiError} from "@/server/http/api-response";
import {getRequestContext} from "@/server/http/request-context";
import {parseInspectionInput,parseInspectionVersion} from "@/server/inspections/inspection-service";
import {PostgresInspectionRepository} from "@/server/inspections/postgres-inspection-repository";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const context=await getRequestContext(request);const {id}=await params;const body=await request.json();const input=parseInspectionInput(body.inspection);const version=parseInspectionVersion(body.expectedVersion);const inspection=await withSecurityTransaction(context,async(client)=>{const repository=new PostgresInspectionRepository(client);const current=await repository.findById(id);if(!current)throw new Error("INSPECTION_NOT_FOUND");const contract=await new PostgresContractRepository(client).findById(current.contractId);if(!contract)throw new Error("INSPECTION_CONTRACT_NOT_FOUND");requireContractPermission(context.principal,"contract.acceptance.update",contract);if(input.contractId!==current.contractId)throw new Error("INSPECTION_CONTRACT_IMMUTABLE");return repository.update(id,version,input,context.principal.userId);});return Response.json({inspection},{headers:{"cache-control":"no-store"}});}catch(error){return apiError(error);}}
