-- Add duration column to requests table
ALTER TABLE requests ADD COLUMN IF NOT EXISTS duration TEXT;

-- Add comment to the column
COMMENT ON COLUMN requests.duration IS 'Duration of the gear request (e.g., 24hours, 1 week, etc.)';

-- Migrate any existing duration information from admin_notes field
UPDATE requests 
SET duration = SUBSTRING(admin_notes, 20) 
WHERE admin_notes LIKE 'Requested Duration: %';
