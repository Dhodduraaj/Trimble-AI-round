# Phase 7: Concurrency - B2B License Management System (LMS)

This phase explains how the system prevents race conditions when multiple administrators attempt to assign the final remaining seat in a license pool simultaneously.

---

## 1. The Concurrency Problem (The "Last Seat" Race Condition)

### Scenario Setup
* **License Pool Capacity ($N$):** 500
* **Current Active Seats:** 499
* **Available Seats:** 1
* **Event:** Administrator A and Administrator B submit allocation requests at the exact same millisecond:
  * Admin A attempts to allocate the 500th seat to `alice@acme.com`.
  * Admin B attempts to allocate the 500th seat to `bob@acme.com`.

### Unhandled Naive Execution (Race Condition Bug)

```
Time   Admin A Transaction                         Admin B Transaction
-----------------------------------------------------------------------------------------
t1     BEGIN TRANSACTION                           BEGIN TRANSACTION
t2     SELECT COUNT(*) -> 499 (499 < 500 OK)       
t3                                                 SELECT COUNT(*) -> 499 (499 < 500 OK)
t4     INSERT INTO seats (alice@acme.com)          
t5     COMMIT (Active seats now 500)               
t6                                                 INSERT INTO seats (bob@acme.com)
t7                                                 COMMIT (Active seats now 501 -> OVER-ALLOCATION!)
```

**Result:** Both transactions succeed. Active seats equal 501 ($>N$). The business contract is violated.

---

## 2. Comparison of Concurrency Strategies

| Strategy | Mechanism | Pros | Cons | Decision |
| :--- | :--- | :--- | :--- | :--- |
| **1. Pessimistic Row Locking (`SELECT FOR UPDATE`)** | Locks the parent `license_pools` row during transaction start. Serializes concurrent allocations for the same pool. | • 100% linearizable & deterministic<br>• No counter column drift<br>• Simple, clean SQL mechanics | • Serializes concurrent writes per pool (negligible impact for admin operations) | **SELECTED** |
| **2. Optimistic Concurrency Control (OCC)** | Uses a `version` column on `license_pools`. Fails/retries update if version changed. | • No DB locks held during computation | • Requires application retry loops<br>• High retry failure under heavy contention | Rejected |
| **3. Atomic Counter Column** | Adds `allocated_seats` column with DB `CHECK (allocated_seats <= capacity)`. Uses `UPDATE ... SET allocated_seats = allocated_seats + 1 WHERE allocated_seats < capacity`. | • High throughput<br>• Lock-free counter update | • Risk of state drift between counter column and actual `seats` table rows | Backup / Rejected for pure query approach |
| **4. Database Trigger** | `BEFORE INSERT` trigger on `seats` table calculating active counts. | • Enforced at database layer | • Obscures business logic<br>• Can still suffer race conditions under `READ COMMITTED` isolation without explicit locks | Rejected |

---

## 3. Justification & Detailed Mechanics of Chosen Solution

### Chosen Solution: Pessimistic Row-Level Locking (`SELECT FOR UPDATE`) + Partial Unique Index

We choose **Pessimistic Row-Level Locking** on the parent `license_pools` row, combined with a **Partial Unique Index** on `seats`.

### Execution Flow with Pessimistic Locking

```
Time   Admin A Transaction                         Admin B Transaction
-----------------------------------------------------------------------------------------
t1     BEGIN TRANSACTION                           BEGIN TRANSACTION
t2     SELECT * FROM license_pools                 SELECT * FROM license_pools
       WHERE id = ? FOR UPDATE                     WHERE id = ? FOR UPDATE
       (ACQUIRES EXCLUSIVE ROW LOCK)              (BLOCKED WAITING FOR ROW LOCK)
t3     SELECT COUNT(*) FROM seats -> 499           | (Waiting...)
t4     Validate: 499 < 500 (PASS)                  | (Waiting...)
t5     INSERT INTO seats (alice@acme.com)          | (Waiting...)
t6     INSERT INTO seat_audit_logs                 | (Waiting...)
t7     COMMIT TRANSACTION                          | (Waiting...)
       (RELEASES ROW LOCK)                        
t8                                                 (UNBLOCKED - ACQUIRES ROW LOCK)
t9                                                 SELECT COUNT(*) FROM seats -> 500
t10                                                Validate: 500 < 500 (FAIL: POOL FULL)
t11                                                ROLLBACK TRANSACTION
t12                                                Return 409 Conflict ("Pool capacity reached")
```

---

## 4. SQL Implementation for Concurrency Control

```sql
-- Transaction execution inside SeatManagementService

BEGIN;

-- Step 1: Acquire exclusive row lock on the target pool
SELECT id, capacity, status, start_date, end_date 
FROM license_pools 
WHERE id = 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' 
FOR UPDATE;

-- Step 2: Validate temporal window and pool status
-- (Application layer verifies start_date <= NOW() <= end_date AND status = 'ACTIVE')

-- Step 3: Count active seats under lock protection
SELECT COUNT(*) 
FROM seats 
WHERE license_pool_id = 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' 
  AND status = 'ACTIVE';

-- Step 4: Conditional Check:
-- If active_count >= capacity THEN ROLLBACK and return 409 Conflict.

-- Step 5: Insert new seat allocation
INSERT INTO seats (id, license_pool_id, employee_email, status, assigned_at, assigned_by)
VALUES (gen_random_uuid(), 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', 'alice@acme.com', 'ACTIVE', CURRENT_TIMESTAMP, 'admin_a');

-- Step 6: Write audit log entry
INSERT INTO seat_audit_logs (id, license_pool_id, seat_id, employee_email, action, performed_by, performed_at)
VALUES (gen_random_uuid(), 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', '<seat_id>', 'alice@acme.com', 'ASSIGNED', 'admin_a', CURRENT_TIMESTAMP);

COMMIT;
```

---

## 5. Why Pessimistic Locking is Ideal for this Architecture

1. **Low Frequency, High Concurrency Protection:** Admin seat allocation is a low-frequency operation (tens to hundreds per day per organization) compared to license verification queries (thousands per minute). Locking the pool row for ~5 milliseconds during allocation introduces zero noticeable latency to admins while guaranteeing zero over-allocation.
2. **Non-Blocking to Verification Reads:** `SELECT ... FOR UPDATE` acquires an exclusive **write lock**. Standard `SELECT` queries used by the `GET /api/v1/licenses/verify` endpoint do not request locks and are **NEVER blocked** by ongoing seat allocation transactions in PostgreSQL (MVCC architecture).
3. **No State Drift:** By dynamically computing active counts under a lock, we eliminate redundant state (like `allocated_seats` counter columns) that could drift out of sync during partial failures.

---

## Key Concepts to Understand Before Proceeding

1. **PostgreSQL MVCC Non-blocking Reads:** `SELECT FOR UPDATE` locks rows against competing writes, but read queries (`SELECT`) read consistent historical snapshots without blocking.
2. **Linearizable Allocation:** Exclusive row-locking converts concurrent race conditions into deterministic sequential executions.
3. **Defense-in-Depth:** Combining row locking with partial unique database indexes (`idx_unique_active_seat`) guarantees both capacity enforcement ($N$) and duplicate seat protection.
