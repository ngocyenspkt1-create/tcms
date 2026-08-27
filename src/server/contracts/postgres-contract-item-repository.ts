import "server-only";

import type { PoolClient } from "pg";
import type { ContractItem, ContractItemInput } from "../../types/contract-item";

type ItemRow = Record<string, unknown> & { id: string; contract_id: string; sequence_number: number; version: number };

function date(value: unknown) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function mapRow(row: ItemRow): ContractItem {
  return {
    id: row.id, contractId: row.contract_id, sequenceNumber: Number(row.sequence_number), version: Number(row.version),
    itemCode: row.item_code as string | undefined, groupCode: row.group_code as string | undefined, groupName: row.group_name as string | undefined,
    serviceDescription: String(row.item_name), workContent: row.description as string | undefined,
    quantity: row.contract_quantity === null ? undefined : Number(row.contract_quantity), completedQuantity: row.completed_quantity === null ? undefined : Number(row.completed_quantity),
    unit: row.unit as string | undefined, serviceLocation: row.service_location as string | undefined,
    completionDurationDays: row.completion_duration_days === null ? undefined : Number(row.completion_duration_days),
    weightPercent: Number(row.weight_percent ?? 0), progressPercent: Number(row.progress_percent),
    plannedStartDate: date(row.planned_start_date), plannedEndDate: date(row.planned_end_date), actualStartDate: date(row.actual_start_date), actualEndDate: date(row.actual_end_date),
    status: row.status as ContractItem["status"], progressNote: row.progress_note as string | undefined, acceptanceStatus: row.acceptance_status as string | undefined,
  };
}

const columns = `(contract_id,sequence_number,item_code,group_code,group_name,item_name,item_type,description,unit,contract_quantity,
  completed_quantity,service_location,completion_duration_days,weight_percent,progress_percent,planned_start_date,planned_end_date,
  actual_start_date,actual_end_date,status,progress_note,acceptance_status,created_by,updated_by)`;

function values(input: ContractItemInput, actorId: string) {
  return [input.itemCode,input.groupCode,input.groupName,input.serviceDescription,input.workContent,input.unit,input.quantity,input.completedQuantity,
    input.serviceLocation,input.completionDurationDays,input.weightPercent,input.progressPercent,input.plannedStartDate||null,input.plannedEndDate||null,
    input.actualStartDate||null,input.actualEndDate||null,input.status,input.progressNote,input.acceptanceStatus,actorId];
}

export class PostgresContractItemRepository {
  constructor(private readonly client: PoolClient) {}

  async list(contractId: string) {
    const result = await this.client.query("SELECT * FROM tcms.contract_items WHERE contract_id=$1 AND archived_at IS NULL ORDER BY sequence_number", [contractId]);
    return result.rows.map((row) => mapRow(row as ItemRow));
  }

  async findById(contractId: string, itemId: string) {
    const row = (await this.client.query("SELECT * FROM tcms.contract_items WHERE contract_id=$1 AND id=$2 AND archived_at IS NULL", [contractId,itemId])).rows[0];
    return row ? mapRow(row as ItemRow) : null;
  }

  async create(contractId: string, input: ContractItemInput, actorId: string) {
    const result = await this.client.query(`INSERT INTO tcms.contract_items ${columns}
      SELECT $1,COALESCE(MAX(sequence_number),0)+1,$2,$3,$4,$5,'SERVICE',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$21
      FROM tcms.contract_items WHERE contract_id=$1 RETURNING *`, [contractId,...values(input,actorId)]);
    return mapRow(result.rows[0] as ItemRow);
  }

  async update(contractId: string, itemId: string, expectedVersion: number, input: ContractItemInput, actorId: string) {
    const result = await this.client.query(`UPDATE tcms.contract_items SET item_code=$1,group_code=$2,group_name=$3,item_name=$4,description=$5,
      unit=$6,contract_quantity=$7,completed_quantity=$8,service_location=$9,completion_duration_days=$10,weight_percent=$11,
      progress_percent=$12,planned_start_date=$13,planned_end_date=$14,actual_start_date=$15,actual_end_date=$16,status=$17,
      progress_note=$18,acceptance_status=$19,updated_by=$20 WHERE contract_id=$21 AND id=$22 AND version=$23 RETURNING *`,
      [...values(input,actorId),contractId,itemId,expectedVersion]);
    if (!result.rowCount) throw new Error("CONCURRENT_UPDATE_OR_NOT_FOUND");
    return mapRow(result.rows[0] as ItemRow);
  }
}
