# Database Utilities

This directory contains scripts for managing and maintaining the Supabase database.

## Available Scripts

- **add-timestamp-columns.js** - Adds created_at and updated_at columns to all tables that don't have them
- **enable-realtime.js** - Assists with enabling Realtime for tables in Supabase

## Usage

Run these scripts using npm:

```bash
npm run add-timestamps
npm run realtime:setup
```

## Notes

These scripts are part of the realtime handling infrastructure that ensures the application can fall back to polling when Realtime is unavailable.
