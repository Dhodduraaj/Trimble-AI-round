import { runInTransaction } from '../db/database';
import { PoolRepository } from '../repositories/PoolRepository';
import { SeatRepository } from '../repositories/SeatRepository';
import { AuditLogRepository } from '../repositories/AuditLogRepository';
import { AssignSeatDTO, AuditAction, RevokeSeatDTO, Seat } from '../types';
import {
  DuplicateSeatException,
  InvalidInputException,
  PoolCapacityExceededException,
  PoolInactiveException,
  PoolNotFoundException,
  SeatNotFoundException,
} from '../errors/DomainErrors';

export class SeatService {
  constructor(
    private poolRepo: PoolRepository = new PoolRepository(),
    private seatRepo: SeatRepository = new SeatRepository(),
    private auditRepo: AuditLogRepository = new AuditLogRepository()
  ) {}

  /**
   * Helper to normalize and validate email addresses.
   */
  private normalizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      throw new InvalidInputException('Employee email is required.');
    }
    const normalized = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalized)) {
      throw new InvalidInputException(`Invalid email format: '${email}'`);
    }
    return normalized;
  }

  /**
   * CONCURRENCY-SAFE SEAT ALLOCATION
   * Acquires row lock (SELECT FOR UPDATE) on license pool, checks capacity N, duplicate active seat,
   * creates seat record and audit log atomically.
   */
  async assignSeat(poolId: string, dto: AssignSeatDTO): Promise<Seat> {
    const email = this.normalizeEmail(dto.employeeEmail);
    const performedBy = dto.performedBy || 'SYSTEM_ADMIN';

    return await runInTransaction(async (client) => {
      // 1. Lock parent license pool row exclusively (FOR UPDATE)
      const pool = await this.poolRepo.findByIdForUpdate(poolId, client);
      if (!pool) {
        throw new PoolNotFoundException(poolId);
      }

      // 2. Validate temporal window and status
      const now = new Date();
      if (pool.status !== 'ACTIVE' || now < new Date(pool.startDate) || now > new Date(pool.endDate)) {
        throw new PoolInactiveException(
          `License pool '${poolId}' is expired or inactive for current time ${now.toISOString()}.`
        );
      }

      // 3. Check for existing active seat for this employee in this pool
      const existingSeat = await this.seatRepo.findActiveSeatByEmail(poolId, email, client);
      if (existingSeat) {
        throw new DuplicateSeatException(email, poolId);
      }

      // 4. Count active assigned seats under row-lock protection
      const activeCount = await this.seatRepo.countActiveSeats(poolId, client);
      if (activeCount >= pool.capacity) {
        throw new PoolCapacityExceededException(poolId, pool.capacity);
      }

      // 5. Create new active seat
      const seat = await this.seatRepo.createSeat(
        {
          licensePoolId: poolId,
          employeeEmail: email,
          assignedBy: performedBy,
        },
        client
      );

      // 6. Write append-only audit record
      await this.auditRepo.logAction(
        {
          licensePoolId: poolId,
          seatId: seat.id,
          employeeEmail: email,
          action: AuditAction.ASSIGNED,
          performedBy: performedBy,
        },
        client
      );

      return seat;
    });
  }

  /**
   * SEAT REVOCATION
   * Locates active seat, updates state to REVOKED, and records audit entry.
   */
  async revokeSeat(poolId: string, dto: RevokeSeatDTO): Promise<Seat> {
    const email = this.normalizeEmail(dto.employeeEmail);
    const performedBy = dto.performedBy || 'SYSTEM_ADMIN';

    return await runInTransaction(async (client) => {
      // 1. Locate active seat
      const activeSeat = await this.seatRepo.findActiveSeatByEmail(poolId, email, client);
      if (!activeSeat) {
        throw new SeatNotFoundException(email, poolId);
      }

      // 2. Transition seat state to REVOKED
      const revokedSeat = await this.seatRepo.revokeSeat(activeSeat.id, performedBy, client);

      // 3. Write append-only audit record
      await this.auditRepo.logAction(
        {
          licensePoolId: poolId,
          seatId: revokedSeat.id,
          employeeEmail: email,
          action: AuditAction.REVOKED,
          performedBy: performedBy,
        },
        client
      );

      return revokedSeat;
    });
  }
}
