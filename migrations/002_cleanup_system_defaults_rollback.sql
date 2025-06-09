-- Start transaction
BEGIN;

-- Add back the notification columns
ALTER TABLE public.system_defaults
ADD COLUMN IF NOT EXISTS notif_fee boolean NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notif_attendance boolean NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notif_system boolean NULL DEFAULT true;

-- Add back theme and sidebar state columns
ALTER TABLE public.system_defaults
ADD COLUMN IF NOT EXISTS theme text NULL DEFAULT 'light',
ADD COLUMN IF NOT EXISTS sidebar_state text NULL DEFAULT 'expanded';

-- Restore currency default to USD
ALTER TABLE public.system_defaults
ALTER COLUMN currency SET DEFAULT 'USD';

-- Restore values from backup if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'system_defaults_backup') THEN
        UPDATE public.system_defaults sd
        SET 
            notif_fee = sdb.notif_fee,
            notif_attendance = sdb.notif_attendance,
            notif_system = sdb.notif_system,
            theme = sdb.theme,
            sidebar_state = sdb.sidebar_state,
            currency = sdb.currency
        FROM system_defaults_backup sdb
        WHERE sd.id = sdb.id;
    END IF;
END $$;

-- Drop the backup table if it exists
DROP TABLE IF EXISTS system_defaults_backup;

-- End transaction
COMMIT; 