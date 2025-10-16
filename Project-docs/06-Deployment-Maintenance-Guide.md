# Deployment, Maintenance & Support Guide
## Nest - Asset & Equipment Management System

**Document Version:** 1.0  
**Last Updated:** October 16, 2025  
**Author:** Daniel Chinonso Samuel  
**Repository:** https://github.com/Ashnagdarc/Nest

---

## Table of Contents

1. [Deployment Guide](#deployment-guide)
2. [Environment Configuration](#environment-configuration)
3. [Build Process](#build-process)
4. [Monitoring & Logging](#monitoring--logging)
5. [Maintenance Procedures](#maintenance-procedures)
6. [Backup & Recovery](#backup--recovery)
7. [Performance Tuning](#performance-tuning)
8. [Security Maintenance](#security-maintenance)
9. [Support Procedures](#support-procedures)
10. [Troubleshooting](#troubleshooting)

---

## Deployment Guide

### Prerequisites

**Required Tools:**
- Node.js 18.17 or later
- npm, yarn, or pnpm package manager
- Git version control
- Supabase CLI (optional for local development)
- Vercel CLI (optional for deployment)

**Required Accounts:**
- Vercel account (for hosting)
- Supabase account (for database)
- GitHub account (for CI/CD)

---

### Initial Setup

#### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/Ashnagdarc/Nest.git
cd Nest

# Install dependencies
npm install
# or
yarn install
# or
pnpm install
```

---

#### 2. Configure Environment Variables

Create `.env.local` file in project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:9002

# Optional: Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your-analytics-id

# Optional: Google Chat Webhook
GOOGLE_CHAT_WEBHOOK_URL=your-webhook-url
```

**Environment Variable Sources:**
- Supabase: Get from Supabase Dashboard → Project Settings → API
- Service Role Key: Supabase Dashboard → Project Settings → API → service_role
- Analytics: Vercel Dashboard → Analytics

---

#### 3. Setup Supabase Database

**Option A: Using Supabase CLI**

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push all migrations
supabase db push

# Generate TypeScript types
supabase gen types typescript --local > src/types/supabase.ts
```

**Option B: Manual Setup**

1. Go to Supabase Dashboard → SQL Editor
2. Run all migration files from `supabase/migrations/` in order
3. Verify tables were created in Table Editor

---

#### 4. Local Development

```bash
# Start development server
npm run dev

# Server will start on http://localhost:9002
```

**Development Scripts:**
```json
{
  "dev": "next dev --port 9002 --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "jest",
  "test:watch": "jest --watch"
}
```

---

### Production Deployment

#### Vercel Deployment (Recommended)

**Step 1: Connect Repository**

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Select the repository: `Ashnagdarc/Nest`

**Step 2: Configure Build Settings**

```yaml
Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: npm install
Development Command: npm run dev
```

**Step 3: Add Environment Variables**

In Vercel Dashboard → Project Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Step 4: Deploy**

```bash
# Using Vercel CLI
npm install -g vercel
vercel login
vercel

# Or push to main branch (auto-deploys)
git push origin main
```

---

#### Manual Deployment

**Build for Production:**

```bash
# Build the application
npm run build

# Test production build locally
npm run start

# Application runs on http://localhost:3000
```

**Deploy to Server:**

```bash
# Using PM2 process manager
npm install -g pm2

# Start application
pm2 start npm --name "nest" -- start

# Save PM2 configuration
pm2 save

# Setup auto-start on system boot
pm2 startup
```

---

### Continuous Integration/Deployment

#### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Environment Configuration

### Environment Types

| Environment | URL | Branch | Database | Purpose |
|-------------|-----|--------|----------|---------|
| Development | `localhost:9002` | `*` | Local/Dev | Local development |
| Staging | `staging.nest.app` | `staging` | Staging DB | Pre-production testing |
| Production | `nest.app` | `main` | Production DB | Live application |

---

### Configuration Files

#### Next.js Config: `next.config.mjs`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'your-project.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:9002', 'nest.app'],
    },
  },
  // Enable PWA
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

#### Vercel Config: `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ]
}
```

---

## Build Process

### Build Steps

```bash
# 1. Clean previous builds
rm -rf .next

# 2. Install dependencies (if needed)
npm ci

# 3. Generate types from Supabase (optional)
supabase gen types typescript --project-id your-project-id > src/types/supabase.ts

# 4. Run linting
npm run lint

# 5. Run tests
npm test

# 6. Build application
npm run build

# 7. Verify build
npm run start
```

---

### Build Optimization

**Environment-Specific Builds:**

```bash
# Development build (fast, unoptimized)
NODE_ENV=development npm run build

# Production build (optimized, minified)
NODE_ENV=production npm run build
```

**Build Performance Tips:**

1. **Use Turbopack** (Next.js 15 feature)
   ```json
   {
     "dev": "next dev --turbopack"
   }
   ```

2. **Optimize Images**
   - Use Next.js Image component
   - Configure image domains in next.config.mjs

3. **Code Splitting**
   - Use dynamic imports for large components
   - Lazy load routes

4. **Bundle Analysis**
   ```bash
   npm install --save-dev @next/bundle-analyzer
   ```

---

## Monitoring & Logging

### Vercel Analytics

**Setup:**

1. Install Vercel Analytics:
   ```bash
   npm install @vercel/analytics
   ```

2. Add to root layout (`src/app/layout.tsx`):
   ```typescript
   import { Analytics } from '@vercel/analytics/react';
   
   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           {children}
           <Analytics />
         </body>
       </html>
     );
   }
   ```

**Metrics Tracked:**
- Page views
- User sessions
- Performance metrics (Core Web Vitals)
- API response times
- Error rates

---

### Application Logging

**Logger Utility:** `src/lib/logger.ts`

```typescript
export const logger = {
  info: (message: string, meta?: object) => {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`, meta);
  },
  
  error: (message: string, error?: Error, meta?: object) => {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, {
      error: error?.message,
      stack: error?.stack,
      ...meta
    });
  },
  
  warn: (message: string, meta?: object) => {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, meta);
  },
  
  debug: (message: string, meta?: object) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()}: ${message}`, meta);
    }
  }
};
```

**Usage in API Routes:**

```typescript
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    logger.info('Fetching dashboard data', { userId: user.id });
    
    // ... logic
    
    logger.info('Dashboard data fetched successfully', { 
      userId: user.id, 
      itemCount: data.length 
    });
    
    return NextResponse.json({ data });
  } catch (error) {
    logger.error('Failed to fetch dashboard data', error, { 
      userId: user?.id 
    });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

---

### Supabase Monitoring

**Access Logs:**

1. Go to Supabase Dashboard
2. Navigate to "Logs" section
3. View different log types:
   - API logs
   - Database logs
   - Auth logs
   - Storage logs
   - Realtime logs

**Set Up Alerts:**

1. Go to Supabase Dashboard → Settings → Alerts
2. Configure alerts for:
   - High database CPU usage (>80%)
   - High connection count
   - Slow queries (>1s)
   - Auth failures

---

### Error Tracking

**Sentry Integration (Optional):**

```bash
npm install @sentry/nextjs
```

**Configure Sentry:** `sentry.client.config.ts`

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
});
```

---

## Maintenance Procedures

### Regular Maintenance Tasks

| Task | Frequency | Description |
|------|-----------|-------------|
| Dependency Updates | Weekly | Update npm packages |
| Database Backups | Daily | Automated backups |
| Security Patches | As needed | Apply security updates |
| Performance Review | Monthly | Analyze metrics |
| Log Review | Daily | Check error logs |
| Database Optimization | Monthly | Analyze and optimize queries |
| Image Cleanup | Monthly | Remove unused images |
| User Cleanup | Quarterly | Archive inactive users |

---

### Dependency Management

**Check for Updates:**

```bash
# Check outdated packages
npm outdated

# Update all packages (with care)
npm update

# Update specific package
npm update package-name
```

**Update Next.js:**

```bash
# Check current version
npm list next

# Update to latest
npm install next@latest react@latest react-dom@latest

# Test thoroughly after update
npm run build
npm test
```

**Update Supabase:**

```bash
# Update Supabase client
npm update @supabase/supabase-js @supabase/ssr

# Regenerate types
supabase gen types typescript --project-id your-project > src/types/supabase.ts
```

---

### Database Maintenance

**Run Database Migrations:**

```bash
# Create new migration
supabase migration new migration_name

# Apply migrations
supabase db push

# Reset database (DANGER: Development only!)
supabase db reset
```

**Optimize Database:**

```sql
-- Analyze table statistics
ANALYZE gears;
ANALYZE gear_requests;

-- Reindex tables
REINDEX TABLE gears;

-- Vacuum to reclaim space
VACUUM ANALYZE;
```

**Check Slow Queries:**

```sql
-- Enable query tracking
ALTER SYSTEM SET track_activities = on;
ALTER SYSTEM SET track_counts = on;

-- View slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

### Storage Management

**Supabase Storage Cleanup:**

```typescript
// Script to clean up orphaned images
import { createClient } from '@supabase/supabase-js';

async function cleanupOrphanedImages() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get all image URLs from database
  const { data: gears } = await supabase
    .from('gears')
    .select('image_url');

  const usedImages = gears?.map(g => g.image_url) || [];

  // List all images in storage
  const { data: files } = await supabase
    .storage
    .from('gear-images')
    .list();

  // Find orphaned images
  const orphaned = files?.filter(f => 
    !usedImages.some(url => url.includes(f.name))
  ) || [];

  // Delete orphaned images
  for (const file of orphaned) {
    await supabase
      .storage
      .from('gear-images')
      .remove([file.name]);
    
    console.log(`Deleted orphaned image: ${file.name}`);
  }
}
```

---

## Backup & Recovery

### Database Backups

**Automated Backups (Supabase):**

Supabase automatically creates daily backups:
- Retained for 7 days (Free tier)
- Retained for 30 days (Pro tier)
- Point-in-time recovery available (Pro tier)

**Manual Backup:**

```bash
# Using Supabase CLI
supabase db dump -f backup.sql

# Compress backup
gzip backup.sql

# Store securely (e.g., AWS S3, Google Cloud Storage)
aws s3 cp backup.sql.gz s3://your-backup-bucket/nest-backup-$(date +%Y%m%d).sql.gz
```

---

### Restore from Backup

**Restore Database:**

```bash
# Decompress backup
gunzip backup.sql.gz

# Restore using psql
psql -h db.your-project.supabase.co \
     -U postgres \
     -d postgres \
     -f backup.sql

# Or using Supabase CLI
supabase db restore backup.sql
```

**Restore Specific Table:**

```sql
-- Export specific table
COPY gears TO '/path/to/gears_backup.csv' CSV HEADER;

-- Import specific table
COPY gears FROM '/path/to/gears_backup.csv' CSV HEADER;
```

---

### Disaster Recovery Plan

**Recovery Time Objective (RTO):** 4 hours  
**Recovery Point Objective (RPO):** 24 hours

**Recovery Steps:**

1. **Assess Damage**
   - Determine scope of data loss
   - Identify last known good state

2. **Restore Database**
   - Restore from most recent backup
   - Apply transaction logs if available

3. **Restore Application**
   - Redeploy from git main branch
   - Verify environment variables

4. **Verify Data Integrity**
   - Run data consistency checks
   - Verify critical workflows

5. **Notify Users**
   - Send status updates
   - Provide ETA for full recovery

---

## Performance Tuning

### Database Performance

**Add Indexes:**

```sql
-- Index frequently queried columns
CREATE INDEX idx_gears_category ON gears(category);
CREATE INDEX idx_gears_status ON gear_states(status);
CREATE INDEX idx_requests_user ON gear_requests(user_id);
CREATE INDEX idx_requests_status ON gear_requests(status);

-- Composite indexes for complex queries
CREATE INDEX idx_gears_category_status ON gears(category, created_at DESC);
```

**Query Optimization:**

```sql
-- Use EXPLAIN ANALYZE to identify slow queries
EXPLAIN ANALYZE
SELECT g.*, gs.available_quantity
FROM gears g
JOIN gear_states gs ON g.id = gs.gear_id
WHERE g.category = 'Electronics'
  AND gs.available_quantity > 0;

-- Add covering index if needed
CREATE INDEX idx_gears_cover ON gears(category) INCLUDE (name, image_url);
```

---

### Application Performance

**Enable Caching:**

```typescript
// API route with caching
export async function GET(request: NextRequest) {
  const data = await fetchData();
  
  return NextResponse.json({ data }, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
    }
  });
}
```

**Optimize Images:**

```typescript
// Use Next.js Image component
import Image from 'next/image';

<Image
  src={gear.image_url}
  alt={gear.name}
  width={300}
  height={300}
  loading="lazy"
  quality={80}
/>
```

**Code Splitting:**

```typescript
// Lazy load heavy components
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Skeleton />,
  ssr: false
});
```

---

### CDN Configuration

**Vercel Edge Network:**

Automatically configured for:
- Static assets
- Images (with optimization)
- API routes (edge functions)

**Custom CDN Rules:**

```javascript
// next.config.mjs
export default {
  images: {
    loader: 'custom',
    loaderFile: './imageLoader.js',
  },
};

// imageLoader.js
export default function imageLoader({ src, width, quality }) {
  return `https://cdn.example.com/${src}?w=${width}&q=${quality || 75}`;
}
```

---

## Security Maintenance

### Security Checklist

**Monthly Tasks:**

- [ ] Review Supabase RLS policies
- [ ] Check for SQL injection vulnerabilities
- [ ] Audit API authentication
- [ ] Review user permissions
- [ ] Update dependencies with security patches
- [ ] Check for exposed secrets in code
- [ ] Review CORS configuration
- [ ] Verify HTTPS enforcement
- [ ] Check rate limiting effectiveness
- [ ] Review security headers

---

### Security Updates

**Apply Security Patches:**

```bash
# Check for vulnerabilities
npm audit

# Fix automatically (if possible)
npm audit fix

# Force fix (with potential breaking changes)
npm audit fix --force

# Review changes
git diff package.json package-lock.json
```

---

### Access Control Review

**Review Admin Users:**

```sql
-- List all admin users
SELECT id, email, full_name, role, created_at
FROM profiles
WHERE role = 'admin'
ORDER BY created_at DESC;

-- Remove admin access
UPDATE profiles
SET role = 'user'
WHERE id = 'user-id-here';
```

**Rotate API Keys:**

1. Generate new keys in Supabase Dashboard
2. Update environment variables in Vercel
3. Test application with new keys
4. Revoke old keys after 24 hours

---

## Support Procedures

### Support Tiers

| Tier | Response Time | Issue Severity | Channels |
|------|---------------|----------------|----------|
| P0 - Critical | 1 hour | System down, data loss | Phone, Email |
| P1 - High | 4 hours | Major feature broken | Email, Slack |
| P2 - Medium | 1 day | Minor feature issue | Email |
| P3 - Low | 3 days | Enhancement request | Email |

---

### User Support Workflow

**1. Issue Intake**
- User submits issue via email/form
- Log issue in tracking system
- Assign priority level

**2. Initial Triage**
- Reproduce issue
- Check logs for errors
- Identify affected users

**3. Investigation**
- Review application logs
- Check database for anomalies
- Test in staging environment

**4. Resolution**
- Apply fix
- Test thoroughly
- Deploy to production
- Verify fix with user

**5. Follow-up**
- Document issue and resolution
- Update knowledge base
- Close ticket

---

### Common Support Scenarios

**User Cannot Log In:**

1. Check if user exists in database
   ```sql
   SELECT id, email, banned_until
   FROM auth.users
   WHERE email = 'user@example.com';
   ```

2. Reset password if needed
3. Check for account lockout (banned_until)

**Equipment Not Showing:**

1. Check gear_states table
   ```sql
   SELECT * FROM gear_states
   WHERE gear_id = 'gear-id';
   ```

2. Verify RLS policies
3. Check if equipment is soft-deleted

**Request Not Approved:**

1. Check request status
2. Verify admin permissions
3. Check Google Chat webhook logs

---

## Troubleshooting

### Build Issues

**Issue: Build Fails with TypeScript Errors**

```bash
# Clear Next.js cache
rm -rf .next

# Regenerate types
supabase gen types typescript --project-id your-project > src/types/supabase.ts

# Rebuild
npm run build
```

---

**Issue: Module Not Found**

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Or use npm ci for clean install
npm ci
```

---

### Runtime Issues

**Issue: 500 Internal Server Error**

1. Check Vercel function logs
2. Review application logs
3. Verify environment variables
4. Check database connectivity

```bash
# Test database connection
psql -h db.your-project.supabase.co -U postgres -d postgres
```

---

**Issue: Slow API Responses**

1. Check Supabase query performance
2. Review database indexes
3. Check Vercel function cold starts
4. Analyze network latency

---

### Database Issues

**Issue: Connection Pool Exhausted**

```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < current_timestamp - INTERVAL '5 minutes';
```

---

**Issue: Database Slow Queries**

```sql
-- Identify slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check missing indexes
SELECT schemaname, tablename, attname
FROM pg_stats
WHERE attname NOT IN (
  SELECT a.attname
  FROM pg_index i
  JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
);
```

---

## Appendix

### Useful Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run start                  # Start production server
npm run lint                   # Run linting
npm test                       # Run tests

# Database
supabase db push               # Apply migrations
supabase db reset              # Reset database (dev only)
supabase gen types typescript  # Generate types

# Deployment
vercel                         # Deploy to Vercel
vercel --prod                  # Deploy to production
vercel logs                    # View deployment logs

# Monitoring
vercel logs --follow           # Follow logs in real-time
npm run analyze                # Analyze bundle size
```

---

### Contact Information

**Development Team:**
- Lead Developer: Daniel Chinonso Samuel
- GitHub: https://github.com/Ashnagdarc/Nest
- Issues: https://github.com/Ashnagdarc/Nest/issues

**Infrastructure:**
- Hosting: Vercel
- Database: Supabase
- Status Page: https://nest-status.vercel.app (if configured)

---

## Document Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Oct 16, 2025 | Daniel Chinonso Samuel | Initial deployment and maintenance guide |

---

**Next Review Date:** January 16, 2026
