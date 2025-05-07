-- Supabase Schema for GearFlow

-- ** Extensions **
-- Enable UUID generation
create extension if not exists "uuid-ossp" with schema extensions;

-- ** Custom Types (Enums) **
-- Drop existing types if they exist to avoid conflicts during re-runs
drop type if exists public.role cascade;
drop type if exists public.gear_status cascade;
drop type if exists public.request_status cascade;
drop type if exists public.user_status cascade;

-- Create custom types
create type public.role as enum ('Admin', 'User');
create type public.gear_status as enum ('Available', 'Booked', 'Damaged', 'Under Repair', 'New');
create type public.request_status as enum ('Pending', 'Approved', 'Rejected', 'Checked Out', 'Checked In', 'Overdue', 'Cancelled');
create type public.user_status as enum ('Active', 'Inactive');

-- ** Tables **

-- 1. Profiles Table (linked to auth.users)
drop table if exists public.profiles cascade;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  updated_at timestamptz default timezone('utc', now()),
  full_name text,
  email text unique,
  phone text,
  department text,
  avatar_url text,
  role public.role default 'User' not null,
  status public.user_status default 'Active' not null,
  created_at timestamptz default timezone('utc', now()) not null
);
comment on table public.profiles is 'Stores user profile information, extending auth.users.';
comment on column public.profiles.id is 'Links to auth.users.id';

-- Drop the old constraint (replace constraint name as needed)
alter table public.profiles drop constraint if exists profiles_id_fkey;

-- Add the correct constraint
alter table public.profiles
add constraint profiles_id_fkey
foreign key (id) references auth.users(id) on delete cascade;

-- 2. Gears Table
drop table if exists public.gears cascade;
create table public.gears (
  id uuid default extensions.uuid_generate_v4() primary key,
  created_at timestamptz default timezone('utc', now()) not null,
  name text not null,
  category text,
  description text,
  serial_number text unique,
  purchase_date date,
  image_url text,
  condition text,
  status public.gear_status default 'Available' not null
);
comment on table public.gears is 'Stores information about each piece of equipment.';

-- 3. Requests Table
drop table if exists public.requests cascade;
create table public.requests (
  id uuid default extensions.uuid_generate_v4() primary key,
  created_at timestamptz default timezone('utc', now()) not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  destination text,
  duration text,
  team_members text,
  status public.request_status default 'Pending' not null,
  admin_notes text,
  checkout_date timestamptz,
  due_date timestamptz,
  checkin_date timestamptz,
  is_damaged_on_checkin boolean default false,
  damage_description_on_checkin text,
  checkin_notes text
);
comment on table public.requests is 'Records user requests for gear.';
comment on column public.requests.user_id is 'The user who made the request.';
comment on column public.requests.checkin_date is 'Timestamp when the gear associated with this request was checked in.';
comment on column public.requests.is_damaged_on_checkin is 'Whether damage was reported during check-in for this request.';
comment on column public.requests.damage_description_on_checkin is 'Details of damage reported during check-in.';
comment on column public.requests.checkin_notes is 'Notes added during the check-in process for this request.';

-- 4. Request_Gears Join Table (Many-to-Many relationship between Requests and Gears)
drop table if exists public.request_gears cascade;
create table public.request_gears (
  request_id uuid not null references public.requests(id) on delete cascade,
  gear_id uuid not null references public.gears(id) on delete cascade,
  created_at timestamptz default timezone('utc', now()) not null,
  primary key (request_id, gear_id)
);
comment on table public.request_gears is 'Join table linking requests to the specific gears requested.';

-- 5. Announcements Table
drop table if exists public.announcements cascade;
create table public.announcements (
  id uuid default extensions.uuid_generate_v4() primary key,
  created_at timestamptz default timezone('utc', now()) not null,
  author_id uuid references public.profiles(id) on delete set null,
  title text not null,
  content text not null
);
comment on table public.announcements is 'Stores announcements made by administrators.';
comment on column public.announcements.author_id is 'The admin user who created the announcement.';

-- 6. App Settings Table (Key-Value Store)
drop table if exists public.app_settings cascade;
create table public.app_settings (
  key text primary key,
  value text,
  updated_at timestamptz default timezone('utc', now()) not null
);
comment on table public.app_settings is 'Stores general application settings like logo URL.';

-- ** Indexes **
-- Add indexes for frequently queried columns, especially foreign keys
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_gears_status on public.gears(status);
create index if not exists idx_gears_category on public.gears(category);
create index if not exists idx_requests_user_id on public.requests(user_id);
create index if not exists idx_requests_status on public.requests(status);
create index if not exists idx_request_gears_gear_id on public.request_gears(gear_id);
create index if not exists idx_request_gears_request_id on public.request_gears(request_id);
create index if not exists idx_announcements_created_at on public.announcements(created_at desc);

-- ** Functions **

-- Function to get user role (useful for RLS policies)
drop function if exists public.get_user_role cascade;
create or replace function public.get_user_role(user_id uuid)
returns public.role
language sql
security definer -- Important for accessing profiles table securely
set search_path = public -- Explicitly set search path
as $$
  select role from public.profiles where id = user_id;
$$;

-- Function to check if user is admin
drop function if exists public.is_admin cascade;
create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.get_user_role(user_id) = 'Admin'::public.role;
$$;

-- Function to sync profile email with auth user email (Optional Trigger)
-- create or replace function public.sync_profile_email()
-- returns trigger
-- language plpgsql
-- security definer set search_path = public
-- as $$
-- begin
--   update public.profiles
--   set email = new.email
--   where id = new.id;
--   return new;
-- end;
-- $$;
--
-- -- Trigger to call the sync function on auth.users changes (Optional)
-- create trigger on_auth_user_updated
--   after insert or update of email on auth.users
--   for each row execute procedure public.sync_profile_email();


-- ** Row Level Security (RLS) **

-- Helper function to get the authenticated user's ID
create or replace function auth.uid() returns uuid as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid;
$$ language sql stable;

-- 1. Profiles Table RLS
alter table public.profiles enable row level security;
drop policy if exists "Allow authenticated users to read profiles" on public.profiles;
drop policy if exists "Allow user to read their own profile" on public.profiles;
drop policy if exists "Allow user to update their own profile" on public.profiles;
drop policy if exists "Allow admin users to manage all profiles" on public.profiles;
-- Policy: Allow authenticated users read access (e.g., for display names)
create policy "Allow authenticated users to read profiles" on public.profiles
  for select using (auth.role() = 'authenticated');
-- Policy: Users can read their own profile
create policy "Allow user to read their own profile" on public.profiles
  for select using (auth.uid() = id);
-- Policy: Users can update their own profile
create policy "Allow user to update their own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
-- Policy: Admins can manage all profiles (bypass other policies for admins)
create policy "Allow admin users to manage all profiles" on public.profiles
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Add policy to allow users to insert their own profile
drop policy if exists "Allow users to insert their own profile" on public.profiles;
create policy "Allow users to insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- 2. Gears Table RLS
alter table public.gears enable row level security;
drop policy if exists "Allow public read access to gears" on public.gears;
drop policy if exists "Allow admin users to manage gears" on public.gears;
-- Policy: Allow public read access to gears (for browsing)
create policy "Allow public read access to gears" on public.gears
  for select using (true); -- Everyone can see gears
-- Policy: Allow admins to manage gears
create policy "Allow admin users to manage gears" on public.gears
  for all using (public.is_admin(auth.uid())); -- Only Admins can insert/update/delete

-- 3. Requests Table RLS
alter table public.requests enable row level security;
drop policy if exists "Allow user to manage their own requests" on public.requests;
drop policy if exists "Allow admin users to manage all requests" on public.requests;
-- Policy: Users can create/read/update/delete their own requests
create policy "Allow user to manage their own requests" on public.requests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Policy: Admins can manage all requests
create policy "Allow admin users to manage all requests" on public.requests
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- 4. Request_Gears Table RLS (Inherits based on linked request)
alter table public.request_gears enable row level security;
drop policy if exists "Allow access based on linked request" on public.request_gears;
-- Policy: Allow access if user can access the linked request
create policy "Allow access based on linked request" on public.request_gears
  for all using (
    (select public.is_admin(auth.uid())) -- Admins can access all
    or
    (exists (select 1 from public.requests where id = request_id and user_id = auth.uid())) -- User owns the request
  );

-- 5. Announcements Table RLS
alter table public.announcements enable row level security;
drop policy if exists "Allow public read access to announcements" on public.announcements;
drop policy if exists "Allow admin users to manage announcements" on public.announcements;
-- Policy: Allow public read access
create policy "Allow public read access to announcements" on public.announcements
  for select using (true);
-- Policy: Allow admins to manage announcements
create policy "Allow admin users to manage announcements" on public.announcements
  for all using (public.is_admin(auth.uid()));

-- 6. App Settings Table RLS
alter table public.app_settings enable row level security;
drop policy if exists "Allow public read access to app settings" on public.app_settings;
drop policy if exists "Allow admin users to manage app settings" on public.app_settings;
-- Policy: Allow public read access (e.g., for logo)
create policy "Allow public read access to app settings" on public.app_settings
  for select using (true);
-- Policy: Allow admins to manage settings
create policy "Allow admin users to manage app settings" on public.app_settings
  for all using (public.is_admin(auth.uid()));


-- ** Storage Buckets and Policies **

-- 1. Avatars Bucket
-- Create bucket (run only once manually or check existence in script)
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
-- on conflict (id) do nothing;

-- Policies for Avatars (Example - adjust as needed)
drop policy if exists "Allow public read access to avatars" on storage.objects;
drop policy if exists "Allow users to upload their own avatar" on storage.objects;
drop policy if exists "Allow users to update their own avatar" on storage.objects;
drop policy if exists "Allow users to delete their own avatar" on storage.objects;
drop policy if exists "Allow admins to manage all avatars" on storage.objects;

-- Public read access
create policy "Allow public read access to avatars" on storage.objects
  for select using (bucket_id = 'avatars');

-- Users can upload their own avatar (filename matches their user ID)
create policy "Allow users to upload their own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and
    auth.uid() = (storage.foldername(name))[1]::uuid -- Assumes folder structure `avatars/<user_id>/filename.ext`
  );

-- Users can update their own avatar
create policy "Allow users to update their own avatar" on storage.objects
  for update using (
    bucket_id = 'avatars' and
    auth.uid() = (storage.foldername(name))[1]::uuid
  );

-- Users can delete their own avatar
create policy "Allow users to delete their own avatar" on storage.objects
  for delete using (
    bucket_id = 'avatars' and
    auth.uid() = (storage.foldername(name))[1]::uuid
  );

-- Admins can manage all avatars
create policy "Allow admins to manage all avatars" on storage.objects
    for all using (
        bucket_id = 'avatars' and
        public.is_admin(auth.uid())
    );


-- 2. Branding Bucket (for Logo)
-- Create bucket (run only once manually or check existence in script)
-- insert into storage.buckets (id, name, public) values ('branding', 'branding', true)
-- on conflict (id) do nothing;

-- Policies for Branding
drop policy if exists "Allow public read access to branding" on storage.objects;
drop policy if exists "Allow admins to manage branding" on storage.objects;

-- Public read access for logo
create policy "Allow public read access to branding" on storage.objects
  for select using (bucket_id = 'branding');

-- Admins can upload/delete/update branding assets
create policy "Allow admins to manage branding" on storage.objects
  for all using (
    bucket_id = 'branding' and
    public.is_admin(auth.uid())
  );


-- ** Default Data (Optional) **

-- Function to create the default admin user
-- NOTE: Run this MANUALLY or via a secure script AFTER deploying the schema.
-- DO NOT include raw passwords directly in version-controlled SQL.
-- Consider using environment variables or a seeding script.
-- This function requires the `supabase_admin` role or similar privileges.
drop function if exists public.create_default_admin cascade;
create or replace function public.create_default_admin()
returns void
language plpgsql
security definer
as $$
declare
  admin_user_id uuid;
  admin_email text := 'admin@gearflow.app';
  admin_password text := 'Admin123!';
begin
  -- Check if the admin user already exists in auth.users
  select id into admin_user_id from auth.users where email = admin_email;

  -- If user doesn't exist, create them using auth.create_user
  if admin_user_id is null then
    select id into admin_user_id from auth.create_user(
      email := admin_email,
      password := admin_password,
      email_confirm := true,
      data := jsonb_build_object('full_name', 'Adira')
    );

    raise notice 'Admin user created in auth.users with ID: %', admin_user_id;
  else
    raise notice 'Admin user already exists in auth.users with ID: %', admin_user_id;
  end if;

  -- Ensure the profile exists and set role to Admin
  insert into public.profiles (id, email, full_name, role, status, updated_at)
  values (
    admin_user_id,
    admin_email,
    'Adira',
    'Admin'::public.role,
    'Active'::public.user_status,
    now()
  )
  on conflict (id) do update set
    role = excluded.role,
    status = excluded.status,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    email = coalesce(public.profiles.email, excluded.email),
    updated_at = now();

  raise notice 'Profile for admin user ID % ensured/updated with Admin role.', admin_user_id;
end;
$$;

-- Example of how to call the function (Requires appropriate permissions):
-- SELECT public.create_default_admin();

-- Optional: Seed default app settings
insert into public.app_settings (key, value, updated_at)
values
  ('logoUrl', null, now()), -- Start with no logo
  ('emailNotifications', 'true', now()),
  ('autoApproveRequests', 'false', now()),
  ('maxCheckoutDuration', '7', now())
on conflict (key) do nothing; -- Don't overwrite if they already exist

commit;

-- Maintenance table
drop table if exists public.gear_maintenance cascade;
create table public.gear_maintenance (
  id uuid primary key default extensions.uuid_generate_v4(),
  gear_id uuid references public.gears(id) on delete cascade,
  date timestamptz not null default now(),
  description text not null,
  status text not null,
  performed_by uuid references public.profiles(id),
  attachments text[],
  next_due timestamptz,
  created_at timestamptz not null default now()
);

-- Update handle_new_user trigger function
drop function if exists public.handle_new_user cascade;
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  full_name_value text;
begin
  -- Extract full_name from raw_user_meta_data, defaulting to email if not present
  full_name_value := coalesce(
    (new.raw_user_meta_data->>'full_name')::text,
    split_part(new.email, '@', 1)
  );

  -- Insert with explicit role and status
  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    status,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    full_name_value,
    'User'::public.role,
    'Active'::public.user_status,
    now(),
    now()
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    updated_at = now()
  where public.profiles.id = excluded.id;

  return new;
end;
$$;

-- Reattach trigger to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
