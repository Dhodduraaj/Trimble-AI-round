import { PoolClient } from 'pg';
import { pool } from '../db/database';
import { LicensePool, PoolStatus } from '../types';

export class PoolRepository {
  /**
   * Insert a new license pool record.
   */
  async create(
    data: {
      tenantId: string;
      productCode: string;
      capacity: number;
      startDate: Date;
      endDate: Date;
      status: PoolStatus;
    },
    client?: PoolClient
  ): Promise<LicensePool> {
    const executor = client || pool;
    const query = `
      INSERT INTO license_pools (tenant_id, product_code, capacity, start_date, end_date, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id, 
        tenant_id AS "tenantId", 
        product_code AS "productCode", 
        capacity, 
        start_date AS "startDate", 
        end_date AS "endDate", 
        status, 
        created_at AS "createdAt", 
        updated_at AS "updatedAt";
    `;
    const res = await executor.query(query, [
      data.tenantId,
      data.productCode,
      data.capacity,
      data.startDate,
      data.endDate,
      data.status,
    ]);
    return res.rows[0];
  }

  /**
   * Find license pool by ID.
   */
  async findById(id: string, client?: PoolClient): Promise<LicensePool | null> {
    const executor = client || pool;
    const query = `
      SELECT 
        id, 
        tenant_id AS "tenantId", 
        product_code AS "productCode", 
        capacity, 
        start_date AS "startDate", 
        end_date AS "endDate", 
        status, 
        created_at AS "createdAt", 
        updated_at AS "updatedAt"
      FROM license_pools 
      WHERE id = $1;
    `;
    const res = await executor.query(query, [id]);
    return res.rows[0] || null;
  }

  /**
   * CRITICAL FOR CONCURRENCY:
   * Acquire an EXCLUSIVE ROW LOCK (FOR UPDATE) on the license pool within a transaction.
   */
  async findByIdForUpdate(id: string, client: PoolClient): Promise<LicensePool | null> {
    const query = `
      SELECT 
        id, 
        tenant_id AS "tenantId", 
        product_code AS "productCode", 
        capacity, 
        start_date AS "startDate", 
        end_date AS "endDate", 
        status, 
        created_at AS "createdAt", 
        updated_at AS "updatedAt"
      FROM license_pools 
      WHERE id = $1 
      FOR UPDATE;
    `;
    const res = await client.query(query, [id]);
    return res.rows[0] || null;
  }

  /**
   * Find an active pool matching tenant, product code, and temporal window.
   */
  async findActivePool(
    tenantId: string,
    productCode: string,
    now: Date = new Date(),
    client?: PoolClient
  ): Promise<LicensePool | null> {
    const executor = client || pool;
    const query = `
      SELECT 
        id, 
        tenant_id AS "tenantId", 
        product_code AS "productCode", 
        capacity, 
        start_date AS "startDate", 
        end_date AS "endDate", 
        status, 
        created_at AS "createdAt", 
        updated_at AS "updatedAt"
      FROM license_pools 
      WHERE tenant_id = $1 
        AND product_code = $2 
        AND status = 'ACTIVE' 
        AND $3 BETWEEN start_date AND end_date
      LIMIT 1;
    `;
    const res = await executor.query(query, [tenantId, productCode, now]);
    return res.rows[0] || null;
  }
}
