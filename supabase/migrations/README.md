# Database Migrations

This directory contains SQL migrations for the Supabase database.

## Running Migrations

To apply these migrations to your Supabase database:

1. Log in to your Supabase dashboard
2. Navigate to the SQL Editor
3. Create a new query
4. Copy and paste the content of the migration file
5. Run the query

## Migration Files

- `20240725_add_duration_to_requests.sql`: Adds a `duration` column to the `requests` table to store the requested duration period.

## Schema Changes

The migrations in this directory make the following changes to the database schema:

### requests table

Added columns:
- `duration` (TEXT): Stores the requested duration for a gear request (e.g., "24hours", "1 week", etc.) 