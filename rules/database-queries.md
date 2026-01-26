# Database Query Best Practices

## Project Database Information
- **Project Name**: Nestbyeden
- **Project ID**: `lkgxzrvcozfxydpmbtqq`
- **Region**: eu-central-1
- **Database Type**: PostgreSQL (Supabase)

## Current Database Schema (as of 2026-01-26)

### Tables (16 total)
All tables have Row Level Security (RLS) enabled ✅

1. **announcements** - System announcements
2. **app_settings** - Application settings
3. **car_assignment** - Car assignments to users
4. **car_bookings** - Car booking records
5. **car_timeblocks** - Car availability time blocks
6. **cars** - Car inventory
7. **checkins** - User check-in records
8. **gear_maintenance** - Gear maintenance records
9. **gear_request_gears** - Junction table for gear requests
10. **gear_requests** - Gear request records
11. **gear_states** - Gear state tracking
12. **gears** - Gear inventory
13. **notifications** - User notifications
14. **profiles** - User profiles
15. **read_announcements** - Announcement read tracking
16. **user_push_tokens** - Push notification tokens

### Views (5 total)
1. **gear_maintenance_summary** - Summary of gear maintenance
2. **user_activity_summary** - User activity aggregation
3. **v_gears_with_state** - Gears with current state
4. **v_request_audit_events** - Request audit trail
5. **weekly_request_trends** - Weekly request analytics

---

## 🔧 Best Practices for Database Queries

### ⚠️ IMPORTANT: Always Use Direct SQL for Table Listings

**Problem**: The `list_tables` MCP tool may return cached or incomplete results.

**Solution**: Always use direct SQL queries via `execute_sql` for accurate table listings.

### Option 1: List All Tables (Most Reliable)
```sql
SELECT 
    tablename as table_name,
    schemaname as schema
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Option 2: Get Complete Table Information
```sql
SELECT 
    table_name,
    table_type,
    CASE 
        WHEN table_type = 'BASE TABLE' THEN (
            SELECT COUNT(*) 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = t.table_name
        )
        ELSE NULL
    END as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_type, table_name;
```

### Option 3: Verify with Multiple Methods
When querying database structure, cross-check results by:
1. Using `execute_sql` with direct SQL queries (PRIMARY METHOD)
2. Using `list_tables` MCP tool (SECONDARY - for comparison only)
3. Checking the Supabase dashboard if discrepancies occur

---

## 📋 Quick Reference Commands

### List all tables
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

### List all views
```sql
SELECT table_name FROM information_schema.views WHERE table_schema = 'public' ORDER BY table_name;
```

### Get table row counts
```sql
SELECT 
    schemaname,
    tablename,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Check RLS status
```sql
SELECT 
    schemaname as schema,
    tablename as table_name,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## 🎯 When to Use Each Method

| Task | Method | Tool |
|------|--------|------|
| List tables | Direct SQL | `execute_sql` |
| Get table schema | Direct SQL | `execute_sql` |
| Query data | Direct SQL | `execute_sql` |
| Apply migrations | Migration | `apply_migration` |
| Generate types | MCP Tool | `generate_typescript_types` |
| Check advisors | MCP Tool | `get_advisors` |

---

## ✅ Database Health Checklist
- ✅ 16 tables (all with RLS enabled)
- ✅ 5 views for analytics/reporting
- ✅ Proper relationships and foreign keys
- ✅ All tables are accessible
- ✅ PostgreSQL 15.8.1

---

**Last Updated**: 2026-01-26  
**Maintained By**: AI Assistant (Antigravity)
