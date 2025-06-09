-- Add discount column to students table
ALTER TABLE public.students
ADD COLUMN discount NUMERIC(5, 2) NULL; 