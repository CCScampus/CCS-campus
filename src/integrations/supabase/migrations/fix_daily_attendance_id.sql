-- First, ensure the daily_attendance table exists with proper UUID default
CREATE TABLE IF NOT EXISTS public.daily_attendance (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL,
    date date NOT NULL,
    hourly_status jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT daily_attendance_pkey PRIMARY KEY (id),
    CONSTRAINT daily_attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT daily_attendance_student_date_unique UNIQUE (student_id, date)
);

-- If table already exists, modify the id column to have the proper default
ALTER TABLE public.daily_attendance 
    ALTER COLUMN id SET DEFAULT gen_random_uuid(),
    ALTER COLUMN id SET NOT NULL; 