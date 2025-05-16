# GearFlow - Equipment Rental & Management System

GearFlow is a modern web application for managing equipment rentals, inventory tracking, and reservations.

## Features

- Equipment inventory management
- Gear rental and reservation system
- User management with admin and regular user roles
- Responsive design for all device sizes
- Check-in/check-out tracking
- Calendar scheduling
- Booking history
- Administrative analytics

## Tech Stack

- **Frontend**: React, Next.js 15, TailwindCSS, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **UI Components**: Radix UI
- **State Management**: React Context API
- **Styling**: Tailwind CSS with shadcn/ui components
- **Notifications**: Web Push API by Eden Oasis

<div align="center">
  <img src="public/logo.png" alt="GearFlow Logo" width="120"/>
  <h3>Professional Equipment Management Platform</h3>
  <p>A modern, full-stack web application for managing real estate equipment and resources.</p>
</div>

---

##Table of Contents
- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [Database](#-database)
- [Authentication](#-authentication)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)
- [Project Maintenance](#-project-maintenance)
- [Realtime Updates](#-realtime-updates)

## Overview

GearFlow is a comprehensive equipment management platform designed specifically for Eden Oasis Realty. It streamlines the process of tracking, requesting, and managing company equipment through an intuitive and modern interface.

### Key Benefits
- **Centralized Management**: Single source of truth for all company equipment
- **Efficient Workflows**: Streamlined request and approval processes
- **Real-time Updates**: Instant status updates and notifications
- **Data-Driven Insights**: Analytics and usage patterns tracking
- **User-Friendly Interface**: Modern, responsive design optimized for all devices

##  Features

### Equipment Management
- **Inventory Tracking**
  - Real-time availability status
  - Detailed equipment specifications
  - Maintenance history
  - Usage analytics

### User Management
- **Role-based Access Control**
  - Admin dashboard
  - User permissions
  - Team management
  - Activity logging

### Booking System
- **Equipment Requests**
  - Easy request submission
  - Approval workflows
  - Calendar integration
  - Conflict detection

### Notifications
- **Real-time Updates**
  - Request status changes
  - Due date reminders
  - Maintenance alerts
  - System announcements

### Analytics & Reporting
- **Usage Insights**
  - Equipment utilization rates
  - Popular items tracking
  - User activity reports
  - Custom report generation

##  Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: Radix UI
- **Animations**: Framer Motion
- **State Management**: React Context + Hooks

### Backend
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **API**: Next.js API Routes
- **File Storage**: Supabase Storage

### Development Tools
- **Package Manager**: npm
- **Version Control**: Git
- **Code Quality**: ESLint, Prettier
- **Testing**: Jest, React Testing Library

## Getting Started

### Prerequisites
- Node.js (v18.17.0 or higher)
- npm (v9.0.0 or higher)
- Git

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/gear-flow.git
   cd gear-flow
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   # WARNING: Never commit the service role key or share it publicly
   SUPABASE_SERVICE_ROLE_KEY=your-service-key
   # For Supabase CLI operations
   SUPABASE_ACCESS_TOKEN=your-access-token
   ```
   
   For convenience, you can copy from our template:
   ```bash
   cp .env.local.example .env.local
   # Then edit .env.local with your actual values
   ```
   # Keep this key secure and only use it for trusted server-side operations
   SUPABASE_SERVICE_ROLE_KEY=your-service-key

   # Application Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:9002
   NEXT_PUBLIC_APP_ENV=development
   
   # Optional Features
   NEXT_PUBLIC_ENABLE_ANALYTICS=false
   NEXT_PUBLIC_MAINTENANCE_MODE=false
   ```

   ⚠️ **IMPORTANT SECURITY NOTES:**
   - NEVER commit `.env` or `.env.local` files to version control
   - NEVER share service role keys or sensitive credentials publicly
   - Add `.env*` to your `.gitignore` file
   - Use environment variables in production deployment platforms
   - Rotate compromised keys immediately
   - Consider using secret management services in production

4. **Database Setup**
   ```bash
   # Apply database migrations
   npm run db:migrate

   # Seed initial data
   npm run db:seed
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── (auth)/         # Authentication routes
│   │   ├── api/            # API routes
│   │   ├── user/           # User dashboard
│   │   └── admin/          # Admin dashboard
│   ├── components/
│   │   ├── ui/             # Reusable UI components
│   │   ├── forms/          # Form components
│   │   └── layouts/        # Layout components
│   ├── lib/
│   │   ├── supabase/       # Supabase client & utilities
│   │   ├── utils/          # Helper functions
│   │   └── constants/      # Application constants
│   ├── types/              # TypeScript definitions
│   └── styles/             # Global styles
├── public/                 # Static assets
├── supabase/
│   ├── migrations/         # Database migrations
│   └── seed/              # Seed data
├── scripts/               # Utility scripts
└── tests/                # Test files
```

## 🧪 Development

### Helper Scripts

We've created two helper scripts to streamline development:

#### Development Helper

```bash
# Start development server
./dev.sh start

# Database operations
./dev.sh db:pull    # Pull latest schema
./dev.sh db:push    # Push schema changes
./dev.sh db:reset   # Reset local database

# Migrations
./dev.sh migrate        # Run migrations
./dev.sh migrate:new    # Create new migration

# Functions
./dev.sh functions:list    # List functions
./dev.sh functions:serve   # Serve functions locally
./dev.sh functions:deploy  # Deploy functions
```

#### Supabase CLI Helper

```bash
# Run any Supabase CLI command securely
./supabase-cli.sh [command]

# Examples
./supabase-cli.sh projects list
./supabase-cli.sh db diff
```

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build production bundle
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run tests
npm run type-check   # Run TypeScript checks

# Database
npm run db:migrate   # Run database migrations
npm run db:reset     # Reset database
npm run db:seed      # Seed database

# Utilities
npm run format       # Format code with Prettier
npm run clean        # Clean build artifacts
```

### Code Quality

We maintain high code quality standards through:
- ESLint configuration
- Prettier formatting
- TypeScript strict mode
- Git hooks (husky)
- Conventional commits

## 🗃 Database

### Schema Overview
- `users`: User accounts and profiles
- `equipment`: Equipment inventory
- `requests`: Equipment booking requests
- `notifications`: System notifications
- `settings`: Application settings

### Migrations
All database changes are version controlled in `supabase/migrations/`.

##  Authentication

### User Types
1. **Admin**
   - Full system access
   - User management
   - Settings configuration

2. **Regular User**
   - Equipment browsing
   - Request submission
   - Profile management

### Security Features
- JWT authentication
- Role-based access control
- Session management
- Password policies
- Rate limiting

##  Deployment

### Production Deployment
1. Build the application
   ```bash
   npm run build
   ```

2. Start the production server
   ```bash
   npm run start
   ```

### Environment Considerations
- Set appropriate environment variables
- Configure proper security headers
- Enable error tracking
- Set up monitoring

##  Contributing

### Development Process
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

### Commit Guidelines
We follow conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Testing changes

##  Troubleshooting

### Common Issues

#### Supabase Realtime Subscription Issues

If you're experiencing issues with real-time updates not working, follow these steps:

1. **Enable Realtime for Your Tables**

   GearFlow uses Supabase Realtime for live updates. You need to explicitly enable this feature for the tables you want to monitor:

   ```bash
   # Run our realtime setup helper script
   node scripts/enable-realtime.js
   ```

   This script will guide you through enabling Realtime for the following required tables:
   - gears
   - gear_requests
   - gear_maintenance
   - gear_activity_log
   - notifications
   - profiles

2. **Verify Realtime Configuration**

   To check if your tables are properly configured for Realtime:

   ```bash
   npx tsx src/utils/supabase-realtime-checker.ts
   ```

   This utility will show which tables have Realtime enabled or disabled and provide guidance if needed.

3. **Fallback Mechanism**

   GearFlow has a built-in fallback mechanism that automatically switches to polling if Realtime subscriptions fail. You'll see a notification when this happens.

### Database Schema Issues

If you encounter errors related to incorrect column names or missing tables:

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p>Built by Daniel Samuel </p>
</div>

## 🔒 Security

### Credential Management
- Use environment variables for all sensitive credentials
- Store production secrets in secure credential management systems
- Rotate keys regularly and after any potential exposure
- Use least-privilege access principles

### Key Security
- Service role keys have full database access - keep them secure
- Only use service role keys in trusted server environments
- Use anon/public keys for client-side operations
- Monitor for and revoke compromised credentials

### Best Practices
- Enable 2FA for all admin accounts
- Regular security audits
- Monitor application logs
- Keep dependencies updated
- Follow OWASP security guidelines

## Project Maintenance

### Code Cleanup for Production

Before deploying to production or committing to GitHub, run the following scripts to clean up the codebase:

```bash
# Check for console.log statements and TODOs
node scripts/prepare-for-production.js

# Automatically replace console.log statements with proper logger calls
node scripts/cleanup-console-logs.js
```

The `prepare-for-production.js` script will identify console.log statements and TODO/FIXME comments that should be addressed before production deployment.

The `cleanup-console-logs.js` script will automatically replace console.log statements with appropriate logger calls, creating backups of modified files with a .backup extension.

### Removed Features

The web push notifications feature has been removed from the project due to compatibility issues with Vercel deployment. This included:

- Removing web-push and @types/web-push dependencies
- Deleting push-notifications.ts, notifications.ts utility files
- Removing notification service worker
- Removing notification API endpoints

The application still maintains in-app notifications through the Supabase database, but no longer supports browser push notifications.

## Enabling Realtime Updates

For optimal dashboard functionality, you should enable Realtime in your Supabase project:

1. Go to your Supabase dashboard and select your project
2. Navigate to Database → Replication
3. Find the "Realtime" section 
4. Enable Realtime for all tables that need updates:
   - gear_requests
   - gears
   - checkins
   - announcements
   - gear_maintenance
   - gear_request_gears

If Realtime is not enabled, the application will automatically fall back to polling, but real-time updates provide a better user experience.

## Realtime Updates

GearFlow uses Supabase Realtime to provide live updates to the user interface. When data changes in the database, the UI updates automatically without requiring a page refresh.

### How Realtime Works

The application implements a robust realtime update system with fallback mechanisms:

1. **Primary Method**: Supabase Realtime subscriptions for instant updates
2. **Fallback**: Automatic polling if Realtime is unavailable (every 20 minutes)
3. **Adaptive**: Detects available timestamp columns for efficient polling

### Troubleshooting Realtime

If you experience issues with realtime updates:

1. Ensure Realtime is enabled in Supabase for your tables
2. Check that tables have timestamp columns (created_at, updated_at)
3. Run diagnostic tools: `npm run realtime:check`
