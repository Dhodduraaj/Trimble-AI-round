# Phase 4: Architecture - B2B License Management System (LMS)

This phase presents the high-level system architecture, explaining each architectural component before providing visual Mermaid.js sequence and component diagrams.

---

## 1. Architectural Components Breakdown

### 1. Enterprise Admin UI
* **Role:** Single-Page Web Application (React/TypeScript).
* **Responsibility:** Provides self-service UI for Enterprise Administrators to view pool capacity, monitor allocated seats, assign seats to employee email addresses, and trigger seat revocations.
* **Protocols:** Communicates with the API Layer over HTTPS/REST via JSON.

### 2. Client SaaS Application (Verifier)
* **Role:** External Enterprise Application / Gatekeeper Service.
* **Responsibility:** Intercepts user requests or login events within the main SaaS platform and queries the LMS for license verification before permitting user access to protected features.

### 3. API Layer (API Gateway & REST Controllers)
* **Role:** Stateless Entrypoint and Request Router.
* **Responsibility:**
  * **AuthN & AuthZ:** Validates JWT access tokens and permissions (e.g. Enterprise Admin role vs. System Billing Admin role).
  * **Input Validation & Normalization:** Validates request bodies (e.g. valid RFC email syntax, non-negative capacity, ISO-8601 timestamps) and normalizes input data (e.g. lower-case email formatting).
  * **HTTP Protocol Mapping:** Translates domain exceptions into standard HTTP status codes (e.g., `409 Conflict`, `400 Bad Request`, `404 Not Found`).

### 4. Business Logic Layer (Services & Transaction Orchestrator)
* **Role:** Core Application Domain Processing.
* **Responsibility:**
  * Enforces core domain invariants (Capacity $N$, active date range checks, duplicate seat detection).
  * Manages transactional boundaries to guarantee that seat assignment/revocation and audit logging succeed or fail atomically.
  * Coordinates pessimistic or optimistic concurrency strategies during high-concurrency allocations.

### 5. Relational Database (RDBMS - PostgreSQL)
* **Role:** Primary Persistent Data Store.
* **Responsibility:**
  * Provides ACID transactional guarantees.
  * Stores `tenants`, `license_pools`, `seats`, and `seat_audit_logs`.
  * Enforces schema constraints (Foreign Keys, Unique Indexes on `(license_pool_id, employee_email, status)`).
  * Executes row-level locking (`SELECT ... FOR UPDATE`) during seat allocation to eliminate race conditions.

---

## 2. High-Level System Architecture Component Diagram

```mermaid
graph TD
    subgraph Clients["Client Layer"]
        UI["Admin UI (Web App)"]
        SaaS["Client SaaS Application"]
    end

    subgraph APILayer["API / Controller Layer"]
        GW["API Gateway / Router"]
        PC["Pool Controller"]
        SC["Seat Controller"]
        VC["Verification Controller"]
    end

    subgraph BusinessLayer["Business Logic Layer"]
        PS["Pool Service"]
        SS["Seat Management Service"]
        VS["Verification Service"]
        AS["Audit Service"]
    end

    subgraph DataLayer["Persistence Layer"]
        DB[(PostgreSQL RDBMS)]
    end

    UI -->|HTTPS / REST| GW
    SaaS -->|HTTPS / REST| GW

    GW --> PC
    GW --> SC
    GW --> VC

    PC --> PS
    SC --> SS
    VC --> VS
    SS --> AS

    PS --> DB
    SS --> DB
    VS --> DB
    AS --> DB
```

---

## 3. Sequence Diagrams for Core Request Flows

### Flow A: Seat Allocation Request Path

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Enterprise Admin
    participant UI as Admin UI
    participant API as API Layer (Seat Controller)
    participant Service as Seat Management Service
    participant DB as PostgreSQL Database

    Admin->>UI: Input employee email & click "Assign Seat"
    UI->>API: POST /api/v1/pools/{pool_id}/seats<br/>{"employee_email": "jane@acme.com"}
    API->>API: Authenticate Admin & normalize email
    API->>Service: assignSeat(pool_id, email, admin_id)
    
    Service->>DB: BEGIN TRANSACTION
    Service->>DB: SELECT * FROM license_pools WHERE id = pool_id FOR UPDATE
    DB-->>Service: Return Pool Record
    
    Service->>Service: Validate: Pool active & UTC_NOW() in [start_date, end_date]
    alt Pool Expired or Inactive
        Service->>DB: ROLLBACK
        Service-->>API: Throw PoolInactiveException
        API-->>UI: 400 Bad Request ("Pool is inactive or expired")
    end

    Service->>DB: SELECT COUNT(*) FROM seats WHERE pool_id = pool_id AND status = 'ACTIVE'
    DB-->>Service: Return Active Count (C_active)
    
    alt C_active >= Capacity N
        Service->>DB: ROLLBACK
        Service-->>API: Throw PoolCapacityExceededException
        API-->>UI: 409 Conflict ("License pool capacity reached")
    end

    Service->>DB: SELECT id FROM seats WHERE pool_id = pool_id AND email = 'jane@acme.com' AND status = 'ACTIVE'
    DB-->>Service: Return Match (if any)
    alt Active Seat Already Exists
        Service->>DB: ROLLBACK
        Service-->>API: Throw DuplicateSeatException
        API-->>UI: 409 Conflict ("Employee already has active seat")
    end

    Service->>DB: INSERT INTO seats (pool_id, email, status, assigned_at, assigned_by)
    Service->>DB: INSERT INTO seat_audit_logs (pool_id, seat_id, email, action, performed_by)
    Service->>DB: COMMIT TRANSACTION
    DB-->>Service: Success

    Service-->>API: Return Assigned Seat Details
    API-->>UI: 201 Created {"seat_id": "...", "status": "ACTIVE"}
    UI-->>Admin: Show "Seat Assigned Successfully"
```

---

### Flow B: License Verification Request Path

```mermaid
sequenceDiagram
    autonumber
    actor User as End User
    participant SaaS as Client SaaS App
    participant API as API Layer (Verify Controller)
    participant Service as Verification Service
    participant DB as PostgreSQL Database

    User->>SaaS: Attempt feature access
    SaaS->>API: GET /api/v1/licenses/verify?tenant_id=...&product_code=...&email=jane@acme.com
    API->>API: Normalize email to lower-case
    API->>Service: verifyLicense(tenant_id, product_code, email)
    
    Service->>DB: Query Active Pool & Active Seat in single SQL:<br/>SELECT s.id, p.end_date FROM license_pools p<br/>JOIN seats s ON s.license_pool_id = p.id<br/>WHERE p.tenant_id = ? AND p.product_code = ?<br/>AND p.status = 'ACTIVE' AND NOW() BETWEEN p.start_date AND p.end_date<br/>AND s.employee_email = ? AND s.status = 'ACTIVE'
    
    DB-->>Service: Return Match or Null
    
    alt Valid Active Seat Found
        Service-->>API: Return Licensed (true, expires_at)
        API-->>SaaS: 200 OK {"licensed": true, "expires_at": "2026-12-31T23:59:59Z"}
        SaaS-->>User: Grant Feature Access
    else No Valid Active Seat
        Service-->>API: Return Licensed (false, reason)
        API-->>SaaS: 200 OK {"licensed": false, "reason": "NO_ACTIVE_SEAT"}
        SaaS-->>User: Deny Access ("No active license seat")
    end
```

---

## Key Concepts to Understand Before Proceeding

1. **Layered Architecture Separation:** Clear boundaries between Presentation/API Layer (HTTP concerns), Service Layer (transaction orchestration & business logic), and Data Layer (ACID persistence).
2. **Pessimistic Row Locking (`FOR UPDATE`):** Acquiring a lock on the `license_pools` row inside the transaction serializes seat allocation attempts for that pool, guaranteeing capacity $N$ is never breached during concurrent admin operations.
3. **Single Optimized Query for Verification:** License verification executes as an optimized single SQL read query without explicit write locks, achieving minimal read latency ($<10\text{ ms}$).
