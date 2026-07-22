# Campus Evaluation Challenge: B2B License Management System (v2 — Fresher)

## Architecture & System Design Assessment (AI-Assisted)

---

### 1. The Challenge (Problem Statement)

Design the **high-level system architecture**, **database schema**, and **REST API contract** for a self-service **License Management System (LMS)**.

An enterprise corporate client purchases software in bulk (e.g., a pool of 500 licenses). Enterprise administrators must be able to distribute and revoke seats to their employees, staying within the purchased limit. The company's SaaS application must be able to check whether an employee currently holds a valid, active license.

**Time guidance:** 20 minutes.

---

### 2. Core Requirements

#### 2.1 Functional Workflows

- **Create License Pool:** An administrator establishes a license pool of $N$ seats bound by a start date and an end date.
- **Manage Seats:** An administrator assigns an available seat to an employee (identified by email) or revokes an active seat so it returns to the pool. Every assign and revoke action must record who performed it, which employee was affected, and when.
- **Verify License:** The SaaS application checks whether a given employee email currently holds a valid, active license.

#### 2.2 System Constraints & Edge Cases

- **Pool Boundary:** The number of actively assigned seats must never exceed the purchased pool capacity $N$. An allocation request when the pool is full must be rejected with a clear error.
- **Date Window:** Allocation must be rejected, and verification must report the employee as unlicensed, if the current date falls outside the pool's active date range.
- **Double Allocation:** If two administrators attempt to allocate the final remaining seat at the same time, only one allocation may succeed. Your design must explain how this is prevented.

---

### 3. Expected Deliverables

Candidates must use AI assistants (e.g., Claude, Copilot) to design, refine, and deliver the following components.

#### A. High-Level System Architecture (Mermaid.js)

Provide a simple architecture diagram using Mermaid syntax showing how these components interact:

- Admin UI (enterprise administrator manages pools and seats)
- API / App Layer (business logic)
- Database

The diagram must show the request flow for at least one **seat allocation** path and one **license verification** path.

#### B. Database Schema Design

Define your own tables (or collections), including field names, data types, primary keys, and foreign keys. Your schema must account for:

- Pool capacity and active date range
- Seat assignments and revocations
- Audit history for assign/revoke actions
- How the "never exceed $N$ active seats" rule is enforced — in the database, in application logic, or both (state your choice)

#### C. API Design

Define a REST API contract sufficient to support all three workflows above. For each endpoint, specify the path, HTTP method, request body, response body, and HTTP status codes — including error responses for a full pool, an expired pool, and invalid requests.

#### D. Concurrency Note

A brief explanation — tied to your own schema and API — of how two administrators racing for the last available seat do not both succeed.

#### E. AI Usage Review (In-Person)

Be prepared to walk the interviewer through **every AI prompt used** during the session and show **design artifacts on your laptop** (with timestamp visible). No separate document submission is required — this is reviewed live at the end of the round.

---

### 4. Extended Scope (Not a mandate)

- Caching, Redis, or read replicas
- Microservices, message queues, or container orchestration
- Multi-tenant company hierarchies
- Payment or billing
