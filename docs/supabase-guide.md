# Supabase Integration Guide

This guide covers how to work with Supabase in the GearFlow project, including database management, authentication, and using the Supabase CLI.

## Setup

### Prerequisites

- Supabase CLI installed (`which supabase` to verify)
- Supabase access token (stored in `.env.local`)

### Connection Configuration

Your Supabase connection is configured in these files:

1. `.env.local` - Environment variables for local development
2. `.vscode/mcp.json` - Model Context Protocol configuration for VS Code

## Supabase CLI Helper

We've created a helper script to securely use your Supabase access token:

```bash
./supabase-cli.sh [command]
```

Example commands:

```bash
# List Supabase projects
./supabase-cli.sh projects list

# Get database diff
./supabase-cli.sh db diff

# Link to your project
./supabase-cli.sh link --project-ref lkgxzrvcozfxydpmbtqq

# Generate migration
./supabase-cli.sh migration new my_migration_name
```

## Database Management

### Migrations

All database schema changes should be tracked in migrations.

#### Creating a Migration

```bash
./supabase-cli.sh migration new my_migration_description
```

This creates two files in `supabase/migrations/`:
- `<timestamp>_my_migration_description.up.sql` - Applied when migrating up
- `<timestamp>_my_migration_description.down.sql` - Applied when reverting

#### Applying Migrations

```bash
./supabase-cli.sh db push
```

### SQL Functions

SQL functions are stored in the `sql/functions/` directory. To deploy them:

```bash
./supabase-cli.sh functions deploy
```

## Supabase Edge Functions

Edge functions are serverless functions that run on Supabase's infrastructure.

### Working with Edge Functions

```bash
# Create a new edge function
./supabase-cli.sh functions new my-function-name

# Deploy functions
./supabase-cli.sh functions deploy

# Serve functions locally for testing
./supabase-cli.sh functions serve
```

## Security Best Practices

1. **Secure Tokens**
   - Never commit access tokens to Git
   - Rotate tokens periodically
   - Use `.env.local` for local development

2. **Row Level Security (RLS)**
   - Always use RLS policies for tables
   - Test policies thoroughly
   - Default to deny all access, then explicitly grant permissions

3. **Service Role vs. Anonymous Role**
   - Use service role only in trusted server environments
   - Use anonymous role for client-side operations
   - Keep service role key secret

## Common Supabase Operations

### Database Operations

```bash
# Pull remote schema changes to local migration files
./supabase-cli.sh db pull

# Generate a diff between local and remote schemas
./supabase-cli.sh db diff

# Push local schema changes to remote database
./supabase-cli.sh db push

# Reset local database to match schema
./supabase-cli.sh db reset
```

### Project Management

```bash
# Switch between projects
./supabase-cli.sh link --project-ref <project-ref>

# List all projects
./supabase-cli.sh projects list

# Show current project status
./supabase-cli.sh status
```

## Troubleshooting

1. **Authentication Issues**
   - Verify your access token in `.env.local`
   - Check CLI login status with `./supabase-cli.sh status`
   - Reauthenticate with `supabase login`

2. **Migration Conflicts**
   - Review changes with `./supabase-cli.sh db diff`
   - Consider resetting with `./supabase-cli.sh db reset`

3. **Permission Errors**
   - Check RLS policies
   - Verify correct role is being used

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
