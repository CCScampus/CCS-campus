// Student Types
export type StudentStatus = 'active' | 'inactive' | 'alumni';

export interface Student {
  id: string;
  name: string;
  rollNo: string;
  course: string;
  batch: string;
  email: string;
  phone: string;
  status: StudentStatus;
  profileImage?: string;
  address?: string;
  dateOfBirth?: string;
  joinDate: string;
  fatherName?: string;
  fatherPhone?: string;
  motherName?: string;
  motherPhone?: string;
  guardianName?: string;
  guardianPhone?: string;
  courseDuration?: string;
  admissionDate?: string;
  validityDate?: string;
  courseFees?: string;
  gracePeriod?: string;
  gracePeriodFees?: string;
  graceMonth?: string;
  discount?: string;
}

// Fee Types
export interface Fee {
  id: string;
  studentId: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  dueDate: string;
  status: 'paid' | 'partially_paid' | 'unpaid';
  payments: {
    id: string;
    amount: number;
    date: string;
    method: 'cash' | 'bank_transfer' | 'online' | 'check';
    reference: string;
    slipURL: string;
    type?: 'regular' | 'grace_fee';
    remainingDueAmount?: number;
  }[];
  graceMonth: number;
  graceFeeAmount: number;
  graceUntilDate?: string;
  isLateFeeApplied?: boolean;
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
  method: 'cash' | 'bank_transfer' | 'online' | 'check';
  reference?: string;
  slipURL?: string;
  remainingDueAmount?: number;
}

// Attendance Types
export type AttendanceStatus = 
  'present' | 
  'absent' | 
  'late' | 
  'leave' | 
  'in' | 
  'out' | 
  'exam' | 
  'medical';

export interface HourlyAttendance {
  hour: number; // 1-15
  status: AttendanceStatus;
  time?: string; // For IN, OUT, Late
  reason?: string; // For Leave, Medical
}

export interface DailyAttendance {
  id?: string;
  studentId: string;
  date: string;
  hourlyStatus: HourlyAttendance[];
  version?: number; // For optimistic concurrency control
}

export interface MonthlyAttendance {
  studentId: string;
  month: number; // 1-12
  year: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalLeave: number;
  totalMedical: number;
  totalHours: number;
  attendancePercentage: number;
  reportURL?: string;
}

// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'admin' | 'staff';
}

// Dashboard Types
export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalFeesCollected: number;
  totalFeesDue: number;
  averageAttendance: number;
  upcomingPayments: number;
}

// New type for tracking selected slots
export interface SelectedSlots {
  studentId: string;
  date: string;
  selectedHours: number[]; // Array of selected hours (15 out of 15)
}
