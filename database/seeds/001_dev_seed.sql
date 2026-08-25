BEGIN;
SELECT set_config('app.actor_id', '00000000-0000-0000-0000-000000000001', true);
SELECT set_config('app.permissions', '["contract.read","contract.create","contract.identity.update","contract.progress.update","contract.acceptance.update","contract.finance.update","contract.assignment.manage","contract.status.transition","audit.write"]', true);
SELECT set_config('app.department_ids', '[]', true);
SELECT set_config('app.assigned_contract_ids', '[]', true);
SELECT set_config('app.global_contract_scope', 'true', true);
SELECT set_config('app.environment', 'development', true);
SELECT set_config('app.correlation_id', 'dev-seed-001', true);
SELECT set_config('app.app_version', 'development-seed', true);

INSERT INTO tcms.app_users (id, identity_subject, username, display_name, primary_department_id, last_identity_sync_at)
SELECT v.id::uuid, v.subject, v.username, v.display_name, d.id, clock_timestamp()
FROM (VALUES
 ('00000000-0000-0000-0000-000000000001','dev-admin','admin@tcms.dev','Quản trị DEV','PXVH1'),
 ('00000000-0000-0000-0000-000000000002','dev-manager','manager@tcms.dev','Quản lý hợp đồng DEV','PXVH1'),
 ('00000000-0000-0000-0000-000000000003','dev-supervisor','supervisor@tcms.dev','Giám sát DEV','PXVH1'),
 ('00000000-0000-0000-0000-000000000004','dev-viewer','viewer@tcms.dev','Người xem DEV','PKT')
) v(id,subject,username,display_name,department_code)
JOIN tcms.departments d ON d.code=v.department_code
ON CONFLICT (identity_subject) DO UPDATE SET display_name=EXCLUDED.display_name, active=true;

INSERT INTO tcms.user_role_scopes (user_id, role_code, department_id, global_scope, granted_by)
SELECT u.id, v.role_code, CASE WHEN v.global_scope THEN NULL ELSE u.primary_department_id END, v.global_scope, 'dev-seed'
FROM (VALUES
 ('dev-admin','SYSTEM_ADMIN',true), ('dev-admin','CONTRACT_MANAGER',true),
 ('dev-manager','CONTRACT_MANAGER',true), ('dev-supervisor','SUPERVISOR',false), ('dev-viewer','VIEWER',false)
) v(subject,role_code,global_scope)
JOIN tcms.app_users u ON u.identity_subject=v.subject
WHERE NOT EXISTS (SELECT 1 FROM tcms.user_role_scopes x WHERE x.user_id=u.id AND x.role_code=v.role_code AND x.global_scope=v.global_scope);

INSERT INTO tcms.contractors (code, name, created_by, updated_by) VALUES
 ('DEV-NT-001','Nhà thầu mẫu An Toàn','dev-seed','dev-seed'),
 ('DEV-NT-002','Đơn vị dịch vụ Kỹ Thuật Mẫu','dev-seed','dev-seed')
ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, updated_by='dev-seed';

INSERT INTO tcms.contracts (contract_number, package_name, lead_department_id, contractor_id, contractor_name,
  contract_duration_days, contract_start_date, contract_end_date, progress_percent, progress_note,
  payment_settlement_status, status, created_by, updated_by)
SELECT v.contract_number,v.package_name,d.id,n.id,n.name,v.duration,v.start_date::date,v.end_date::date,
  v.progress,v.progress_note,'Chưa thanh toán',v.status,'dev-seed','dev-seed'
FROM (VALUES
 ('DEV/2026/001','Bảo dưỡng thiết bị phụ tổ máy - dữ liệu giả','PXVH1','DEV-NT-001',90,'2026-08-01','2026-10-29',25,'Đang triển khai theo kế hoạch','IN_PROGRESS'),
 ('DEV/2026/002','Kiểm định kỹ thuật định kỳ - dữ liệu giả','PKT','DEV-NT-002',45,'2026-09-01','2026-10-15',0,'Chưa bắt đầu','ACTIVE')
) v(contract_number,package_name,department_code,contractor_code,duration,start_date,end_date,progress,progress_note,status)
JOIN tcms.departments d ON d.code=v.department_code JOIN tcms.contractors n ON n.code=v.contractor_code
ON CONFLICT (contract_number) DO NOTHING;

INSERT INTO tcms.contract_departments (contract_id, department_id, participation_type, assigned_by)
SELECT c.id,c.lead_department_id,'LEAD','dev-seed' FROM tcms.contracts c WHERE c.contract_number LIKE 'DEV/%'
ON CONFLICT DO NOTHING;

INSERT INTO tcms.contract_items (contract_id,sequence_number,item_code,item_name,item_type,unit,contract_quantity,
  completed_quantity,weight_percent,planned_start_date,planned_end_date,progress_percent,status,progress_note,created_by,updated_by)
SELECT c.id,v.stt,v.code,v.name,v.item_type,v.unit,v.quantity,v.completed,v.weight,v.start_date::date,v.end_date::date,
  v.progress,v.status,v.note,'dev-seed','dev-seed'
FROM tcms.contracts c JOIN (VALUES
 ('DEV/2026/001',1,'DV-01','Khảo sát và lập biện pháp','DELIVERABLE','Hồ sơ',1,1,20,100,'COMPLETED','2026-08-01','2026-08-10','Đã hoàn thành'),
 ('DEV/2026/001',2,'DV-02','Thực hiện bảo dưỡng thiết bị','SERVICE','Gói',1,0,80,6.25,'IN_PROGRESS','2026-08-11','2026-10-20','Đang thực hiện'),
 ('DEV/2026/002',1,'KT-01','Kiểm định thiết bị','SERVICE','Thiết bị',12,0,100,0,'NOT_STARTED','2026-09-01','2026-10-10','Chưa bắt đầu')
) v(contract_number,stt,code,name,item_type,unit,quantity,completed,weight,progress,status,start_date,end_date,note)
ON c.contract_number=v.contract_number
ON CONFLICT (contract_id,sequence_number) DO NOTHING;
COMMIT;
