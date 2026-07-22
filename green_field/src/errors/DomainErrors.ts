export class DomainError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PoolNotFoundException extends DomainError {
  constructor(poolId: string) {
    super('POOL_NOT_FOUND', 404, `License pool with ID '${poolId}' was not found.`);
  }
}

export class PoolInactiveException extends DomainError {
  constructor(message: string = 'License pool is currently inactive or outside valid dates.') {
    super('POOL_INACTIVE', 400, message);
  }
}

export class PoolCapacityExceededException extends DomainError {
  constructor(poolId: string, capacity: number) {
    super(
      'POOL_FULL',
      409,
      `License pool '${poolId}' has reached its maximum capacity limit of ${capacity} active seats.`
    );
  }
}

export class DuplicateSeatException extends DomainError {
  constructor(email: string, poolId: string) {
    super(
      'DUPLICATE_SEAT',
      409,
      `Employee '${email}' already holds an active seat in pool '${poolId}'.`
    );
  }
}

export class SeatNotFoundException extends DomainError {
  constructor(email: string, poolId: string) {
    super(
      'SEAT_NOT_FOUND',
      404,
      `No active seat found for employee '${email}' in pool '${poolId}'.`
    );
  }
}

export class InvalidInputException extends DomainError {
  constructor(message: string) {
    super('INVALID_INPUT', 400, message);
  }
}
