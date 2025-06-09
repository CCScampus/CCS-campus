-- Update parent fields in students table
ALTER TABLE public.students
ADD COLUMN guardian_name text NULL,
ADD COLUMN guardian_phone text NULL,
ADD COLUMN father_name text NULL,
ADD COLUMN father_phone text NULL;

-- Copy existing parent data to guardian fields
UPDATE public.students
SET guardian_name = parent_name,
    guardian_phone = parent_phone;

-- Drop old parent columns
ALTER TABLE public.students
DROP COLUMN parent_name,
DROP COLUMN parent_phone; 