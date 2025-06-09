// DEPRECATED: All feature-specific API logic has been moved to studentService.ts, attendanceService.ts, and feesService.ts
// Only shared or unrelated logic should remain here.

import { supabase } from '@/integrations/supabase/client';
import { Student, Fee, DailyAttendance, MonthlyAttendance, DashboardStats } from '@/types';
import { Json } from '@/integrations/supabase/types';

// Students API
export const getStudents = async (): Promise<Student[]> => {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching students:', error);
    throw error;
  }
  
  // Convert to our app's Student type
  return data.map(student => ({
    id: student.id,
    name: student.name,
    rollNo: student.roll_no,
    course: student.course,
    batch: student.batch,
    email: student.email || '',
    phone: student.phone || '',
    status: student.status as any,
    profileImage: student.profile_image,
    address: student.address,
    parentName: student.parent_name,
    parentPhone: student.parent_phone,
    dateOfBirth: student.date_of_birth ? new Date(student.date_of_birth).toISOString().split('T')[0] : undefined,
    joinDate: new Date(student.join_date).toISOString().split('T')[0],
  }));
};

export const getStudentById = async (id: string): Promise<Student | null> => {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    console.error('Error fetching student:', error);
    throw error;
  }
  
  return {
    id: data.id,
    name: data.name,
    rollNo: data.roll_no,
    course: data.course,
    batch: data.batch,
    email: data.email || '',
    phone: data.phone || '',
    status: data.status as any,
    profileImage: data.profile_image,
    address: data.address,
    parentName: data.parent_name,
    parentPhone: data.parent_phone,
    dateOfBirth: data.date_of_birth ? new Date(data.date_of_birth).toISOString().split('T')[0] : undefined,
    joinDate: new Date(data.join_date).toISOString().split('T')[0],
  };
};

export const createStudent = async (student: Omit<Student, 'id'>): Promise<Student> => {
  // Format data according to database schema
  const formattedData = {
    name: student.name,
    roll_no: student.rollNo,
    course: student.course,
    batch: student.batch,
    email: student.email || null,
    phone: student.phone || null,
    status: student.status,
    profile_image: student.profileImage || null,
    address: student.address || null,
    parent_name: student.parentName || null,
    parent_phone: student.parentPhone || null,
    date_of_birth: student.dateOfBirth || null,
    join_date: student.joinDate,
    // These fields don't exist in the database schema
    // Commenting them out to prevent errors
    /*
    father_name: student.fatherName || null,
    father_phone: student.fatherPhone || null,
    mother_name: student.motherName || null,
    mother_phone: student.motherPhone || null,
    course_duration: student.courseDuration || null,
    admission_date: student.admissionDate || null,
    validity_date: student.validityDate || null,
    course_fees: student.courseFees ? Number(student.courseFees) : 0,
    grace_period: student.gracePeriod || null,
    grace_period_fees: student.gracePeriodFees ? Number(student.gracePeriodFees) : 0,
    */
  };

  console.log('Creating student with data:', formattedData);
  
  const { data, error } = await supabase
    .from('students')
    .insert(formattedData)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating student:', error);
    throw error;
  }
  
  return {
    id: data.id,
    name: data.name,
    rollNo: data.roll_no,
    course: data.course,
    batch: data.batch,
    email: data.email || '',
    phone: data.phone || '',
    status: data.status as any,
    profileImage: data.profile_image,
    address: data.address,
    parentName: data.parent_name,
    parentPhone: data.parent_phone,
    dateOfBirth: data.date_of_birth ? new Date(data.date_of_birth).toISOString().split('T')[0] : undefined,
    joinDate: new Date(data.join_date).toISOString().split('T')[0],
    // Frontend fields that don't exist in DB - return empty values
    fatherName: '',
    fatherPhone: '',
    motherName: '',
    motherPhone: '',
    courseDuration: '',
    admissionDate: '',
    validityDate: '',
    courseFees: '',
    gracePeriod: '',
    gracePeriodFees: '',
  };
};

export const updateStudent = async (id: string, student: Partial<Student>): Promise<Student> => {
  // Convert from our app type to database schema
  const dbStudent: any = {};
  
  // Handle required fields
  if (student.name !== undefined) dbStudent.name = student.name;
  if (student.rollNo !== undefined) dbStudent.roll_no = student.rollNo;
  if (student.course !== undefined) dbStudent.course = student.course;
  if (student.batch !== undefined) dbStudent.batch = student.batch;
  if (student.joinDate !== undefined) dbStudent.join_date = student.joinDate;
  
  // Handle optional fields - convert empty strings to null
  if (student.email !== undefined) dbStudent.email = student.email || null;
  if (student.phone !== undefined) dbStudent.phone = student.phone || null;
  if (student.status !== undefined) dbStudent.status = student.status;
  if (student.profileImage !== undefined) dbStudent.profile_image = student.profileImage || null;
  if (student.address !== undefined) dbStudent.address = student.address || null;
  if (student.parentName !== undefined) dbStudent.parent_name = student.parentName || null;
  if (student.parentPhone !== undefined) dbStudent.parent_phone = student.parentPhone || null;
  if (student.dateOfBirth !== undefined) dbStudent.date_of_birth = student.dateOfBirth || null;
  
  // These fields don't exist in the database schema, so we're not including them
  // Commented out to prevent errors but kept as reference
  /*
  if (student.fatherName !== undefined) dbStudent.father_name = student.fatherName || null;
  if (student.fatherPhone !== undefined) dbStudent.father_phone = student.fatherPhone || null;
  if (student.motherName !== undefined) dbStudent.mother_name = student.motherName || null;
  if (student.motherPhone !== undefined) dbStudent.mother_phone = student.motherPhone || null;
  if (student.courseDuration !== undefined) dbStudent.course_duration = student.courseDuration || null;
  if (student.admissionDate !== undefined) dbStudent.admission_date = student.admissionDate || null;
  if (student.validityDate !== undefined) dbStudent.validity_date = student.validityDate || null;
  if (student.courseFees !== undefined) dbStudent.course_fees = student.courseFees ? Number(student.courseFees) : 0;
  if (student.gracePeriod !== undefined) dbStudent.grace_period = student.gracePeriod || null;
  if (student.gracePeriodFees !== undefined) dbStudent.grace_period_fees = student.gracePeriodFees ? Number(student.gracePeriodFees) : 0;
  */
  
  console.log('Updating student with data:', dbStudent);
  
  const { data, error } = await supabase
    .from('students')
    .update(dbStudent)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating student:', error);
    throw error;
  }
  
  // Return the data with all fields from our frontend model
  // We'll keep the frontend interface the same but won't try to update non-existent DB fields
  return {
    id: data.id,
    name: data.name,
    rollNo: data.roll_no,
    course: data.course,
    batch: data.batch,
    email: data.email || '',
    phone: data.phone || '',
    status: data.status as any,
    profileImage: data.profile_image,
    address: data.address,
    parentName: data.parent_name,
    parentPhone: data.parent_phone,
    dateOfBirth: data.date_of_birth ? new Date(data.date_of_birth).toISOString().split('T')[0] : undefined,
    joinDate: new Date(data.join_date).toISOString().split('T')[0],
    // Frontend fields that don't exist in DB - return empty values
    fatherName: '',
    fatherPhone: '',
    motherName: '',
    motherPhone: '',
    courseDuration: '',
    admissionDate: '',
    validityDate: '',
    courseFees: '',
    gracePeriod: '',
    gracePeriodFees: '',
  };
};

// Fees API
export const getStudentFees = async (studentId?: string): Promise<Array<Fee & { student: Student }>> => {
  let query = supabase
    .from('fees')
    .select(`
      *,
      student:student_id (id, name, roll_no, course, batch, email, phone, father_name),
      payments (*)
    `);
  
  if (studentId) {
    query = query.eq('student_id', studentId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching fees:', error);
    throw error;
  }
  
  return data.map(fee => ({
    id: fee.id,
    studentId: fee.student_id,
    totalAmount: fee.total_amount,
    paidAmount: fee.paid_amount,
    dueAmount: fee.due_amount || 0,
    dueDate: fee.due_date,
    status: fee.status as 'paid' | 'partially_paid' | 'unpaid',
    student: {
      id: fee.student.id,
      name: fee.student.name,
      rollNo: fee.student.roll_no,
      course: fee.student.course,
      batch: fee.student.batch,
      email: fee.student.email || '',
      phone: fee.student.phone || '',
      status: 'active',
      joinDate: '',
      fatherName: fee.student.father_name || '',
    },
    payments: fee.payments.map((payment: any) => ({
      id: payment.id,
      amount: payment.amount,
      date: payment.payment_date,
      method: payment.payment_method as 'cash' | 'bank_transfer' | 'online' | 'check',
      reference: payment.reference_number || '',
      slipURL: payment.slip_url || '',
    })),
  }));
};

export const addPayment = async (
  feeId: string, 
  payment: Omit<Fee['payments'][0], 'id'>
): Promise<Fee> => {
  // First, insert the payment
  const { data: paymentData, error: paymentError } = await supabase
    .from('payments')
    .insert({
      fee_id: feeId,
      amount: payment.amount,
      payment_date: payment.date.split('T')[0],
      payment_method: payment.method,
      reference_number: payment.reference,
      slip_url: payment.slipURL,
    })
    .select();

  if (paymentError) {
    console.error('Error adding payment:', paymentError);
    throw paymentError;
  }

  // Then, get the current fee's data
  const { data: feeData, error: feeError } = await supabase
    .from('fees')
    .select('paid_amount, total_amount')
    .eq('id', feeId)
    .single();

  if (feeError) {
    console.error('Error getting fee data:', feeError);
    throw feeError;
  }

  // Calculate new values
  const newPaidAmount = feeData.paid_amount + payment.amount;
  const newDueAmount = feeData.total_amount - newPaidAmount;
  const newStatus = newDueAmount <= 0 ? 'paid' : 'partially_paid';

  // Update the fee record
  const { error: updateError } = await supabase
    .from('fees')
    .update({
      paid_amount: newPaidAmount,
      due_amount: newDueAmount > 0 ? newDueAmount : 0,
      status: newStatus,
    })
    .eq('id', feeId);

  if (updateError) {
    console.error('Error updating fee:', updateError);
    throw updateError;
  }

  // Finally, fetch the updated fee with all related data
  const { data: updatedFee, error: fetchError } = await supabase
    .from('fees')
    .select(`
      *,
      student:student_id (id, name, roll_no, course, batch, email, phone),
      payments (*)
    `)
    .eq('id', feeId)
    .single();

  if (fetchError) {
    console.error('Error fetching updated fee:', fetchError);
    throw fetchError;
  }

  return {
    id: updatedFee.id,
    studentId: updatedFee.student_id,
    totalAmount: updatedFee.total_amount,
    paidAmount: updatedFee.paid_amount,
    dueAmount: updatedFee.due_amount || 0,
    dueDate: updatedFee.due_date,
    status: updatedFee.status as 'paid' | 'partially_paid' | 'unpaid',
    payments: updatedFee.payments.map((payment: any) => ({
      id: payment.id,
      amount: payment.amount,
      date: payment.payment_date,
      method: payment.payment_method as 'cash' | 'bank_transfer' | 'online' | 'check',
      reference: payment.reference_number || '',
      slipURL: payment.slip_url || '',
    })),
  };
};

// Attendance API
export const getDailyAttendance = async (
  date: string
): Promise<DailyAttendance[]> => {
  // First get all students
  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('id, name, roll_no')
    .eq('status', 'active');
  
  if (studentError) {
    console.error('Error fetching students for attendance:', studentError);
    throw studentError;
  }
  
  // Then get attendance records for the date
  const { data: attendance, error: attendanceError } = await supabase
    .from('daily_attendance')
    .select('*')
    .eq('date', date);
  
  if (attendanceError) {
    console.error('Error fetching attendance:', attendanceError);
    throw attendanceError;
  }
  
  // Map students to attendance records
  return students.map((student: any) => {
    const attendanceRecord = attendance.find((a: any) => a.student_id === student.id);
    
    // Convert the JSON hourly_status to HourlyAttendance[] type
    const hourlyStatus = attendanceRecord?.hourly_status 
      ? (attendanceRecord.hourly_status as any[]).map((h: any) => ({
          hour: h.hour,
          status: h.status,
          time: h.time,
          reason: h.reason
        }))
      : [];
    
    return {
      id: attendanceRecord?.id || `temp-${student.id}`,
      studentId: student.id,
      date: date,
      hourlyStatus: hourlyStatus,
    };
  });
};

export const updateDailyAttendance = async (
  attendance: DailyAttendance[]
): Promise<boolean> => {
  // Create an array of upsert operations
  const upserts = attendance.map(record => {
    // Convert HourlyAttendance[] to a format compatible with Supabase's Json type
    const hourlyStatusJson = record.hourlyStatus.map(h => ({
      hour: h.hour,
      status: h.status,
      time: h.time,
      reason: h.reason
    }));
    
    return {
      student_id: record.studentId,
      date: record.date,
      hourly_status: hourlyStatusJson as Json,
      // If the record has a temporary ID, it's a new record
      id: record.id.startsWith('temp-') ? undefined : record.id
    };
  });
  
  const { error } = await supabase
    .from('daily_attendance')
    .upsert(upserts, { 
      onConflict: 'student_id, date',
      ignoreDuplicates: false
    });
  
  if (error) {
    console.error('Error updating attendance:', error);
    throw error;
  }
  
  return true;
};

export const getMonthlyAttendance = async (
  month: number,
  year: number
): Promise<MonthlyAttendance[]> => {
  // Get start and end date for the month
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];
  
  // Get all active students
  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('id, name, roll_no')
    .eq('status', 'active');
  
  if (studentError) {
    console.error('Error fetching students for monthly attendance:', studentError);
    throw studentError;
  }
  
  // Get attendance for the month
  const { data: attendance, error: attendanceError } = await supabase
    .from('daily_attendance')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);
  
  if (attendanceError) {
    console.error('Error fetching monthly attendance:', attendanceError);
    throw attendanceError;
  }
  
  // Calculate monthly statistics for each student
  return students.map((student: any) => {
    const studentAttendance = attendance.filter((a: any) => a.student_id === student.id);
    
    // Calculate statistics
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalLeave = 0;
    let totalMedical = 0;
    let totalHours = 0;
    
    studentAttendance.forEach((day: any) => {
      day.hourly_status.forEach((hour: any) => {
        totalHours++;
        switch(hour.status) {
          case 'present': totalPresent++; break;
          case 'absent': totalAbsent++; break;
          case 'late': totalLate++; break;
          case 'leave': totalLeave++; break;
          case 'medical': totalMedical++; break;
        }
      });
    });
    
    const attendancePercentage = totalHours > 0 
      ? Math.round((totalPresent / totalHours) * 100) 
      : 0;
    
    return {
      studentId: student.id,
      month,
      year,
      totalPresent,
      totalAbsent,
      totalLate,
      totalLeave,
      totalMedical,
      totalHours,
      attendancePercentage,
    };
  });
};

export const generateMonthlyReport = async (
  studentId: string,
  month: number,
  year: number
): Promise<string> => {
  // This would typically call an API to generate a report
  // For now, we'll just simulate a delay and return a dummy URL
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`/reports/${studentId}_${year}_${month}.pdf`);
    }, 1500);
  });
};

// Dashboard API
export const getDashboardStats = async (): Promise<any> => {
  // Get total and active students
  const { data: studentCounts, error: studentError } = await supabase
    .from('students')
    .select('status', { count: 'exact', head: false })
    .in('status', ['active', 'inactive', 'alumni']);
  
  if (studentError) {
    console.error('Error fetching student counts:', studentError);
    throw studentError;
  }
  
  const totalStudents = studentCounts.length;
  const activeStudents = studentCounts.filter((s: any) => s.status === 'active').length;
  
  // Get fee statistics
  const { data: fees, error: feeError } = await supabase
    .from('fees')
    .select('total_amount, paid_amount, due_amount, due_date, status');
  
  if (feeError) {
    console.error('Error fetching fee statistics:', feeError);
    throw feeError;
  }
  
  const totalFeesCollected = fees.reduce((total: number, fee: any) => total + Number(fee.paid_amount), 0);
  const totalFeesDue = fees.reduce((total: number, fee: any) => total + Number(fee.due_amount), 0);
  
  // Count upcoming payments (due in the next 30 days)
  const now = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(now.getDate() + 30);
  
  const upcomingPayments = fees.filter((fee: any) => {
    const dueDate = new Date(fee.due_date);
    return fee.status !== 'paid' && dueDate >= now && dueDate <= thirtyDaysLater;
  }).length;
  
  // Get attendance statistics
  const { data: attendance, error: attendanceError } = await supabase
    .from('daily_attendance')
    .select('date, hourly_status');
  
  if (attendanceError) {
    console.error('Error fetching attendance statistics:', attendanceError);
    throw attendanceError;
  }
  
  // Calculate attendance for each of the last 6 months (including current)
  const attendanceHistory = [];
  const monthsToShow = 6;
  const current = new Date();
  let hasAnyAttendance = attendance.length > 0;
  for (let i = monthsToShow - 1; i >= 0; i--) {
    const d = new Date(current.getFullYear(), current.getMonth() - i, 1);
    // Don't show future months
    if (d > current) continue;
    const monthStr = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    // Get all attendance records for this month
    const monthAttendance = attendance.filter((a: any) => {
      const ad = new Date(a.date);
      return ad.getFullYear() === d.getFullYear() && ad.getMonth() === d.getMonth();
    });
    let totalHours = 0;
    let presentHours = 0;
    monthAttendance.forEach((day: any) => {
      day.hourly_status.forEach((hour: any) => {
        totalHours++;
        if (hour.status === 'present') presentHours++;
      });
    });
    // Only include months up to current, and only if there is any attendance data or it's the current month
    if (monthAttendance.length > 0 || i === 0 || hasAnyAttendance) {
      const avg = totalHours > 0 ? Math.round((presentHours / totalHours) * 100) : 0;
      attendanceHistory.push({ month: monthStr, attendance: avg });
    }
  }
  // If there is no attendance at all, show only the current month with 0
  if (!hasAnyAttendance) {
    const d = new Date(current.getFullYear(), current.getMonth(), 1);
    const monthStr = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    attendanceHistory.push({ month: monthStr, attendance: 0 });
  }
  
  let totalAttendanceHours = 0;
  let totalPresentHours = 0;
  attendance.forEach((day: any) => {
    day.hourly_status.forEach((hour: any) => {
      totalAttendanceHours++;
      if (hour.status === 'present') {
        totalPresentHours++;
      }
    });
  });
  const averageAttendance = totalAttendanceHours > 0 
    ? Math.round((totalPresentHours / totalAttendanceHours) * 100) 
    : 0;
  
  // Calculate due payments and due students
  const dueFees = fees.filter((fee: any) => fee.status !== 'paid');
  const duePayments = dueFees.reduce((total: number, fee: any) => total + Number(fee.due_amount), 0);
  const dueStudents = new Set(dueFees.map((fee: any) => fee.student_id)).size;
  const dueTrend = 0; // Placeholder, implement trend logic if needed

  return {
    totalStudents,
    activeStudents,
    totalFeesCollected,
    totalFeesDue,
    averageAttendance,
    upcomingPayments,
    attendanceHistory,
    duePayments,
    dueStudents,
    dueTrend,
  };
};
