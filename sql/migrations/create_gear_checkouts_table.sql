-- Create the gear_checkouts table to track gear checkout history
CREATE TABLE IF NOT EXISTS gear_checkouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gear_id UUID REFERENCES gears(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  request_id UUID REFERENCES gear_requests(id) NOT NULL,
  checkout_date TIMESTAMP WITH TIME ZONE NOT NULL,
  expected_return_date TIMESTAMP WITH TIME ZONE,
  actual_return_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL, -- 'Checked Out', 'Returned', 'Overdue', etc.
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_gear_checkouts_gear_id ON gear_checkouts(gear_id);
CREATE INDEX IF NOT EXISTS idx_gear_checkouts_user_id ON gear_checkouts(user_id);
CREATE INDEX IF NOT EXISTS idx_gear_checkouts_request_id ON gear_checkouts(request_id);
CREATE INDEX IF NOT EXISTS idx_gear_checkouts_status ON gear_checkouts(status);

-- Enable Row Level Security (RLS)
ALTER TABLE gear_checkouts ENABLE ROW LEVEL SECURITY;

-- Create policies for gear_checkouts table

-- Allow users to view their own checkouts
CREATE POLICY "Users can view their own checkouts"
ON gear_checkouts
FOR SELECT
USING (auth.uid() = user_id);

-- Allow admins full access to all checkout records
CREATE POLICY "Admins have full access to checkout records"
ON gear_checkouts
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
  )
);

-- Trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_gear_checkouts_updated_at
BEFORE UPDATE ON gear_checkouts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 