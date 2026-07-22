# Phase 8: Implementation Plan - B2B License Management System (LMS)

This phase breaks down the implementation of the License Management System into logical, testable milestones. Each milestone defines the deliverables, components built, and verification criteria.

---

## Technical Stack Selection

* **Language & Runtime:** Node.js (v20 LTS) with TypeScript (Strict Mode).
* **Web Framework:** Express.js.
* **Database & ORM/Driver:** PostgreSQL with `pg` / TypeORM / Prisma for typed SQL query execution and explicit transaction lock control (`SELECT ... FOR UPDATE`).
* **Validation & Utilities:** `zod` for request schema validation, `uuid` for identifier generation.
* **Testing:** Jest / Supertest for unit, integration, and concurrency tests.

---

## Logical Implementation Milestones

```
+-----------------------------------------------------------------------+
| Milestone 1: Core Domain Entities, DTOs & Schema Migrations          |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| Milestone 2: Data Access Layer & Repositories (Pessimistic Locking)   |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| Milestone 3: Business Logic Services & Transaction Orchestration       |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| Milestone 4: REST API Controllers & RFC 7807 Error Middleware          |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| Milestone 5: Concurrency Verification & Comprehensive Test Suite      |
+-----------------------------------------------------------------------+
```

---

### Milestone 1: Domain Entities, DTOs & Schema Migrations
* **Goal:** Establish core types, data models, domain enums, and database table creation.
* **Deliverables:**
  * `src/entities/Tenant.ts`
  * `src/entities/LicensePool.ts`
  * `src/entities/Seat.ts`
  * `src/entities/SeatAuditLog.ts`
  * `src/dtos/` (Request/Response interfaces)
  * `src/db/migrations/001_initial_schema.sql`
* **Verification:** Database tables created with correct foreign keys, check constraints, and partial unique index (`idx_unique_active_seat`).

---

### Milestone 2: Data Access Layer & Repositories
* **Goal:** Implement persistent data access modules with explicit transaction and row-locking support.
* **Deliverables:**
  * `src/repositories/PoolRepository.ts` (Includes `findForUpdate(id, client)`)
  * `src/repositories/SeatRepository.ts` (Includes `countActiveSeats(poolId, client)` and `findActiveSeat(poolId, email, client)`)
  * `src/repositories/AuditLogRepository.ts`
  * `src/db/database.ts` (Connection pooling & transaction runner utility)
* **Verification:** Unit tests confirming transactional query execution and row lock acquisition semantics.

---

### Milestone 3: Business Logic Services
* **Goal:** Build domain services enforcing business rules, capacity limits, date bounds, email normalization, and audit logging.
* **Deliverables:**
  * `src/services/PoolService.ts`
  * `src/services/SeatService.ts` (Handles `assignSeat` and `revokeSeat` inside atomic DB transactions)
  * `src/services/VerificationService.ts` (Fast read-path license verification)
  * `src/services/AuditService.ts`
* **Verification:** Unit tests verifying capacity $N$ check failures, duplicate active seat rejections, and expired date window rejections.

---

### Milestone 4: REST API Controllers & Error Handler
* **Goal:** Expose REST API endpoints conforming to the Phase 6 specification with RFC 7807 standard error payloads.
* **Deliverables:**
  * `src/controllers/PoolController.ts`
  * `src/controllers/SeatController.ts`
  * `src/controllers/VerificationController.ts`
  * `src/middleware/errorHandler.ts` (RFC 7807 error formatter)
  * `src/middleware/validate.ts` (Zod request validator)
  * `src/app.ts` & `src/server.ts`
* **Verification:** End-to-end HTTP integration tests via Supertest covering all 5 API endpoints.

---

### Milestone 5: Concurrency Verification & Test Suite
* **Goal:** Validate system behavior under concurrent load and edge cases.
* **Deliverables:**
  * `tests/concurrency/seat_allocation_race.test.ts`
  * `tests/integration/workflow.test.ts`
* **Verification:** Execute a test simulating 50 concurrent requests competing for 1 remaining seat. Verify **exactly 1 request succeeds (201 Created)** and **49 requests fail with 409 Conflict**, with total active seats remaining exactly $N$.

---

## Key Concepts to Understand Before Proceeding

1. **Incremental Layering:** Developing bottom-up (Entities $\rightarrow$ Repositories $\rightarrow$ Services $\rightarrow$ Controllers) ensures that domain rules and data safety are verified before exposing HTTP endpoints.
2. **Explicit Transaction Propagation:** Repositories accept an optional database client context (`pg.PoolClient`) so multiple repository operations execute inside the exact same database transaction block.
3. **Automated Concurrency Test:** Concurrency cannot be verified manually; automated Promise.all / thread-pool tests validate row locking behavior under load.
