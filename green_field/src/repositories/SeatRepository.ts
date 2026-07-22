import { PoolClient } from 'pg';
import { pool } from '../db/database';
import { Seat, SeatStatus } from '../types';

export class SeatRepository {
  /**
   * Count the number of active assigned seats in a pool.
   */
  async countActiveSeats(poolId: string, client?: PoolClient): Promise<number> {
    const executor = client || pool;
    const query = `
      SELECT COUNT(*)::int AS count 
      FROM seats 
      WHERE license_pool_id = $1 AND status = 'ACTIVE';
    `;
    const res = await executor.query(query, [poolId]);
    return res.rows[0].count;
  }

  /**
   * Find an active seat for a specific employee email in a pool.
   */
  async findActiveSeatByEmail(
    poolId: string,
    email: string,
    client?: PoolClient
  ): Promise<Seat | null> {
    const executor = client || pool;
    const query = `
      SELECT 
        id, 
        license_pool_id AS "licensePoolId", 
        employee_email AS "employeeEmail", 
        status, 
        assigned_at AS "assignedAt", 
        assigned_by AS "assignedBy", 
        revoked_at AS "revokedAt", 
        revoked_by AS "revokedBy", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt"
      FROM seats 
      WHERE license_pool_id = $1 
        AND employee_email = $2 
        AND status = 'ACTIVE';
    `;
    const res = await executor.query(query, [poolId, email]);
    return res.rows[0] || null;
  }

  /**
   * Create a new active seat allocation.
   */
  async createSeat(
    data: {
      licensePoolId: string;
      employeeEmail: string;
      assignedBy: string;
    },
    client?: PoolClient
  ): Promise<Seat> {
    const executor = client || pool;
    const query = `
      INSERT INTO seats (license_pool_id, employee_email, status, assigned_by)
      VALUES ($1, $2, 'ACTIVE', $3)
      RETURNING 
        id, 
        license_pool_id AS "licensePoolId", 
        employee_email AS "employeeEmail", 
        status, 
        assigned_at AS "assignedAt", 
        assigned_by AS "assignedBy", 
        revoked_at AS "revokedAt", 
        revoked_by AS "revokedBy", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt";
    `;
    const res = await executor.query(query, [
      data.licensePoolId,
      data.employeeEmail,
      data.assignedBy,
    ]);
    return res.rows[0];
  }

  /**
   * Update seat state to REVOKED.
   */
  async revokeSeat(
    seatId: string,
    revokedBy: string,
    client?: PoolClient
  ): Promise<Seat> {
    const executor = client || pool;
    const query = `
      UPDATE seats 
      SET status = 'REVOKED', 
          revoked_at = CURRENT_TIMESTAMP, 
          revoked_by = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING 
        id, 
        license_pool_id AS "licensePoolId", 
        employee_email AS "employeeEmail", 
        status, 
        assigned_at AS "assignedAt", 
        assigned_by AS "assignedBy", 
        revoked_at AS "revokedAt", 
        revoked_by AS "revokedBy", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt";
    `;
    const res = await executor.query(query, [seatId, revokedBy]);
    return res.rows[0];
  }
}
