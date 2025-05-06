-- Create notifications table
create table if not exists public.notifications (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    type text not null check (type in ('gear', 'profile', 'system')),
    title text not null,
    message text not null,
    read boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add indexes
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);
create index if not exists idx_notifications_read on public.notifications(read);

-- Enable RLS
alter table public.notifications enable row level security;

-- RLS Policies
create policy "Users can view their own notifications"
    on public.notifications for select
    using (auth.uid() = user_id);

create policy "Users can update their own notifications"
    on public.notifications for update
    using (auth.uid() = user_id);

create policy "System can insert notifications"
    on public.notifications for insert
    with check (true);

-- Function to create notification
create or replace function public.create_notification(
    p_user_id uuid,
    p_type text,
    p_title text,
    p_message text
) returns uuid
language plpgsql
security definer
as $$
declare
    v_notification_id uuid;
begin
    insert into public.notifications (user_id, type, title, message)
    values (p_user_id, p_type, p_title, p_message)
    returning id into v_notification_id;
    
    return v_notification_id;
end;
$$; 