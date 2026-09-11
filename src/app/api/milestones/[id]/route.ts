import {requireContractPermission} from "@/server/contracts/contract-api";
import {PostgresContractRepository} from "@/server/contracts/postgres-contract-repository";
import {withSecurityTransaction} from "@/server/db/security-transaction";
import {apiError} from "@/server/http/api-response";
import {getRequestContext} from "@/server/http/request-context";
import {parseMilestoneInput,parseMilestoneVersion} from "@/server/milestones/milestone-service";
import {PostgresMilestoneRepository} from "@/server/milestones/postgres-milestone-repository";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const context=await getRequestContext(request);const {id}=await params;const body=await request.json();const input=parseMilestoneInput(body.milestone);const expectedVersion=parseMilestoneVersion(body.expectedVersion);const milestone=await withSecurityTransaction(context,async(client)=>{const repository=new PostgresMilestoneRepository(client);const current=await repository.findById(id);if(!current)throw new Error("MILESTONE_NOT_FOUND");const currentContract=await new PostgresContractRepository(client).findById(current.contractId);if(!currentContract)throw new Error("MILESTONE_CONTRACT_NOT_FOUND");requireContractPermission(context.principal,"contract.progress.update",currentContract);if(input.contractId!==current.contractId){const target=await new PostgresContractRepository(client).findById(input.contractId);if(!target)throw new Error("MILESTONE_CONTRACT_NOT_FOUND");requireContractPermission(context.principal,"contract.progress.update",target);}return repository.update(id,expectedVersion,input,context.principal.userId);});return Response.json({milestone},{headers:{"cache-control":"no-store"}});}catch(error){return apiError(error);}}
