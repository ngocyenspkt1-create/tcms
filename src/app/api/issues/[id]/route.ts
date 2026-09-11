import {requireContractPermission} from "@/server/contracts/contract-api";
import {PostgresContractRepository} from "@/server/contracts/postgres-contract-repository";
import {withSecurityTransaction} from "@/server/db/security-transaction";
import {apiError} from "@/server/http/api-response";
import {getRequestContext} from "@/server/http/request-context";
import {parseTechnicalIssueInput,parseTechnicalIssueVersion} from "@/server/issues/technical-issue-service";
import {PostgresTechnicalIssueRepository} from "@/server/issues/postgres-technical-issue-repository";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const context=await getRequestContext(request);const {id}=await params;const body=await request.json();const input=parseTechnicalIssueInput(body.issue);const version=parseTechnicalIssueVersion(body.expectedVersion);const issue=await withSecurityTransaction(context,async(client)=>{const repository=new PostgresTechnicalIssueRepository(client);const current=await repository.findById(id);if(!current)throw new Error("TECHNICAL_ISSUE_NOT_FOUND");const contract=await new PostgresContractRepository(client).findById(current.contractId);if(!contract)throw new Error("TECHNICAL_ISSUE_CONTRACT_NOT_FOUND");requireContractPermission(context.principal,"contract.progress.update",contract);if(input.contractId!==current.contractId)throw new Error("TECHNICAL_ISSUE_CONTRACT_IMMUTABLE");return repository.update(id,version,input,context.principal.userId);});return Response.json({issue},{headers:{"cache-control":"no-store"}});}catch(error){return apiError(error);}}
