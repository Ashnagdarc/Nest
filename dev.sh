#!/bin/bash
# GearFlow development helper script
# This script helps with common development tasks for the GearFlow project

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env.local ]; then
  # Only export the SUPABASE_ACCESS_TOKEN to avoid issues with other env vars
  export SUPABASE_ACCESS_TOKEN=$(grep "SUPABASE_ACCESS_TOKEN" .env.local | cut -d '=' -f2)
  echo -e "${GREEN}✓${NC} Environment loaded from .env.local"
else
  echo -e "${RED}⨯${NC} Warning: .env.local file not found"
fi

# Function to display help
show_help() {
  echo -e "${BLUE}GearFlow Development Helper${NC}"
  echo "Usage: ./dev.sh [command]"
  echo ""
  echo "Commands:"
  echo "  start           - Start the development server"
  echo "  build           - Build the project"
  echo "  db:pull         - Pull the latest database schema"
  echo "  db:push         - Push local schema changes to the database"
  echo "  db:reset        - Reset the local database"
  echo "  migrate         - Run database migrations"
  echo "  migrate:new     - Create a new migration file"
  echo "  functions:list  - List Supabase functions"
  echo "  functions:serve - Serve local functions for development"
  echo "  functions:deploy- Deploy functions to Supabase"
  echo "  test            - Run tests"
  echo "  lint            - Run linter"
  echo "  help            - Show this help"
}

# Main command switch
case "$1" in
  start)
    echo -e "${BLUE}Starting development server...${NC}"
    npm run dev
    ;;
  build)
    echo -e "${BLUE}Building the project...${NC}"
    npm run build
    ;;
  db:pull)
    echo -e "${BLUE}Pulling database schema...${NC}"
    ./supabase-cli.sh db pull
    ;;
  db:push)
    echo -e "${BLUE}Pushing schema changes to database...${NC}"
    ./supabase-cli.sh db push
    ;;
  db:reset)
    echo -e "${YELLOW}Warning: This will reset your local database.${NC}"
    read -p "Are you sure you want to continue? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      echo -e "${BLUE}Resetting local database...${NC}"
      ./supabase-cli.sh db reset
    fi
    ;;
  migrate)
    echo -e "${BLUE}Running migrations...${NC}"
    ./supabase-cli.sh migration up
    ;;
  migrate:new)
    echo -e "${BLUE}Creating new migration...${NC}"
    read -p "Enter migration name: " migration_name
    ./supabase-cli.sh migration new "$migration_name"
    ;;
  functions:list)
    echo -e "${BLUE}Listing Supabase functions...${NC}"
    ./supabase-cli.sh functions list
    ;;
  functions:serve)
    echo -e "${BLUE}Serving Supabase functions locally...${NC}"
    ./supabase-cli.sh functions serve
    ;;
  functions:deploy)
    echo -e "${BLUE}Deploying functions to Supabase...${NC}"
    ./supabase-cli.sh functions deploy
    ;;
  test)
    echo -e "${BLUE}Running tests...${NC}"
    npm test
    ;;
  lint)
    echo -e "${BLUE}Running linter...${NC}"
    npm run lint
    ;;
  help|*)
    show_help
    ;;
esac
