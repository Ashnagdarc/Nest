#!/bin/bash

# Nest by Eden Oasis development setup script
# Run this script manually when you need to set up your development environment

# Next.js setup
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir
npm install resend @supabase/supabase-js @supabase/auth-helpers-nextjs postgres://$POSTGRES_URL

# Supabase functions
supabase functions deploy get_popular_gears --project-ref lkgxzrvcozfxydpmbtqq
cd /Users/gfx2edenoasis/Downloads/Development/GearFlow && npx ts-node scripts/verify-schema.ts
cd /Users/gfx2edenoasis/Downloads/Development/GearFlow && npm install --save-dev ts-node @types/node dotenv @supabase/supabase-js
cd /Users/gfx2edenoasis/Downloads/Development/GearFlow && npx ts-node scripts/db-structures.ts
npm install --save-dev dotenv @supabase/supabase-js
cd npx ts-node scripts/cleanup-tables.ts
npm install --save-dev ts-node && npx run cleanup-tables.ts

# Database setup
supabase status
PGPASSWORD=Edensupabase12 psql -h db.lkgxzrvcozfxydpmbtqq.supabase.co -p 5432 -U postgres -c "\dt+ notifications;" -c "\dp$"
cd /Users/gfx2edenoasis/Downloads/Development/GearFlow && supabase link --project-ref lkgxzrvcozfxydpmbtqq
cd /Users/gfx2edenoasis/Downloads/Development/GearFlow && supabase link --project-ref lkgxzrvcozfxydpmbtqq --password Eden$
PGPASSWORD=Edensupabase12 psql -h db.lkgxzrvcozfxydpmbtqq.supabase.co -p 5432 -U postgres -d postgres -c "\dt+"
docker stop $(docker ps -a -q) && docker rm -f $(docker ps -a -q) && supabase link --project-ref lkgxzrvcozfxydpmbtqq supabase$
scripts/download-notification-sounds.js http://localhost:9002> mv .env.local .env
sudo lsof -i :5432 && kill -9 PID

# Cleanup
docker system prune -af && docker volume prune -f

echo "Development environment setup complete!" 