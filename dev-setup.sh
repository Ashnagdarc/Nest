#!/bin/bash

# Nest by Eden Oasis development setup script
# This script provides a guided setup for your development environment.

# --- Helper Functions ---
function print_header() {
  echo "=================================================="
  echo "$1"
  echo "=================================================="
}

function print_success() {
  echo "✅ $1"
}

function print_error() {
  echo "❌ $1"
}

function prompt_for_input() {
  read -p "$1: " -r
  echo "$REPLY"
}

# --- Environment Setup ---
print_header "Setting up environment variables"

if [ -f ".env.local" ]; then
  echo "Found existing .env.local file. Skipping creation."
else
  cp .env.example .env.local
  print_success "Created .env.local from .env.example"
fi

echo "Please ensure your .env.local file is correctly configured with your Supabase credentials."
echo "You will need:"
echo "- NEXT_PUBLIC_SUPABASE_URL"
echo "- NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "- SUPABASE_SERVICE_ROLE_KEY"

# --- Dependency Installation ---
print_header "Installing dependencies"
npm install
print_success "Dependencies installed"

# --- Supabase Setup ---
print_header "Setting up Supabase"

echo "Please ensure you have the Supabase CLI installed and are logged in."
echo "You can install it with: npm install -g supabase"
echo "And log in with: supabase login"

PROJECT_REF=$(prompt_for_input "Enter your Supabase project reference ID")

if [ -z "$PROJECT_REF" ]; then
  print_error "Supabase project reference ID is required. Exiting."
  exit 1
fi

supabase link --project-ref "$PROJECT_REF"
print_success "Linked Supabase project"

echo "Resetting database and running migrations..."
supabase db reset
print_success "Database reset and migrations applied"

echo "Development environment setup complete!"
