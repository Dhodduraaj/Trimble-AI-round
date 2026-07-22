import { Request, Response, NextFunction } from 'express';
import { PoolService } from '../services/PoolService';

export class PoolController {
  constructor(private poolService: PoolService = new PoolService()) {}

  /**
   * POST /api/v1/pools
   */
  createPool = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pool = await this.poolService.createPool({
        tenantId: req.body.tenant_id,
        productCode: req.body.product_code,
        capacity: req.body.capacity,
        startDate: req.body.start_date,
        endDate: req.body.end_date,
      });

      res.status(201).json({
        id: pool.id,
        tenant_id: pool.tenantId,
        product_code: pool.productCode,
        capacity: pool.capacity,
        active_seats_count: 0,
        start_date: pool.startDate.toISOString(),
        end_date: pool.endDate.toISOString(),
        status: pool.status,
        created_at: pool.createdAt.toISOString(),
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/pools/:poolId
   */
  getPool = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { poolId } = req.params;
      const details = await this.poolService.getPoolDetails(poolId);

      res.status(200).json({
        id: details.pool.id,
        tenant_id: details.pool.tenantId,
        product_code: details.pool.productCode,
        capacity: details.pool.capacity,
        active_seats: details.activeSeats,
        available_seats: details.availableSeats,
        start_date: details.pool.startDate.toISOString(),
        end_date: details.pool.endDate.toISOString(),
        status: details.pool.status,
      });
    } catch (err) {
      next(err);
    }
  };
}
