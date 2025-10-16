# Product Requirements Document (PRD)
## Nest - Asset & Equipment Management System

**Document Version:** 1.0  
**Last Updated:** October 16, 2025  
**Author:** Daniel Chinonso Samuel  
**Organization:** Eden Oasis

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Overview](#product-overview)
3. [Business Objectives](#business-objectives)
4. [User Personas](#user-personas)
5. [Functional Requirements](#functional-requirements)
6. [Non-Functional Requirements](#non-functional-requirements)
7. [User Stories](#user-stories)
8. [Success Metrics](#success-metrics)

---

## Executive Summary

Nest is a comprehensive, production-ready asset and equipment management system built on Next.js 15 and Supabase. It provides organizations with a centralized platform to track, request, manage, and analyze equipment inventory across the organization. The system supports real-time updates, role-based access control, and multi-channel notifications, enabling efficient asset lifecycle management from procurement to retirement.

**Key Value Propositions:**
- Real-time asset tracking and availability monitoring
- Streamlined request and approval workflows
- Role-based dashboards for admins and users
- Comprehensive reporting and analytics
- Mobile-responsive design with PWA capabilities
- Automated notifications via database and Google Chat webhooks

---

## Product Overview

### Vision Statement
To create the most intuitive and efficient asset management platform that eliminates bottlenecks in equipment tracking, reduces asset loss, and empowers organizations to maximize resource utilization.

### Target Market
- Small to medium-sized enterprises (10-500 employees)
- Educational institutions
- Production companies and studios
- Research laboratories
- Corporate offices requiring equipment management

### Product Positioning
Nest positions itself as a modern, user-friendly alternative to legacy asset management systems, focusing on:
- Zero-configuration deployment
- Intuitive UX following Apple's Human Interface Guidelines
- Real-time collaboration features
- Flexible integration capabilities

---

## Business Objectives

### Primary Objectives
1. **Reduce Asset Loss**: Decrease equipment loss by 80% through comprehensive tracking
2. **Improve Utilization**: Increase equipment utilization rates by 40%
3. **Streamline Workflows**: Reduce request approval time from days to hours
4. **Enhance Visibility**: Provide real-time insights into asset availability and usage patterns

### Secondary Objectives
1. Enable data-driven decision-making for procurement
2. Reduce administrative overhead by 50%
3. Improve user satisfaction with intuitive interfaces
4. Support compliance and audit requirements

---

## User Personas

### Persona 1: Admin Manager (Sarah)
**Role:** Operations Manager / Asset Administrator  
**Age:** 32-45  
**Tech Savviness:** High  

**Goals:**
- Monitor all equipment across the organization
- Approve/reject requests efficiently
- Generate reports for management
- Maintain accurate inventory records

**Pain Points:**
- Manual tracking in spreadsheets is error-prone
- Difficulty identifying equipment availability
- Time-consuming approval processes
- Lack of usage analytics

**Key Features:**
- Centralized admin dashboard
- Quick approval workflows
- Real-time inventory updates
- Comprehensive reporting tools

### Persona 2: Equipment User (Michael)
**Role:** Project Team Member / End User  
**Age:** 25-40  
**Tech Savviness:** Medium to High  

**Goals:**
- Find and request equipment quickly
- Track request status in real-time
- Check-in/out equipment easily
- View equipment history

**Pain Points:**
- Uncertain equipment availability
- Unclear request status
- Complex check-in procedures
- No visibility into request queue

**Key Features:**
- Browse equipment catalog
- Simple request submission
- Real-time status updates
- QR code scanning for check-in/out

---

## Functional Requirements

### FR-1: User Authentication & Authorization
**Priority:** Critical  
**Status:** Implemented

**Requirements:**
- FR-1.1: Users must register with email and password
- FR-1.2: System must support email verification
- FR-1.3: Two user roles: Admin and User
- FR-1.4: Role-based access control (RBAC) with Row-Level Security
- FR-1.5: Session management with automatic timeout
- FR-1.6: Password reset functionality

**Acceptance Criteria:**
- Users can sign up and receive verification emails
- Only admins can access admin-specific features
- Sessions expire after inactivity period
- Users can reset passwords via email link

---

### FR-2: Equipment/Gear Management
**Priority:** Critical  
**Status:** Implemented

**Requirements:**
- FR-2.1: Admins can create, read, update, delete (CRUD) equipment records
- FR-2.2: Each equipment must have: name, category, description, serial number, image, quantity
- FR-2.3: Support for equipment status: Available, Checked Out, Partially Checked Out, Under Repair, Retired
- FR-2.4: Track available quantity vs total quantity
- FR-2.5: Support for equipment images with upload to Supabase Storage
- FR-2.6: Equipment categorization (Camera, Lighting, Audio, etc.)
- FR-2.7: Search and filter capabilities
- FR-2.8: CSV import/export for bulk operations

**Acceptance Criteria:**
- Admins can perform all CRUD operations on equipment
- Equipment images display properly in all views
- Status updates reflect in real-time across all users
- Quantity tracking prevents over-allocation

---

### FR-3: Request Management System
**Priority:** Critical  
**Status:** Implemented

**Requirements:**
- FR-3.1: Users can create equipment requests
- FR-3.2: Multi-item requests supported (request multiple items simultaneously)
- FR-3.3: Request details include: reason, destination, expected duration, team members
- FR-3.4: Request statuses: Pending, Approved, Rejected, Cancelled
- FR-3.5: Admins can approve/reject requests with notes
- FR-3.6: Users can view request history and status
- FR-3.7: Due date tracking for approved requests
- FR-3.8: Automated notifications on status changes

**Acceptance Criteria:**
- Users can submit requests with multiple equipment items
- Admins receive notifications for new requests
- Approved requests update equipment availability
- Users receive real-time status updates

---

### FR-4: Check-In/Check-Out System
**Priority:** High  
**Status:** Implemented

**Requirements:**
- FR-4.1: Users can check out equipment based on approved requests
- FR-4.2: QR code scanning support for quick identification
- FR-4.3: Check-in workflow with condition reporting
- FR-4.4: Damage documentation with photo upload
- FR-4.5: Automatic due date calculation
- FR-4.6: Overdue tracking and notifications
- FR-4.7: Multi-item check-in support
- FR-4.8: Check-in history tracking

**Acceptance Criteria:**
- QR scanner works on mobile devices
- Check-in updates equipment status immediately
- Damage reports are saved with check-in records
- Overdue equipment triggers notifications

---

### FR-5: Dashboard & Analytics
**Priority:** High  
**Status:** Implemented

**Requirements:**
- FR-5.1: Admin dashboard with system-wide statistics
- FR-5.2: User dashboard with personal activity
- FR-5.3: Real-time data updates via Supabase subscriptions
- FR-5.4: Key metrics: total equipment, available, checked out, utilization rates
- FR-5.5: Request statistics and approval rates
- FR-5.6: Recent activity timeline
- FR-5.7: Pending items summary
- FR-5.8: Visual charts and graphs using Recharts

**Acceptance Criteria:**
- Dashboards load within 2 seconds
- Statistics update in real-time
- Charts are responsive and mobile-friendly
- Data is accurate and reflects current state

---

### FR-6: Notification System
**Priority:** High  
**Status:** Implemented

**Requirements:**
- FR-6.1: In-app notification center
- FR-6.2: Real-time notification delivery
- FR-6.3: Notification types: info, success, warning, error, system
- FR-6.4: Notification persistence in database
- FR-6.5: Mark as read/unread functionality
- FR-6.6: Notification filtering and search
- FR-6.7: Google Chat webhook integration for admins
- FR-6.8: Configurable notification preferences

**Acceptance Criteria:**
- Users receive notifications within 1 second of events
- Notifications persist across sessions
- Google Chat integration delivers formatted messages
- Users can manage notification settings

---

### FR-7: Reporting & Export
**Priority:** Medium  
**Status:** Implemented

**Requirements:**
- FR-7.1: Generate PDF reports for equipment inventory
- FR-7.2: Generate PDF reports for request history
- FR-7.3: CSV export for equipment data
- FR-7.4: CSV import for bulk equipment creation
- FR-7.5: Weekly activity reports
- FR-7.6: Utilization analytics
- FR-7.7: Custom date range filtering
- FR-7.8: Report templates with organization branding

**Acceptance Criteria:**
- PDFs generate with proper formatting
- CSV exports include all relevant fields
- CSV imports validate data before creation
- Reports can be scheduled for recurring delivery

---

### FR-8: User Profile Management
**Priority:** Medium  
**Status:** Implemented

**Requirements:**
- FR-8.1: Users can view and edit profile information
- FR-8.2: Avatar upload and management
- FR-8.3: Profile fields: full name, email, department, phone, bio
- FR-8.4: User status tracking: Active, Inactive, Suspended
- FR-8.5: Admin can manage user accounts
- FR-8.6: User activity history
- FR-8.7: Ban/unban user functionality for admins

**Acceptance Criteria:**
- Profile updates reflect immediately
- Avatar images are properly resized and optimized
- Banned users cannot access the system
- Admin can view all user profiles

---

### FR-9: Car Booking System (Extended Feature)
**Priority:** Medium  
**Status:** Implemented

**Requirements:**
- FR-9.1: Users can book available cars
- FR-9.2: Car inventory management by admins
- FR-9.3: Booking request with start/end time
- FR-9.4: Car assignment tracking
- FR-9.5: Booking approval workflow
- FR-9.6: Conflict detection for overlapping bookings
- FR-9.7: Calendar view of car availability

**Acceptance Criteria:**
- Users can view car availability
- Booking conflicts are prevented
- Admins can approve/reject car bookings
- Calendar shows accurate availability

---

### FR-10: Announcements System
**Priority:** Low  
**Status:** Implemented

**Requirements:**
- FR-10.1: Admins can create system-wide announcements
- FR-10.2: Users see announcements on dashboard
- FR-10.3: Announcement categories and priorities
- FR-10.4: Mark announcements as read
- FR-10.5: Announcement expiration dates
- FR-10.6: Rich text formatting support

**Acceptance Criteria:**
- Announcements display prominently on user dashboards
- Users can dismiss announcements
- Expired announcements are automatically hidden
- Markdown formatting renders correctly

---

## Non-Functional Requirements

### NFR-1: Performance
**Priority:** Critical

**Requirements:**
- NFR-1.1: Page load time < 3 seconds on 4G connection
- NFR-1.2: API response time < 500ms for 95% of requests
- NFR-1.3: Dashboard data refresh < 2 seconds
- NFR-1.4: Support 100 concurrent users without degradation
- NFR-1.5: Real-time updates delivered within 1 second

**Measurement:**
- Lighthouse performance score > 90
- Time to Interactive (TTI) < 3.5 seconds
- Core Web Vitals passing

---

### NFR-2: Security
**Priority:** Critical

**Requirements:**
- NFR-2.1: All data transmitted over HTTPS/TLS 1.3
- NFR-2.2: Row-Level Security (RLS) enforced on all database tables
- NFR-2.3: Password hashing with bcrypt (handled by Supabase Auth)
- NFR-2.4: JWT token-based authentication
- NFR-2.5: XSS and CSRF protection
- NFR-2.6: Rate limiting on API endpoints
- NFR-2.7: Input validation and sanitization
- NFR-2.8: Regular security audits

**Measurement:**
- Zero critical vulnerabilities in security scans
- All Supabase RLS policies active
- Rate limiting prevents > 100 requests/minute per user

---

### NFR-3: Scalability
**Priority:** High

**Requirements:**
- NFR-3.1: Database supports > 10,000 equipment items
- NFR-3.2: System handles > 1,000 daily requests
- NFR-3.3: Storage supports > 100GB of images
- NFR-3.4: Horizontal scaling capability
- NFR-3.5: Database connection pooling

**Measurement:**
- Load testing with 1000 concurrent users passes
- Database queries remain < 100ms with large datasets

---

### NFR-4: Usability
**Priority:** High

**Requirements:**
- NFR-4.1: Mobile-responsive design (iOS, Android)
- NFR-4.2: Follows Apple Human Interface Guidelines
- NFR-4.3: WCAG 2.1 AA accessibility compliance
- NFR-4.4: Keyboard navigation support
- NFR-4.5: Screen reader compatible
- NFR-4.6: Intuitive navigation (< 3 clicks to any feature)
- NFR-4.7: Progressive Web App (PWA) support

**Measurement:**
- Accessibility score > 95 on Lighthouse
- User testing: 90% task completion rate
- Mobile usability score > 90

---

### NFR-5: Reliability
**Priority:** High

**Requirements:**
- NFR-5.1: 99.9% uptime SLA
- NFR-5.2: Automated backups every 24 hours
- NFR-5.3: Error handling on all API routes
- NFR-5.4: Graceful degradation for offline mode
- NFR-5.5: Transaction rollback on failures
- NFR-5.6: Health monitoring and alerts

**Measurement:**
- Maximum downtime: 43 minutes/month
- Database backup success rate: 100%
- Error recovery rate > 95%

---

### NFR-6: Maintainability
**Priority:** Medium

**Requirements:**
- NFR-6.1: Comprehensive code documentation
- NFR-6.2: TypeScript for type safety
- NFR-6.3: Modular component architecture
- NFR-6.4: Automated testing coverage > 70%
- NFR-6.5: CI/CD pipeline for deployments
- NFR-6.6: Structured logging and error tracking
- NFR-6.7: Database migration versioning

**Measurement:**
- Code review approval required for merges
- Zero TypeScript errors in production builds
- Deployment success rate > 99%

---

## User Stories

### Epic 1: Equipment Discovery
**US-1:** As a user, I want to browse all available equipment so that I can find what I need for my project.

**US-2:** As a user, I want to search equipment by name or category so that I can quickly locate specific items.

**US-3:** As a user, I want to see equipment details including images and specifications so that I can make informed decisions.

### Epic 2: Request Workflow
**US-4:** As a user, I want to request multiple equipment items in a single request so that I can save time.

**US-5:** As a user, I want to track my request status in real-time so that I know when to expect equipment.

**US-6:** As an admin, I want to review and approve requests with one click so that I can process requests efficiently.

**US-7:** As an admin, I want to add notes when rejecting requests so that users understand the reason.

### Epic 3: Check-In/Out Process
**US-8:** As a user, I want to scan QR codes to check out equipment so that the process is fast and accurate.

**US-9:** As a user, I want to report equipment condition during check-in so that damage is properly documented.

**US-10:** As an admin, I want to see overdue equipment so that I can follow up with users.

### Epic 4: Monitoring & Analytics
**US-11:** As an admin, I want to see dashboard statistics so that I can monitor system health.

**US-12:** As an admin, I want to generate utilization reports so that I can optimize equipment procurement.

**US-13:** As a user, I want to see my activity history so that I can track my equipment usage.

### Epic 5: Communication
**US-14:** As a user, I want to receive notifications when my request is approved so that I can pick up equipment promptly.

**US-15:** As an admin, I want to receive Google Chat notifications for urgent requests so that I can respond quickly.

**US-16:** As a user, I want to see system announcements so that I stay informed about policy changes.

---

## Success Metrics

### Primary KPIs

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| User Adoption Rate | 80% of organization | Active users / Total employees |
| Request Processing Time | < 4 hours | Avg time from submission to approval |
| Equipment Utilization | 65%+ | (Checked out hours / Total available hours) × 100 |
| User Satisfaction | 4.5/5 stars | User feedback surveys |
| System Uptime | 99.9% | Monitoring tools (Vercel Analytics) |

### Secondary KPIs

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Asset Loss Rate | < 2% annually | Missing items / Total items |
| Request Approval Rate | > 90% | Approved / Total requests |
| Mobile Usage | > 40% | Mobile sessions / Total sessions |
| API Performance | < 500ms avg | Response time monitoring |
| Error Rate | < 0.1% | Errors / Total requests |

### Business Impact Metrics

| Metric | Baseline | Target | Timeline |
|--------|----------|--------|----------|
| Admin Time Savings | 20 hrs/week | 10 hrs/week | 3 months |
| Equipment ROI | N/A | 15% increase | 6 months |
| User Productivity | N/A | 25% improvement | 6 months |
| Procurement Accuracy | 70% | 95% | 12 months |

---

## Document Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Oct 16, 2025 | Daniel Chinonso Samuel | Initial PRD creation |

---

**Approvals:**

- Product Owner: _________________ Date: _________
- Engineering Lead: _________________ Date: _________
- Stakeholders: _________________ Date: _________
