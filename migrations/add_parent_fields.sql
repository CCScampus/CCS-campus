-- Add parent fields to students table
ALTER TABLE public.students
ADD COLUMN father_name text NULL,
ADD COLUMN father_phone text NULL,
ADD COLUMN mother_name text NULL,
ADD COLUMN mother_phone text NULL; 