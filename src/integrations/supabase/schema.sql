-- system_defaults
create table public.system_defaults (
  id serial not null,
  grace_fee numeric(10, 2) null default 0,
  batch_format text null default 'YYYY-BATCH'::text,
  course_list text[] null default '{}'::text[],
  min_payment numeric(10, 2) null default 0,
  attendance_threshold integer null default 80,
  currency text null default 'INR'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  grace_period_months integer null default 5,
  max_attendance_slots integer not null default 15,
  required_attendance_slots integer not null default 12,
  version integer null default 1,
  constraint system_defaults_pkey primary key (id),
  constraint system_defaults_id_check check ((id = 1))
) TABLESPACE pg_default;

create trigger set_timestamp BEFORE
update on system_defaults for EACH row
execute FUNCTION update_timestamp ();


-- daily_attendance
create table public.daily_attendance (
  id uuid not null default gen_random_uuid (),
  student_id uuid not null,
  date date not null,
  hourly_status jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  version integer null default 1,
  constraint daily_attendance_pkey primary key (id),
  constraint daily_attendance_student_id_fkey foreign KEY (student_id) references students (id) on delete CASCADE
) TABLESPACE pg_default;

create unique INDEX IF not exists unique_student_date on public.daily_attendance using btree (student_id, date) TABLESPACE pg_default;

create trigger enforce_max_present_lectures_trigger BEFORE INSERT
or
update on daily_attendance for EACH row
execute FUNCTION enforce_max_present_lectures ();

create trigger update_daily_attendance_updated_at BEFORE
update on daily_attendance for EACH row
execute FUNCTION update_updated_at_column ();


-- fees
create table public.fees (
  id uuid not null default gen_random_uuid (),
  student_id uuid not null,
  total_amount numeric(12, 2) not null,
  paid_amount numeric(12, 2) not null default 0,
  due_date date not null,
  status text GENERATED ALWAYS as (
    case
      when (total_amount = paid_amount) then 'paid'::text
      when (paid_amount > (0)::numeric) then 'partially_paid'::text
      else 'unpaid'::text
    end
  ) STORED null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  grace_fee_amount integer null default 0,
  is_late_fee_applied boolean null default false,
  grace_month integer null default 5,
  due_amount numeric GENERATED ALWAYS as ((total_amount - paid_amount)) STORED (12, 2) null,
  constraint fees_pkey primary key (id),
  constraint fees_student_id_fkey foreign KEY (student_id) references students (id) on delete CASCADE
) TABLESPACE pg_default;


-- payments
create table public.payments (
  id uuid not null default gen_random_uuid (),
  fee_id uuid not null,
  amount numeric(12, 2) not null,
  payment_date date not null,
  payment_method text not null,
  slip_url text null,
  created_at timestamp with time zone not null default now(),
  payment_type text null,
  reference_number text null,
  constraint payments_pkey primary key (id),
  constraint payments_fee_id_fkey foreign KEY (fee_id) references fees (id) on delete CASCADE
) TABLESPACE pg_default;


-- profiles
create table public.profiles (
  id uuid not null,
  username text null,
  email text null,
  name text null,
  role text not null default 'user'::text,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint profiles_pkey primary key (id),
  constraint profiles_email_key unique (email),
  constraint profiles_username_key unique (username),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger update_profiles_updated_at BEFORE
update on profiles for EACH row
execute FUNCTION update_updated_at_column ();


-- students
create table public.students (
  id uuid not null default gen_random_uuid (),
  name text not null,
  roll_no text not null,
  course text not null,
  batch text not null,
  email text null,
  phone text null,
  status text null default 'active'::text,
  profile_image text null,
  address text null,
  date_of_birth date null,
  join_date date not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  mother_name text null,
  mother_phone text null,
  course_duration text null,
  validity_date date null,
  course_fees numeric null default 0,
  grace_period_fees numeric null default 0,
  grace_month integer null default 5,
  guardian_name text null,
  guardian_phone text null,
  father_name text null,
  father_phone text null,
  discount numeric(5, 2) null,
  constraint students_pkey primary key (id),
  constraint students_roll_no_key unique (roll_no)
) TABLESPACE pg_default;



-- teachers
create table public.teachers (
  id uuid not null,
  name text null,
  email text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  updated_by uuid null,
  constraint teachers_pkey primary key (id),
  constraint teachers_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
  constraint teachers_updated_by_fkey foreign KEY (updated_by) references auth.users (id)
) TABLESPACE pg_default;