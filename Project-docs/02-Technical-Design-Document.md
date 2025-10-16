# Technical Design Document (TDD)
## Nest - Asset & Equipment Management System

**Document Version:** 1.0  
**Last Updated:** October 16, 2025  
**Author:** Daniel Chinonso Samuel  
**Organization:** Eden Oasis

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Technology Stack](#technology-stack)
3. [Database Design](#database-design)
4. [API Design](#api-design)
5. [Security Architecture](#security-architecture)
6. [Component Architecture](#component-architecture)
7. [State Management](#state-management)
8. [Performance Optimization](#performance-optimization)
9. [Deployment Architecture](#deployment-architecture)
10. [Testing Strategy](#testing-strategy)

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer (Browser)                    │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 15 App Router │ React 18 │ TypeScript │ Tailwind CSS  │
│  - Server Components   │ - Client Components  │ - UI Library   │
│  - API Routes          │ - Hooks & Context    │ - shadcn/ui    │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ HTTPS/WSS
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│                     Application Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  Next.js API Routes        │  Server-Side Rendering (SSR)       │
│  - RESTful Endpoints       │  - Page Pre-rendering              │
│  - Authentication          │  - Dynamic Routes                  │
│  - Business Logic          │  - Middleware                      │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ PostgreSQL Protocol / WebSocket
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│                    Data Layer (Supabase)                         │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL DB    │  Supabase Auth  │  Supabase Storage         │
│  - Tables & Views │  - JWT Tokens   │  - Image Storage          │
│  - RLS Policies   │  - User Mgmt    │  - File Management        │
│  - Functions      │  - Sessions     │  - CDN Delivery           │
│  - Realtime       │                 │                           │
└─────────────────────────────────────────────────────────────────┘
                   │
                   │ External Integrations
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│              Third-Party Services                                │
├─────────────────────────────────────────────────────────────────┤
│  Google Chat Webhook  │  Vercel Analytics  │  Resend (Email)   │
└─────────────────────────────────────────────────────────────────┘
```

### Architecture Patterns

**1. Client-Server Architecture**
- Next.js serves as both client and server
- Server-side rendering for initial page loads
- Client-side navigation via React Router
- API routes handle backend logic

**2. Microservices-Oriented**
- Modular API route structure
- Independent service layers
- Loosely coupled components
- Domain-driven design principles

**3. Event-Driven Architecture**
- Real-time updates via Supabase Realtime
- WebSocket connections for live data
- Database triggers for notifications
- Event sourcing for audit logs

---

## Technology Stack

### Frontend Technologies

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Framework | Next.js | 15.3.3 | Full-stack React framework |
| Language | TypeScript | 5.x | Type-safe JavaScript |
| UI Library | React | 18.2.0 | Component-based UI |
| Styling | Tailwind CSS | 3.4.1 | Utility-first CSS |
| Component Library | shadcn/ui | Latest | Pre-built UI components |
| Icons | Lucide React | 0.475.0 | Icon system |
| Animations | Framer Motion | 11.3.12 | Animation library |
| State Management | React Context | Built-in | Global state |
| Forms | React Hook Form | 7.54.2 | Form validation |
| Validation | Zod | 3.24.2 | Schema validation |
| Charts | Recharts | 2.15.3 | Data visualization |
| PDF Generation | jsPDF | 3.0.1 | PDF reports |
| QR Codes | QRCode.react | 4.2.0 | QR code generation |
| QR Scanner | html5-qrcode | 2.3.8 | QR code scanning |
| Date Handling | date-fns | 3.6.0 | Date utilities |

### Backend Technologies

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Runtime | Node.js | 18+ | JavaScript runtime |
| API Framework | Next.js API Routes | 15.x | RESTful API endpoints |
| Database | PostgreSQL | 14+ (via Supabase) | Relational database |
| ORM | Supabase Client | 2.50.0 | Database abstraction |
| Authentication | Supabase Auth | Built-in | User authentication |
| Storage | Supabase Storage | Built-in | File storage |
| Realtime | Supabase Realtime | Built-in | WebSocket connections |

### DevOps & Tools

| Category | Technology | Purpose |
|----------|-----------|---------|
| Hosting | Vercel | Application deployment |
| Database Host | Supabase Cloud | Managed PostgreSQL |
| Version Control | Git | Source control |
| Package Manager | npm | Dependency management |
| Linting | ESLint | Code quality |
| Type Checking | TypeScript | Static typing |
| Testing | Jest | Unit testing |
| Analytics | Vercel Analytics | Performance monitoring |
| Monitoring | Vercel Speed Insights | Core Web Vitals |

---

## Database Design

### Entity Relationship Diagram (ERD)

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   profiles  │─────────│gear_requests │─────────│gear_request_ │
│             │  1:N    │              │  1:N    │    gears     │
│ - id (PK)   │         │ - id (PK)    │         │ - id (PK)    │
│ - email     │         │ - user_id FK │         │ - request_id │
│ - full_name │         │ - status     │         │ - gear_id FK │
│ - role      │         │ - reason     │         │ - quantity   │
│ - avatar    │         │ - due_date   │         └──────────────┘
│ - dept      │         └──────────────┘                │
└─────────────┘                │                        │
      │                        │                        │
      │                        │                        │ N:1
      │ 1:N                    │                        │
      │                        │                   ┌────▼────────┐
      │                   ┌────▼────────┐         │    gears    │
      │                   │  checkins   │         │             │
      │                   │             │◄────────│ - id (PK)   │
      │                   │ - id (PK)   │   1:N   │ - name      │
      └──────────────────►│ - user_id   │         │ - category  │
                          │ - gear_id   │         │ - quantity  │
                          │ - condition │         │ - image_url │
                          │ - notes     │         │ - serial_no │
                          └─────────────┘         └─────────────┘
                                                        │
                                                        │ 1:1
                                                        │
                                                   ┌────▼────────┐
                                                   │gear_states  │
                                                   │             │
                                                   │ - id (PK)   │
                                                   │ - gear_id   │
                                                   │ - status    │
                                                   │ - available │
                                                   │ - checked_to│
                                                   └─────────────┘
```

### Core Tables

#### 1. profiles
**Purpose:** User account information

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, FK(auth.users) | User identifier |
| email | TEXT | UNIQUE, NOT NULL | User email |
| full_name | TEXT | NOT NULL | Full name |
| role | TEXT | DEFAULT 'User' | Admin or User |
| avatar_url | TEXT | NULL | Profile picture URL |
| department | TEXT | NULL | User department |
| phone | TEXT | NULL | Contact number |
| bio | TEXT | NULL | User biography |
| status | TEXT | DEFAULT 'Active' | Active/Inactive/Suspended |
| is_banned | BOOLEAN | DEFAULT false | Ban status |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Update timestamp |

**Indexes:**
- idx_profiles_email (email)
- idx_profiles_role (role)

**RLS Policies:**
- Users can view their own profile
- Admins can view all profiles
- Users can update their own profile
- Admins can update any profile

---

#### 2. gears
**Purpose:** Equipment/asset inventory

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Gear identifier |
| name | TEXT | NOT NULL | Equipment name |
| category | TEXT | NOT NULL | Equipment category |
| description | TEXT | NULL | Detailed description |
| serial_number | TEXT | UNIQUE | Serial number |
| purchase_date | DATE | NULL | Purchase date |
| image_url | TEXT | NULL | Equipment image |
| quantity | INTEGER | DEFAULT 1 | Total quantity |
| available_quantity | INTEGER | DEFAULT 1 | Available count |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Update timestamp |

**Indexes:**
- idx_gears_category (category)
- idx_gears_name (name)

**RLS Policies:**
- All authenticated users can SELECT
- Only Admins can INSERT/UPDATE/DELETE

---

#### 3. gear_states
**Purpose:** Current state and availability of each gear

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | State identifier |
| gear_id | UUID | FK(gears), UNIQUE | Reference to gear |
| status | TEXT | DEFAULT 'Available' | Current status |
| available_quantity | INTEGER | DEFAULT 1 | Available units |
| checked_out_to | UUID | FK(profiles) NULL | Current user |
| current_request_id | UUID | FK(gear_requests) NULL | Active request |
| due_date | TIMESTAMPTZ | NULL | Return due date |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Update timestamp |

**Status Values:**
- Available
- Checked Out
- Partially Checked Out
- Under Repair
- Retired

**Indexes:**
- idx_gear_states_gear_id (gear_id)
- idx_gear_states_status (status)

---

#### 4. gear_requests
**Purpose:** Equipment request tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Request identifier |
| user_id | UUID | FK(profiles), NOT NULL | Requester |
| reason | TEXT | NOT NULL | Request reason |
| destination | TEXT | NULL | Usage location |
| expected_duration | TEXT | NULL | Duration estimate |
| team_members | TEXT | NULL | Team member names |
| status | TEXT | DEFAULT 'Pending' | Request status |
| due_date | TIMESTAMPTZ | NULL | Return deadline |
| approved_at | TIMESTAMPTZ | NULL | Approval timestamp |
| admin_notes | TEXT | NULL | Admin comments |
| updated_by | UUID | FK(profiles) NULL | Last modifier |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Update timestamp |

**Status Values:**
- Pending
- Approved
- Rejected
- Cancelled
- Completed

**Indexes:**
- idx_gear_requests_user_id (user_id)
- idx_gear_requests_status (status)
- idx_gear_requests_created_at (created_at DESC)

**RLS Policies:**
- Users can view their own requests
- Admins can view all requests
- Users can create requests
- Only Admins can approve/reject

---

#### 5. gear_request_gears
**Purpose:** Junction table for multi-item requests

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Line item ID |
| request_id | UUID | FK(gear_requests), NOT NULL | Parent request |
| gear_id | UUID | FK(gears), NOT NULL | Requested gear |
| quantity | INTEGER | DEFAULT 1 | Requested quantity |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

**Indexes:**
- idx_gear_request_gears_request_id (request_id)
- idx_gear_request_gears_gear_id (gear_id)

**Composite Unique:**
- (request_id, gear_id)

---

#### 6. checkins
**Purpose:** Check-in/out activity log

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Checkin identifier |
| user_id | UUID | FK(profiles), NOT NULL | User performing action |
| gear_id | UUID | FK(gears), NOT NULL | Equipment involved |
| action | TEXT | NOT NULL | 'check_in' or 'check_out' |
| condition | TEXT | NULL | Equipment condition |
| notes | TEXT | NULL | Additional notes |
| damage_photo_url | TEXT | NULL | Damage documentation |
| location | TEXT | NULL | Check-in location |
| created_at | TIMESTAMPTZ | DEFAULT now() | Action timestamp |

**Indexes:**
- idx_checkins_user_id (user_id)
- idx_checkins_gear_id (gear_id)
- idx_checkins_created_at (created_at DESC)

---

#### 7. notifications
**Purpose:** User notification system

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Notification ID |
| user_id | UUID | FK(profiles), NOT NULL | Recipient |
| type | TEXT | NOT NULL | Notification type |
| title | TEXT | NOT NULL | Notification title |
| message | TEXT | NOT NULL | Notification body |
| is_read | BOOLEAN | DEFAULT false | Read status |
| link | TEXT | NULL | Action link |
| expires_at | TIMESTAMPTZ | NULL | Expiration time |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

**Notification Types:**
- info
- success
- warning
- error
- system

**Indexes:**
- idx_notifications_user_read_created (user_id, is_read, created_at DESC)

---

#### 8. announcements
**Purpose:** System-wide announcements

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Announcement ID |
| title | TEXT | NOT NULL | Title |
| content | TEXT | NOT NULL | Content |
| created_by | UUID | FK(profiles) | Creator |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Update timestamp |

---

#### 9. car_bookings (Extended Feature)
**Purpose:** Vehicle booking management

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Booking ID |
| user_id | UUID | FK(profiles), NOT NULL | Requester |
| car_id | UUID | FK(cars), NOT NULL | Vehicle |
| start_time | TIMESTAMPTZ | NOT NULL | Start datetime |
| end_time | TIMESTAMPTZ | NOT NULL | End datetime |
| purpose | TEXT | NOT NULL | Booking reason |
| status | TEXT | DEFAULT 'Pending' | Booking status |
| approved_by | UUID | FK(profiles) NULL | Approver |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Update timestamp |

---

### Database Functions

#### 1. get_popular_gears()
**Purpose:** Retrieve most requested equipment

```sql
CREATE OR REPLACE FUNCTION get_popular_gears(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    gear_id UUID,
    gear_name TEXT,
    request_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.id AS gear_id,
        g.name AS gear_name,
        COUNT(grg.id) AS request_count
    FROM gears g
    LEFT JOIN gear_request_gears grg ON g.id = grg.gear_id
    GROUP BY g.id, g.name
    ORDER BY request_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
```

#### 2. check_gear_availability()
**Purpose:** Validate equipment availability for requests

```sql
CREATE OR REPLACE FUNCTION check_gear_availability(
    p_gear_id UUID,
    p_quantity INTEGER,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS BOOLEAN AS $$
DECLARE
    available_qty INTEGER;
BEGIN
    SELECT available_quantity INTO available_qty
    FROM gear_states
    WHERE gear_id = p_gear_id;
    
    RETURN available_qty >= p_quantity;
END;
$$ LANGUAGE plpgsql;
```

---

## API Design

### RESTful API Endpoints

#### Authentication Endpoints

```
POST   /api/auth/signup          # Create new user account
POST   /api/auth/login           # Authenticate user
GET    /api/auth/user            # Get current user
POST   /api/auth/logout          # Sign out user
POST   /api/auth/reset-password  # Request password reset
```

#### User Profile Endpoints

```
GET    /api/users/profile        # Get user profile
PUT    /api/users/profile        # Update user profile
GET    /api/users/[id]           # Get user by ID (Admin)
GET    /api/users                # List all users (Admin)
PUT    /api/users/[id]/ban       # Ban user (Admin)
```

#### Gear Management Endpoints

```
GET    /api/gears                # List all equipment
POST   /api/gears                # Create equipment (Admin)
GET    /api/gears/[id]           # Get equipment details
PUT    /api/gears/[id]           # Update equipment (Admin)
DELETE /api/gears/[id]           # Delete equipment (Admin)
GET    /api/gears/available      # Get available equipment
GET    /api/gears/popular        # Get popular equipment
POST   /api/gears/import         # Bulk import CSV (Admin)
GET    /api/gears/export         # Export to CSV (Admin)
```

#### Request Management Endpoints

```
GET    /api/requests             # List requests
POST   /api/requests             # Create request
GET    /api/requests/[id]        # Get request details
PUT    /api/requests/[id]        # Update request
DELETE /api/requests/[id]        # Cancel request
POST   /api/requests/approve     # Approve request (Admin)
POST   /api/requests/reject      # Reject request (Admin)
GET    /api/requests/user        # Get user's requests
GET    /api/requests/created     # Get requests created by user
POST   /api/requests/add-lines   # Add items to request
```

#### Check-In/Out Endpoints

```
GET    /api/checkins             # List check-in history
POST   /api/checkins             # Record check-in/out
GET    /api/checkins/user/[id]   # User's check-in history
GET    /api/checkins/gear/[id]   # Gear's check-in history
```

#### Notification Endpoints

```
GET    /api/notifications        # Get user notifications
POST   /api/notifications        # Create notification (System)
PUT    /api/notifications/[id]   # Mark as read
DELETE /api/notifications/[id]   # Delete notification
GET    /api/notifications/unread # Get unread count
```

#### Dashboard Endpoints

```
GET    /api/dashboard/unified    # Unified dashboard data
GET    /api/dashboard/stats      # Dashboard statistics
GET    /api/dashboard/activities # Recent activities
GET    /api/dashboard/reports    # Generate reports
```

#### Car Booking Endpoints

```
GET    /api/car-bookings         # List bookings
POST   /api/car-bookings         # Create booking
GET    /api/car-bookings/[id]    # Get booking details
PUT    /api/car-bookings/[id]    # Update booking
DELETE /api/car-bookings/[id]    # Cancel booking
POST   /api/car-bookings/approve # Approve booking (Admin)
```

#### Report Endpoints

```
GET    /api/reports/weekly       # Weekly activity report
GET    /api/reports/utilization  # Equipment utilization
POST   /api/reports/generate     # Generate custom report
GET    /api/reports/export/pdf   # Export report as PDF
```

---

### API Response Format

#### Success Response

```json
{
  "data": {
    "id": "uuid",
    "name": "Canon EOS R5",
    "category": "Camera",
    ...
  },
  "error": null
}
```

#### Error Response

```json
{
  "data": null,
  "error": {
    "message": "Equipment not found",
    "code": "GEAR_NOT_FOUND",
    "details": {}
  }
}
```

#### Paginated Response

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalPages": 5,
    "totalItems": 95
  },
  "error": null
}
```

---

## Security Architecture

### Authentication Flow

```
1. User submits credentials
   ↓
2. Supabase Auth validates
   ↓
3. JWT token generated
   ↓
4. Token stored in httpOnly cookie
   ↓
5. Token validated on each request
   ↓
6. RLS policies enforce data access
```

### Row-Level Security (RLS)

**Key Principles:**
- All tables have RLS enabled
- Policies check auth.uid() for user identity
- Admin checks query profiles table for role
- No data leakage between users
- Service role key bypasses RLS (server-side only)

**Example Policy:**

```sql
-- Users can only view their own requests
CREATE POLICY "gear_requests_select_own"
ON gear_requests FOR SELECT
USING (user_id = auth.uid());

-- Admins can view all requests
CREATE POLICY "gear_requests_admin_select_all"
ON gear_requests FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'Admin'
    )
);
```

### Security Best Practices

1. **Input Validation**
   - Zod schemas for all form inputs
   - Type checking via TypeScript
   - SQL injection prevention via Supabase

2. **XSS Prevention**
   - React escapes outputs by default
   - No dangerouslySetInnerHTML usage
   - Content Security Policy headers

3. **CSRF Protection**
   - SameSite cookies
   - CSRF tokens on state-changing operations
   - Origin validation

4. **Rate Limiting**
   - 100 requests per minute per user
   - Exponential backoff on auth attempts
   - IP-based throttling

5. **Data Encryption**
   - TLS 1.3 for data in transit
   - PostgreSQL encryption at rest
   - Encrypted Supabase Storage

---

## Component Architecture

### Folder Structure

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Auth routes (login, signup)
│   ├── admin/               # Admin dashboard routes
│   ├── user/                # User dashboard routes
│   ├── api/                 # API route handlers
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing page
├── components/              # React components
│   ├── admin/               # Admin-specific components
│   ├── user/                # User-specific components
│   ├── dashboard/           # Dashboard widgets
│   ├── ui/                  # shadcn/ui components
│   ├── navigation/          # Navigation components
│   └── providers/           # Context providers
├── hooks/                   # Custom React hooks
│   ├── dashboard/           # Dashboard hooks
│   ├── requests/            # Request hooks
│   └── use-toast.ts         # Toast notifications
├── lib/                     # Utility libraries
│   ├── supabase/            # Supabase clients
│   ├── api/                 # API client functions
│   ├── utils/               # Helper functions
│   └── performance/         # Performance utilities
├── services/                # Business logic services
│   ├── notification.ts      # Notification service
│   └── announcement-service.ts
├── types/                   # TypeScript type definitions
│   ├── supabase.ts          # Database types
│   ├── dashboard.ts         # Dashboard types
│   └── notifications.ts     # Notification types
└── utils/                   # Utility functions
    └── googleChat.ts        # Google Chat integration
```

### Component Design Principles

**1. Server vs Client Components**
- Default to Server Components
- Use 'use client' only when needed (state, effects, browser APIs)
- Server Components for data fetching
- Client Components for interactivity

**2. Composition Pattern**
- Small, focused components
- Reusable building blocks
- Props for customization
- Children for flexibility

**3. Naming Conventions**
- PascalCase for components
- camelCase for functions
- kebab-case for files
- Descriptive, self-documenting names

---

## State Management

### State Management Strategy

**1. Server State (React Query pattern)**
- API data fetched server-side
- Cached in Server Components
- Revalidated on navigation

**2. Client State (React Context)**
- User session context
- Theme context
- Dashboard data context
- Notification context

**3. Form State (React Hook Form)**
- Local form state
- Validation with Zod
- Error handling

**4. URL State (Next.js Router)**
- Search params for filters
- Query params for pagination
- Route params for IDs

### Dashboard Context Example

```typescript
interface DashboardContextType {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType>();

export function DashboardProvider({ children }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/unified');
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <DashboardContext.Provider value={{ data, loading, error, refetch: fetchData }}>
      {children}
    </DashboardContext.Provider>
  );
}
```

---

## Performance Optimization

### Frontend Optimization

**1. Code Splitting**
- Automatic route-based splitting by Next.js
- Dynamic imports for heavy components
- Lazy loading for modals and dialogs

**2. Image Optimization**
- Next.js Image component
- WebP format with fallbacks
- Responsive images with srcset
- Lazy loading images

**3. Bundle Optimization**
- Tree shaking unused code
- Minification in production
- Gzip compression
- Bundle analysis with @next/bundle-analyzer

**4. Caching Strategy**
- Static assets cached indefinitely
- API responses cached with SWR
- Service Worker for offline support
- CDN for global distribution

### Backend Optimization

**1. Database Optimization**
- Indexed columns for fast queries
- Query optimization with EXPLAIN
- Connection pooling
- Read replicas for scaling

**2. API Optimization**
- Response compression
- ETag headers for caching
- Parallel data fetching
- Pagination for large datasets

**3. Real-time Optimization**
- Selective subscriptions
- Debounced updates
- Polling fallback for WebSocket failures

---

## Deployment Architecture

### Vercel Deployment

```
┌─────────────────────────────────────────────────┐
│           Vercel Edge Network (CDN)             │
├─────────────────────────────────────────────────┤
│  - Global edge caching                          │
│  - Automatic HTTPS                              │
│  - DDoS protection                              │
└────────────────┬────────────────────────────────┘
                 │
     ┌───────────▼────────────┐
     │  Vercel Serverless     │
     │  Functions (US-East)   │
     │  - Next.js API Routes  │
     │  - SSR Pages           │
     └───────────┬────────────┘
                 │
     ┌───────────▼────────────┐
     │  Supabase Cloud        │
     │  (Multi-region)        │
     │  - PostgreSQL          │
     │  - Auth                │
     │  - Storage             │
     │  - Realtime            │
     └────────────────────────┘
```

### Environment Configuration

**Development:**
- Local Next.js dev server
- Supabase local instance (optional)
- Hot module replacement
- Debug logging enabled

**Staging:**
- Vercel preview deployments
- Supabase staging project
- Production-like environment
- E2E testing

**Production:**
- Vercel production deployment
- Supabase production project
- Monitoring enabled
- Error tracking (Sentry/LogRocket)

---

## Testing Strategy

### Test Pyramid

```
           ┌──────┐
          /  E2E   \       (10% - Full user flows)
         /──────────\
        /  Integration \   (30% - API + DB)
       /────────────────\
      /   Unit Tests     \ (60% - Functions, components)
     /────────────────────\
```

### Testing Tools

| Test Type | Framework | Purpose |
|-----------|-----------|---------|
| Unit Tests | Jest | Component logic, utilities |
| Integration Tests | Jest + Supabase | API routes, database queries |
| E2E Tests | Playwright | User workflows |
| Visual Tests | Chromatic | UI regression |
| Performance Tests | Lighthouse CI | Core Web Vitals |

### Test Coverage Goals

- Unit Tests: 80%+ coverage
- Critical paths: 100% coverage
- API routes: 90%+ coverage
- UI components: 70%+ coverage

---

## Document Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Oct 16, 2025 | Daniel Chinonso Samuel | Initial TDD creation |

---

**Technical Review:**

- Architecture Reviewer: _________________ Date: _________
- Security Reviewer: _________________ Date: _________
- Database Reviewer: _________________ Date: _________
