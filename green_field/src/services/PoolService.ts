import { PoolRepository } from '../repositories/PoolRepository';
import { SeatRepository } from '../repositories/SeatRepository';
import { CreatePoolDTO, LicensePool, PoolStatus } from '../types';
import { InvalidInputException, PoolNotFoundException } from '../errors/DomainErrors';

export class PoolService {
  constructor(
    private poolRepo: PoolRepository = new PoolRepository(),
    private seatRepo: SeatRepository = new SeatRepository()
  ) {}

  /**
   * Create a new license pool with capacity and date range validation.
   */
  async createPool(dto: CreatePoolDTO): Promise<LicensePool> {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    const now = new Date();

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new InvalidInputException('Invalid ISO-8601 date format for start_date or end_date.');
    }

    if (startDate >= endDate) {
      throw new InvalidInputException('start_date must strictly precede end_date.');
    }

    if (dto.capacity <= 0) {
      throw new InvalidInputException('Pool capacity must be greater than zero.');
    }

    const status = now >= startDate && now <= endDate ? PoolStatus.ACTIVE : PoolStatus.SUSPENDED;

    return await this.poolRepo.create({
      tenantId: dto.tenantId,
      productCode: dto.productCode,
      capacity: dto.capacity,
      startDate,
      endDate,
      status,
    });
  }

  /**
   * Retrieve pool details along with current active & available seat counts.
   */
  async getPoolDetails(poolId: string): Promise<{
    pool: LicensePool;
    activeSeats: number;
    availableSeats: number;
  }> {
    const pool = await this.poolRepo.findById(poolId);
    if (!pool) {
      throw new PoolNotFoundException(poolId);
    }

    const activeSeats = await this.seatRepo.countActiveSeats(poolId);
    const availableSeats = Math.max(0, pool.capacity - activeSeats);

    return {
      pool,
      activeSeats,
      availableSeats,
    };
  }
}
