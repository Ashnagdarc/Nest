-- Create the checkins table to track gear returns
CREATE TABLE IF NOT EXISTS public.checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gear_id UUID NOT NULL REFERENCES public.gears(id) ON DELETE CASCADE,
  checkin_date TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  status TEXT NOT NULL DEFAULT 'Completed',
  notes TEXT,
  condition TEXT DEFAULT 'Good',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  CONSTRAINT valid_status CHECK (status IN ('Pending', 'Completed', 'Completed (Damaged)'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS checkins_user_id_idx ON public.checkins (user_id);
CREATE INDEX IF NOT EXISTS checkins_gear_id_idx ON public.checkins (gear_id);

-- Enable Row Level Security
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- Users can view their own check-ins
CREATE POLICY "Users can view their own check-ins" 
  ON public.checkins
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can create check-ins for gear they've checked out
CREATE POLICY "Users can check-in their gear" 
  ON public.checkins
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their pending check-ins
CREATE POLICY "Users can update their pending check-ins" 
  ON public.checkins
  FOR UPDATE 
  USING (auth.uid() = user_id AND status = 'Pending');

-- Only admins can delete check-ins
CREATE POLICY "Only admins can delete check-ins" 
  ON public.checkins
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- Admin policies
CREATE POLICY "Admins can view all check-ins" 
  ON public.checkins
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

CREATE POLICY "Admins can update any check-in" 
  ON public.checkins
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- Grant permissions
GRANT ALL ON public.checkins TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.checkins TO authenticated; 