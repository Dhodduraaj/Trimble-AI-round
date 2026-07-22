# Phase 6: API Design - B2B License Management System (LMS)

This phase defines the REST API contract, endpoint specifications, request/response formats, HTTP status codes, validation rules, and standardized error response models.

---

## 1. Standard Error Schema (RFC 7807 Problem Details)

All 4xx and 5xx error responses return a standardized RFC 7807 compliant JSON payload:

```json
{
  "type": "https://api.lms.com/errors/POOL_FULL",
  "title": "License Pool Capacity Exceeded",
  "status": 409,
  "code": "POOL_FULL",
  "detail": "Cannot assign seat to 'jane.doe@acme.com'. Pool 'pool-123' has reached its capacity limit of 500 active seats.",
  "timestamp": "2026-07-21T10:00:00Z",
  "instance": "/api/v1/pools/pool-123/seats"
}
```

---

## 2. API Endpoints Specification

### Endpoint 1: Create License Pool

* **HTTP Method:** `POST`
* **Path:** `/api/v1/pools`
* **Description:** Provisions a new software license pool for an enterprise tenant.
* **Headers:** `Content-Type: application/json`, `Authorization: Bearer <token>`

#### Request Body
```json
{
  "tenant_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "product_code": "CAD_PRO_V1",
  "capacity": 500,
  "start_date": "2026-01-01T00:00:00Z",
  "end_date": "2026-12-31T23:59:59Z"
}
```

#### Responses
* **`201 Created`**
  ```json
  {
    "id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
    "tenant_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "product_code": "CAD_PRO_V1",
    "capacity": 500,
    "active_seats_count": 0,
    "start_date": "2026-01-01T00:00:00Z",
    "end_date": "2026-12-31T23:59:59Z",
    "status": "ACTIVE",
    "created_at": "2026-07-21T10:00:00Z"
  }
  ```
* **`400 Bad Request`** (Validation failed: e.g. `start_date >= end_date` or `capacity <= 0`).

---

### Endpoint 2: Assign Seat to Employee

* **HTTP Method:** `POST`
* **Path:** `/api/v1/pools/{pool_id}/seats`
* **Description:** Allocates an available seat in the pool to an employee.
* **Headers:** `Content-Type: application/json`, `Authorization: Bearer <token>`

#### Request Body
```json
{
  "employee_email": "jane.doe@acme.com"
}
```

#### Responses
* **`201 Created`**
  ```json
  {
    "id": "e9f8d7c6-b5a4-3f2e-1d0c-9b8a7f6e5d4c",
    "license_pool_id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
    "employee_email": "jane.doe@acme.com",
    "status": "ACTIVE",
    "assigned_at": "2026-07-21T10:05:00Z",
    "assigned_by": "admin@acme.com"
  }
  ```
* **`400 Bad Request`** (Invalid email syntax, or pool currently expired/inactive).
* **`404 Not Found`** (`pool_id` does not exist).
* **`409 Conflict`** (`POOL_FULL`: capacity $N$ reached OR `DUPLICATE_SEAT`: employee already holds an active seat).

---

### Endpoint 3: Revoke Seat from Employee

* **HTTP Method:** `POST`
* **Path:** `/api/v1/pools/{pool_id}/seats/revoke`
* **Description:** Revokes an employee's active seat, returning capacity to the pool.
* **Headers:** `Content-Type: application/json`, `Authorization: Bearer <token>`

#### Request Body
```json
{
  "employee_email": "jane.doe@acme.com"
}
```

#### Responses
* **`200 OK`**
  ```json
  {
    "id": "e9f8d7c6-b5a4-3f2e-1d0c-9b8a7f6e5d4c",
    "license_pool_id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
    "employee_email": "jane.doe@acme.com",
    "status": "REVOKED",
    "assigned_at": "2026-07-21T10:05:00Z",
    "revoked_at": "2026-07-21T10:10:00Z",
    "revoked_by": "admin@acme.com"
  }
  ```
* **`404 Not Found`** (`SEAT_NOT_FOUND`: No active seat found for specified employee email in this pool).

---

### Endpoint 4: Verify License (Low-Latency Verification Path)

* **HTTP Method:** `GET`
* **Path:** `/api/v1/licenses/verify`
* **Query Parameters:**
  * `tenant_id` (UUID, Required)
  * `product_code` (String, Required)
  * `email` (String, Required)

#### Responses
* **`200 OK` (Licensed User)**
  ```json
  {
    "licensed": true,
    "employee_email": "jane.doe@acme.com",
    "product_code": "CAD_PRO_V1",
    "license_pool_id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
    "expires_at": "2026-12-31T23:59:59Z"
  }
  ```
* **`200 OK` (Unlicensed User)**
  ```json
  {
    "licensed": false,
    "employee_email": "unknown.user@acme.com",
    "product_code": "CAD_PRO_V1",
    "reason": "NO_ACTIVE_SEAT"
  }
  ```
* **`400 Bad Request`** (Missing required query parameters or malformed email format).

---

### Endpoint 5: Get License Pool Details & Seats Summary

* **HTTP Method:** `GET`
* **Path:** `/api/v1/pools/{pool_id}`
* **Description:** Retrieves license pool metadata, total capacity, active seat count, and remaining seats.

#### Responses
* **`200 OK`**
  ```json
  {
    "id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
    "tenant_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "product_code": "CAD_PRO_V1",
    "capacity": 500,
    "active_seats": 342,
    "available_seats": 158,
    "start_date": "2026-01-01T00:00:00Z",
    "end_date": "2026-12-31T23:59:59Z",
    "status": "ACTIVE"
  }
  ```

---

## 3. Summary of HTTP Status Codes & Error Mapping

| Status Code | Scenario / Error Code | Description |
| :--- | :--- | :--- |
| **`200 OK`** | Success / `VERIFICATION_RESULT` | Successful verification query or seat revocation. |
| **`201 Created`** | `POOL_CREATED` / `SEAT_ASSIGNED` | Successfully created pool or assigned seat. |
| **`400 Bad Request`** | `INVALID_INPUT` / `POOL_EXPIRED` | Malformed parameters, invalid date ranges, or expired pool window. |
| **`404 Not Found`** | `RESOURCE_NOT_FOUND` / `SEAT_NOT_FOUND` | Specified pool or active seat does not exist. |
| **`409 Conflict`** | `POOL_FULL` / `DUPLICATE_SEAT` | Pool reached max capacity $N$, or employee already holds an active seat. |
| **`500 Internal Error`** | `INTERNAL_SERVER_ERROR` | Unexpected database or system error. |

---

## Key Concepts to Understand Before Proceeding

1. **RFC 7807 Standardization:** Standard error responses allow frontend clients and upstream microservices to systematically parse error details using predictable fields (`type`, `code`, `title`, `detail`).
2. **Semantics of Verification Endpoint:** `GET /licenses/verify` returns `200 OK` for both licensed and unlicensed users. `200 OK` indicates the verification engine evaluated successfully; the payload field `"licensed": true/false` reflects domain authorization.
3. **Canonical Data Sanitization:** Emails are converted to lowercase before hitting business logic or API parameters to maintain canonical identity matching.
