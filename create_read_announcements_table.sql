-- Create a table to track which announcements have been read by which users
CREATE TABLE IF NOT EXISTS public.read_announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, announcement_id)
);

-- Create a RLS policy for read_announcements table
ALTER TABLE public.read_announcements ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own read_announcements records
CREATE POLICY "Users can view their own read announcements" 
  ON public.read_announcements
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Allow users to mark announcements as read
CREATE POLICY "Users can mark announcements as read" 
  ON public.read_announcements
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own read announcements
CREATE POLICY "Users can update their own read announcements" 
  ON public.read_announcements
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Prevent deletion by normal users
CREATE POLICY "Only admins can delete read announcements" 
  ON public.read_announcements
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

GRANT ALL ON public.read_announcements TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.read_announcements TO authenticated; 