# Phase 2: Domain Modeling - B2B License Management System (LMS)

## 1. Domain Entities & Responsibilities

```
+------------------+         1:N         +------------------+
|      Tenant      | ------------------> |   LicensePool    |
+------------------+                     +------------------+
                                                  |
                                                  | 1:N
                                                  v
+------------------+         1:N         +------------------+
|   SeatAuditLog   | <------------------ |       Seat       |
+------------------+                     +------------------+
```

---

### Entity 1: `Tenant` (Enterprise Organization)
* **Responsibility:** Represents the corporate client account that purchases license packages.
* **Attributes:**
  * `id` (UUID, PK): Unique identifier for the organization.
  * `name` (String): Corporate name (e.g., "Acme Corp").
  * `created_at` (Timestamp): Record creation time.
  * `updated_at` (Timestamp): Record last update time.

---

### Entity 2: `LicensePool`
* **Responsibility:** Manages the contractual allotment of seats ($N$), product identification, and temporal boundaries (`start_date` to `end_date`).
* **Attributes:**
  * `id` (UUID, PK): Unique identifier for the license pool.
  * `tenant_id` (UUID, FK -> Tenant.id): Owning organization.
  * `product_code` (String): SaaS application/module identifier (e.g., `CAD_PRO_V1`).
  * `capacity` (Integer, $N$): Total allowed active seats.
  * `start_date` (Timestamp UTC): Date/time from which seats become valid.
  * `end_date` (Timestamp UTC): Expiration date/time after which seats become invalid.
  * `status` (Enum: `ACTIVE`, `SUSPENDED`, `EXPIRED`): Operational lifecycle state of the pool.
  * `created_at` (Timestamp UTC).
  * `updated_at` (Timestamp UTC).
* **Domain Invariants & Rules:**
  * `capacity` must be $> 0$.
  * `start_date` must be $< end\_date$.
  * Pool is active iff `status == ACTIVE` AND `start_date <= current_time <= end_date`.

---

### Entity 3: `Seat`
* **Responsibility:** Represents the allocation state of an individual license seat to a specific employee email within a license pool.
* **Attributes:**
  * `id` (UUID, PK): Unique identifier for the seat record.
  * `license_pool_id` (UUID, FK -> LicensePool.id): The pool this seat belongs to.
  * `employee_email` (String): Normalized target employee email address (e.g., `john.doe@acme.com`).
  * `status` (Enum: `ACTIVE`, `REVOKED`): Current state of the seat allocation.
  * `assigned_at` (Timestamp UTC): Timestamp of allocation.
  * `assigned_by` (String): User ID or email of the admin who granted the seat.
  * `revoked_at` (Timestamp UTC, Nullable): Timestamp of revocation (if revoked).
  * `revoked_by` (String, Nullable): Admin ID or email who revoked the seat.
* **Domain Invariants & Rules:**
  * An employee (`employee_email`) can have at most **one** `ACTIVE` seat per `license_pool_id` at any moment.
  * A seat in `REVOKED` status cannot be assigned directly; a new seat assignment record is created or status transitions cleanly.

---

### Entity 4: `SeatAuditLog`
* **Responsibility:** Immutable ledger recording every state-changing lifecycle action performed on seats for compliance, historical tracing, and security auditing.
* **Attributes:**
  * `id` (UUID, PK): Audit entry identifier.
  * `license_pool_id` (UUID, FK -> LicensePool.id): Associated license pool.
  * `seat_id` (UUID, FK -> Seat.id): Associated seat.
  * `employee_email` (String): Employee target.
  * `action` (Enum: `ASSIGNED`, `REVOKED`): Action type.
  * `performed_by` (String): Admin identity who performed the action.
  * `timestamp` (Timestamp UTC): Exact time of event.
  * `metadata` (JSON / String, Optional): Contextual data (IP address, client user agent, correlation ID).
* **Domain Invariants & Rules:**
  * Strictly append-only. Updates and deletions are forbidden.

---

## 2. Entity Relationships & Cardinality

| Source Entity | Target Entity | Cardinality | Relationship Description |
| :--- | :--- | :--- | :--- |
| `Tenant` | `LicensePool` | $1 : N$ | A tenant can purchase multiple license pools (e.g., for different products or renewal years). |
| `LicensePool` | `Seat` | $1 : N$ | A pool contains up to $N$ active seats, plus historical revoked seat records. |
| `Seat` | `SeatAuditLog` | $1 : N$ | A seat undergoes multiple lifecycle events (e.g., assigned, then revoked). |
| `LicensePool` | `SeatAuditLog` | $1 : N$ | All seat events for a pool are queryable via the pool ID. |

---

## Key Concepts to Understand Before Proceeding

1. **State Machine for Seats:** A seat transitions from `ACTIVE` $\rightarrow$ `REVOKED`. The system uses active state filtering (`status = 'ACTIVE'`) to calculate pool utilization against capacity $N$.
2. **Normalized Email Identification:** Employees are identified via normalized lower-case email addresses to prevent case-sensitivity duplicate allocation exploits (e.g., `Alice@corp.com` vs `alice@corp.com`).
3. **Audit Decoupling:** Business domain state (`Seat`) is kept separate from event history (`SeatAuditLog`). Audit entries are created synchronously within the same transaction to guarantee data integrity.
