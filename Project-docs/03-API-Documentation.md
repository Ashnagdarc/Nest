# API Documentation
## Nest - Asset & Equipment Management System

**Document Version:** 1.0  
**Last Updated:** October 16, 2025  
**Author:** Daniel Chinonso Samuel  
**Base URL:** `https://nest-eden-oasis.vercel.app`

---

## Table of Contents

1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [Common Patterns](#common-patterns)
4. [API Endpoints](#api-endpoints)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Webhooks](#webhooks)
8. [SDK Examples](#sdk-examples)

---

## Introduction

The Nest API provides programmatic access to the asset management system. All API endpoints follow REST principles and return JSON responses. The API supports authentication via JWT tokens, comprehensive error handling, and real-time updates via WebSocket connections.

### API Characteristics

- **Protocol:** HTTPS only (TLS 1.3)
- **Format:** JSON request/response bodies
- **Authentication:** JWT Bearer tokens
- **Rate Limiting:** 100 requests/minute per user
- **Versioning:** URL-based (future: `/api/v2/...`)

### Base URLs

| Environment | Base URL |
|-------------|----------|
| Production | `https://nest-eden-oasis.vercel.app/api` |
| Staging | `https://nest-staging.vercel.app/api` |
| Development | `http://localhost:9002/api` |

---

## Authentication

### Authentication Flow

1. User registers or logs in via Supabase Auth
2. Server returns JWT access token
3. Client stores token in httpOnly cookie
4. Client includes token in subsequent requests
5. Server validates token on each request

### Auth Endpoints

#### Sign Up

```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "department": "Operations"
}
```

**Response:**

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "created_at": "2025-10-16T10:00:00Z"
    },
    "session": {
      "access_token": "jwt_token_here",
      "refresh_token": "refresh_token_here",
      "expires_in": 3600
    }
  },
  "error": null
}
```

---

#### Log In

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:** Same as Sign Up

---

#### Get Current User

```http
GET /api/auth/user
Authorization: Bearer {access_token}
```

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "User",
    "full_name": "John Doe",
    "avatar_url": "https://..."
  },
  "error": null
}
```

---

#### Log Out

```http
POST /api/auth/logout
Authorization: Bearer {access_token}
```

**Response:**

```json
{
  "data": {
    "message": "Successfully logged out"
  },
  "error": null
}
```

---

## Common Patterns

### Request Headers

```http
Content-Type: application/json
Authorization: Bearer {access_token}
Accept: application/json
```

### Response Format

#### Success Response

```json
{
  "data": {
    // Response payload
  },
  "error": null
}
```

#### Error Response

```json
{
  "data": null,
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": {
      "field": "specific_field",
      "reason": "validation failed"
    }
  }
}
```

### Pagination

```http
GET /api/gears?page=1&pageSize=20
```

**Paginated Response:**

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalPages": 5,
    "totalItems": 95,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "error": null
}
```

### Filtering & Sorting

```http
GET /api/gears?category=Camera&status=Available&sort=name&order=asc
```

**Query Parameters:**

- `category`: Filter by equipment category
- `status`: Filter by status (Available, Checked Out, etc.)
- `search`: Full-text search on name/description
- `sort`: Sort field (name, created_at, etc.)
- `order`: Sort order (asc, desc)

---

## API Endpoints

### User Profile

#### Get User Profile

```http
GET /api/users/profile
Authorization: Bearer {access_token}
```

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "User",
    "department": "Operations",
    "phone": "+1234567890",
    "avatar_url": "https://...",
    "bio": "Product manager",
    "status": "Active",
    "created_at": "2025-01-15T08:00:00Z",
    "updated_at": "2025-10-16T10:00:00Z"
  },
  "error": null
}
```

---

#### Update User Profile

```http
PUT /api/users/profile
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "full_name": "John Smith",
  "department": "Engineering",
  "phone": "+1234567890",
  "bio": "Senior Engineer"
}
```

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "full_name": "John Smith",
    "department": "Engineering",
    // ... updated fields
  },
  "error": null
}
```

---

#### Get User by ID (Admin Only)

```http
GET /api/users/{user_id}
Authorization: Bearer {admin_access_token}
```

---

### Equipment (Gears)

#### List All Equipment

```http
GET /api/gears
Authorization: Bearer {access_token}
```

**Query Parameters:**

- `page` (integer, default: 1)
- `pageSize` (integer, default: 20, max: 100)
- `category` (string)
- `status` (string)
- `search` (string)
- `sort` (string: name, created_at, category)
- `order` (string: asc, desc)

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Canon EOS R5",
      "category": "Camera",
      "description": "Professional mirrorless camera",
      "serial_number": "CAM-2024-001",
      "image_url": "https://...",
      "quantity": 5,
      "available_quantity": 3,
      "status": "Partially Checked Out",
      "purchase_date": "2024-01-15",
      "created_at": "2024-01-15T08:00:00Z",
      "updated_at": "2025-10-16T10:00:00Z"
    },
    // ... more items
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalPages": 3,
    "totalItems": 47
  },
  "error": null
}
```

---

#### Get Equipment by ID

```http
GET /api/gears/{gear_id}
Authorization: Bearer {access_token}
```

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "name": "Canon EOS R5",
    "category": "Camera",
    "description": "Professional mirrorless camera with 45MP sensor",
    "serial_number": "CAM-2024-001",
    "image_url": "https://storage.supabase.co/...",
    "quantity": 5,
    "available_quantity": 3,
    "status": "Partially Checked Out",
    "purchase_date": "2024-01-15",
    "created_at": "2024-01-15T08:00:00Z",
    "updated_at": "2025-10-16T10:00:00Z",
    "gear_state": {
      "status": "Partially Checked Out",
      "available_quantity": 3,
      "checked_out_to": ["uuid1", "uuid2"],
      "due_date": "2025-10-20T18:00:00Z"
    }
  },
  "error": null
}
```

---

#### Create Equipment (Admin Only)

```http
POST /api/gears
Authorization: Bearer {admin_access_token}
Content-Type: application/json

{
  "name": "Sony A7 IV",
  "category": "Camera",
  "description": "Versatile hybrid camera",
  "serial_number": "CAM-2025-015",
  "quantity": 3,
  "purchase_date": "2025-10-01",
  "image_url": "https://..."
}
```

**Response:**

```json
{
  "data": {
    "id": "new_uuid",
    "name": "Sony A7 IV",
    // ... all fields including generated ones
  },
  "error": null
}
```

**Validation Rules:**

- `name`: Required, 1-255 characters
- `category`: Required, one of predefined categories
- `quantity`: Required, integer >= 1
- `serial_number`: Optional, unique if provided
- `image_url`: Optional, valid URL

---

#### Update Equipment (Admin Only)

```http
PUT /api/gears/{gear_id}
Authorization: Bearer {admin_access_token}
Content-Type: application/json

{
  "description": "Updated description",
  "quantity": 4
}
```

**Response:**

```json
{
  "data": {
    "id": "uuid",
    // ... updated equipment data
  },
  "error": null
}
```

---

#### Delete Equipment (Admin Only)

```http
DELETE /api/gears/{gear_id}
Authorization: Bearer {admin_access_token}
```

**Response:**

```json
{
  "data": {
    "message": "Equipment deleted successfully",
    "id": "uuid"
  },
  "error": null
}
```

---

#### Get Available Equipment

```http
GET /api/gears/available
Authorization: Bearer {access_token}
```

Returns only equipment with `available_quantity > 0` and `status = 'Available'`.

---

#### Get Popular Equipment

```http
GET /api/gears/popular?limit=10
Authorization: Bearer {access_token}
```

**Response:**

```json
{
  "data": [
    {
      "gear_id": "uuid",
      "gear_name": "Canon EOS R5",
      "request_count": 47,
      "category": "Camera",
      "image_url": "https://..."
    },
    // ... top 10 most requested
  ],
  "error": null
}
```

---

### Requests

#### List Requests

```http
GET /api/requests
Authorization: Bearer {access_token}
```

**Query Parameters:**

- `status` (string: Pending, Approved, Rejected, Cancelled)
- `userId` (uuid, admin only)
- `page` (integer)
- `pageSize` (integer)

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "user": {
        "full_name": "John Doe",
        "email": "john@example.com",
        "avatar_url": "https://..."
      },
      "reason": "Video production project",
      "destination": "Studio A",
      "expected_duration": "3 days",
      "team_members": "Jane, Bob",
      "status": "Pending",
      "due_date": "2025-10-20T18:00:00Z",
      "gear_items": [
        {
          "gear_id": "uuid",
          "gear_name": "Canon EOS R5",
          "quantity": 2
        }
      ],
      "created_at": "2025-10-16T09:00:00Z",
      "updated_at": "2025-10-16T09:00:00Z"
    },
    // ... more requests
  ],
  "pagination": {...},
  "error": null
}
```

---

#### Create Request

```http
POST /api/requests
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "reason": "Video production for marketing campaign",
  "destination": "Studio B",
  "expected_duration": "5 days",
  "team_members": "Alice, Bob, Carol",
  "gear_items": [
    {
      "gear_id": "uuid1",
      "quantity": 2
    },
    {
      "gear_id": "uuid2",
      "quantity": 1
    }
  ]
}
```

**Response:**

```json
{
  "data": {
    "id": "new_request_uuid",
    "user_id": "user_uuid",
    "status": "Pending",
    "reason": "Video production for marketing campaign",
    // ... all request fields
    "gear_items": [...]
  },
  "error": null
}
```

**Validation:**

- `reason`: Required, 10-1000 characters
- `gear_items`: Required, array with at least 1 item
- `gear_items[].quantity`: Must not exceed available quantity

---

#### Get Request by ID

```http
GET /api/requests/{request_id}
Authorization: Bearer {access_token}
```

Users can only access their own requests. Admins can access all.

---

#### Update Request

```http
PUT /api/requests/{request_id}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "reason": "Updated reason",
  "expected_duration": "7 days"
}
```

Only pending requests can be updated by users.

---

#### Cancel Request

```http
DELETE /api/requests/{request_id}
Authorization: Bearer {access_token}
```

Sets request status to "Cancelled".

---

#### Approve Request (Admin Only)

```http
POST /api/requests/approve
Authorization: Bearer {admin_access_token}
Content-Type: application/json

{
  "request_id": "uuid",
  "due_date": "2025-10-25T18:00:00Z",
  "admin_notes": "Approved for 5-day usage"
}
```

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "status": "Approved",
    "approved_at": "2025-10-16T10:30:00Z",
    "due_date": "2025-10-25T18:00:00Z",
    "admin_notes": "Approved for 5-day usage"
  },
  "error": null
}
```

**Side Effects:**

- Updates equipment `available_quantity`
- Creates notification for user
- Sends Google Chat webhook (if configured)
- Updates `gear_states` table

---

#### Reject Request (Admin Only)

```http
POST /api/requests/reject
Authorization: Bearer {admin_access_token}
Content-Type: application/json

{
  "request_id": "uuid",
  "admin_notes": "Equipment not available for requested dates"
}
```

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "status": "Rejected",
    "admin_notes": "Equipment not available for requested dates"
  },
  "error": null
}
```

---

### Check-Ins

#### List Check-In History

```http
GET /api/checkins
Authorization: Bearer {access_token}
```

**Query Parameters:**

- `user_id` (uuid)
- `gear_id` (uuid)
- `action` (string: check_in, check_out)
- `page`, `pageSize`

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "user": {
        "full_name": "John Doe",
        "email": "john@example.com"
      },
      "gear_id": "uuid",
      "gear": {
        "name": "Canon EOS R5",
        "category": "Camera"
      },
      "action": "check_in",
      "condition": "Good",
      "notes": "Camera returned in excellent condition",
      "damage_photo_url": null,
      "location": "Studio A",
      "created_at": "2025-10-16T17:00:00Z"
    },
    // ... more check-ins
  ],
  "pagination": {...},
  "error": null
}
```

---

#### Record Check-In/Out

```http
POST /api/checkins
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "gear_id": "uuid",
  "action": "check_in",
  "condition": "Good",
  "notes": "All accessories included",
  "location": "Main Office"
}
```

**Check-In Actions:**

- `check_out`: Mark equipment as checked out (based on approved request)
- `check_in`: Return equipment

**Condition Values:**

- Excellent
- Good
- Fair
- Poor
- Damaged

**Response:**

```json
{
  "data": {
    "id": "new_checkin_uuid",
    "user_id": "uuid",
    "gear_id": "uuid",
    "action": "check_in",
    "condition": "Good",
    // ... all fields
  },
  "error": null
}
```

**Side Effects:**

- Updates `gear_states.available_quantity`
- Updates `gear_states.checked_out_to`
- Clears `due_date` on check-in
- Creates notification
- Triggers realtime update

---

### Notifications

#### Get User Notifications

```http
GET /api/notifications
Authorization: Bearer {access_token}
```

**Query Parameters:**

- `unreadOnly` (boolean, default: false)
- `limit` (integer, default: 20)
- `page` (integer)

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "type": "success",
      "title": "Request Approved",
      "message": "Your request for Canon EOS R5 has been approved",
      "is_read": false,
      "link": "/user/my-requests/uuid",
      "created_at": "2025-10-16T10:30:00Z",
      "expires_at": "2025-11-16T10:30:00Z"
    },
    // ... more notifications
  ],
  "pagination": {...},
  "error": null
}
```

---

#### Mark Notification as Read

```http
PUT /api/notifications/{notification_id}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "is_read": true
}
```

---

#### Delete Notification

```http
DELETE /api/notifications/{notification_id}
Authorization: Bearer {access_token}
```

---

#### Get Unread Count

```http
GET /api/notifications/unread
Authorization: Bearer {access_token}
```

**Response:**

```json
{
  "data": {
    "count": 5
  },
  "error": null
}
```

---

### Dashboard

#### Get Unified Dashboard Data

```http
GET /api/dashboard/unified
Authorization: Bearer {access_token}
```

Returns comprehensive dashboard data including stats, recent activity, pending items, and notifications.

**Response:**

```json
{
  "data": {
    "stats": {
      "total_equipment": 47,
      "available_equipment": 32,
      "checked_out_equipment": 15,
      "total_users": 125,
      "pending_requests": 8,
      "approved_requests": 342,
      "utilization_rate": 68.5
    },
    "recent_activity": [...],
    "pending_items": [...],
    "notifications": [...],
    "popular_gears": [...]
  },
  "error": null
}
```

---

#### Get Dashboard Statistics

```http
GET /api/dashboard/stats
Authorization: Bearer {access_token}
```

Returns only statistics (faster than unified endpoint).

---

### Reports

#### Generate Weekly Report

```http
GET /api/reports/weekly
Authorization: Bearer {admin_access_token}
```

**Query Parameters:**

- `from` (ISO 8601 date)
- `to` (ISO 8601 date)

**Response:**

```json
{
  "data": {
    "period": {
      "from": "2025-10-09",
      "to": "2025-10-16"
    },
    "summary": {
      "total_requests": 23,
      "approved_requests": 20,
      "rejected_requests": 3,
      "total_checkins": 18,
      "total_checkouts": 20,
      "new_equipment": 2,
      "active_users": 45
    },
    "top_equipment": [...],
    "request_trends": [...],
    "utilization_by_category": {...}
  },
  "error": null
}
```

---

#### Export Report as PDF

```http
POST /api/reports/export/pdf
Authorization: Bearer {admin_access_token}
Content-Type: application/json

{
  "report_type": "weekly",
  "from": "2025-10-09",
  "to": "2025-10-16"
}
```

**Response:**

```json
{
  "data": {
    "pdf_url": "https://storage.supabase.co/.../report.pdf",
    "expires_at": "2025-10-17T10:00:00Z"
  },
  "error": null
}
```

---

### Car Bookings

#### List Car Bookings

```http
GET /api/car-bookings
Authorization: Bearer {access_token}
```

**Query Parameters:**

- `status` (Pending, Approved, Rejected)
- `from` (ISO 8601 datetime)
- `to` (ISO 8601 datetime)

---

#### Create Car Booking

```http
POST /api/car-bookings
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "car_id": "uuid",
  "start_time": "2025-10-20T08:00:00Z",
  "end_time": "2025-10-20T18:00:00Z",
  "purpose": "Client meeting downtown"
}
```

---

#### Approve Car Booking (Admin)

```http
POST /api/car-bookings/approve
Authorization: Bearer {admin_access_token}
Content-Type: application/json

{
  "booking_id": "uuid",
  "admin_notes": "Approved for day trip"
}
```

---

## Error Handling

### Error Response Format

```json
{
  "data": null,
  "error": {
    "message": "Equipment not found",
    "code": "GEAR_NOT_FOUND",
    "details": {
      "gear_id": "invalid-uuid"
    }
  }
}
```

### HTTP Status Codes

| Status | Meaning | Usage |
|--------|---------|-------|
| 200 | OK | Successful GET/PUT request |
| 201 | Created | Successful POST request |
| 204 | No Content | Successful DELETE request |
| 400 | Bad Request | Invalid input/validation error |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource conflict (e.g., duplicate) |
| 422 | Unprocessable Entity | Semantic validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | Temporary service disruption |

### Common Error Codes

| Error Code | Description |
|------------|-------------|
| `UNAUTHENTICATED` | No valid authentication token |
| `UNAUTHORIZED` | Insufficient permissions |
| `VALIDATION_ERROR` | Input validation failed |
| `GEAR_NOT_FOUND` | Equipment doesn't exist |
| `REQUEST_NOT_FOUND` | Request doesn't exist |
| `INSUFFICIENT_QUANTITY` | Not enough equipment available |
| `DUPLICATE_REQUEST` | Request already exists |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `DATABASE_ERROR` | Database operation failed |
| `EXTERNAL_SERVICE_ERROR` | Third-party service error |

---

## Rate Limiting

### Rate Limit Policy

- **Limit:** 100 requests per minute per user
- **Headers:** Rate limit info included in response headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1697456789
```

### Rate Limit Exceeded Response

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 60

{
  "data": null,
  "error": {
    "message": "Rate limit exceeded. Please try again in 60 seconds.",
    "code": "RATE_LIMIT_EXCEEDED",
    "details": {
      "retry_after": 60,
      "limit": 100,
      "window": "1 minute"
    }
  }
}
```

---

## Webhooks

### Google Chat Webhook

Nest can send notifications to Google Chat for admin alerts.

**Configuration:**

```env
GOOGLE_CHAT_WEBHOOK_URL=https://chat.googleapis.com/v1/spaces/.../messages?key=...
```

**Event Types:**

- New equipment request
- Request approved/rejected
- Equipment overdue
- New user signup
- Equipment added/updated

**Webhook Payload Example:**

```json
{
  "text": "🔔 New Equipment Request",
  "cards": [
    {
      "sections": [
        {
          "widgets": [
            {
              "keyValue": {
                "topLabel": "User",
                "content": "John Doe (john@example.com)"
              }
            },
            {
              "keyValue": {
                "topLabel": "Equipment",
                "content": "Canon EOS R5 (x2)"
              }
            },
            {
              "keyValue": {
                "topLabel": "Reason",
                "content": "Video production project"
              }
            }
          ]
        }
      ]
    }
  ]
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
// Using fetch API
async function getGears() {
  const response = await fetch('https://nest-eden-oasis.vercel.app/api/gears', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  const result = await response.json();
  
  if (result.error) {
    throw new Error(result.error.message);
  }
  
  return result.data;
}

// Create request
async function createRequest(requestData) {
  const response = await fetch('https://nest-eden-oasis.vercel.app/api/requests', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
  });
  
  return await response.json();
}
```

---

### Python

```python
import requests

BASE_URL = "https://nest-eden-oasis.vercel.app/api"

def get_gears(access_token):
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(f"{BASE_URL}/gears", headers=headers)
    response.raise_for_status()
    
    result = response.json()
    
    if result.get("error"):
        raise Exception(result["error"]["message"])
    
    return result["data"]

def create_request(access_token, request_data):
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(
        f"{BASE_URL}/requests",
        headers=headers,
        json=request_data
    )
    
    return response.json()
```

---

### cURL Examples

```bash
# Get equipment list
curl -X GET "https://nest-eden-oasis.vercel.app/api/gears" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"

# Create request
curl -X POST "https://nest-eden-oasis.vercel.app/api/requests" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Video production",
    "destination": "Studio A",
    "expected_duration": "3 days",
    "gear_items": [
      {"gear_id": "uuid1", "quantity": 2}
    ]
  }'

# Approve request (Admin)
curl -X POST "https://nest-eden-oasis.vercel.app/api/requests/approve" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "request_uuid",
    "due_date": "2025-10-25T18:00:00Z",
    "admin_notes": "Approved"
  }'
```

---

## Document Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Oct 16, 2025 | Daniel Chinonso Samuel | Initial API documentation |

---

**API Support:**

For API support, please contact: support@edenoasis.com

**Rate Limit Increase:**

Contact: api@edenoasis.com with your use case
