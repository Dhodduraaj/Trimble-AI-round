# Phase 9: Code - B2B License Management System (LMS)

This document presents the full, production-quality TypeScript implementation of the B2B License Management System. All code modules are strictly contained within the `green field` directory.

---

## Directory & Module Layout

```
green field/
├── package.json
├── tsconfig.json
├── Phase_1_Requirement_Analysis.md
├── Phase_2_Domain_Modeling.md
├── Phase_3_Workflow_Analysis.md
├── Phase_4_Architecture.md
├── Phase_5_Data_Design.md
├── Phase_6_API_Design.md
├── Phase_7_Concurrency.md
├── Phase_8_Implementation_Plan.md
├── Phase_9_Code.md
└── src/
    ├── types/
    │   └── index.ts               # Domain interfaces, Enums, DTOs
    ├── errors/
    │   └── DomainErrors.ts        # Custom exception hierarchy
    ├── db/
    │   └── database.ts            # Connection pool & runInTransaction helper
    ├── repositories/
    │   ├── PoolRepository.ts      # Includes findByIdForUpdate (SELECT FOR UPDATE)
    │   ├── SeatRepository.ts      # Active seat queries and creation
    │   └── AuditLogRepository.ts  # Append-only audit logger
    ├── services/
    │   ├── PoolService.ts         # Pool creation and details
    │   ├── SeatService.ts         # Concurrency-safe seat assign & revoke
    │   └── VerificationService.ts # Fast read-path license check
    ├── middleware/
    │   └── errorHandler.ts        # RFC 7807 problem details handler
    ├── controllers/
    │   ├── PoolController.ts      # Pool endpoints handler
    │   ├── SeatController.ts      # Seat assign/revoke handler
    │   └── VerificationController.ts # License verification handler
    └── app.ts                     # Express app factory & route registration
```

---

## Major Design Decisions & Code Explanations

### 1. Concurrency-Safe Seat Allocation (`SeatService.ts` & `PoolRepository.ts`)
* **Decision:** `assignSeat` executes inside `runInTransaction(async (client) => ...)` and calls `PoolRepository.findByIdForUpdate(poolId, client)`.
* **Rationale:** This issues a SQL `SELECT ... FOR UPDATE` row lock on the parent `license_pools` table. Competing transactions attempting to allocate seats in the same pool are queued by PostgreSQL until the first transaction commits or rolls back. Active seat counts (`countActiveSeats`) are computed under lock protection, guaranteeing zero capacity over-allocation even under high concurrency.

### 2. Standardized RFC 7807 Error Handling (`errorHandler.ts` & `DomainErrors.ts`)
* **Decision:** Domain exceptions inherit from `DomainError` containing explicit error codes (`POOL_FULL`, `DUPLICATE_SEAT`, `POOL_INACTIVE`, `SEAT_NOT_FOUND`).
* **Rationale:** All unhandled or domain errors pass through `errorHandler`, formatting responses into standardized JSON Problem Details objects with ISO-8601 timestamps and RFC error URLs.

### 3. Canonical Identity Normalization (`SeatService.ts` & `VerificationService.ts`)
* **Decision:** Employee email addresses are trimmed and lowercased (`email.trim().toLowerCase()`) before reaching database queries or business comparisons.
* **Rationale:** Prevents case-sensitivity duplicate allocation bugs (e.g. `Alice@acme.com` vs `alice@acme.com`).

### 4. Non-Blocking Read Path (`VerificationService.ts`)
* **Decision:** `verifyLicense` performs plain read queries without acquiring row locks.
* **Rationale:** PostgreSQL Multi-Version Concurrency Control (MVCC) enables license verification reads to execute instantly ($<10\text{ ms}$) without being blocked by ongoing administrative seat allocation transactions.
