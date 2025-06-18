# Nest by Eden Oasis

**Enterprise Asset Management System**

A comprehensive, modern asset management platform designed for organizations to efficiently track, manage, and allocate equipment, vehicles, and resources. Built with Next.js, TypeScript, and Supabase for scalable, real-time operations.

---

## Overview

Nest by Eden Oasis is an enterprise-grade asset management system that revolutionizes how organizations handle their equipment inventory. From cameras and laptops to vehicles and specialized equipment, our platform provides complete lifecycle management with real-time tracking, automated workflows, and comprehensive reporting.

### Mission

To eliminate asset management inefficiencies through intelligent automation, real-time tracking, and data-driven insights that empower organizations to maximize their resource utilization.

---

## Key Features

### 🏗️ **Core Asset Management**

- **Equipment Catalog**: Comprehensive asset database with detailed specifications
- **Real-time Tracking**: Live status updates and availability monitoring
- **Category Management**: Organized equipment classification system
- **Status Workflows**: Automated status transitions (Available → Checked Out → Maintenance)
- **Condition Monitoring**: Equipment health tracking and maintenance scheduling

### **Request & Workflow Management**

- **Intelligent Request System**: Multi-item selection with smart recommendations
- **Approval Workflows**: Configurable approval chains and automated processing
- **Team Collaboration**: Multi-user requests and resource sharing
- **Duration Management**: Flexible rental periods from hours to years
- **Automated Reminders**: Due date notifications and overdue alerts

### **User Experience**

- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **QR Code Integration**: Quick equipment identification and check-in/out
- **Search & Discovery**: Advanced multi-field search with instant results
- **Visual Catalog**: Rich equipment cards with images and specifications
- **Progressive Web App**: Offline capabilities and native app experience

### **Administrative Control**

- **Dashboard Analytics**: Real-time metrics and performance indicators
- **Inventory Management**: Complete equipment lifecycle control
- **User Management**: Role-based access control and permissions
- **Reporting System**: Comprehensive analytics and business intelligence
- **Audit Trails**: Complete activity logging and compliance tracking

### **Notifications & Alerts**

- **Multi-Channel Notifications**: Email, in-app, and push notifications
- **Google Chat Integration**: Real-time team collaboration
- **Automated Alerts**: Overdue equipment, maintenance schedules, and system events
- **Customizable Preferences**: User-controlled notification settings

### **Analytics & Reporting**

- **Utilization Analytics**: Equipment usage patterns and optimization insights
- **Financial Reporting**: Cost analysis and budget impact assessment
- **Performance Metrics**: User engagement and operational efficiency
- **Custom Reports**: Configurable reporting for specific business needs

---

## Architecture

### **Technology Stack**

#### **Frontend**

- **Next.js 14**: React framework with App Router and Server Components
- **TypeScript**: Type-safe development with comprehensive interfaces
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **shadcn/ui**: Modern, accessible component library
- **Framer Motion**: Smooth animations and micro-interactions
- **React Hook Form**: Performant form handling with validation

#### **Backend & Database**

- **Supabase**: PostgreSQL database with real-time subscriptions
- **Row Level Security (RLS)**: Database-level security and authorization
- **Edge Functions**: Serverless functions for custom business logic
- **Real-time Subscriptions**: Live data updates across the application

#### **Authentication & Security**

- **Supabase Auth**: Secure authentication with multiple providers
- **JWT Tokens**: Stateless authentication with automatic refresh
- **Role-Based Access Control (RBAC)**: Granular permission management
- **Input Validation**: Comprehensive data validation with Zod

#### **Development & Deployment**

- **Vercel**: Optimized deployment with Edge Runtime
- **ESLint & Prettier**: Code quality and formatting standards
- **TypeScript Strict Mode**: Enhanced type safety and error prevention
- **Performance Monitoring**: Real-time application performance tracking

### **System Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                      │
├─────────────────────────────────────────────────────────────┤
│  Web App (Next.js)  │  Mobile PWA  │  Admin Dashboard      │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                     API Layer                              │
├─────────────────────────────────────────────────────────────┤
│  Next.js API Routes  │  Supabase Edge Functions            │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                  Business Logic                            │
├─────────────────────────────────────────────────────────────┤
│  Services  │  Utilities  │  Hooks  │  State Management     │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                              │
├─────────────────────────────────────────────────────────────┤
│  Supabase PostgreSQL  │  Real-time  │  Storage  │  Auth    │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### **Prerequisites**

- **Node.js** 18+ and npm/yarn
- **Supabase** account and project
- **Git** for version control

### **Installation**

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/nest-by-eden-oasis.git
   cd nest-by-eden-oasis
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment setup**

   ```bash
   cp .env.example .env.local
   ```

4. **Configure environment variables**

   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # Application Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   
   # External Integrations
   GOOGLE_CHAT_WEBHOOK_URL=your-google-chat-webhook
   
   # Security
   JWT_SECRET=your-jwt-secret
   ```

5. **Database setup**

   ```bash
   # Run database migrations
   npx supabase db reset
   
   # Seed initial data (optional)
   npm run db:seed
   ```

6. **Start development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:9002) in your browser.

---

## 📁 Project Structure

```
nest-by-eden-oasis/
├── 📁 src/
│   ├── 📁 app/                     # Next.js App Router
│   │   ├── 📁 (auth)/             # Authentication pages
│   │   ├── 📁 admin/              # Admin dashboard
│   │   ├── 📁 api/                # API routes
│   │   └── 📁 user/               # User pages
│   ├── 📁 components/             # React components
│   │   ├── 📁 ui/                 # Base UI components
│   │   ├── 📁 admin/              # Admin-specific components
│   │   └── 📁 user/               # User-specific components
│   ├── 📁 hooks/                  # Custom React hooks
│   ├── 📁 lib/                    # Utility libraries
│   │   ├── 📁 api/                # API utilities
│   │   └── 📁 supabase/           # Database client
│   ├── 📁 services/               # Business logic services
│   ├── 📁 types/                  # TypeScript definitions
│   └── 📁 utils/                  # Helper utilities
├── 📁 public/                     # Static assets
├── 📁 supabase/                   # Database schema and migrations
├── 📁 sql/                        # Custom SQL functions
└── 📄 Configuration files
```

### **Key Directories Explained**

#### **`src/app/`** - Application Pages

- **Authentication flows** with secure login/signup
- **User dashboard** with personalized equipment access
- **Admin interface** for system management
- **API endpoints** for data operations

#### **`src/components/`** - UI Components

- **Reusable UI components** built with shadcn/ui
- **Feature-specific components** for equipment management
- **Layout components** for consistent design

#### **`src/services/`** - Business Logic

- **Report generation** with analytics and insights
- **Notification system** with multi-channel support
- **Equipment workflows** for lifecycle management

#### **`src/lib/`** - Core Utilities

- **Database queries** with optimized performance
- **Error handling** with user-friendly messages
- **Supabase client** configuration and management

---

## 🎯 User Roles & Permissions

### User (Standard)**

- **Browse Equipment**: View available equipment catalog
- **Request Equipment**: Submit equipment requests with approvals
- **Check-out/Check-in**: Manage borrowed equipment
- **View History**: Access personal request and usage history
- **Notifications**: Receive updates on requests and due dates

### 👨‍💼 Admin (Administrative)**

- **Full Equipment Management**: Add, edit, delete equipment
- **User Management**: Manage user accounts and permissions
- **Request Processing**: Approve/deny equipment requests
- **Inventory Control**: Monitor equipment status and availability
- **Analytics Dashboard**: Access comprehensive reporting and insights
- **System Configuration**: Manage application settings and preferences

### Super Admin (System)**

- **All Admin Permissions**: Complete administrative access
- **System Configuration**: Modify core system settings
- **Database Management**: Direct database access and maintenance
- **User Role Management**: Assign and modify user permissions
- **Audit Controls**: Access complete system audit trails

---

## User Interface

### **Modern Design System**

- **Consistent Color Palette**: Professional brand colors with semantic meaning
- **Typography**: Clean, readable fonts optimized for digital interfaces
- **Spacing System**: Consistent spacing scale for visual harmony
- **Component Library**: Reusable components with consistent behavior

### **Responsive Design**

- **Mobile-First**: Optimized for mobile devices with progressive enhancement
- **Tablet Support**: Enhanced layouts for tablet interfaces
- **Desktop Experience**: Full-featured desktop interface with advanced controls

### **Accessibility**

- **WCAG 2.1 Compliant**: Meets international accessibility standards
- **Keyboard Navigation**: Full keyboard accessibility for all features
- **Screen Reader Support**: Semantic HTML with proper ARIA labels
- **High Contrast**: Optimized color contrast for visual accessibility

### **Key UI Features**

- **Equipment Cards**: Visual equipment representation with images and status
- **Status Badges**: Color-coded status indicators for quick recognition
- **Search Interface**: Advanced search with filters and instant results
- **Dashboard Metrics**: Visual KPIs with charts and graphs
- **Modal Dialogs**: Contextual interfaces for detailed operations

---

## Configuration

### **Environment Variables**

#### **Required Variables**

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application (Required)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

#### **Optional Variables**

```env
# Google Chat Integration
GOOGLE_CHAT_WEBHOOK_URL=https://chat.googleapis.com/v1/spaces/...

# Email Configuration
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-password

# Analytics
GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID
```

### **Application Configuration**

#### **`next.config.mjs`**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  images: {
    domains: ['your-supabase-project.supabase.co'],
  },
  // PWA configuration
  // Performance optimizations
  // Security headers
}
```

#### **Database Configuration**

- **Connection Pooling**: Optimized for high concurrency
- **Row Level Security**: Database-level access control
- **Real-time Subscriptions**: Live data updates
- **Backup Strategy**: Automated daily backups with point-in-time recovery

---

## Deployment

### **Vercel Deployment (Recommended)**

1. **Connect Repository**

   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel --prod
   ```

2. **Environment Variables**
   - Configure all required environment variables in Vercel dashboard
   - Set up preview deployments for staging environment

3. **Domain Configuration**
   - Configure custom domain
   - Set up SSL certificates
   - Configure CDN settings

### **Alternative Deployment Options**

#### **Docker Deployment**

```dockerfile
FROM node:18-alpine AS base
# ... Docker configuration
```

#### **Traditional Hosting**

```bash
# Build application
npm run build

# Start production server
npm start
```

### **Production Checklist**

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates installed
- [ ] Monitoring tools configured
- [ ] Backup systems operational
- [ ] Performance optimization enabled

---

## Database Schema

### **Core Tables**

#### **`profiles`** - User Management

```sql
profiles (
  id: uuid PRIMARY KEY,
  email: text UNIQUE NOT NULL,
  full_name: text,
  role: user_role DEFAULT 'user',
  avatar_url: text,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
)
```

#### **`gears`** - Equipment Inventory

```sql
gears (
  id: uuid PRIMARY KEY,
  name: text NOT NULL,
  description: text,
  category: text,
  brand: text,
  model: text,
  serial_number: text UNIQUE,
  status: gear_status DEFAULT 'available',
  condition: gear_condition DEFAULT 'excellent',
  image_url: text,
  checked_out_to: uuid REFERENCES profiles(id),
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
)
```

#### **`gear_requests`** - Request Management

```sql
gear_requests (
  id: uuid PRIMARY KEY,
  user_id: uuid REFERENCES profiles(id) NOT NULL,
  gear_ids: uuid[] NOT NULL,
  reason: text NOT NULL,
  destination: text NOT NULL,
  expected_duration: text NOT NULL,
  team_members: text,
  status: request_status DEFAULT 'pending',
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
)
```

#### **`gear_activity_log`** - Audit Trail

```sql
gear_activity_log (
  id: uuid PRIMARY KEY,
  gear_id: uuid REFERENCES gears(id) NOT NULL,
  user_id: uuid REFERENCES profiles(id),
  activity_type: activity_type NOT NULL,
  status: text,
  notes: text,
  created_at: timestamptz DEFAULT now()
)
```

### **Custom Types**

```sql
-- User roles
CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin');

-- Equipment status
CREATE TYPE gear_status AS ENUM ('available', 'checked_out', 'maintenance', 'damaged', 'retired');

-- Equipment condition
CREATE TYPE gear_condition AS ENUM ('excellent', 'good', 'fair', 'poor', 'damaged');

-- Request status
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'denied', 'cancelled', 'completed');

-- Activity types
CREATE TYPE activity_type AS ENUM ('request', 'checkout', 'checkin', 'maintenance', 'damage_report');
```

---

## 🔌 API Documentation

### **REST API Endpoints**

#### **Authentication**

```http
POST /api/auth/login
POST /api/auth/signup
POST /api/auth/logout
GET  /api/auth/user
```

#### **Equipment Management**

```http
GET    /api/gears              # List equipment
POST   /api/gears              # Create equipment
GET    /api/gears/:id          # Get equipment details
PUT    /api/gears/:id          # Update equipment
DELETE /api/gears/:id          # Delete equipment
```

#### **Request Management**

```http
GET    /api/requests           # List requests
POST   /api/requests           # Create request
GET    /api/requests/:id       # Get request details
PUT    /api/requests/:id       # Update request
DELETE /api/requests/:id       # Cancel request
```

#### **Notifications**

```http
GET    /api/notifications      # List notifications
POST   /api/notifications      # Create notification
PUT    /api/notifications/:id  # Mark as read
DELETE /api/notifications/:id  # Delete notification
```

### **Real-time Subscriptions**

#### **Equipment Updates**

```javascript
// Subscribe to equipment changes
const channel = supabase
  .channel('equipment-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'gears'
  }, handleEquipmentChange)
  .subscribe()
```

#### **Request Updates**

```javascript
// Subscribe to request status changes
const channel = supabase
  .channel('request-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'gear_requests'
  }, handleRequestUpdate)
  .subscribe()
```

---

## Testing

### **Testing Strategy**

- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API endpoint and database testing
- **E2E Tests**: Complete user workflow testing
- **Performance Tests**: Load testing and optimization

### **Test Commands**

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

### **Testing Tools**

- **Jest**: Unit and integration testing framework
- **React Testing Library**: Component testing utilities
- **Playwright**: End-to-end testing
- **MSW**: API mocking for testing

---

## Performance

### **Optimization Strategies**

#### **Frontend Performance**

- **Code Splitting**: Automatic route-based code splitting
- **Image Optimization**: Next.js Image component with WebP support
- **Caching**: Aggressive caching with SWR for data fetching
- **Bundle Analysis**: Regular bundle size monitoring and optimization

#### **Database Performance**

- **Query Optimization**: Efficient database queries with proper indexing
- **Connection Pooling**: Optimized database connection management
- **Real-time Efficiency**: Selective real-time subscriptions
- **Data Pagination**: Efficient data loading for large datasets

#### **Application Metrics**

- **Core Web Vitals**: Optimized for Google's performance metrics
- **Time to Interactive**: Fast application startup and interactivity
- **First Contentful Paint**: Optimized initial page loading
- **Cumulative Layout Shift**: Stable layout preventing content shifts

### **Performance Monitoring**

```javascript
// Performance monitoring setup
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

// Track Core Web Vitals
getCLS(console.log)
getFID(console.log)
getFCP(console.log)
getLCP(console.log)
getTTFB(console.log)
```

---

## Security

### **Security Measures**

#### **Authentication & Authorization**

- **JWT Tokens**: Secure, stateless authentication
- **Row Level Security**: Database-level access control
- **Role-Based Permissions**: Granular permission management
- **Session Management**: Secure session handling with automatic refresh

#### **Data Protection**

- **Input Validation**: Comprehensive data validation with Zod
- **SQL Injection Prevention**: Parameterized queries and ORM protection
- **XSS Protection**: Content Security Policy and input sanitization
- **CSRF Protection**: Anti-CSRF tokens and same-site cookies

#### **Infrastructure Security**

- **HTTPS Enforcement**: SSL/TLS encryption for all communications
- **Environment Variables**: Secure configuration management
- **API Rate Limiting**: Protection against abuse and DoS attacks
- **Audit Logging**: Comprehensive activity tracking and monitoring

### **Security Best Practices**

```typescript
// Input validation example
const equipmentSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(['camera', 'laptop', 'vehicle']),
  serialNumber: z.string().regex(/^[A-Z0-9-]+$/)
})

// Secure API endpoint
export async function POST(request: Request) {
  // Validate authentication
  const user = await getUser(request)
  if (!user) return unauthorized()
  
  // Validate permissions
  if (!hasPermission(user, 'equipment.create')) {
    return forbidden()
  }
  
  // Validate input
  const data = equipmentSchema.parse(await request.json())
  
  // Process request...
}
```

---

## Troubleshooting

### **Common Issues**

#### **Database Connection Issues**

```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Test database connection
npx supabase db ping
```

#### **Authentication Problems**

```typescript
// Debug authentication
const { data: { user }, error } = await supabase.auth.getUser()
console.log('User:', user)
console.log('Auth Error:', error)
```

#### **Real-time Subscription Issues**

```typescript
// Debug real-time connections
const channel = supabase
  .channel('debug-channel')
  .on('postgres_changes', {}, (payload) => {
    console.log('Real-time payload:', payload)
  })
  .subscribe((status) => {
    console.log('Subscription status:', status)
  })
```

### **Performance Issues**

- **Slow Page Loading**: Check bundle size and optimize imports
- **Database Queries**: Use database query profiling
- **Memory Leaks**: Monitor component cleanup and subscriptions
- **Network Issues**: Check API response times and caching

### **Debugging Tools**

- **React Developer Tools**: Component inspection and profiling
- **Supabase Dashboard**: Database query monitoring
- **Vercel Analytics**: Performance and error monitoring
- **Browser DevTools**: Network, performance, and console debugging

---

## Additional Resources

### **Documentation**

- **[Next.js Documentation](https://nextjs.org/docs)**: Framework documentation
- **[Supabase Documentation](https://supabase.com/docs)**: Backend and database
- **[Tailwind CSS](https://tailwindcss.com/docs)**: Styling framework
- **[TypeScript Handbook](https://www.typescriptlang.org/docs)**: TypeScript guide

### **Community & Support**

- **GitHub Issues**: Report bugs and request features
- **Discord Community**: Join our development community
- **Documentation Wiki**: Community-contributed guides
- **Video Tutorials**: Step-by-step setup and usage guides

### **Contributing**

- **Contributing Guide**: How to contribute to the project
- **Code of Conduct**: Community guidelines and expectations
- **Development Setup**: Local development environment setup
- **Pull Request Guidelines**: Code review and submission process

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Next.js Team** for the incredible React framework
- **Supabase Team** for the amazing backend-as-a-service platform
- **Vercel Team** for the seamless deployment platform
- **shadcn** for the beautiful component library
- **Open Source Community** for the countless libraries and tools

---

## 📧 Contact & Support

**Project Maintainer**: Daniel Chinonso Samuel  
**Email**: <support@edenoasis.com>  
**Website**: <https://nest.edenoasis.com>  
**Documentation**: <https://docs.nest.edenoasis.com>  

---

<div align="center">

**Built with ❤️ by the Eden Oasis Team**

[Website](https://edenoasis.com) • [📧 Contact](mailto:contact@edenoasis.com) • [🐛 Report Bug](https://github.com/your-org/nest-by-eden-oasis/issues) • [💡 Request Feature](https://github.com/your-org/nest-by-eden-oasis/issues)

</div>
