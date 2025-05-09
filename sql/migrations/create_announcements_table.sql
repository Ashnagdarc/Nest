-- Create announcements table if it doesn't exist
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Create a function to check if a user is an admin (using our existing SECURITY DEFINER function)
-- Uses the same function we created earlier for profiles RLS
-- Uncomment if you need to recreate it
/*
CREATE OR REPLACE FUNCTION private.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = uid AND role = 'Admin'
  );
$$;
*/

-- Create policies for the announcements table
-- All users can view announcements
CREATE POLICY "Anyone can view announcements" 
ON announcements FOR SELECT 
USING (true);

-- Only admins can insert announcements
CREATE POLICY "Only admins can create announcements" 
ON announcements FOR INSERT 
TO authenticated
WITH CHECK (private.is_admin(auth.uid()));

-- Only admins can update announcements
CREATE POLICY "Only admins can update announcements" 
ON announcements FOR UPDATE 
TO authenticated
USING (private.is_admin(auth.uid()))
WITH CHECK (private.is_admin(auth.uid()));

-- Only admins can delete announcements
CREATE POLICY "Only admins can delete announcements" 
ON announcements FOR DELETE 
TO authenticated
USING (private.is_admin(auth.uid()));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by); 