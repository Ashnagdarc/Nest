# Nest by Eden Oasis

**Comprehensive Asset Management System**

A modern, full-stack asset management platform designed for organizations to efficiently track, request, and manage all types of assets - from equipment and vehicles to technology devices and office supplies.

## 🌟 Overview

Nest by Eden Oasis is a powerful web application that streamlines asset management workflows with:
- **Universal Asset Tracking** - Manage equipment, vehicles, technology, supplies, and more
- **Request Management** - Streamlined approval workflows for asset requests
- **Real-time Dashboards** - Comprehensive analytics and reporting
- **User Role Management** - Admin and user permissions with customizable access
- **Mobile-Responsive Design** - Access from any device, anywhere
- **Notification System** - Email, in-app, and push notifications

## 🚀 Features

### Asset Management
- **Comprehensive Tracking** - Track all asset types with detailed information
- **Status Management** - Available, checked out, under repair, maintenance
- **QR Code Integration** - Quick asset identification and check-in/out
- **Condition Monitoring** - Track asset condition and maintenance history
- **Photo Documentation** - Visual asset records with image uploads

### Request System
- **User-Friendly Requests** - Simple asset request interface
- **Approval Workflows** - Admin approval with notification system
- **Request History** - Complete audit trail of all requests
- **Priority Levels** - Urgent, high, medium, low priority handling
- **Reason Tracking** - Document why assets are needed

### Dashboard & Analytics
- **Real-time Metrics** - Live asset utilization and availability stats
- **Visual Reports** - Charts and graphs for usage patterns
- **Export Capabilities** - PDF and CSV report generation
- **Activity Feeds** - Recent activity and system events
- **Trend Analysis** - Historical usage patterns and forecasting

### User Management
- **Role-Based Access** - Admin and User roles with granular permissions
- **Profile Management** - User profiles with contact information
- **Notification Preferences** - Customizable notification settings
- **Authentication** - Secure login with Supabase Auth

### Technical Features
- **Progressive Web App (PWA)** - Install on mobile devices
- **Offline Support** - Basic functionality when offline
- **Real-time Updates** - Live synchronization across all users
- **Search & Filtering** - Advanced search capabilities
- **Responsive Design** - Optimized for desktop, tablet, and mobile

## 🛠 Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Modern UI component library
- **Framer Motion** - Smooth animations
- **React Hook Form** - Form management with validation

### Backend & Database
- **Supabase** - Backend-as-a-Service with PostgreSQL
- **Supabase Auth** - User authentication and authorization
- **Supabase Storage** - File and image storage
- **Real-time Subscriptions** - Live data synchronization

### Additional Services
- **Vercel** - Deployment and hosting
- **Firebase Cloud Messaging** - Push notifications
- **Nodemailer** - Email notifications
- **React Query** - Server state management

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd nest-by-eden-oasis
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Copy `.env.example` to `.env.local` and configure:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Email Configuration
   SMTP_HOST=your_smtp_host
   SMTP_PORT=587
   SMTP_USER=your_email
   SMTP_PASS=your_password
   
   # Firebase (for push notifications)
   FCM_SERVER_KEY=your_fcm_server_key
   ```

4. **Database Setup**
   ```bash
   # Run Supabase migrations
   npx supabase db push
   
   # Seed initial data (optional)
   npm run db:seed
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

   Visit `http://localhost:9002` to see the application.

### Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy to Vercel**
   ```bash
   npx vercel --prod
   ```

## 📁 Project Structure

```
nest-by-eden-oasis/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Authentication pages
│   │   ├── admin/             # Admin dashboard pages
│   │   ├── api/               # API routes
│   │   └── user/              # User dashboard pages
│   ├── components/            # Reusable UI components
│   │   ├── admin/            # Admin-specific components
│   │   ├── ui/               # shadcn/ui components
│   │   └── user/             # User-specific components
│   ├── lib/                   # Utility libraries
│   │   ├── api/              # API utilities and queries
│   │   ├── supabase/         # Supabase client configuration
│   │   └── utils/            # Helper functions
│   ├── types/                 # TypeScript type definitions
│   └── hooks/                 # Custom React hooks
├── public/                    # Static assets
├── sql/                       # Database scripts and functions
├── supabase/                  # Supabase configuration
└── docs/                      # Documentation
```

## 🔧 Configuration

### Database Schema
The application uses several key tables:
- `profiles` - User information and preferences
- `gears` - Asset/equipment records
- `gear_requests` - Request management
- `gear_checkouts` - Check-out tracking
- `notifications` - In-app notifications
- `app_settings` - Application configuration

### User Roles
- **Admin** - Full system access, user management, asset management
- **User** - Request assets, view personal history, manage profile

### Notification Channels
- **Email** - SMTP-based email notifications
- **In-App** - Real-time browser notifications
- **Push** - Mobile push notifications via FCM

## 🎯 Usage

### For Administrators
1. **Asset Management** - Add, edit, and track all organization assets
2. **Request Approval** - Review and approve/deny user requests
3. **User Management** - Manage user accounts and permissions
4. **Analytics** - Monitor usage patterns and generate reports
5. **System Configuration** - Customize settings and branding

### For Users
1. **Browse Assets** - View available equipment and resources
2. **Make Requests** - Request assets with reason and priority
3. **Track History** - View personal request and usage history
4. **Receive Notifications** - Get updates on request status
5. **Manage Profile** - Update personal information and preferences

## 🚨 Support & Troubleshooting

### Common Issues

**Database Connection**
- Verify Supabase URL and keys in environment variables
- Check network connectivity to Supabase

**Email Notifications**
- Confirm SMTP settings are correct
- Test email credentials separately

**Push Notifications**
- Ensure FCM server key is valid
- Check browser permissions for notifications

### Development Tools
```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Testing
npm run test

# Database utilities
npm run realtime:check      # Check real-time connections
npm run add-timestamps      # Add timestamp columns
```

## 📄 License

This project is proprietary software owned by Eden Oasis.

## 🤝 Contributing

This is a private project for Eden Oasis. For internal development:

1. Create feature branches from `main`
2. Follow TypeScript and ESLint guidelines
3. Test thoroughly before submitting PRs
4. Update documentation as needed

## 📞 Contact

**Eden Oasis Development Team**
- Internal Support: [Insert Internal Contact]
- Technical Issues: [Insert Technical Contact]

---

**Nest by Eden Oasis** - *Streamlining asset management for modern organizations*
