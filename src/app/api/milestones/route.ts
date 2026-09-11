import {permissionsForRoles} from "@/lib/security/authorization";
import {requireContractPermission,requireRolePermission} from "@/server/contracts/contract-api";
import {PostgresContractRepository} from "@/server/contracts/postgres-contract-repository";
import {withSecurityTransaction} from "@/server/db/security-transaction";
import {apiError} from "@/server/http/api-response";
import {getRequestContext} from "@/server/http/request-context";
import {parseMilestoneInput} from "@/server/milestones/milestone-service";
import {PostgresMilestoneRepository} from "@/server/milestones/postgres-milestone-repository";

export async function GET(request:Request){try{const context=await getRequestContext(request);requireRolePermission(context.principal,"contract.read");const canManage=permissionsForRoles(context.principal.roles).has("contract.progress.update");const result=await withSecurityTransaction(context,async(client)=>{const repository=new PostgresMilestoneRepository(client);return {milestones:await repository.list(),summary:await repository.summary(),options:canManage?await repository.options():{contracts:[],workScopes:[],contractItems:[],personnel:[]}};});return Response.json({...result,capabilities:{canManage}},{headers:{"cache-control":"no-store"}});}catch(error){return apiError(error);}}

export async function POST(request:Request){try{const context=await getRequestContext(request);const input=parseMilestoneInput(await request.json());const milestone=await withSecurityTransaction(context,async(client)=>{const contract=await new PostgresContractRepository(client).findById(input.contractId);if(!contract)throw new Error("MILESTONE_CONTRACT_NOT_FOUND");requireContractPermission(context.principal,"contract.progress.update",contract);return new PostgresMilestoneRepository(client).create(input,context.principal.userId);});return Response.json({milestone},{status:201,headers:{"cache-control":"no-store"}});}catch(error){return apiError(error);}}
