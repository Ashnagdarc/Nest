# Source Code Documentation
## Nest - Asset & Equipment Management System

**Document Version:** 1.0  
**Last Updated:** October 16, 2025  
**Author:** Daniel Chinonso Samuel  
**Repository:** https://github.com/Ashnagdarc/Nest

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Core Technologies](#core-technologies)
3. [Code Organization](#code-organization)
4. [Key Components](#key-components)
5. [API Routes](#api-routes)
6. [Database Layer](#database-layer)
7. [State Management](#state-management)
8. [Hooks & Utilities](#hooks--utilities)
9. [Styling & Theming](#styling--theming)
10. [Code Standards](#code-standards)

---

## Project Structure

### Directory Overview

```
nest/
├── public/                      # Static assets
│   ├── Favicon/                 # Favicon files
│   ├── icons/                   # PWA icons
│   ├── images/                  # Image assets
│   ├── Logo/                    # Brand logos
│   ├── animations/              # Lottie animations
│   └── sounds/                  # Audio files
│
├── src/                         # Source code
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/              # Authentication routes group
│   │   │   ├── login/           # Login page
│   │   │   └── signup/          # Signup page
│   │   ├── admin/               # Admin routes
│   │   │   ├── dashboard/       # Admin dashboard
│   │   │   ├── manage-gears/    # Equipment management
│   │   │   ├── manage-requests/ # Request management
│   │   │   ├── manage-users/    # User management
│   │   │   ├── reports/         # Reports & analytics
│   │   │   └── settings/        # Admin settings
│   │   ├── user/                # User routes
│   │   │   ├── dashboard/       # User dashboard
│   │   │   ├── browse/          # Browse equipment
│   │   │   ├── request/         # Request equipment
│   │   │   ├── my-requests/     # View requests
│   │   │   ├── check-in/        # Check-in/out
│   │   │   └── history/         # Activity history
│   │   ├── api/                 # API route handlers
│   │   │   ├── auth/            # Authentication endpoints
│   │   │   ├── gears/           # Equipment endpoints
│   │   │   ├── requests/        # Request endpoints
│   │   │   ├── notifications/   # Notification endpoints
│   │   │   ├── dashboard/       # Dashboard endpoints
│   │   │   └── reports/         # Report endpoints
│   │   ├── layout.tsx           # Root layout component
│   │   ├── page.tsx             # Landing page
│   │   └── globals.css          # Global styles
│   │
│   ├── components/              # React components
│   │   ├── admin/               # Admin-specific components
│   │   ├── user/                # User-specific components
│   │   ├── dashboard/           # Dashboard widgets
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── navigation/          # Navigation components
│   │   ├── auth/                # Authentication components
│   │   ├── notifications/       # Notification components
│   │   ├── providers/           # Context providers
│   │   └── foundation/          # Base components
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── dashboard/           # Dashboard hooks
│   │   ├── requests/            # Request hooks
│   │   ├── inventory/           # Inventory hooks
│   │   ├── check-in/            # Check-in hooks
│   │   └── user-dashboard/      # User dashboard hooks
│   │
│   ├── lib/                     # Utility libraries
│   │   ├── supabase/            # Supabase clients
│   │   │   ├── client.ts        # Browser client
│   │   │   └── server.ts        # Server client
│   │   ├── api/                 # API utilities
│   │   │   ├── queries.ts       # Query functions
│   │   │   └── mutations.ts     # Mutation functions
│   │   ├── utils/               # Helper utilities
│   │   ├── performance/         # Performance utilities
│   │   ├── analytics.ts         # Analytics tracking
│   │   ├── email.ts             # Email utilities
│   │   ├── logger.ts            # Logging utilities
│   │   └── utils.ts             # General utilities
│   │
│   ├── services/                # Business logic services
│   │   ├── notification.ts      # Notification service
│   │   ├── announcement-service.ts # Announcement service
│   │   └── car-bookings.ts      # Car booking service
│   │
│   ├── types/                   # TypeScript types
│   │   ├── supabase.ts          # Database types
│   │   ├── dashboard.ts         # Dashboard types
│   │   ├── notifications.ts     # Notification types
│   │   └── api.ts               # API types
│   │
│   ├── utils/                   # Utility functions
│   │   ├── googleChat.ts        # Google Chat integration
│   │   ├── logger.ts            # Logger utility
│   │   └── responsive.ts        # Responsive utilities
│   │
│   └── middleware.ts            # Next.js middleware
│
├── supabase/                    # Supabase configuration
│   ├── migrations/              # Database migrations
│   ├── functions/               # Edge functions
│   └── config.toml              # Supabase config
│
├── .env.local                   # Environment variables
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── tailwind.config.ts           # Tailwind config
├── next.config.mjs              # Next.js config
└── README.md                    # Project documentation
```

---

## Core Technologies

### Framework & Language

**Next.js 15 (App Router)**
- Server Components by default
- Streaming and Suspense
- Server Actions
- Route Groups
- Parallel Routes
- Intercepting Routes

**TypeScript 5**
- Strict type checking
- Type inference
- Interface definitions
- Generic types
- Type guards

---

### Key Libraries

```json
{
  "dependencies": {
    "next": "^15.3.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.50.0",
    "tailwindcss": "^3.4.1",
    "@radix-ui/react-*": "Various",
    "framer-motion": "^11.3.12",
    "zod": "^3.24.2",
    "react-hook-form": "^7.54.2",
    "recharts": "^2.15.3",
    "date-fns": "^3.6.0"
  }
}
```

---

## Code Organization

### File Naming Conventions

**Components:**
```
PascalCase.tsx        // Components
camelCase.ts          // Utilities
kebab-case.css        // Stylesheets
[dynamic].tsx         // Dynamic routes
(group)/              // Route groups
_private/             // Private folders
```

**Examples:**
- `UserDashboard.tsx` - Component
- `use-dashboard-data.ts` - Hook
- `api-client.ts` - Utility
- `[id]/page.tsx` - Dynamic route

---

### Component Structure

**Standard Component Template:**

```typescript
/**
 * Component Name
 * 
 * Brief description of what this component does.
 * 
 * @component
 * @param {ComponentProps} props - Component properties
 * @returns {JSX.Element} Rendered component
 * 
 * @example
 * ```tsx
 * <ComponentName prop1="value" prop2={123} />
 * ```
 */

import { useState, useEffect } from 'react';
import type { ComponentProps } from './types';

// ========== TYPES ==========
interface ComponentProps {
  prop1: string;
  prop2?: number;
  onAction?: () => void;
}

// ========== COMPONENT ==========
export default function ComponentName({ 
  prop1, 
  prop2 = 0, 
  onAction 
}: ComponentProps) {
  // ===== STATE =====
  const [state, setState] = useState<string>('');

  // ===== EFFECTS =====
  useEffect(() => {
    // Effect logic
  }, []);

  // ===== HANDLERS =====
  const handleAction = () => {
    // Handler logic
  };

  // ===== RENDER =====
  return (
    <div className="component-container">
      {/* Component JSX */}
    </div>
  );
}
```

---

### Module Organization

**API Route Template:**

```typescript
/**
 * API Route: [Route Name]
 * 
 * Description of what this endpoint does.
 * 
 * @route GET/POST/PUT/DELETE /api/path
 * @access Public/Private/Admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ResponseType } from '@/types/api';

// ========== GET HANDLER ==========
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { data: null, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Business logic
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message },
        { status: 500 }
      );
    }

    // Success response
    return NextResponse.json({ data, error: null });

  } catch (error) {
    console.error('[API Error]:', error);
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ========== POST HANDLER ==========
export async function POST(request: NextRequest) {
  // Similar structure
}
```

---

## Key Components

### 1. Authentication Components

**Location:** `src/components/auth/`

**AuthCard.tsx**
```typescript
/**
 * Reusable authentication card wrapper
 * Provides consistent styling for login/signup forms
 */
interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}
```

**PasswordField.tsx**
```typescript
/**
 * Password input with show/hide toggle
 * Includes validation indicators
 */
interface PasswordFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  error?: string;
}
```

---

### 2. Dashboard Components

**Location:** `src/components/dashboard/`

**DashboardStats.tsx**
```typescript
/**
 * Dashboard statistics cards
 * Displays key metrics with icons and trends
 * 
 * Features:
 * - Real-time data updates
 * - Loading skeletons
 * - Error states
 * - Responsive grid layout
 */
interface DashboardStatsProps {
  stats: DashboardStats;
  loading?: boolean;
}

interface DashboardStats {
  totalEquipment: number;
  availableEquipment: number;
  checkedOutEquipment: number;
  pendingRequests: number;
  utilization: number;
}
```

**PopularGearWidget.tsx**
```typescript
/**
 * Displays most requested equipment
 * Sorted by request count
 * 
 * Features:
 * - Top 10 equipment
 * - Request count badges
 * - Quick request links
 */
interface PopularGearProps {
  gears: PopularGear[];
  onRequestClick?: (gearId: string) => void;
}
```

---

### 3. Admin Components

**Location:** `src/components/admin/`

**AddGearForm.tsx**
```typescript
/**
 * Admin form to add new equipment
 * 
 * Features:
 * - Form validation with Zod
 * - Image upload
 * - Category selection
 * - Quantity management
 * - Real-time validation feedback
 */
interface AddGearFormProps {
  onSuccess?: (gear: Gear) => void;
  onCancel?: () => void;
}
```

**RequestsManagement.tsx**
```typescript
/**
 * Admin interface for managing requests
 * 
 * Features:
 * - List all requests with filters
 * - Approve/reject actions
 * - Bulk operations
 * - Request details modal
 * - Status indicators
 */
interface RequestsManagementProps {
  initialRequests?: GearRequest[];
}
```

---

### 4. UI Components (shadcn/ui)

**Location:** `src/components/ui/`

All UI components follow the shadcn/ui pattern:
- Built on Radix UI primitives
- Fully accessible (ARIA compliant)
- Customizable with Tailwind
- Type-safe with TypeScript

**Key Components:**
- `Button` - Interactive button with variants
- `Card` - Content container
- `Dialog` - Modal dialog
- `Dropdown` - Menu dropdown
- `Form` - Form wrapper with validation
- `Input` - Text input field
- `Select` - Dropdown select
- `Table` - Data table
- `Toast` - Notification toast

---

## API Routes

### Route Organization

**Authentication Routes:** `/api/auth/`
- `signup/route.ts` - User registration
- `login/route.ts` - User login
- `user/route.ts` - Get current user
- `logout/route.ts` - Sign out

**Equipment Routes:** `/api/gears/`
- `route.ts` - GET (list), POST (create)
- `[id]/route.ts` - GET (details), PUT (update), DELETE
- `available/route.ts` - GET available equipment
- `popular/route.ts` - GET popular equipment
- `import/route.ts` - POST CSV import
- `export/route.ts` - GET CSV export

**Request Routes:** `/api/requests/`
- `route.ts` - GET (list), POST (create)
- `[id]/route.ts` - GET, PUT, DELETE
- `approve/route.ts` - POST approve request
- `reject/route.ts` - POST reject request
- `user/route.ts` - GET user's requests
- `add-lines/route.ts` - POST add items to request

**Notification Routes:** `/api/notifications/`
- `route.ts` - GET (list), POST (create)
- `[id]/route.ts` - GET, PUT (mark read), DELETE
- `unread/route.ts` - GET unread count

**Dashboard Routes:** `/api/dashboard/`
- `unified/route.ts` - GET comprehensive dashboard data
- `stats/route.ts` - GET statistics only
- `activities/route.ts` - GET recent activities

---

### API Response Pattern

```typescript
// Success Response Type
interface ApiSuccessResponse<T> {
  data: T;
  error: null;
}

// Error Response Type
interface ApiErrorResponse {
  data: null;
  error: {
    message: string;
    code: string;
    details?: Record<string, unknown>;
  };
}

// Combined Response Type
type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Usage Example
export async function GET(request: NextRequest) {
  try {
    const data = await fetchData();
    return NextResponse.json({ data, error: null });
  } catch (error) {
    return NextResponse.json({
      data: null,
      error: {
        message: error.message,
        code: 'FETCH_ERROR'
      }
    }, { status: 500 });
  }
}
```

---

## Database Layer

### Supabase Client

**Browser Client:** `src/lib/supabase/client.ts`

```typescript
/**
 * Browser-side Supabase client
 * Singleton pattern for efficiency
 * Handles authentication state
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

let supabaseInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (supabaseInstance) return supabaseInstance;

  supabaseInstance = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return supabaseInstance;
}
```

**Server Client:** `src/lib/supabase/server.ts`

```typescript
/**
 * Server-side Supabase client
 * Cookie-based authentication
 * Used in API routes and Server Components
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}
```

---

### Database Types

**Generated Types:** `src/types/supabase.ts`

```typescript
/**
 * Auto-generated from Supabase schema
 * Command: supabase gen types typescript --local > src/types/supabase.ts
 */

export interface Database {
  public: {
    Tables: {
      gears: {
        Row: {
          id: string;
          name: string;
          category: string;
          // ... other fields
        };
        Insert: {
          // Insert types
        };
        Update: {
          // Update types
        };
      };
      // ... other tables
    };
    Views: {
      // View types
    };
    Functions: {
      // Function types
    };
  };
}

// Helper types
export type Gear = Database['public']['Tables']['gears']['Row'];
export type GearInsert = Database['public']['Tables']['gears']['Insert'];
export type GearUpdate = Database['public']['Tables']['gears']['Update'];
```

---

### Query Patterns

**Location:** `src/lib/api/queries.ts`

```typescript
/**
 * Reusable database query functions
 * Centralized data access layer
 */

import { createClient } from '@/lib/supabase/client';
import type { Gear, GearRequest } from '@/types/supabase';

// ========== GEAR QUERIES ==========
export const gearQueries = {
  /**
   * Get all equipment with optional filters
   */
  async getAll(filters?: {
    category?: string;
    status?: string;
    search?: string;
  }) {
    const supabase = createClient();
    let query = supabase
      .from('gears')
      .select('*, gear_states(*)');

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    return { data, error };
  },

  /**
   * Get equipment by ID
   */
  async getById(id: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('gears')
      .select('*, gear_states(*)')
      .eq('id', id)
      .single();

    return { data, error };
  },

  /**
   * Get available equipment only
   */
  async getAvailable() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('gears')
      .select('*, gear_states!inner(*)')
      .gt('gear_states.available_quantity', 0);

    return { data, error };
  }
};

// ========== REQUEST QUERIES ==========
export const requestQueries = {
  /**
   * Get user's requests
   */
  async getUserRequests(userId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('gear_requests')
      .select(`
        *,
        gear_request_gears(
          *,
          gears(id, name, image_url)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return { data, error };
  }
};
```

---

## State Management

### Context Providers

**Dashboard Context:** `src/components/admin/DashboardProvider.tsx`

```typescript
/**
 * Dashboard data context
 * Provides global dashboard state
 * Handles real-time subscriptions
 */

interface DashboardContextType {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/unified');
      const result = await response.json();
      
      if (result.error) throw new Error(result.error);
      
      setData(result.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Setup real-time subscription
  useEffect(() => {
    fetchData();

    const supabase = createClient();
    const channel = supabase
      .channel('dashboard_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'gears' },
        () => fetchData()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'gear_requests' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <DashboardContext.Provider value={{ data, loading, error, refetch: fetchData }}>
      {children}
    </DashboardContext.Provider>
  );
}

// Hook to use dashboard context
export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
}
```

---

## Hooks & Utilities

### Custom Hooks

**Dashboard Hook:** `src/hooks/dashboard/use-unified-dashboard.ts`

```typescript
/**
 * Unified dashboard data hook
 * Fetches and manages dashboard state
 * 
 * @returns {Object} Dashboard data, loading state, error
 */

import { useState, useEffect } from 'react';
import type { DashboardData } from '@/types/dashboard';

export function useUnifiedDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await fetch('/api/dashboard/unified');
        const result = await response.json();
        
        if (result.error) throw new Error(result.error);
        
        setData(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  return { data, loading, error };
}
```

**Toast Hook:** `src/hooks/use-toast.ts`

```typescript
/**
 * Toast notification hook
 * Manages toast state and display
 * 
 * @returns {Object} toast function and toast list
 */

import { useState } from 'react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning';
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (toastData: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toastData, id };
    
    setToasts(prev => [...prev, newToast]);

    // Auto-dismiss after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, toastData.duration || 5000);
  };

  return { toast, toasts };
}
```

---

### Utility Functions

**Location:** `src/lib/utils.ts`

```typescript
/**
 * Utility functions
 * General-purpose helpers
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes safely
 * Handles conflicts and precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date to relative time
 * @param date - Date to format
 * @returns Relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

/**
 * Debounce function calls
 * Delays execution until after wait time
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Generate avatar URL from name
 * Uses DiceBear API
 */
export function generateAvatarUrl(name: string): string {
  const seed = name.toLowerCase().replace(/\s/g, '');
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`;
}
```

---

## Styling & Theming

### Tailwind Configuration

**Location:** `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ... more colors
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        // ... more animations
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        // ... more animations
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

---

### CSS Variables

**Location:** `src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    /* ... more variables */
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... dark mode variables */
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

---

## Code Standards

### TypeScript Standards

**Naming Conventions:**
- Components: `PascalCase`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Types/Interfaces: `PascalCase`
- Private variables: `_prefixedCamelCase` (rare)

**Type Safety:**
```typescript
// ✅ Good: Explicit types
function processGear(gear: Gear): ProcessedGear {
  return {
    ...gear,
    status: gear.status.toUpperCase()
  };
}

// ❌ Bad: Implicit any
function processGear(gear) {
  return { ...gear };
}

// ✅ Good: Type guards
function isGear(obj: unknown): obj is Gear {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj
  );
}
```

---

### Component Standards

**Composition over Inheritance:**
```typescript
// ✅ Good: Composition
function GearCard({ gear }: { gear: Gear }) {
  return (
    <Card>
      <CardHeader>
        <GearImage src={gear.image_url} />
        <GearTitle>{gear.name}</GearTitle>
      </CardHeader>
      <CardContent>
        <GearDetails gear={gear} />
      </CardContent>
    </Card>
  );
}

// ❌ Bad: Large monolithic component
```

---

### Error Handling Standards

```typescript
// ✅ Good: Try-catch with logging
try {
  const result = await dangerousOperation();
  return { data: result, error: null };
} catch (error) {
  console.error('[Operation Failed]:', error);
  logError(error, 'dangerousOperation');
  return { 
    data: null, 
    error: error instanceof Error ? error.message : 'Unknown error' 
  };
}

// ✅ Good: Error boundaries
<ErrorBoundary fallback={<ErrorFallback />}>
  <DashboardContent />
</ErrorBoundary>
```

---

### Performance Standards

**Memoization:**
```typescript
// ✅ Good: Memoize expensive calculations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// ✅ Good: Memoize callbacks
const handleClick = useCallback(() => {
  performAction(id);
}, [id]);
```

**Lazy Loading:**
```typescript
// ✅ Good: Code splitting
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// ✅ Good: Dynamic imports
const loadModule = async () => {
  const module = await import('./module');
  return module.default;
};
```

---

## Document Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Oct 16, 2025 | Daniel Chinonso Samuel | Initial source code documentation |

---

**For Developer Support:**

- GitHub: https://github.com/Ashnagdarc/Nest
- Issues: https://github.com/Ashnagdarc/Nest/issues
- Discussions: https://github.com/Ashnagdarc/Nest/discussions
