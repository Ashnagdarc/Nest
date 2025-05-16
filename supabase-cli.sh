#!/bin/bash
# A helper script to run Supabase CLI commands with the access token from .env.local
# Usage: ./supabase-cli.sh <command>
# Example: ./supabase-cli.sh projects list

# Load environment variables from .env.local
if [ -f .env.local ]; then
  # Only export the SUPABASE_ACCESS_TOKEN to avoid issues with other env vars
  export SUPABASE_ACCESS_TOKEN=$(grep "SUPABASE_ACCESS_TOKEN" .env.local | cut -d '=' -f2)
  
  echo "Using Supabase token from .env.local"
else
  echo "Warning: .env.local file not found"
fi

# Run Supabase CLI with the access token
supabase "$@"
