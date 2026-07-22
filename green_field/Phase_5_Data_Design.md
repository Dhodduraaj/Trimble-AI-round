# Phase 5: Data Design - B2B License Management System (LMS)

This phase details the relational database schema, tables, relationships, constraints, indexes, and mechanisms used to enforce capacity and active date rules.

---

## 1. DDL Schema Definition (PostgreSQL)

```sql
-- Enable UUID extension if required
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLE 1: tenants
-- =============================================================================
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- TABLE 2: license_pools
-- =============================================================================
CREATE TABLE license_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    product_code VARCHAR(100) NOT NULL,
    capacity INT NOT NULL CHECK (capacity > 0),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'EXPIRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Invariant: start_date must strictly precede end_date
    CONSTRAINT chk_pool_dates CHECK (start_date < end_date)
);

-- =============================================================================
-- TABLE 3: seats
-- =============================================================================
CREATE TABLE seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_pool_id UUID NOT NULL REFERENCES license_pools(id) ON DELETE RESTRICT,
    employee_email VARCHAR(320) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(255) NOT NULL,
    revoked_at TIMESTAMPTZ NULL,
    revoked_by VARCHAR(255) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Database Level Invariant: Employee can hold at most ONE 'ACTIVE' seat per pool
CREATE UNIQUE INDEX idx_unique_active_seat 
ON seats (license_pool_id, employee_email) 
WHERE status = 'ACTIVE';

-- =============================================================================
-- TABLE 4: seat_audit_logs
-- =============================================================================
CREATE TABLE seat_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_pool_id UUID NOT NULL REFERENCES license_pools(id) ON DELETE RESTRICT,
    seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE RESTRICT,
    employee_email VARCHAR(320) NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('ASSIGNED', 'REVOKED')),
    performed_by VARCHAR(255) NOT NULL,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB NULL
);
```

---

## 2. Performance Indexes

```sql
-- 1. Fast seat counting index (Pool Capacity Checks)
CREATE INDEX idx_seats_pool_status 
ON seats (license_pool_id, status);

-- 2. Fast license verification index (Email & Status Lookup)
CREATE INDEX idx_seats_verify_email 
ON seats (employee_email, status, license_pool_id);

-- 3. Fast pool lookup by Tenant & Product Code
CREATE INDEX idx_pools_tenant_product 
ON license_pools (tenant_id, product_code, status, start_date, end_date);

-- 4. Audit Log historical lookup index
CREATE INDEX idx_audit_pool_time 
ON seat_audit_logs (license_pool_id, performed_at DESC);
```

---

## 3. Enforcement of System Invariants & Business Rules

### Rule 1: Never Exceed Purchased Capacity $N$
* **Mechanism:** Hybrid Application-Pessimistic DB Transaction Control.
* **Explanation:**
  1. Transaction begins.
  2. `SELECT capacity FROM license_pools WHERE id = ? FOR UPDATE` locks the license pool row exclusively.
  3. `SELECT COUNT(*) FROM seats WHERE license_pool_id = ? AND status = 'ACTIVE'` counts active seats.
  4. If `active_count >= capacity`, transaction aborts and returns `409 Conflict`.
  5. Because of row lock (`FOR UPDATE`), concurrent allocations on the same pool are serialized. No two transactions can read stale seat counts simultaneously.

### Rule 2: Active Date Window Enforcement
* **Mechanism:** Schema CHECK Constraint + Temporal Query Filters.
* **Explanation:**
  * **Creation:** `CONSTRAINT chk_pool_dates CHECK (start_date < end_date)` ensures invalid ranges cannot be inserted.
  * **Allocation:** `SELECT * FROM license_pools WHERE id = ? AND status = 'ACTIVE' AND CURRENT_TIMESTAMP BETWEEN start_date AND end_date` ensures seats cannot be allocated outside valid pool dates.
  * **Verification:** Verification query joins active seats with pools filtering `CURRENT_TIMESTAMP BETWEEN start_date AND end_date`.

### Rule 3: Single Active Seat Per Employee Per Pool (No Double Allocation)
* **Mechanism:** Database Partial Unique Index (`idx_unique_active_seat`).
* **Explanation:** `CREATE UNIQUE INDEX idx_unique_active_seat ON seats (license_pool_id, employee_email) WHERE status = 'ACTIVE';`
  * If an admin attempts to assign a seat to `jane@acme.com` while an active seat exists in that pool, PostgreSQL immediately throws a unique constraint violation (`23505`), guaranteeing data integrity even if application layer checks fail.

---

## Key Concepts to Understand Before Proceeding

1. **Partial Unique Index:** Standard unique indexes enforce uniqueness across all rows. Partial unique indexes (`WHERE status = 'ACTIVE'`) allow an employee to have multiple historical `REVOKED` rows while enforcing that at most one row is `ACTIVE`.
2. **Pessimistic Locking vs Triggers:** Locking the parent `license_pools` row via `FOR UPDATE` serializes seat additions, preventing over-allocation without complex trigger logic.
3. **TIMESTAMPTZ Standard:** All dates are stored with timezone awareness (`TIMESTAMPTZ`) in UTC to prevent date boundary ambiguities across global deployments.
