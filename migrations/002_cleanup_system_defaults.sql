-- Start transaction
BEGIN;

-- First backup the current values in case we need them
CREATE TABLE IF NOT EXISTS system_defaults_backup AS 
SELECT * FROM system_defaults;

-- Drop the notification columns
ALTER TABLE public.system_defaults
DROP COLUMN IF EXISTS notif_fee,
DROP COLUMN IF EXISTS notif_attendance,
DROP COLUMN IF EXISTS notif_system;

-- Drop theme and sidebar state columns
ALTER TABLE public.system_defaults
DROP COLUMN IF EXISTS theme,
DROP COLUMN IF EXISTS sidebar_state;

-- Update currency default to INR
ALTER TABLE public.system_defaults
ALTER COLUMN currency SET DEFAULT 'INR';

-- Update existing records to use INR
UPDATE public.system_defaults
SET currency = 'INR'
WHERE currency = 'USD';

-- End transaction
COMMIT; 