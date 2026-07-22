import { PoolClient } from 'pg';
import { pool } from '../db/database';
import { AuditAction, SeatAuditLog } from '../types';

export class AuditLogRepository {
  /**
   * Append a new audit record to the seat_audit_logs ledger.
   */
  async logAction(
    data: {
      licensePoolId: string;
      seatId: string;
      employeeEmail: string;
      action: AuditAction;
      performedBy: string;
      metadata?: Record<string, any>;
    },
    client?: PoolClient
  ): Promise<SeatAuditLog> {
    const executor = client || pool;
    const query = `
      INSERT INTO seat_audit_logs (license_pool_id, seat_id, employee_email, action, performed_by, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id, 
        license_pool_id AS "licensePoolId", 
        seat_id AS "seatId", 
        employee_email AS "employeeEmail", 
        action, 
        performed_by AS "performedBy", 
        performed_at AS "performedAt", 
        metadata;
    `;
    const res = await executor.query(query, [
      data.licensePoolId,
      data.seatId,
      data.employeeEmail,
      data.action,
      data.performedBy,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ]);
    return res.rows[0];
  }
}
