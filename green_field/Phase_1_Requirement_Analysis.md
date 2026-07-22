# Phase 1: Requirement Analysis - B2B License Management System (LMS)

## 1. Business Problem Summary
Enterprise B2B SaaS applications rely on seat-based licensing models. Corporate enterprise clients purchase licenses in bulk (e.g., a pool of $N$ seats valid for a specified term). Enterprise administrators require self-service capabilities to allocate seats to employees and revoke seats when roles change. Concurrently, the SaaS application must continuously verify whether an employee holds an active, valid license before allowing feature access.

The core challenge is delivering a reliable, scalable, and audit-compliant system that strictly prevents over-allocation ($>N$ active seats) under high-concurrency admin actions and accurately enforces active date boundaries without introducing latency bottlenecks into the primary SaaS application.

---

## 2. Actors
1. **Enterprise Administrator (Admin):** Responsible for managing enterprise license pools, assigning seats to employees via email, and revoking seats.
2. **Employee (End User):** Consumes the seat assigned by their Enterprise Admin to access SaaS features.
3. **SaaS Application / Client System (Verifier):** Interacts with the LMS API to perform real-time license validation for employees requesting service access.
4. **Super Admin / Billing System:** Creates and provisions new license pools upon enterprise contract completion.

---

## 3. Functional Requirements (FRs)

* **FR-1: License Pool Provisioning:** An authorized system administrator or automated billing system can create a license pool with capacity $N$, bound by a strict `start_date` and `end_date`.
* **FR-2: Seat Allocation:** An Enterprise Admin can assign an available seat in an active pool to an employee (identified by email).
* **FR-3: Seat Revocation:** An Enterprise Admin can revoke an active seat from an employee, instantly returning the seat to the available pool capacity.
* **FR-4: Real-time License Verification:** The SaaS application can query whether an employee email currently holds a valid, active seat for a given pool/product at the current timestamp.
* **FR-5: Audit Logging:** Every seat management operation (Assign, Revoke) must record who performed the action, the affected employee, the pool ID, the action type, and the timestamp.

---

## 4. Non-Functional Requirements (NFRs)

* **NFR-1: Strict Consistency for Seat Allocation:** Zero tolerance for over-allocation. Active allocated seats must never exceed pool capacity $N$, even under simultaneous concurrent admin operations.
* **NFR-2: Low-Latency License Verification:** License check endpoints must respond with low latency ($<20\text{ ms}$ p99) as verification occurs frequently during user authentication and session authorization.
* **NFR-3: High Availability & Scalability:** High uptime ($99.99\%$) for verification APIs to prevent blocking SaaS application access for end users.
* **NFR-4: Auditability & Immutability:** Audit records must be immutable and append-only for enterprise compliance and history tracking.

---

## 5. Constraints & Assumptions

### Constraints
* **Scope Restriction:** All design and implementation must reside exclusively inside the `green field` folder.
* **Strict Capacity Cap:** $N$ active seats max.
* **Temporal Cap:** Active seat allocations are invalid outside `[start_date, end_date]`.

### Assumptions
* Employee identity is uniquely represented by a normalized email address (`user@company.com`).
* Timestamps are stored and processed strictly in UTC ISO-8601 standard format.
* An employee can hold at most one active seat per pool at any given time.

---

## 6. Edge Cases & Risk Scenarios

1. **Pool Capacity Exhaustion:** Attempting to assign a seat when active assigned seats equal capacity $N$. (Must fail gracefully with HTTP 409 Conflict / Pool Full error).
2. **Temporal Window Violation:** Assigning or verifying a seat when `current_time < start_date` or `current_time > end_date`. (Allocation fails with HTTP 400 Bad Request; Verification returns `licensed: false`).
3. **Double Allocation Race Condition:** Two administrators simultaneously clicking "Assign" for the last remaining seat ($N - 1$ active). Exactly one request must succeed; the other must receive an explicit error without corrupting pool state.
4. **Duplicate Seat Assignment:** Admin tries to assign a seat to an employee who already holds an active seat in the same pool. (Must reject duplicate active seat).
5. **Orphan / Idempotent Revocation:** Admin attempts to revoke a seat for an employee who has no active seat, or revokes the same seat twice. (Must handle idempotently or return clear HTTP 404/400).
6. **Pool Shrink / Expiration with Active Seats:** Admin or contract changes pool capacity or pool expires while active seats are still held.

---

## Key Concepts to Understand Before Proceeding

1. **Active vs. Capacity:** Pool capacity ($N$) is the hard upper limit; active seats are dynamically assigned entries where state is `ACTIVE` within `[start_date, end_date]`.
2. **Read-Heavy vs. Write-Critical Asymmetry:** Verification is high-volume and read-heavy (demands speed and high availability), while Allocation/Revocation is write-critical (demands strict linearizability/concurrency control).
3. **Audit Trail vs. Current State:** Distinguish between current state (`seats` table) and historical events (`seat_audit_logs` table) for compliance and integrity.
