-- Supabase SQL: Automatic profile creation trigger
-- 1. Create the function
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id, 
    email, 
    full_name,
    role,           -- Added role
    status,         -- Added status
    created_at,     -- Added timestamps
    updated_at
  )
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'User'),  -- Default to 'User' if not specified
    'Active',  -- Default status
    now(),
    now()
  );
  return new;
end;
$$ language plpgsql security definer;

-- 2. Create the trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user(); 