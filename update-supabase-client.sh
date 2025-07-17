#!/bin/bash

# Find all API route files that use createSupabaseServerClient
find src/app/api -name "route.ts" -exec grep -l "createSupabaseServerClient" {} \; | while read file; do
  echo "Updating $file..."
  # Replace "const supabase = createSupabaseServerClient" with "const supabase = await createSupabaseServerClient"
  sed -i '' 's/const supabase = createSupabaseServerClient/const supabase = await createSupabaseServerClient/g' "$file"
done

echo "Update complete!" 