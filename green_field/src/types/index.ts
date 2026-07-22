/**
 * Domain Enums
 */
export enum PoolStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
}

export enum SeatStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
}

export enum AuditAction {
  ASSIGNED = 'ASSIGNED',
  REVOKED = 'REVOKED',
}

/**
 * Domain Entities
 */
export interface Tenant {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LicensePool {
  id: string;
  tenantId: string;
  productCode: string;
  capacity: number;
  startDate: Date;
  endDate: Date;
  status: PoolStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Seat {
  id: string;
  licensePoolId: string;
  employeeEmail: string;
  status: SeatStatus;
  assignedAt: Date;
  assignedBy: string;
  revokedAt?: Date | null;
  revokedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SeatAuditLog {
  id: string;
  licensePoolId: string;
  seatId: string;
  employeeEmail: string;
  action: AuditAction;
  performedBy: string;
  performedAt: Date;
  metadata?: Record<string, any> | null;
}

/**
 * DTOs (Data Transfer Objects)
 */
export interface CreatePoolDTO {
  tenantId: string;
  productCode: string;
  capacity: number;
  startDate: string; // ISO String
  endDate: string;   // ISO String
}

export interface AssignSeatDTO {
  employeeEmail: string;
  performedBy: string;
}

export interface RevokeSeatDTO {
  employeeEmail: string;
  performedBy: string;
}

export interface LicenseVerificationQuery {
  tenantId: string;
  productCode: string;
  email: string;
}

export interface LicenseVerificationResult {
  licensed: boolean;
  employeeEmail: string;
  productCode?: string;
  licensePoolId?: string;
  expiresAt?: string;
  reason?: string;
}
