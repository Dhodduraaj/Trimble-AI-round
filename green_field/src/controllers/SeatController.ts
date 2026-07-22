import { Request, Response, NextFunction } from 'express';
import { SeatService } from '../services/SeatService';

export class SeatController {
  constructor(private seatService: SeatService = new SeatService()) {}

  /**
   * POST /api/v1/pools/:poolId/seats
   */
  assignSeat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { poolId } = req.params;
      const performedBy = (req.headers['x-admin-id'] as string) || 'ADMIN_USER';

      const seat = await this.seatService.assignSeat(poolId, {
        employeeEmail: req.body.employee_email,
        performedBy,
      });

      res.status(201).json({
        id: seat.id,
        license_pool_id: seat.licensePoolId,
        employee_email: seat.employeeEmail,
        status: seat.status,
        assigned_at: seat.assignedAt.toISOString(),
        assigned_by: seat.assignedBy,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/pools/:poolId/seats/revoke
   */
  revokeSeat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { poolId } = req.params;
      const performedBy = (req.headers['x-admin-id'] as string) || 'ADMIN_USER';

      const seat = await this.seatService.revokeSeat(poolId, {
        employeeEmail: req.body.employee_email,
        performedBy,
      });

      res.status(200).json({
        id: seat.id,
        license_pool_id: seat.licensePoolId,
        employee_email: seat.employeeEmail,
        status: seat.status,
        assigned_at: seat.assignedAt.toISOString(),
        revoked_at: seat.revokedAt ? seat.revokedAt.toISOString() : null,
        revoked_by: seat.revokedBy,
      });
    } catch (err) {
      next(err);
    }
  };
}
