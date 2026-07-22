import { PoolRepository } from '../repositories/PoolRepository';
import { SeatRepository } from '../repositories/SeatRepository';
import { LicenseVerificationQuery, LicenseVerificationResult } from '../types';
import { InvalidInputException } from '../errors/DomainErrors';

export class VerificationService {
  constructor(
    private poolRepo: PoolRepository = new PoolRepository(),
    private seatRepo: SeatRepository = new SeatRepository()
  ) {}

  /**
   * Fast-Path License Verification.
   * Checks if an employee email currently holds an active seat in a valid active pool.
   */
  async verifyLicense(query: LicenseVerificationQuery): Promise<LicenseVerificationResult> {
    if (!query.tenantId || !query.productCode || !query.email) {
      throw new InvalidInputException('tenantId, productCode, and email query parameters are required.');
    }

    const email = query.email.trim().toLowerCase();
    const now = new Date();

    // 1. Locate valid active pool matching tenant, product, and current timestamp
    const pool = await this.poolRepo.findActivePool(query.tenantId, query.productCode, now);
    if (!pool) {
      return {
        licensed: false,
        employeeEmail: email,
        productCode: query.productCode,
        reason: 'NO_ACTIVE_POOL_FOUND',
      };
    }

    // 2. Check for active seat assigned to target email
    const activeSeat = await this.seatRepo.findActiveSeatByEmail(pool.id, email);
    if (!activeSeat) {
      return {
        licensed: false,
        employeeEmail: email,
        productCode: query.productCode,
        licensePoolId: pool.id,
        reason: 'NO_ACTIVE_SEAT',
      };
    }

    // 3. User holds valid active license seat
    return {
      licensed: true,
      employeeEmail: email,
      productCode: query.productCode,
      licensePoolId: pool.id,
      expiresAt: pool.endDate.toISOString(),
    };
  }
}
