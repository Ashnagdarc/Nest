# GearFlow Development Guide

## Environment Setup

### Prerequisites
- Node.js (v18+)
- npm or yarn
- Supabase CLI

### Getting Started

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd GearFlow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.local.example` to `.env.local` (if not already done)
   - Add your Supabase credentials

4. **Link to Supabase project**
   ```bash
   ./supabase-cli.sh link --project-ref lkgxzrvcozfxydpmbtqq
   ```

## Development Workflow

### Using the Development Helper Script

We've created a helper script to simplify common development tasks:

```bash
# Start development server
./dev.sh start

# Build the project
./dev.sh build

# Database commands
./dev.sh db:pull    # Pull latest database schema
./dev.sh db:push    # Push local changes to database
./dev.sh db:reset   # Reset local database

# Migration commands
./dev.sh migrate        # Run migrations
./dev.sh migrate:new    # Create new migration

# Supabase Functions
./dev.sh functions:list    # List functions
./dev.sh functions:serve   # Serve functions locally
./dev.sh functions:deploy  # Deploy functions

# Testing and linting
./dev.sh test
./dev.sh lint
```

### Working with Supabase

#### Supabase CLI

We have a helper script that securely uses your Supabase access token:

```bash
./supabase-cli.sh [command]
```

For example:
```bash
./supabase-cli.sh projects list
./supabase-cli.sh db diff
```

#### Database Migrations

When making changes to the database schema:

1. Create a new migration:
   ```bash
   ./dev.sh migrate:new my_migration_name
   ```

2. Edit the migration files in `supabase/migrations/`

3. Apply the migration:
   ```bash
   ./dev.sh migrate
   ```

#### Security Best Practices

- Never commit `.env.local` files to version control
- Use RLS (Row Level Security) policies in Supabase
- Test all access controls thoroughly
- Verify function permissions in Supabase

## CI/CD Pipeline

Our CI/CD pipeline automatically:
- Runs tests
- Lints code
- Builds the application
- Deploys to staging/production

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Support

For questions or issues, contact the development team or create an issue in the project repository.
