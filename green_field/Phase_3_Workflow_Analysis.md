# Phase 3: Workflow Analysis - B2B License Management System (LMS)

This phase details the end-to-end procedural workflows for the four core system operations, highlighting validation checks, state transitions, transactional boundaries, and response codes.

---

## Workflow 1: Create License Pool

### Flow Step-by-Step
1. **Trigger:** System Administrator or automated billing webhook sends `POST /api/v1/pools` with payload:
   ```json
   {
     "tenant_id": "tenant-uuid-123",
     "product_code": "CAD_PRO_V1",
     "capacity": 500,
     "start_date": "2026-01-01T00:00:00Z",
     "end_date": "2026-12-31T23:59:59Z"
   }
   ```
2. **Validation Layer:**
   * Validate parameters: `capacity > 0`, `start_date < end_date`.
   * Verify existence of `tenant_id`.
3. **Business Processing:**
   * Evaluate initial state: `status = ACTIVE` if current UTC time $\ge$ `start_date` and $\le$ `end_date`.
4. **Database Transaction:**
   * Insert row into `license_pools` table.
5. **Response:**
   * Return `201 Created` with created pool details and location header.

```
[Admin/Billing] ---> (POST /pools) ---> [Validation] ---> [Insert LicensePool DB] ---> 201 Created
```

---

## Workflow 2: Assign Seat to Employee

### Flow Step-by-Step
1. **Trigger:** Enterprise Admin submits `POST /api/v1/pools/{pool_id}/seats` with payload:
   ```json
   {
     "employee_email": "jane.doe@acme.com"
   }
   ```
2. **Authentication & Authorization:** Verify Admin identity and ensure Admin belongs to the tenant owning `pool_id`.
3. **Data Normalization:** Convert `employee_email` to lower-case (`jane.doe@acme.com`).
4. **Transactional Execution (Atomic Boundary):**
   * **a. Fetch & Validate Pool:** Retrieve pool where `id = pool_id`. Check `start_date <= UTC_NOW() <= end_date` and `status == ACTIVE`. If invalid, rollback and return `400 Bad Request` ("Pool expired or inactive").
   * **b. Check Existing Seat:** Check if `Seat` exists with `license_pool_id = pool_id`, `employee_email = jane.doe@acme.com`, and `status = 'ACTIVE'`. If exists, rollback and return `409 Conflict` ("Employee already holds an active seat").
   * **c. Check Capacity:** Count current active seats ($C_{active} = \text{COUNT(status = 'ACTIVE')}$). If $C_{active} \ge N$, rollback and return `409 Conflict` ("License pool is full").
   * **d. Create Seat:** Insert new `Seat` row (`status = ACTIVE`, `assigned_at = UTC_NOW()`, `assigned_by = AdminID`).
   * **e. Write Audit Log:** Insert row into `seat_audit_logs` (`action = ASSIGNED`, `performed_by = AdminID`, `timestamp = UTC_NOW()`).
5. **Commit Transaction.**
6. **Response:** Return `201 Created` with assigned seat details.

```
[Admin] ---> (POST /seats) ---> [Auth & Email Cleanup] ---> [Tx: Validate Pool -> Check Dup -> Check Capacity -> Insert Seat -> Write Audit] ---> 201 Created / 409 Conflict
```

---

## Workflow 3: Revoke Seat from Employee

### Flow Step-by-Step
1. **Trigger:** Enterprise Admin submits `POST /api/v1/pools/{pool_id}/seats/revoke` or `DELETE /api/v1/pools/{pool_id}/seats/{seat_id}` with payload:
   ```json
   {
     "employee_email": "jane.doe@acme.com"
   }
   ```
2. **Authentication & Authorization:** Validate Admin authority.
3. **Transactional Execution:**
   * **a. Locate Active Seat:** Query `Seat` table for `license_pool_id = pool_id`, `employee_email = lower(email)`, and `status = 'ACTIVE'` with row-level lock.
   * **b. Handle Missing Seat:** If no active seat exists, return `404 Not Found` ("No active seat found for this employee").
   * **c. Update State:** Set `status = 'REVOKED'`, `revoked_at = UTC_NOW()`, `revoked_by = AdminID`.
   * **d. Write Audit Log:** Insert row into `seat_audit_logs` (`action = REVOKED`, `performed_by = AdminID`, `timestamp = UTC_NOW()`).
4. **Commit Transaction.**
5. **Response:** Return `200 OK` with revoked seat record.

```
[Admin] ---> (POST /revoke) ---> [Tx: Find Active Seat -> Update Status to REVOKED -> Write Audit] ---> 200 OK / 404 Not Found
```

---

## Workflow 4: Real-time License Verification

### Flow Step-by-Step
1. **Trigger:** SaaS Application calls `GET /api/v1/licenses/verify?tenant_id={tenant_id}&product_code={product_code}&email={employee_email}` during user login or API request authorization.
2. **Data Normalization:** Lowercase the target `email`.
3. **Read Operation (Fast-Path Query):**
   * Check for an active `LicensePool` matching `tenant_id` and `product_code` where `start_date <= UTC_NOW() <= end_date` and `status = 'ACTIVE'`.
   * If no valid pool exists $\rightarrow$ Return `200 OK` with `{ "licensed": false, "reason": "POOL_EXPIRED_OR_NOT_FOUND" }`.
   * Query `Seat` table for `license_pool_id = pool.id`, `employee_email = lower(email)`, and `status = 'ACTIVE'`.
4. **Evaluation & Response:**
   * If active seat found $\rightarrow$ Return `200 OK`:
     ```json
     {
       "licensed": true,
       "employee_email": "jane.doe@acme.com",
       "product_code": "CAD_PRO_V1",
       "pool_id": "pool-uuid-123",
       "expires_at": "2026-12-31T23:59:59Z"
     }
     ```
   * If no active seat found $\rightarrow$ Return `200 OK`:
     ```json
     {
       "licensed": false,
       "employee_email": "jane.doe@acme.com",
       "reason": "NO_ACTIVE_SEAT"
     }
     ```

```
[SaaS App] ---> (GET /verify) ---> [Query Active Pool & Seat] ---> 200 OK { licensed: true/false }
```

---

## Key Concepts to Understand Before Proceeding

1. **Transactional Boundaries:** Allocation and Revocation execute inside single ACID database transactions. If any check fails (capacity exceeded, duplicate seat, inactive pool), the transaction aborts cleanly without partial writes.
2. **Verification Always Returns 200 OK:** License verification is an authorization query. Failing to hold a license is a valid business response (`licensed: false`), not an HTTP error code (e.g. `404`). HTTP 4xx/5xx codes are reserved for invalid system queries or server failures.
3. **Explicit Temporal Verification:** License validity depends on two dimensions: an active seat assignment AND a valid date range (`start_date <= UTC_NOW() <= end_date`).
